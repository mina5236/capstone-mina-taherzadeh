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

module.exports = { findEventsByUser }