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
