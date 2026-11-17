const db = require('../db/connection')

const SELECT_MANAGED = `
  SELECT e.event_id, e.club_id, c.club_name, e.title, e.description,
         e.event_date, e.location, e.max_capacity, e.current_count
  FROM events e
  JOIN clubs c ON c.club_id = e.club_id
`

function toManagedEvent(row) {
  return {
    id: row.event_id,
    clubId: row.club_id,
    clubName: row.club_name,
    title: row.title,
    description: row.description,
    date: row.event_date,
    location: row.location,
    maxCapacity: row.max_capacity,
    currentCount: row.current_count
  }
}

// Active clubs this user runs (used by the "create event" form).
function listClubsByAdmin(userId) {
  return db
    .prepare("SELECT club_id, club_name FROM clubs WHERE admin_user_id = ? AND status = 'approved' ORDER BY club_name")
    .all(userId)
    .map((row) => ({ id: row.club_id, name: row.club_name }))
}

// Every event of the clubs this user runs.
function listByAdmin(userId) {
  return db
    .prepare(`${SELECT_MANAGED} WHERE c.admin_user_id = ? ORDER BY e.event_date`)
    .all(userId)
    .map(toManagedEvent)
}

// One event, but only if it belongs to a club this user runs.
function findOwned(eventId, userId) {
  const row = db.prepare(`${SELECT_MANAGED} WHERE e.event_id = ? AND c.admin_user_id = ?`).get(eventId, userId)
  return row ? toManagedEvent(row) : null
}

// F4.1: create an event for one of the user's active clubs.
function createEvent(userId, { clubId, title, description, eventDate, location, maxCapacity }) {
  const club = db
    .prepare("SELECT club_id FROM clubs WHERE club_id = ? AND admin_user_id = ? AND status = 'approved'")
    .get(clubId, userId)

  if (!club) return { error: 'CLUB_NOT_FOUND' }

  const result = db
    .prepare('INSERT INTO events (club_id, title, description, event_date, location, max_capacity) VALUES (?, ?, ?, ?, ?, ?)')
    .run(club.club_id, title, description, eventDate, location, maxCapacity)

  return { event: findOwned(Number(result.lastInsertRowid), userId) }
}

// F4.2: edit an event. Capacity can't go below the students already registered.
const updateEvent = db.transaction((eventId, userId, { title, description, eventDate, location, maxCapacity }) => {
  const event = findOwned(eventId, userId)

  if (!event) return { error: 'NOT_FOUND' }
  if (maxCapacity < event.currentCount) {
    return { error: 'CAPACITY_TOO_LOW', registered: event.currentCount }
  }

  db.prepare('UPDATE events SET title = ?, description = ?, event_date = ?, location = ?, max_capacity = ? WHERE event_id = ?')
    .run(title, description, eventDate, location, maxCapacity, eventId)

  return { event: findOwned(eventId, userId) }
})

// F4.3: delete an event (its registrations are deleted with it).
function deleteEvent(eventId, userId) {
  if (!findOwned(eventId, userId)) return { error: 'NOT_FOUND' }

  db.prepare('DELETE FROM events WHERE event_id = ?').run(eventId)
  return { ok: true }
}

// F4.4: students registered for one of the user's events.
function listRegistrations(eventId, userId) {
  const event = findOwned(eventId, userId)

  if (!event) return null

  const students = db
    .prepare(
      `SELECT u.full_name, u.student_id, u.email, r.registered_at
       FROM event_registrations r
       JOIN users u ON u.user_id = r.user_id
       WHERE r.event_id = ? AND r.status = 'registered'
       ORDER BY r.registered_at, r.registration_id`
    )
    .all(eventId)
    .map((row) => ({
      fullName: row.full_name,
      studentId: row.student_id,
      email: row.email,
      registeredAt: row.registered_at
    }))

  return { event, students }
}

module.exports = {
  listClubsByAdmin,
  listByAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
  listRegistrations
}