process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'jest-session-secret-with-at-least-32-characters'

const request = require('supertest')
const app = require('./testApp')
const db = require('../db/connection')
const users = require('../data/users')
const clubEvents = require('../data/clubEvents')
const registrations = require('../data/registrations')
const { hashPassword } = require('../utils/password')
const { createSessionToken } = require('../utils/sessionToken')

let counter = 0

function makePerson(role = 'student') {
  counter += 1
  const fullName = `Student ${counter}`
  const studentId = String(counter).padStart(8, '0')
  const user = users.insertUser({
    fullName,
    email: `s${counter}@test.com`,
    studentId,
    passwordHash: hashPassword('Password1'),
  })
  if (role !== 'student') {
    db.prepare('UPDATE users SET role = ? WHERE user_id = ?').run(role, user.id)
  }
  return { id: user.id, fullName, studentId, email: user.email, auth: { Authorization: `Bearer ${createSessionToken(user)}` } }
}

function makeClub(ownerId, name = 'Chess Club') {
  return Number(db.prepare('INSERT INTO clubs (admin_user_id, club_name) VALUES (?, ?)').run(ownerId, name).lastInsertRowid)
}

function makeEvent(clubId, title = 'Welcome Week') {
  return Number(
    db
      .prepare('INSERT INTO events (club_id, title, description, event_date, location, max_capacity) VALUES (?, ?, ?, ?, ?, ?)')
      .run(clubId, title, 'Meet clubs and make friends.', '2030-11-20 10:00:00', 'Main Hall', 50).lastInsertRowid
  )
}

const eventRow = (id) => db.prepare('SELECT * FROM events WHERE event_id = ?').get(id)
const eventCount = () => db.prepare('SELECT COUNT(*) AS n FROM events').get().n
const registrationCount = (eventId) =>
  db.prepare('SELECT COUNT(*) AS n FROM event_registrations WHERE event_id = ?').get(eventId).n

// Values the data functions expect.
const values = {
  title: 'Chess Tournament',
  description: 'A friendly tournament for all levels.',
  eventDate: '2030-12-01 18:00:00',
  location: 'Room 204',
  maxCapacity: 30,
}

// JSON body the API expects (date and time are sent separately).
const formBody = (clubId, overrides = {}) => ({
  clubId,
  title: values.title,
  description: values.description,
  date: '2030-12-01',
  time: '18:00',
  location: values.location,
  maxCapacity: values.maxCapacity,
  ...overrides,
})

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

describe('event CRUD logic (unit)', () => {
  test('U16: valid data saves the event for the admin\'s own club', () => {
    const admin = makePerson('club_admin')
    const clubId = makeClub(admin.id)

    const result = clubEvents.createEvent(admin.id, { clubId, ...values })

    expect(result.error).toBeUndefined()
    expect(result.event).toMatchObject({
      clubId,
      clubName: 'Chess Club',
      title: 'Chess Tournament',
      date: '2030-12-01 18:00:00',
      location: 'Room 204',
      maxCapacity: 30,
      currentCount: 0,
    })
    expect(eventCount()).toBe(1)
  })

  test('U16: an event cannot be created for another admin\'s club or an inactive club', () => {
    const admin = makePerson('club_admin')
    const other = makePerson('club_admin')
    const othersClub = makeClub(other.id, 'Other Club')
    const inactiveClub = makeClub(admin.id, 'Old Club')
    db.prepare("UPDATE clubs SET status = 'inactive' WHERE club_id = ?").run(inactiveClub)

    const notOwned = clubEvents.createEvent(admin.id, { clubId: othersClub, ...values })
    const inactive = clubEvents.createEvent(admin.id, { clubId: inactiveClub, ...values })

    expect(notOwned.error).toBe('CLUB_NOT_FOUND')
    expect(inactive.error).toBe('CLUB_NOT_FOUND')
    expect(eventCount()).toBe(0)
  })

  test('U17: valid data updates the event', () => {
    const admin = makePerson('club_admin')
    const eventId = makeEvent(makeClub(admin.id))

    const result = clubEvents.updateEvent(eventId, admin.id, {
      ...values,
      title: 'Chess Finals',
      eventDate: '2030-12-05 09:30:00',
      maxCapacity: 40,
    })

    expect(result.event).toMatchObject({ id: eventId, title: 'Chess Finals', date: '2030-12-05 09:30:00', maxCapacity: 40 })
    expect(eventRow(eventId).title).toBe('Chess Finals')
  })

  test('U17: capacity cannot be lower than the students already registered', () => {
    const admin = makePerson('club_admin')
    const eventId = makeEvent(makeClub(admin.id))
    registrations.registerUser(makePerson().id, eventId)
    registrations.registerUser(makePerson().id, eventId)

    const tooLow = clubEvents.updateEvent(eventId, admin.id, { ...values, maxCapacity: 1 })
    const exact = clubEvents.updateEvent(eventId, admin.id, { ...values, maxCapacity: 2 })

    expect(tooLow).toEqual({ error: 'CAPACITY_TOO_LOW', registered: 2 })
    expect(exact.event.maxCapacity).toBe(2)
  })

  test('U17: another admin cannot edit the event', () => {
    const admin = makePerson('club_admin')
    const other = makePerson('club_admin')
    const eventId = makeEvent(makeClub(admin.id))

    const result = clubEvents.updateEvent(eventId, other.id, values)

    expect(result.error).toBe('NOT_FOUND')
    expect(eventRow(eventId).title).toBe('Welcome Week')
  })

  test('U18: deleting an existing event removes it and its registrations', () => {
    const admin = makePerson('club_admin')
    const eventId = makeEvent(makeClub(admin.id))
    registrations.registerUser(makePerson().id, eventId)

    const result = clubEvents.deleteEvent(eventId, admin.id)

    expect(result.ok).toBe(true)
    expect(eventRow(eventId)).toBeUndefined()
    expect(registrationCount(eventId)).toBe(0)
  })

  test('U18: another admin cannot delete the event', () => {
    const admin = makePerson('club_admin')
    const other = makePerson('club_admin')
    const eventId = makeEvent(makeClub(admin.id))

    const result = clubEvents.deleteEvent(eventId, other.id)

    expect(result.error).toBe('NOT_FOUND')
    expect(eventRow(eventId)).toBeDefined()
  })

  test('F4.5: lists the students registered for an owned event', () => {
    const admin = makePerson('club_admin')
    const eventId = makeEvent(makeClub(admin.id))
    const student = makePerson()
    registrations.registerUser(student.id, eventId)

    const result = clubEvents.listRegistrations(eventId, admin.id)

    expect(result.event.id).toBe(eventId)
    expect(result.students).toHaveLength(1)
    expect(result.students[0]).toMatchObject({ fullName: student.fullName, studentId: student.studentId, email: student.email })
  })

  test('F4.5: returns nothing for another admin\'s event', () => {
    const admin = makePerson('club_admin')
    const other = makePerson('club_admin')
    const eventId = makeEvent(makeClub(admin.id))

    expect(clubEvents.listRegistrations(eventId, other.id)).toBeNull()
  })
})

describe('create event endpoint (A5, F4.1, F4.2)', () => {
  test('A5: valid event JSON returns 201 and the saved event', async () => {
    const admin = makePerson('club_admin')
    const clubId = makeClub(admin.id)

    const response = await request(app).post('/club-admin/events').set(admin.auth).send(formBody(clubId))

    expect(response.status).toBe(201)
    expect(response.body.message).toBe('Event created.')
    expect(response.body.event).toMatchObject({
      clubId,
      title: 'Chess Tournament',
      date: '2030-12-01 18:00:00',
      location: 'Room 204',
      maxCapacity: 30,
      currentCount: 0,
    })
    expect(eventCount()).toBe(1)
  })

  test('A5: the new event shows up for students', async () => {
    const admin = makePerson('club_admin')
    const student = makePerson()
    await request(app).post('/club-admin/events').set(admin.auth).send(formBody(makeClub(admin.id)))

    const response = await request(app).get('/events').set(student.auth)

    expect(response.body.events.some((item) => item.title === 'Chess Tournament')).toBe(true)
  })

  test.each([
    ['title too short', { title: 'ab' }, 'Event title must be between 3 and 100 characters.'],
    ['description too short', { description: 'short' }, 'Event description must be between 10 and 1000 characters.'],
    ['impossible date', { date: '2030-02-31' }, 'Please choose a valid date.'],
    ['missing time', { time: '' }, 'Please choose a valid time.'],
    ['invalid time', { time: '25:99' }, 'Please choose a valid time.'],
    ['location too short', { location: 'A' }, 'Location must be between 2 and 100 characters.'],
    ['capacity zero', { maxCapacity: 0 }, 'Maximum capacity must be a whole number between 1 and 1000.'],
    ['capacity too large', { maxCapacity: 1001 }, 'Maximum capacity must be a whole number between 1 and 1000.'],
    ['capacity not a whole number', { maxCapacity: 2.5 }, 'Maximum capacity must be a whole number between 1 and 1000.'],
    ['script tags in the title', { title: '<b>Party</b>' }, 'Please remove "<" and ">" characters from the form.'],
    ['script tags in the description', { description: '<script>alert(1)</script> text' }, 'Please remove "<" and ">" characters from the form.'],
  ])('F4.2: %s is rejected with 400 and nothing is saved', async (name, overrides, message) => {
    const admin = makePerson('club_admin')
    const clubId = makeClub(admin.id)

    const response = await request(app).post('/club-admin/events').set(admin.auth).send(formBody(clubId, overrides))

    expect(response.status).toBe(400)
    expect(response.body.message).toBe(message)
    expect(eventCount()).toBe(0)
  })

  test('A5: a missing club returns 400', async () => {
    const admin = makePerson('club_admin')

    const response = await request(app).post('/club-admin/events').set(admin.auth).send(formBody(undefined))

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('Please choose a club.')
  })

  test('A5: another admin\'s club returns 403', async () => {
    const admin = makePerson('club_admin')
    const other = makePerson('club_admin')
    const othersClub = makeClub(other.id)

    const response = await request(app).post('/club-admin/events').set(admin.auth).send(formBody(othersClub))

    expect(response.status).toBe(403)
    expect(eventCount()).toBe(0)
  })
})

describe('edit event endpoint (A6, F4.3)', () => {
  test('A6: valid JSON returns 200 and the updated event', async () => {
    const admin = makePerson('club_admin')
    const clubId = makeClub(admin.id)
    const eventId = makeEvent(clubId)

    const response = await request(app)
      .put(`/club-admin/events/${eventId}`)
      .set(admin.auth)
      .send(formBody(clubId, { title: 'Chess Finals', date: '2030-12-05', time: '09:30', maxCapacity: 40 }))

    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Event updated.')
    expect(response.body.event).toMatchObject({ id: eventId, title: 'Chess Finals', date: '2030-12-05 09:30:00', maxCapacity: 40 })
    expect(eventRow(eventId).title).toBe('Chess Finals')
  })

  test('A6: capacity below the registered students returns 409', async () => {
    const admin = makePerson('club_admin')
    const clubId = makeClub(admin.id)
    const eventId = makeEvent(clubId)
    registrations.registerUser(makePerson().id, eventId)
    registrations.registerUser(makePerson().id, eventId)

    const response = await request(app)
      .put(`/club-admin/events/${eventId}`)
      .set(admin.auth)
      .send(formBody(clubId, { maxCapacity: 1 }))

    expect(response.status).toBe(409)
    expect(response.body.message).toBe('Capacity cannot be lower than the 2 students already registered.')
    expect(eventRow(eventId).max_capacity).toBe(50)
  })

  test('A6: invalid data returns 400 and changes nothing', async () => {
    const admin = makePerson('club_admin')
    const clubId = makeClub(admin.id)
    const eventId = makeEvent(clubId)

    const response = await request(app)
      .put(`/club-admin/events/${eventId}`)
      .set(admin.auth)
      .send(formBody(clubId, { title: 'ab' }))

    expect(response.status).toBe(400)
    expect(eventRow(eventId).title).toBe('Welcome Week')
  })

  test('A6: unknown ids, and another admin\'s event, return 404', async () => {
    const admin = makePerson('club_admin')
    const other = makePerson('club_admin')
    const clubId = makeClub(admin.id)
    const eventId = makeEvent(clubId)

    const unknown = await request(app).put('/club-admin/events/9999').set(admin.auth).send(formBody(clubId))
    const invalid = await request(app).put('/club-admin/events/abc').set(admin.auth).send(formBody(clubId))
    const notOwned = await request(app).put(`/club-admin/events/${eventId}`).set(other.auth).send(formBody(clubId))

    expect(unknown.status).toBe(404)
    expect(invalid.status).toBe(404)
    expect(notOwned.status).toBe(404)
    expect(eventRow(eventId).title).toBe('Welcome Week')
  })
})

describe('delete event endpoint (A7, F4.4)', () => {
  test('A7: deleting an event returns 200 and removes it and its registrations', async () => {
    const admin = makePerson('club_admin')
    const student = makePerson()
    const eventId = makeEvent(makeClub(admin.id))
    registrations.registerUser(student.id, eventId)

    const response = await request(app).delete(`/club-admin/events/${eventId}`).set(admin.auth)
    const studentView = await request(app).get('/events').set(student.auth)

    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Event deleted.')
    expect(eventRow(eventId)).toBeUndefined()
    expect(registrationCount(eventId)).toBe(0)
    expect(studentView.body.events).toHaveLength(0)
  })

  test('A7: unknown ids, and another admin\'s event, return 404', async () => {
    const admin = makePerson('club_admin')
    const other = makePerson('club_admin')
    const eventId = makeEvent(makeClub(admin.id))

    const unknown = await request(app).delete('/club-admin/events/9999').set(admin.auth)
    const invalid = await request(app).delete('/club-admin/events/abc').set(admin.auth)
    const notOwned = await request(app).delete(`/club-admin/events/${eventId}`).set(other.auth)

    expect(unknown.status).toBe(404)
    expect(invalid.status).toBe(404)
    expect(notOwned.status).toBe(404)
    expect(eventRow(eventId)).toBeDefined()
  })
})

describe('registered students and lists (F4.5)', () => {
  test('the registrations endpoint returns the event and its students', async () => {
    const admin = makePerson('club_admin')
    const student = makePerson()
    const eventId = makeEvent(makeClub(admin.id))
    registrations.registerUser(student.id, eventId)

    const response = await request(app).get(`/club-admin/events/${eventId}/registrations`).set(admin.auth)

    expect(response.status).toBe(200)
    expect(response.body.event.id).toBe(eventId)
    expect(response.body.students).toEqual([
      {
        fullName: student.fullName,
        studentId: student.studentId,
        email: student.email,
        registeredAt: expect.any(String),
      },
    ])
  })

  test('another admin\'s event and unknown ids return 404', async () => {
    const admin = makePerson('club_admin')
    const other = makePerson('club_admin')
    const eventId = makeEvent(makeClub(admin.id))

    const notOwned = await request(app).get(`/club-admin/events/${eventId}/registrations`).set(other.auth)
    const unknown = await request(app).get('/club-admin/events/9999/registrations').set(admin.auth)

    expect(notOwned.status).toBe(404)
    expect(unknown.status).toBe(404)
  })

  test('an admin only sees their own clubs and events', async () => {
    const admin = makePerson('club_admin')
    const other = makePerson('club_admin')
    const myClub = makeClub(admin.id, 'My Club')
    const otherClub = makeClub(other.id, 'Other Club')
    makeEvent(myClub, 'My Event')
    makeEvent(otherClub, 'Other Event')

    const clubs = await request(app).get('/club-admin/clubs').set(admin.auth)
    const events = await request(app).get('/club-admin/events').set(admin.auth)

    expect(clubs.body.clubs).toEqual([{ id: myClub, name: 'My Club' }])
    expect(events.body.events.map((item) => item.title)).toEqual(['My Event'])
  })
})

describe('club admin access protection', () => {
  const endpoints = [
    ['get', '/club-admin/clubs'],
    ['get', '/club-admin/events'],
    ['post', '/club-admin/events'],
    ['put', '/club-admin/events/1'],
    ['delete', '/club-admin/events/1'],
    ['get', '/club-admin/events/1/registrations'],
  ]

  test('a student gets 403 on every club admin endpoint', async () => {
    const student = makePerson()

    for (const [method, url] of endpoints) {
      const response = await request(app)[method](url).set(student.auth)
      expect(response.status).toBe(403)
    }
  })

  test('no token gets 401 on every club admin endpoint', async () => {
    for (const [method, url] of endpoints) {
      const response = await request(app)[method](url)
      expect(response.status).toBe(401)
    }
  })

  test('a deactivated club admin is locked out (401)', async () => {
    const admin = makePerson('club_admin')
    db.prepare('UPDATE users SET is_active = 0 WHERE user_id = ?').run(admin.id)

    const response = await request(app).get('/club-admin/events').set(admin.auth)

    expect(response.status).toBe(401)
  })

  test('a platform admin who owns a club can create events too', async () => {
    const admin = makePerson('platform_admin')
    const clubId = makeClub(admin.id)

    const response = await request(app).post('/club-admin/events').set(admin.auth).send(formBody(clubId))

    expect(response.status).toBe(201)
  })
})