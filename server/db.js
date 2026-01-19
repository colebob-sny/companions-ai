const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// DB file under server/data
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'companions.db');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function init() {
  ensureDataDir();
  const db = new Database(DB_FILE);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS personalities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emotion TEXT,
      attitude TEXT,
      opinions TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      email TEXT,
      preferred_personality_id INTEGER,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed a couple of personalities if table empty
  const count = db.prepare('SELECT COUNT(1) as c FROM personalities').get().c;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO personalities (name, emotion, attitude, opinions) VALUES (?, ?, ?, ?)');
    insert.run('Friendly Teddy', 'warm, comforting', 'patient, encouraging', 'Believes in kindness and reassurance. Enjoys praise and gentle humor.');
    insert.run('Curious Owl', 'thoughtful, inquisitive', 'analytical, probing', 'Values facts and asks lots of questions. Prefers deep conversations.');
    insert.run('Snarky Raven', 'mischievous, dry', 'sarcastic, blunt', 'Has a sharp wit and often responds with sarcasm; playful but not cruel.');
  }

  return db;
}

// Helper wrappers
const db = init();

function getPersonalities() {
  return db.prepare('SELECT * FROM personalities ORDER BY id').all();
}

function getPersonality(id) {
  return db.prepare('SELECT * FROM personalities WHERE id = ?').get(id);
}

function createPersonality({ name, emotion, attitude, opinions }) {
  const info = db.prepare('INSERT INTO personalities (name, emotion, attitude, opinions) VALUES (?, ?, ?, ?)').run(name, emotion, attitude, opinions);
  return getPersonality(info.lastInsertRowid);
}

function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function createUser({ username, email, preferred_personality_id, metadata }) {
  const info = db.prepare('INSERT INTO users (username, email, preferred_personality_id, metadata) VALUES (?, ?, ?, ?)').run(username, email, preferred_personality_id || null, metadata ? JSON.stringify(metadata) : null);
  return getUser(info.lastInsertRowid);
}

function updateUser(id, fields) {
  // Build a small dynamic update for allowed fields
  const allowed = ['username', 'email', 'preferred_personality_id', 'metadata'];
  const setParts = [];
  const values = [];
  for (const k of allowed) {
    if (k in fields) {
      setParts.push(`${k} = ?`);
      if (k === 'metadata') values.push(fields[k] ? JSON.stringify(fields[k]) : null);
      else values.push(fields[k]);
    }
  }
  if (setParts.length === 0) return getUser(id);
  values.push(id);
  const stmt = db.prepare(`UPDATE users SET ${setParts.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getUser(id);
}

module.exports = {
  getPersonalities,
  getPersonality,
  createPersonality,
  getUser,
  createUser,
  updateUser,
};
