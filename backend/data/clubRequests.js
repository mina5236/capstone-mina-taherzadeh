const db = require('../db/connection')

const SELECT_REQUEST = `
  SELECT r.request_id, r.user_id, r.proposed_club_name, r.club_description,
         r.contact_email, r.purpose_explanation, r.status, r.submitted_at,
         u.full_name, u.student_id
  FROM club_requests r
  JOIN users u ON u.user_id = r.user_id
`

function toRequest(row) {
  if (!row) return null

  return {
    id: row.request_id,
    userId: row.user_id,
    clubName: row.proposed_club_name,
    description: row.club_description,
    contactEmail: row.contact_email,
    purpose: row.purpose_explanation,
    status: row.status,
    submittedAt: row.submitted_at,
    requesterName: row.full_name,
    studentId: row.student_id
  }
}

function findById(requestId) {
  return toRequest(db.prepare(`${SELECT_REQUEST} WHERE r.request_id = ?`).get(requestId))
}

function listByUser(userId) {
  return db
    .prepare(`${SELECT_REQUEST} WHERE r.user_id = ? ORDER BY r.submitted_at DESC, r.request_id DESC`)
    .all(userId)
    .map(toRequest)
}

function listPending() {
  return db
    .prepare(`${SELECT_REQUEST} WHERE r.status = 'pending' ORDER BY r.submitted_at, r.request_id`)
    .all()
    .map(toRequest)
}

// One pending request per student, and no duplicate club names.
const submitRequest = db.transaction((userId, { clubName, description, contactEmail, purpose }) => {
  const pending = db
    .prepare("SELECT 1 FROM club_requests WHERE user_id = ? AND status = 'pending'")
    .get(userId)

  if (pending) return { error: 'ALREADY_PENDING' }

  const nameTaken = db
    .prepare(
      `SELECT 1 FROM clubs WHERE lower(club_name) = lower(?)
       UNION
       SELECT 1 FROM club_requests WHERE status = 'pending' AND lower(proposed_club_name) = lower(?)`
    )
    .get(clubName, clubName)

  if (nameTaken) return { error: 'NAME_TAKEN' }

  const result = db
    .prepare(
      `INSERT INTO club_requests
         (user_id, proposed_club_name, club_description, contact_email, purpose_explanation, submitted_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))`
    )
    .run(userId, clubName, description, contactEmail, purpose)

  return { request: findById(result.lastInsertRowid) }
})

// Approving creates the club and makes the requester a club admin.
const approveRequest = db.transaction((requestId) => {
  const request = db.prepare('SELECT * FROM club_requests WHERE request_id = ?').get(requestId)

  if (!request) return { error: 'NOT_FOUND' }
  if (request.status !== 'pending') return { error: 'ALREADY_REVIEWED' }

  const nameTaken = db
    .prepare('SELECT 1 FROM clubs WHERE lower(club_name) = lower(?)')
    .get(request.proposed_club_name)

  if (nameTaken) return { error: 'NAME_TAKEN' }

  db.prepare("INSERT INTO clubs (admin_user_id, club_name, description, status) VALUES (?, ?, ?, 'approved')").run(
    request.user_id,
    request.proposed_club_name,
    request.club_description
  )
  db.prepare("UPDATE club_requests SET status = 'approved' WHERE request_id = ?").run(requestId)
  db.prepare("UPDATE users SET role = 'club_admin' WHERE user_id = ? AND role = 'student'").run(request.user_id)

  return { ok: true }
})

const rejectRequest = db.transaction((requestId) => {
  const request = db.prepare('SELECT status FROM club_requests WHERE request_id = ?').get(requestId)

  if (!request) return { error: 'NOT_FOUND' }
  if (request.status !== 'pending') return { error: 'ALREADY_REVIEWED' }

  db.prepare("UPDATE club_requests SET status = 'rejected' WHERE request_id = ?").run(requestId)

  return { ok: true }
})

module.exports = { listByUser, listPending, submitRequest, approveRequest, rejectRequest }