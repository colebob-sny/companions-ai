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

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
    const messages = shortTermMemory.map(e => ({
      role: e.role === 'assistant' ? 'assistant' : 'user',
      content: e.text,
    }));

    // Call OpenAI Chat Completions (v1) via fetch - keeps dependencies minimal.
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('OpenAI API error:', resp.status, errText);
      return res.status(502).json({ error: 'OpenAI API error', status: resp.status, detail: errText });
    }

    const data = await resp.json();
    // Extract assistant reply
    const assistantMessage = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      ? data.choices[0].message.content
      : (data.choices && data.choices[0] && data.choices[0].text) || '';

    // Save assistant reply to memory
    const assistantEntry = { role: 'assistant', text: assistantMessage, timestamp: new Date().toISOString() };
    shortTermMemory.push(assistantEntry);

    return res.json({ status: 'ok', reply: assistantMessage, raw: data });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

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
