process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'jest-session-secret-with-at-least-32-characters'

const request = require('supertest')
const app = require('./testApp')
const db = require('../db/connection')
const users = require('../data/users')
const { createSessionToken } = require('../utils/sessionToken')

let counter = 0

function makePerson() {
  counter += 1
  const user = users.insertUser({
    fullName: `Student ${counter}`,
    email: `s${counter}@test.com`,
    studentId: String(counter).padStart(8, '0'),
    passwordHash: 'hash',
  })
  return { id: user.id, auth: { Authorization: `Bearer ${createSessionToken(user)}` } }
}

function makeEvent(capacity = 2) {
  const owner = makePerson()
  const club = db
    .prepare('INSERT INTO clubs (admin_user_id, club_name) VALUES (?, ?)')
    .run(owner.id, 'Chess Club')
  const event = db
    .prepare('INSERT INTO events (club_id, title, event_date, location, max_capacity) VALUES (?, ?, ?, ?, ?)')
    .run(club.lastInsertRowid, 'Welcome Week', '2026-11-20 10:00:00', 'Main Hall', capacity)
  return Number(event.lastInsertRowid)
}

const registeredEvents = async (person) =>
  (await request(app).get(`/profile/${person.id}`).set(person.auth)).body.events

beforeEach(() => {
  db.exec('DELETE FROM event_registrations; DELETE FROM events; DELETE FROM clubs; DELETE FROM users;')
})

afterAll(() => {
  db.close()
})

describe('event registration', () => {
  test('A8: registers a student for an event (HTTP 201)', async () => {
    const student = makePerson()
    const eventId = makeEvent()

    const response = await request(app).post(`/events/${eventId}/register`).set(student.auth)

    expect(response.status).toBe(201)
    expect(response.body.message).toMatch(/registered/i)
    expect(response.body.event).toMatchObject({ isRegistered: true, currentCount: 1 })
  })

  test('U13: the registered events are listed for the student', async () => {
    const student = makePerson()
    const eventId = makeEvent()
    await request(app).post(`/events/${eventId}/register`).set(student.auth)

    const list = await registeredEvents(student)

    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ title: 'Welcome Week', location: 'Main Hall', clubName: 'Chess Club' })
  })

  test('A9: cancels a registration (HTTP 200) and frees the seat', async () => {
    const student = makePerson()
    const eventId = makeEvent()
    await request(app).post(`/events/${eventId}/register`).set(student.auth)

    const response = await request(app).delete(`/events/${eventId}/register`).set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.message).toMatch(/cancelled/i)
    expect(response.body.event.currentCount).toBe(0)
  })

  test('U14: a cancelled event is removed from the student\'s list', async () => {
    const student = makePerson()
    const eventId = makeEvent()
    await request(app).post(`/events/${eventId}/register`).set(student.auth)

    await request(app).delete(`/events/${eventId}/register`).set(student.auth)

    expect(await registeredEvents(student)).toEqual([])
  })

  test('U15: registration is blocked when the event is full', async () => {
    const eventId = makeEvent(1)
    await request(app).post(`/events/${eventId}/register`).set(makePerson().auth)

    const response = await request(app).post(`/events/${eventId}/register`).set(makePerson().auth)

    expect(response.status).toBe(409)
    expect(response.body.message).toMatch(/full/i)
    expect(response.body.event.currentCount).toBe(1)
  })

  test('a student with no registrations has an empty list', async () => {
    expect(await registeredEvents(makePerson())).toEqual([])
  })

  test('registering twice for the same event is blocked', async () => {
    const student = makePerson()
    const eventId = makeEvent()
    await request(app).post(`/events/${eventId}/register`).set(student.auth)

    const response = await request(app).post(`/events/${eventId}/register`).set(student.auth)

    expect(response.status).toBe(409)
    expect(response.body.event.currentCount).toBe(1)
  })

  test('cancelling without a registration returns 404', async () => {
    const response = await request(app).delete(`/events/${makeEvent()}/register`).set(makePerson().auth)

    expect(response.status).toBe(404)
  })

  test('registering requires a login token', async () => {
    const response = await request(app).post(`/events/${makeEvent()}/register`)

    expect(response.status).toBe(401)
  })
})