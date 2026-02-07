const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('clockbot.db');

// Enable foreign keys for time_logs data integrity
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    company_role TEXT,
    timezone TEXT DEFAULT 'UTC',
    join_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS time_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    project_id INTEGER,
    type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES profiles(discord_id),
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );
`);

module.exports = db;