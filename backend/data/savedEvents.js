const db = require('../db/connection')

// F5.4: add an event to the user's wish list. Only events of approved clubs can be saved.
function saveEvent(userId, eventId) {
  const event = db
    .prepare(
      "SELECT e.event_id FROM events e JOIN clubs c ON c.club_id = e.club_id WHERE e.event_id = ? AND c.status = 'approved'"
    )
    .get(eventId)

  if (!event) return { error: 'NOT_FOUND' }

  // UNIQUE (user_id, event_id) means a second save changes nothing.
  const result = db.prepare('INSERT OR IGNORE INTO saved_events (user_id, event_id) VALUES (?, ?)').run(userId, eventId)

  return result.changes === 0 ? { error: 'ALREADY_SAVED' } : { ok: true }
}

// F5.4: remove an event from the wish list.
function unsaveEvent(userId, eventId) {
  const result = db.prepare('DELETE FROM saved_events WHERE user_id = ? AND event_id = ?').run(userId, eventId)

  return result.changes === 0 ? { error: 'NOT_SAVED' } : { ok: true }
}

module.exports = { saveEvent, unsaveEvent }