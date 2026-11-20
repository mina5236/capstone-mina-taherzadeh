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

// F5.1: active clubs that students can browse, with how many events each has.
function listApproved() {
  return db
    .prepare(
      `SELECT c.club_id, c.club_name, c.description,
              (SELECT COUNT(*) FROM events e WHERE e.club_id = c.club_id) AS event_count
       FROM clubs c
       WHERE c.status = 'approved'
       ORDER BY c.club_name COLLATE NOCASE`
    )
    .all()
    .map((row) => ({
      id: row.club_id,
      name: row.club_name,
      description: row.description,
      eventCount: row.event_count
    }))
}

// F5.1: one active club with its events (null if the club doesn't exist or is deactivated).
function findApproved(id) {
  const club = db
    .prepare("SELECT club_id, club_name, description FROM clubs WHERE club_id = ? AND status = 'approved'")
    .get(id)

  if (!club) return null

  const events = db
    .prepare(
      'SELECT event_id, title, event_date, location, max_capacity, current_count FROM events WHERE club_id = ? ORDER BY event_date'
    )
    .all(id)
    .map((row) => ({
      id: row.event_id,
      title: row.title,
      date: row.event_date,
      location: row.location,
      maxCapacity: row.max_capacity,
      currentCount: row.current_count
    }))

  return { id: club.club_id, name: club.club_name, description: club.description, events }
}

module.exports = { listAll, findById, setStatus, countActive, listApproved, findApproved }