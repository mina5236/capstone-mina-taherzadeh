const db = require('../db/connection')

// Only events from approved clubs are shown to students.
const SELECT_EVENT = `
  SELECT e.event_id, e.title, e.description, e.event_date, e.location,
         e.max_capacity, e.current_count, c.club_name,
         EXISTS (
           SELECT 1 FROM event_registrations r
           WHERE r.event_id = e.event_id AND r.user_id = ? AND r.status = 'registered'
         ) AS is_registered
  FROM events e
  JOIN clubs c ON c.club_id = e.club_id
  WHERE c.status = 'approved'
`

function toEvent(row) {
  if (!row) return null

  return {
    id: row.event_id,
    title: row.title,
    description: row.description,
    date: row.event_date,
    location: row.location,
    clubName: row.club_name,
    maxCapacity: row.max_capacity,
    currentCount: row.current_count,
    isRegistered: !!row.is_registered
  }
}

function listEvents(userId) {
  return db.prepare(`${SELECT_EVENT} ORDER BY e.event_date`).all(userId).map(toEvent)
}

function findEventById(eventId, userId) {
  return toEvent(db.prepare(`${SELECT_EVENT} AND e.event_id = ?`).get(userId, eventId))
}

module.exports = { listEvents, findEventById }