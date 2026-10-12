const db = require('../db/connection')

function findEventsByUser(userId) {
  const rows = db
    .prepare(
      `SELECT e.event_id, e.title, e.event_date, e.location, c.club_name
       FROM event_registrations r
       JOIN events e ON e.event_id = r.event_id
       JOIN clubs c ON c.club_id = e.club_id
       WHERE r.user_id = ? AND r.status = 'registered'
       ORDER BY e.event_date`
    )
    .all(userId)

  return rows.map((row) => ({
    id: row.event_id,
    title: row.title,
    date: row.event_date,
    location: row.location,
    clubName: row.club_name
  }))
}

// A transaction keeps the registration row and current_count in sync,
// and stops two requests from filling the last seat at the same time.
const registerUser = db.transaction((userId, eventId) => {
  const event = db
    .prepare(
      `SELECT e.max_capacity, e.current_count
       FROM events e
       JOIN clubs c ON c.club_id = e.club_id
       WHERE e.event_id = ? AND c.status = 'approved'`
    )
    .get(eventId)

  if (!event) return { error: 'NOT_FOUND' }

  const existing = db
    .prepare('SELECT 1 FROM event_registrations WHERE user_id = ? AND event_id = ?')
    .get(userId, eventId)

  if (existing) return { error: 'ALREADY_REGISTERED' }
  if (event.current_count >= event.max_capacity) return { error: 'FULL' }

  db.prepare('INSERT INTO event_registrations (user_id, event_id) VALUES (?, ?)').run(userId, eventId)
  db.prepare('UPDATE events SET current_count = current_count + 1 WHERE event_id = ?').run(eventId)

  return { ok: true }
})

const cancelRegistration = db.transaction((userId, eventId) => {
  const result = db
    .prepare('DELETE FROM event_registrations WHERE user_id = ? AND event_id = ?')
    .run(userId, eventId)

  if (result.changes === 0) return { error: 'NOT_REGISTERED' }

  db.prepare('UPDATE events SET current_count = MAX(current_count - 1, 0) WHERE event_id = ?').run(eventId)

  return { ok: true }
})


module.exports = { findEventsByUser , registerUser, cancelRegistration  }