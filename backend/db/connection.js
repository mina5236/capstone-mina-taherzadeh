const path = require('path')
const Database = require('better-sqlite3')

const db = new Database(path.join(__dirname, 'campusconnect.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Only the tables backed by real routes today. Clubs/Events/Registrations
// from the ERD get added once those features are actually built.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    student_id TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    profile_picture TEXT,
    last_login TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

module.exports = db
