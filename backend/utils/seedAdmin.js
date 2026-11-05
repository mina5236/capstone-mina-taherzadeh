const db = require('../db/connection')
const users = require('../data/users')
const { hashPassword } = require('./password')

// Re-creates the demo data every time the server starts.
function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) return

  let admin = users.findByEmail(email)

  if (!admin) {
    admin = users.insertUser({
      fullName: 'Platform Admin',
      email,
      studentId: '00000001',
      passwordHash: hashPassword(password),
    })
    db.prepare("UPDATE users SET role = 'platform_admin' WHERE user_id = ?").run(admin.id)
    console.log(`Seeded platform admin ${email}`)
  }

  if (process.env.SEED_DEMO_EVENTS !== 'true') return
  if (db.prepare('SELECT COUNT(*) AS n FROM clubs').get().n > 0) return

  const club = db
    .prepare("INSERT INTO clubs (admin_user_id, club_name, description, status) VALUES (?, ?, ?, 'approved')")
    .run(admin.id, 'Campus Welcome Club', 'Official club for campus-wide welcome events.')

  const addEvent = db.prepare(
    "INSERT INTO events (club_id, title, description, event_date, location, max_capacity) VALUES (?, ?, ?, datetime('now', ?), ?, ?)"
  )
  addEvent.run(club.lastInsertRowid, 'Welcome Week Mixer', 'Meet clubs and make new friends.', '+7 days', 'Student Centre, Main Hall', 50)
  addEvent.run(club.lastInsertRowid, 'Study Skills Workshop', 'Tips for exams and time management.', '+10 days', 'Library Room 204', 20)
  addEvent.run(club.lastInsertRowid, 'Game Night', 'Board games and snacks.', '+14 days', 'Residence Common Room', 2)

  console.log('Seeded demo club and events')
}

module.exports = { seedAdmin }