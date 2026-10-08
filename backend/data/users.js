const db = require('../db/connection')

function toUser(row) {
  if (!row) return null

  return {
    id: row.user_id,
    fullName: row.full_name,
    email: row.email,
    studentId: row.student_id,
    passwordHash: row.password_hash,
    role: row.role,
    profilePictureUrl: row.profile_picture,
    isActive: !!row.is_active,
    createdAt: row.created_at
  }
}

function findByEmail(email) {
  return toUser(db.prepare('SELECT * FROM users WHERE email = ?').get(email))
}

function findByStudentId(studentId) {
  return toUser(db.prepare('SELECT * FROM users WHERE student_id = ?').get(studentId))
}

function findById(id) {
  return toUser(db.prepare('SELECT * FROM users WHERE user_id = ?').get(id))
}

function insertUser({ fullName, email, studentId, passwordHash }) {
  const result = db
    .prepare(
      "INSERT INTO users (full_name, email, student_id, password_hash, created_at) VALUES (?, ?, ?, ?, datetime('now', 'localtime'))"
    )
    .run(fullName, email, studentId, passwordHash)

  return findById(result.lastInsertRowid)
}

function updateLastLogin(id) {
  db.prepare("UPDATE users SET last_login = datetime('now', 'localtime') WHERE user_id = ?").run(id)
}

function updateUser(id, { fullName, email, passwordHash }) {
  if (fullName !== undefined) {
    db.prepare('UPDATE users SET full_name = ? WHERE user_id = ?').run(fullName, id)
  }
  if (email !== undefined) {
    db.prepare('UPDATE users SET email = ? WHERE user_id = ?').run(email, id)
  }
  if (passwordHash !== undefined) {
    db.prepare('UPDATE users SET password_hash = ? WHERE user_id = ?').run(passwordHash, id)
  }

  return findById(id)
}

function updatePasswordIfUnchanged(id, currentPasswordHash, newPasswordHash) {
  const result = db
    .prepare('UPDATE users SET password_hash = ? WHERE user_id = ? AND password_hash = ?')
    .run(newPasswordHash, id, currentPasswordHash)

  return result.changes === 1
}

module.exports = {
  findByEmail,
  findByStudentId,
  findById,
  insertUser,
  updateLastLogin,
  updateUser,
  updatePasswordIfUnchanged,
}
