process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'jest-session-secret-with-at-least-32-characters'

const request = require('supertest')
const app = require('./testApp')
const db = require('../db/connection')
const users = require('../data/users')
const { createSessionToken } = require('../utils/sessionToken')

let counter = 0

function makePerson(role = 'student') {
  counter += 1
  const user = users.insertUser({
    fullName: `Student ${counter}`,
    email: `s${counter}@test.com`,
    studentId: String(counter).padStart(8, '0'),
    passwordHash: 'hash',
  })
  if (role !== 'student') {
    db.prepare('UPDATE users SET role = ? WHERE user_id = ?').run(role, user.id)
  }
  return { id: user.id, auth: { Authorization: `Bearer ${createSessionToken(user)}` } }
}

const validForm = {
  clubName: 'Chess Club',
  description: 'A friendly club for chess players of every skill level.',
  contactEmail: 'Chess@Test.com',
  purpose: 'Weekly games, tournaments and beginner lessons.',
}

const submit = (person, form = validForm) => request(app).post('/club-requests').set(person.auth).send(form)

beforeEach(() => {
  db.exec('DELETE FROM club_requests; DELETE FROM clubs; DELETE FROM users;')
})

afterAll(() => {
  db.close()
})

describe('submitting a club request', () => {
  test('U19: a valid club request is saved as pending', async () => {
    const student = makePerson()

    await submit(student)

    const row = db.prepare('SELECT * FROM club_requests WHERE user_id = ?').get(student.id)
    expect(row).toMatchObject({
      proposed_club_name: 'Chess Club',
      contact_email: 'chess@test.com',
      status: 'pending',
    })
  })

  test('A10: submitting a club request returns HTTP 201 with the saved request', async () => {
    const response = await submit(makePerson())

    expect(response.status).toBe(201)
    expect(response.body.message).toMatch(/submitted/i)
    expect(response.body.request).toMatchObject({ clubName: 'Chess Club', status: 'pending' })
    expect(response.body.request.studentId).toMatch(/^\d{8}$/)
  })

  test('rejects incomplete or invalid forms', async () => {
    const student = makePerson()
    const badForms = [
      { ...validForm, clubName: 'ab' },
      { ...validForm, description: 'too short' },
      { ...validForm, contactEmail: 'chess@' },
      { ...validForm, purpose: '' },
    ]

    for (const form of badForms) {
      const response = await submit(student, form)
      expect(response.status).toBe(400)
    }
    expect(db.prepare('SELECT COUNT(*) AS n FROM club_requests').get().n).toBe(0)
  })

  test('requires a login token', async () => {
    const response = await request(app).post('/club-requests').send(validForm)

    expect(response.status).toBe(401)
  })

  test('a student cannot have two pending requests', async () => {
    const student = makePerson()
    await submit(student)

    const second = await submit(student, { ...validForm, clubName: 'Robotics Club' })

    expect(second.status).toBe(409)
  })

  test('a club name that is already requested is blocked, ignoring upper/lower case', async () => {
    await submit(makePerson())

    const second = await submit(makePerson(), { ...validForm, clubName: 'CHESS club' })

    expect(second.status).toBe(409)
  })

  test('a student can see their own requests', async () => {
    const student = makePerson()
    await submit(student)

    const response = await request(app).get('/club-requests/mine').set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.requests).toHaveLength(1)
  })
})

describe('reviewing club requests', () => {
  test('U20: approving a request creates the club and makes the student a club admin', async () => {
    const student = makePerson()
    const admin = makePerson('platform_admin')
    const { body } = await submit(student)

    await request(app).post(`/admin/club-requests/${body.request.id}/approve`).set(admin.auth)

    expect(db.prepare('SELECT * FROM clubs WHERE club_name = ?').get('Chess Club')).toMatchObject({
      admin_user_id: student.id,
      status: 'approved',
    })
    expect(users.findById(student.id).role).toBe('club_admin')
    expect(db.prepare('SELECT status FROM club_requests WHERE request_id = ?').get(body.request.id).status).toBe('approved')
  })

  test('A11: approving a request returns HTTP 200 and the club becomes active', async () => {
    const admin = makePerson('platform_admin')
    const { body } = await submit(makePerson())

    const response = await request(app).post(`/admin/club-requests/${body.request.id}/approve`).set(admin.auth)

    expect(response.status).toBe(200)
    expect(response.body.message).toMatch(/approved/i)
  })

  test('rejecting a request creates no club and keeps the student role', async () => {
    const student = makePerson()
    const admin = makePerson('platform_admin')
    const { body } = await submit(student)

    const response = await request(app).post(`/admin/club-requests/${body.request.id}/reject`).set(admin.auth)

    expect(response.status).toBe(200)
    expect(db.prepare('SELECT COUNT(*) AS n FROM clubs').get().n).toBe(0)
    expect(users.findById(student.id).role).toBe('student')
  })

  test('a request that was already reviewed cannot be reviewed again', async () => {
    const admin = makePerson('platform_admin')
    const { body } = await submit(makePerson())
    await request(app).post(`/admin/club-requests/${body.request.id}/approve`).set(admin.auth)

    const again = await request(app).post(`/admin/club-requests/${body.request.id}/reject`).set(admin.auth)

    expect(again.status).toBe(409)
    expect(db.prepare('SELECT COUNT(*) AS n FROM clubs').get().n).toBe(1)
  })

  test('an unknown request id returns 404', async () => {
    const response = await request(app).post('/admin/club-requests/9999/approve').set(makePerson('platform_admin').auth)

    expect(response.status).toBe(404)
  })

  test('a student cannot review requests (403) and no token is rejected (401)', async () => {
    const { body } = await submit(makePerson())

    const asStudent = await request(app).post(`/admin/club-requests/${body.request.id}/approve`).set(makePerson().auth)
    const noToken = await request(app).post(`/admin/club-requests/${body.request.id}/approve`)

    expect(asStudent.status).toBe(403)
    expect(noToken.status).toBe(401)
  })

  test('the admin list shows only pending requests', async () => {
    const admin = makePerson('platform_admin')
    const first = await submit(makePerson())
    await submit(makePerson(), { ...validForm, clubName: 'Robotics Club' })
    await request(app).post(`/admin/club-requests/${first.body.request.id}/approve`).set(admin.auth)

    const response = await request(app).get('/admin/club-requests').set(admin.auth)

    expect(response.status).toBe(200)
    expect(response.body.requests.map((r) => r.clubName)).toEqual(['Robotics Club'])
  })
})