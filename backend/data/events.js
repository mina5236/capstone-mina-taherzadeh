const db = require('../db/connection')

// Selects event fields, the club name, whether this user is registered and whether they saved it.
// Only events of approved clubs appear
const SELECT_EVENT = `
  SELECT e.event_id, e.title, e.description, e.event_date, e.location,
         e.max_capacity, e.current_count, c.club_name,
         EXISTS (
           SELECT 1 FROM event_registrations r
           WHERE r.event_id = e.event_id AND r.user_id = ? AND r.status = 'registered'
         ) AS is_registered,
         EXISTS (
           SELECT 1 FROM saved_events s
           WHERE s.event_id = e.event_id AND s.user_id = ?
         ) AS is_saved
  FROM events e
  JOIN clubs c ON c.club_id = e.club_id
  WHERE c.status = 'approved'
`

//Renames database columns to what the page uses (maxCapacity, currentCount, isRegistered, isSaved)
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
    isRegistered: !!row.is_registered,
    isSaved: !!row.is_saved
  }
}

function listEvents(userId) {
  return db.prepare(`${SELECT_EVENT} ORDER BY e.event_date`).all(userId, userId).map(toEvent)
}

function findEventById(eventId, userId) {
  return toEvent(db.prepare(`${SELECT_EVENT} AND e.event_id = ?`).get(userId, userId, eventId))
}

module.exports = { listEvents, findEventById }