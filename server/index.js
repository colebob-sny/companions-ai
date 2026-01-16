// Load local .env in development (safe; actual secret files should be ignored)
require('dotenv').config();

// Fail fast if OpenAI key is missing
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: Missing OPENAI_API_KEY in environment. Set it in server/.env or via environment variables.');
  // Exit with non-zero so deployments fail early
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(cors());
// Limit request body size to avoid huge payloads
app.use(express.json({ limit: '12kb' }));

// Basic rate limiter (per IP): 60 requests per minute by default
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// Apply rate limiter specifically to chat endpoint
app.use('/chat', chatLimiter);

// Short-term memory for active session (in-memory array)
// This is intentionally ephemeral and will reset when the server restarts.
const shortTermMemory = [];

// Minimal API contract:
// - POST /message { role, text } -> adds to memory
// - GET /memory -> returns memory array
// - DELETE /memory -> clears memory

app.post('/message', (req, res) => {
  const { role, text } = req.body || {};
  if (!role || !text) {
    return res.status(400).json({ error: 'Missing role or text in request body' });
  }

  const entry = { role, text, timestamp: new Date().toISOString() };
  shortTermMemory.push(entry);

  // Placeholder AI reply
  const aiReply = "Hello! This is a placeholder response.";
  shortTermMemory.push({ role: 'assistant', text: aiReply, timestamp: new Date().toISOString() });

  return res.json({ status: 'ok', entry, reply: aiReply });
});

// POST /chat -> call OpenAI chat completions using the server-side key
app.post('/chat', async (req, res) => {
  try {
    const { role, text } = req.body || {};
    if (!role || !text) {
      return res.status(400).json({ error: 'Missing role or text in request body' });
    }

    // Store the incoming user message
    const userEntry = { role, text, timestamp: new Date().toISOString() };
    shortTermMemory.push(userEntry);

    // Build messages array from shortTermMemory for the chat API
    // Convert stored entries to { role: 'user'|'assistant' , content }
    // Cap the number of messages sent to OpenAI to avoid huge contexts
    const MAX_MEMORY_MESSAGES = Number(process.env.MAX_MEMORY_MESSAGES || 40);
    const recent = shortTermMemory.slice(-MAX_MEMORY_MESSAGES);
    const messages = recent.map(e => ({
      role: e.role === 'assistant' ? 'assistant' : 'user',
      content: e.text,
    }));

    // Call OpenAI Chat Completions (v1) via fetch - keeps dependencies minimal.
    // Use AbortController to enforce a timeout for the upstream OpenAI call
    const controller = new AbortController();
    const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 10000); // 10s default
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages,
        max_tokens: Number(process.env.OPENAI_MAX_TOKENS || 512),
        temperature: Number(process.env.OPENAI_TEMPERATURE || 0.7),
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('OpenAI API error:', resp.status, errText);
      return res.status(502).json({ error: 'OpenAI API error', status: resp.status, detail: errText });
    }

  clearTimeout(timeout);
  const data = await resp.json();
    // Extract assistant reply
    const assistantMessage = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      ? data.choices[0].message.content
      : (data.choices && data.choices[0] && data.choices[0].text) || '';

    // Save assistant reply to memory and cap total memory size
    const assistantEntry = { role: 'assistant', text: assistantMessage, timestamp: new Date().toISOString() };
    shortTermMemory.push(assistantEntry);
    const MAX_TOTAL_MEMORY = Number(process.env.MAX_TOTAL_MEMORY || 200);
    if (shortTermMemory.length > MAX_TOTAL_MEMORY) {
      // drop oldest
      shortTermMemory.splice(0, shortTermMemory.length - MAX_TOTAL_MEMORY);
    }

    return res.json({ status: 'ok', reply: assistantMessage, raw: data });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('OpenAI request timed out');
      return res.status(504).json({ error: 'OpenAI request timed out' });
    }
    console.error('Chat endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// rate limiter applied above near its declaration

app.get('/memory', (req, res) => {
  return res.json({ memory: shortTermMemory });
});

app.delete('/memory', (req, res) => {
  shortTermMemory.length = 0;
  return res.json({ status: 'cleared' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Companion AI server listening on port ${PORT}`);
});
