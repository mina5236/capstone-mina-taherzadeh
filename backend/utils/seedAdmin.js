const db = require('../db/connection')
const users = require('../data/users')
const { hashPassword } = require('./password')


// Demo data for the deployed site. Render's free disk is wiped on every restart/redeploy,
// so this refills the database whenever it is empty. Turn on with SEED_DEMO_DATA=true.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234'

function seedDemoData(admin) {
  if (process.env.SEED_DEMO_DATA !== 'true') return
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 1) return

  const setRole = db.prepare('UPDATE users SET role = ? WHERE user_id = ?')
  const make = (fullName, email, studentId, role) => {
    const user = users.insertUser({
      fullName,
      email,
      studentId,
      passwordHash: hashPassword(DEMO_PASSWORD),
    })
    if (role !== 'student') setRole.run(role, user.id)
    return user
  }

  const mina = make('Mina Tz', 'mina.demo@example.com', '89898989', 'student')
  make('Sara', 'sara.demo@example.com', '98989898', 'student')
  make('Mahsa', 'mahsa.demo@example.com', '23232323', 'student')
  make('Tara', 'tara.demo@example.com', '23232322', 'student')
  make('Maral', 'maral.demo@example.com', '12345678', 'platform_admin')
  const shahin = make('Shahin', 'shahin.demo@example.com', '92929292', 'club_admin')
  make('Yalda', 'yalda.demo@example.com', '99999999', 'student')
  make('Shania', 'shania.demo@example.com', '34343434', 'student')

  const addClub = db.prepare(
    'INSERT INTO clubs (admin_user_id, club_name, description, status) VALUES (?, ?, ?, ?)'
  )
  const coding = addClub.run(mina.id, 'Coding Club', 'Workshops, hackathons and coding nights.', 'approved')
  const hiking = addClub.run(shahin.id, 'Outdoors Club', 'Hikes and trips around Thunder Bay.', 'approved')
  addClub.run(mina.id, 'Pending Club (sample)', 'An inactive club used for testing.', 'inactive')

  const addEvent = db.prepare(
    "INSERT INTO events (club_id, title, description, event_date, location, max_capacity) VALUES (?, ?, ?, datetime('now', ?), ?, ?)"
  )
  addEvent.run(coding.lastInsertRowid, 'React Workshop', 'Hands-on intro to React.', '+5 days', 'Room B204', 30)
  addEvent.run(coding.lastInsertRowid, 'Hackathon Night', 'Build something in one night.', '+9 days', 'Main Hall', 100)
  addEvent.run(coding.lastInsertRowid, 'Full Event', 'Already at capacity.', '+12 days', 'Studio 2', 1)
  addEvent.run(hiking.lastInsertRowid, 'Sleeping Giant Hike', 'Group hike, all levels welcome.', '+14 days', 'Trailhead parking lot', 20)

  const addRequest = db.prepare(
    'INSERT INTO club_requests (user_id, proposed_club_name, club_description, contact_email, purpose_explanation) VALUES (?, ?, ?, ?, ?)'
  )
  addRequest.run(mina.id, 'Chess Club', 'Weekly chess meetups.', 'mina.demo@example.com', 'Bring chess players together.')
  addRequest.run(shahin.id, 'Photography Club', 'Photo walks and critiques.', 'shahin.demo@example.com', 'Share and improve photography skills.')

  console.log('Seeded demo users, clubs, events and club requests')
}

// Runs at every server start.
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

  seedDemoData(admin)

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