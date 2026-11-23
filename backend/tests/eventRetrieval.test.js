process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'jest-session-secret-with-at-least-32-characters'

const request = require('supertest')
const app = require('./testApp')
const db = require('../db/connection')
const users = require('../data/users')
const registrations = require('../data/registrations')
const { hashPassword } = require('../utils/password')
const { createSessionToken } = require('../utils/sessionToken')

let counter = 0

function makePerson() {
  counter += 1
  const user = users.insertUser({
    fullName: `Student ${counter}`,
    email: `s${counter}@test.com`,
    studentId: String(counter).padStart(8, '0'),
    passwordHash: hashPassword('Password1'),
  })
  return { id: user.id, auth: { Authorization: `Bearer ${createSessionToken(user)}` } }
}

function makeClub(ownerId, name = 'Chess Club', description = 'Weekly chess games') {
  return Number(
    db.prepare('INSERT INTO clubs (admin_user_id, club_name, description) VALUES (?, ?, ?)').run(ownerId, name, description)
      .lastInsertRowid
  )
}

function makeEvent(clubId, title = 'Welcome Week', date = '2030-11-20 10:00:00', capacity = 50) {
  return Number(
    db
      .prepare('INSERT INTO events (club_id, title, description, event_date, location, max_capacity) VALUES (?, ?, ?, ?, ?, ?)')
      .run(clubId, title, `${title} description text`, date, 'Main Hall', capacity).lastInsertRowid
  )
}

const deactivateClub = (clubId) => db.prepare("UPDATE clubs SET status = 'inactive' WHERE club_id = ?").run(clubId)

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

describe('event retrieval (F5.2)', () => {
  test('GET /events returns events of active clubs in date order with every detail field', async () => {
    const owner = makePerson()
    const student = makePerson()
    const clubId = makeClub(owner.id)
    makeEvent(clubId, 'Later Event', '2030-12-10 10:00:00')
    makeEvent(clubId, 'Sooner Event', '2030-11-20 10:00:00')

    const response = await request(app).get('/events').set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.events.map((item) => item.title)).toEqual(['Sooner Event', 'Later Event'])
    expect(response.body.events[0]).toEqual({
      id: expect.any(Number),
      title: 'Sooner Event',
      description: 'Sooner Event description text',
      date: '2030-11-20 10:00:00',
      location: 'Main Hall',
      clubName: 'Chess Club',
      maxCapacity: 50,
      currentCount: 0,
      isRegistered: false,
      isSaved: false,
    })
  })

  test('GET /events hides the events of a deactivated club', async () => {
    const owner = makePerson()
    const student = makePerson()
    const clubId = makeClub(owner.id)
    makeEvent(clubId)
    deactivateClub(clubId)

    const response = await request(app).get('/events').set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.events).toHaveLength(0)
  })

  test('GET /events shows registration status for each student separately', async () => {
    const owner = makePerson()
    const registered = makePerson()
    const other = makePerson()
    const eventId = makeEvent(makeClub(owner.id))
    registrations.registerUser(registered.id, eventId)

    const mine = await request(app).get('/events').set(registered.auth)
    const theirs = await request(app).get('/events').set(other.auth)

    expect(mine.body.events[0]).toMatchObject({ isRegistered: true, currentCount: 1 })
    expect(theirs.body.events[0]).toMatchObject({ isRegistered: false, currentCount: 1 })
  })

  test('GET /events/:id returns one event with its details', async () => {
    const owner = makePerson()
    const student = makePerson()
    const eventId = makeEvent(makeClub(owner.id))

    const response = await request(app).get(`/events/${eventId}`).set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.event).toMatchObject({
      id: eventId,
      title: 'Welcome Week',
      description: 'Welcome Week description text',
      location: 'Main Hall',
      clubName: 'Chess Club',
      maxCapacity: 50,
    })
  })

  test('GET /events/:id returns 404 for unknown ids, invalid ids and deactivated clubs', async () => {
    const owner = makePerson()
    const student = makePerson()
    const clubId = makeClub(owner.id)
    const eventId = makeEvent(clubId)
    deactivateClub(clubId)

    const unknown = await request(app).get('/events/9999').set(student.auth)
    const invalid = await request(app).get('/events/abc').set(student.auth)
    const hidden = await request(app).get(`/events/${eventId}`).set(student.auth)

    expect(unknown.status).toBe(404)
    expect(invalid.status).toBe(404)
    expect(hidden.status).toBe(404)
  })

  test('event endpoints need a login, and a deactivated account is locked out', async () => {
    const student = makePerson()
    db.prepare('UPDATE users SET is_active = 0 WHERE user_id = ?').run(student.id)

    const noToken = await request(app).get('/events')
    const noTokenOne = await request(app).get('/events/1')
    const deactivated = await request(app).get('/events').set(student.auth)

    expect(noToken.status).toBe(401)
    expect(noTokenOne.status).toBe(401)
    expect(deactivated.status).toBe(401)
  })
})

describe('browsing clubs (F5.1)', () => {
  test('GET /clubs lists only active clubs, sorted by name, with description and event count', async () => {
    const owner = makePerson()
    const student = makePerson()
    const chess = makeClub(owner.id, 'chess club', 'Weekly chess games')
    makeClub(owner.id, 'Art Club', 'Painting and drawing')
    const old = makeClub(owner.id, 'Old Club', 'Closed')
    makeEvent(chess, 'Chess Night')
    makeEvent(chess, 'Chess Finals', '2030-12-01 10:00:00')
    deactivateClub(old)

    const response = await request(app).get('/clubs').set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.clubs).toEqual([
      { id: expect.any(Number), name: 'Art Club', description: 'Painting and drawing', eventCount: 0 },
      { id: chess, name: 'chess club', description: 'Weekly chess games', eventCount: 2 },
    ])
  })

  test('GET /clubs returns an empty list when there are no active clubs', async () => {
    const student = makePerson()

    const response = await request(app).get('/clubs').set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.clubs).toEqual([])
  })

  test('GET /clubs/:id returns the club with its events in date order', async () => {
    const owner = makePerson()
    const student = makePerson()
    const clubId = makeClub(owner.id)
    makeEvent(clubId, 'Later Event', '2030-12-10 10:00:00')
    makeEvent(clubId, 'Sooner Event', '2030-11-20 10:00:00')

    const response = await request(app).get(`/clubs/${clubId}`).set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.club).toMatchObject({ id: clubId, name: 'Chess Club', description: 'Weekly chess games' })
    expect(response.body.club.events.map((item) => item.title)).toEqual(['Sooner Event', 'Later Event'])
    expect(response.body.club.events[0]).toEqual({
      id: expect.any(Number),
      title: 'Sooner Event',
      date: '2030-11-20 10:00:00',
      location: 'Main Hall',
      maxCapacity: 50,
      currentCount: 0,
    })
  })

  test('GET /clubs/:id returns an empty events list for a club with no events', async () => {
    const owner = makePerson()
    const student = makePerson()
    const clubId = makeClub(owner.id)

    const response = await request(app).get(`/clubs/${clubId}`).set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.club.events).toEqual([])
  })

  test('GET /clubs/:id returns 404 for unknown ids, invalid ids and deactivated clubs', async () => {
    const owner = makePerson()
    const student = makePerson()
    const clubId = makeClub(owner.id)
    deactivateClub(clubId)

    const unknown = await request(app).get('/clubs/9999').set(student.auth)
    const invalid = await request(app).get('/clubs/abc').set(student.auth)
    const inactive = await request(app).get(`/clubs/${clubId}`).set(student.auth)

    expect(unknown.status).toBe(404)
    expect(invalid.status).toBe(404)
    expect(inactive.status).toBe(404)
  })

  test('club endpoints need a login', async () => {
    const list = await request(app).get('/clubs')
    const one = await request(app).get('/clubs/1')

    expect(list.status).toBe(401)
    expect(one.status).toBe(401)
  })
})

describe('wish list (F5.4)', () => {
  test('saving an event returns 201 and marks it as saved', async () => {
    const owner = makePerson()
    const student = makePerson()
    const eventId = makeEvent(makeClub(owner.id))

    const response = await request(app).post(`/events/${eventId}/save`).set(student.auth)
    const list = await request(app).get('/events').set(student.auth)

    expect(response.status).toBe(201)
    expect(response.body.message).toBe('Event saved to your wish list.')
    expect(response.body.event).toMatchObject({ id: eventId, isSaved: true })
    expect(list.body.events[0].isSaved).toBe(true)
  })

  test('saving the same event twice returns 409', async () => {
    const owner = makePerson()
    const student = makePerson()
    const eventId = makeEvent(makeClub(owner.id))
    await request(app).post(`/events/${eventId}/save`).set(student.auth)

    const response = await request(app).post(`/events/${eventId}/save`).set(student.auth)

    expect(response.status).toBe(409)
    expect(response.body.message).toBe('This event is already in your wish list.')
    expect(response.body.event.isSaved).toBe(true)
  })

  test('removing a saved event returns 200 and clears the saved mark', async () => {
    const owner = makePerson()
    const student = makePerson()
    const eventId = makeEvent(makeClub(owner.id))
    await request(app).post(`/events/${eventId}/save`).set(student.auth)

    const response = await request(app).delete(`/events/${eventId}/save`).set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Event removed from your wish list.')
    expect(response.body.event.isSaved).toBe(false)
  })

  test('removing an event that is not saved returns 404', async () => {
    const owner = makePerson()
    const student = makePerson()
    const eventId = makeEvent(makeClub(owner.id))

    const response = await request(app).delete(`/events/${eventId}/save`).set(student.auth)

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('This event is not in your wish list.')
  })

  test('saving needs a real event of an active club', async () => {
    const owner = makePerson()
    const student = makePerson()
    const clubId = makeClub(owner.id)
    const eventId = makeEvent(clubId)
    deactivateClub(clubId)

    const unknown = await request(app).post('/events/9999/save').set(student.auth)
    const invalid = await request(app).post('/events/abc/save').set(student.auth)
    const hidden = await request(app).post(`/events/${eventId}/save`).set(student.auth)

    expect(unknown.status).toBe(404)
    expect(invalid.status).toBe(404)
    expect(hidden.status).toBe(404)
  })

  test('each student has their own wish list', async () => {
    const owner = makePerson()
    const first = makePerson()
    const second = makePerson()
    const eventId = makeEvent(makeClub(owner.id))
    await request(app).post(`/events/${eventId}/save`).set(first.auth)

    const mine = await request(app).get('/events').set(first.auth)
    const theirs = await request(app).get('/events').set(second.auth)

    expect(mine.body.events[0].isSaved).toBe(true)
    expect(theirs.body.events[0].isSaved).toBe(false)
  })

  test('saving does not register the student for the event', async () => {
    const owner = makePerson()
    const student = makePerson()
    const eventId = makeEvent(makeClub(owner.id))

    const response = await request(app).post(`/events/${eventId}/save`).set(student.auth)

    expect(response.body.event).toMatchObject({ isSaved: true, isRegistered: false, currentCount: 0 })
  })

  test('wish list endpoints need a login', async () => {
    const save = await request(app).post('/events/1/save')
    const remove = await request(app).delete('/events/1/save')

    expect(save.status).toBe(401)
    expect(remove.status).toBe(401)
  })
})