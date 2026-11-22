process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'jest-session-secret-with-at-least-32-characters'

const request = require('supertest')
const app = require('./testApp')
const db = require('../db/connection')
const users = require('../data/users')
const { hashPassword } = require('../utils/password')
const { createSessionToken } = require('../utils/sessionToken')

let counter = 0

function makePerson(role = 'student') {
  counter += 1
  const user = users.insertUser({
    fullName: `Student ${counter}`,
    email: `s${counter}@test.com`,
    studentId: String(counter).padStart(8, '0'),
    passwordHash: hashPassword('Password1'),
  })
  if (role !== 'student') {
    db.prepare('UPDATE users SET role = ? WHERE user_id = ?').run(role, user.id)
  }
  return { id: user.id, email: user.email, auth: { Authorization: `Bearer ${createSessionToken(user)}` } }
}

function makeClub(ownerId, name = 'Chess Club') {
  return Number(db.prepare('INSERT INTO clubs (admin_user_id, club_name) VALUES (?, ?)').run(ownerId, name).lastInsertRowid)
}

function makeEvent(clubId) {
  return Number(
    db
      .prepare('INSERT INTO events (club_id, title, event_date, location, max_capacity) VALUES (?, ?, ?, ?, ?)')
      .run(clubId, 'Welcome Week', '2026-11-20 10:00:00', 'Main Hall', 50).lastInsertRowid
  )
}

const isActive = (id) => db.prepare('SELECT is_active FROM users WHERE user_id = ?').get(id).is_active === 1
const clubStatus = (id) => db.prepare('SELECT status FROM clubs WHERE club_id = ?').get(id).status

beforeEach(() => {
  db.exec(`
    DELETE FROM event_registrations;
    DELETE FROM saved_events;
    DELETE FROM events;
    DELETE FROM club_requests;
    DELETE FROM clubs;
    DELETE FROM users;
  `)
})

afterAll(() => {
  db.close()
})

describe('user deactivation (F3.4)', () => {
  test('U21: deactivating a valid user ID switches the account off', async () => {
    const admin = makePerson('platform_admin')
    const student = makePerson()

    await request(app).post(`/admin/users/${student.id}/deactivate`).set(admin.auth)

    expect(isActive(student.id)).toBe(false)
  })

  test('A12: the deactivate endpoint returns 200 and the deactivated user', async () => {
    const admin = makePerson('platform_admin')
    const student = makePerson()

    const response = await request(app).post(`/admin/users/${student.id}/deactivate`).set(admin.auth)

    expect(response.status).toBe(200)
    expect(response.body.message).toMatch(/deactivated/i)
    expect(response.body.user).toMatchObject({ id: student.id, isActive: false })
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  test('an admin can reactivate a deactivated account', async () => {
    const admin = makePerson('platform_admin')
    const student = makePerson()
    await request(app).post(`/admin/users/${student.id}/deactivate`).set(admin.auth)

    const response = await request(app).post(`/admin/users/${student.id}/reactivate`).set(admin.auth)

    expect(response.status).toBe(200)
    expect(isActive(student.id)).toBe(true)
  })

  test('a deactivated user cannot log in, and a wrong password still gets the normal error', async () => {
    const admin = makePerson('platform_admin')
    const student = makePerson()
    await request(app).post(`/admin/users/${student.id}/deactivate`).set(admin.auth)

    const blocked = await request(app).post('/login').send({ email: student.email, password: 'Password1' })
    const wrongPassword = await request(app).post('/login').send({ email: student.email, password: 'WrongPass1' })

    expect(blocked.status).toBe(403)
    expect(blocked.body.message).toMatch(/deactivated/i)
    expect(blocked.body.token).toBeUndefined()
    expect(wrongPassword.status).toBe(401)
  })

  test('the open session of a deactivated user stops working immediately', async () => {
    const admin = makePerson('platform_admin')
    const student = makePerson()
    const before = await request(app).get('/club-requests/mine').set(student.auth)

    await request(app).post(`/admin/users/${student.id}/deactivate`).set(admin.auth)
    const after = await request(app).get('/club-requests/mine').set(student.auth)

    expect(before.status).toBe(200)
    expect(after.status).toBe(401)
  })

  test('an admin cannot deactivate themselves or another administrator', async () => {
    const admin = makePerson('platform_admin')
    const otherAdmin = makePerson('platform_admin')

    const self = await request(app).post(`/admin/users/${admin.id}/deactivate`).set(admin.auth)
    const other = await request(app).post(`/admin/users/${otherAdmin.id}/deactivate`).set(admin.auth)

    expect(self.status).toBe(400)
    expect(other.status).toBe(403)
    expect(isActive(admin.id)).toBe(true)
    expect(isActive(otherAdmin.id)).toBe(true)
  })

  test('unknown or invalid ids return 404 and a second deactivation returns 409', async () => {
    const admin = makePerson('platform_admin')
    const student = makePerson()

    const unknown = await request(app).post('/admin/users/9999/deactivate').set(admin.auth)
    const invalid = await request(app).post('/admin/users/abc/deactivate').set(admin.auth)
    await request(app).post(`/admin/users/${student.id}/deactivate`).set(admin.auth)
    const again = await request(app).post(`/admin/users/${student.id}/deactivate`).set(admin.auth)

    expect(unknown.status).toBe(404)
    expect(invalid.status).toBe(404)
    expect(again.status).toBe(409)
  })

  test('the user list shows every account without password hashes', async () => {
    const admin = makePerson('platform_admin')
    makePerson()

    const response = await request(app).get('/admin/users').set(admin.auth)

    expect(response.status).toBe(200)
    expect(response.body.users).toHaveLength(2)
    expect(response.body.users[0].passwordHash).toBeUndefined()
  })
})

describe('admin access protection', () => {
  const adminEndpoints = [
    ['get', '/admin/stats'],
    ['get', '/admin/users'],
    ['post', '/admin/users/1/deactivate'],
    ['get', '/admin/clubs'],
    ['post', '/admin/clubs/1/deactivate'],
    ['get', '/admin/club-requests'],
  ]

  test('a student gets 403 on every admin endpoint', async () => {
    const student = makePerson()

    for (const [method, url] of adminEndpoints) {
      const response = await request(app)[method](url).set(student.auth)
      expect(response.status).toBe(403)
    }
  })

  test('no token gets 401 on every admin endpoint', async () => {
    for (const [method, url] of adminEndpoints) {
      const response = await request(app)[method](url)
      expect(response.status).toBe(401)
    }
  })

  test('a deactivated administrator is locked out (401)', async () => {
    const admin = makePerson('platform_admin')
    db.prepare('UPDATE users SET is_active = 0 WHERE user_id = ?').run(admin.id)

    const response = await request(app).get('/admin/stats').set(admin.auth)

    expect(response.status).toBe(401)
  })
})

describe('admin dashboard (F3.5)', () => {
  test('shows the number of active clubs and student users', async () => {
    const admin = makePerson('platform_admin')
    const owner = makePerson()
    makePerson()
    makePerson('club_admin')
    makeClub(owner.id, 'Chess Club')
    db.prepare("INSERT INTO clubs (admin_user_id, club_name, status) VALUES (?, ?, 'inactive')").run(owner.id, 'Old Club')

    const response = await request(app).get('/admin/stats').set(admin.auth)

    expect(response.status).toBe(200)
    expect(response.body.stats).toEqual({ activeClubs: 1, studentUsers: 3 })
  })
})

describe('club administration tools', () => {
  test('lists every club with its status and club admin', async () => {
    const admin = makePerson('platform_admin')
    const owner = makePerson()
    makeClub(owner.id)

    const response = await request(app).get('/admin/clubs').set(admin.auth)

    expect(response.status).toBe(200)
    expect(response.body.clubs[0]).toMatchObject({ name: 'Chess Club', status: 'approved', adminEmail: owner.email })
  })

  test('deactivating a club hides its events from students, and reactivating shows them again', async () => {
    const admin = makePerson('platform_admin')
    const student = makePerson()
    const clubId = makeClub(makePerson().id)
    makeEvent(clubId)

    const visible = await request(app).get('/events').set(student.auth)
    const deactivated = await request(app).post(`/admin/clubs/${clubId}/deactivate`).set(admin.auth)
    const statusAfterDeactivate = clubStatus(clubId)
    const hidden = await request(app).get('/events').set(student.auth)
    const reactivated = await request(app).post(`/admin/clubs/${clubId}/reactivate`).set(admin.auth)
    const statusAfterReactivate = clubStatus(clubId)
    const visibleAgain = await request(app).get('/events').set(student.auth)

    expect(visible.body.events).toHaveLength(1)
    expect(deactivated.status).toBe(200)
    expect(statusAfterDeactivate).toBe('inactive')
    expect(hidden.body.events).toHaveLength(0)
    expect(reactivated.status).toBe(200)
    expect(statusAfterReactivate).toBe('approved')
    expect(visibleAgain.body.events).toHaveLength(1)
  })

  test('students cannot register for the events of a deactivated club', async () => {
    const admin = makePerson('platform_admin')
    const student = makePerson()
    const clubId = makeClub(makePerson().id)
    const eventId = makeEvent(clubId)
    await request(app).post(`/admin/clubs/${clubId}/deactivate`).set(admin.auth)

    const response = await request(app).post(`/events/${eventId}/register`).set(student.auth)

    expect(response.status).toBe(404)
  })

  test('unknown club returns 404 and a second deactivation returns 409', async () => {
    const admin = makePerson('platform_admin')
    const clubId = makeClub(makePerson().id)

    const unknown = await request(app).post('/admin/clubs/9999/deactivate').set(admin.auth)
    await request(app).post(`/admin/clubs/${clubId}/deactivate`).set(admin.auth)
    const again = await request(app).post(`/admin/clubs/${clubId}/deactivate`).set(admin.auth)

    expect(unknown.status).toBe(404)
    expect(again.status).toBe(409)
  })
})