const db = require('../db/connection')

// "approved" means the club is active. "inactive" means an admin switched it off.
const SELECT_CLUB = `
  SELECT c.club_id, c.club_name, c.description, c.status, c.created_at,
         u.full_name AS admin_name, u.email AS admin_email
  FROM clubs c
  JOIN users u ON u.user_id = c.admin_user_id
`

function toClub(row) {
  return {
    id: row.club_id,
    name: row.club_name,
    description: row.description,
    status: row.status,
    adminName: row.admin_name,
    adminEmail: row.admin_email,
    createdAt: row.created_at
  }
}

function listAll() {
  return db.prepare(`${SELECT_CLUB} ORDER BY c.created_at DESC, c.club_id DESC`).all().map(toClub)
}

function findById(id) {
  const row = db.prepare(`${SELECT_CLUB} WHERE c.club_id = ?`).get(id)
  return row ? toClub(row) : null
}

function setStatus(id, status) {
  db.prepare('UPDATE clubs SET status = ? WHERE club_id = ?').run(status, id)
  return findById(id)
}

function countActive() {
  return db.prepare("SELECT COUNT(*) AS n FROM clubs WHERE status = 'approved'").get().n
}

module.exports = { listAll, findById, setStatus, countActive }