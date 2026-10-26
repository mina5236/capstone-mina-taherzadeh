process.env.DB_PATH = ':memory:'

const db = require('../db/connection')
const users = require('../data/users')
const clubRequests = require('../data/clubRequests')

const form = {
  clubName: 'Chess Club',
  description: 'A friendly club for chess players of every skill level.',
  contactEmail: 'chess@test.com',
  purpose: 'Weekly games, tournaments and beginner lessons.',
}

function makeUser(n, role = 'student') {
  const user = users.insertUser({
    fullName: `Student ${n}`,
    email: `student${n}@test.com`,
    studentId: String(n).padStart(8, '0'),
    passwordHash: 'hash',
  })
  if (role !== 'student') {
    db.prepare('UPDATE users SET role = ? WHERE user_id = ?').run(role, user.id)
  }
  return users.findById(user.id)
}

const clubCount = () => db.prepare('SELECT COUNT(*) AS n FROM clubs').get().n

beforeEach(() => {
  db.exec('DELETE FROM club_requests; DELETE FROM clubs; DELETE FROM users;')
})

afterAll(() => {
  db.close()
})

describe('submitRequest', () => {
  test('U19: saves a valid request as pending with requester name and student ID', () => {
    const student = makeUser(1)
    const result = clubRequests.submitRequest(student.id, form)

    expect(result.error).toBeUndefined()
    expect(result.request).toMatchObject({
      userId: student.id,
      clubName: 'Chess Club',
      contactEmail: 'chess@test.com',
      status: 'pending',
      requesterName: 'Student 1',
      studentId: '00000001',
    })
    expect(clubRequests.listByUser(student.id)).toHaveLength(1)
  })

  test('U19-b: a student cannot have two pending requests', () => {
    const student = makeUser(1)
    clubRequests.submitRequest(student.id, form)

    const second = clubRequests.submitRequest(student.id, { ...form, clubName: 'Robotics Club' })

    expect(second.error).toBe('ALREADY_PENDING')
    expect(clubRequests.listByUser(student.id)).toHaveLength(1)
  })

  test('U19-c: club name already requested by someone else is blocked (case-insensitive)', () => {
    clubRequests.submitRequest(makeUser(1).id, form)
    const result = clubRequests.submitRequest(makeUser(2).id, { ...form, clubName: 'CHESS club' })
    expect(result.error).toBe('NAME_TAKEN')
  })

  test('U19-d: club name that already exists as a club is blocked', () => {
    const owner = makeUser(1)
    db.prepare('INSERT INTO clubs (admin_user_id, club_name) VALUES (?, ?)').run(owner.id, 'Chess Club')

    const result = clubRequests.submitRequest(makeUser(2).id, form)
    expect(result.error).toBe('NAME_TAKEN')
  })

  test('U19-e: a student can submit again after a rejection', () => {
    const student = makeUser(1)
    const first = clubRequests.submitRequest(student.id, form).request
    clubRequests.rejectRequest(first.id)

    const again = clubRequests.submitRequest(student.id, { ...form, clubName: 'Robotics Club' })

    expect(again.error).toBeUndefined()
    expect(clubRequests.listByUser(student.id)).toHaveLength(2)
  })
})

describe('approveRequest', () => {
  test('U20: creates the club, marks request approved, makes student a club admin', () => {
    const student = makeUser(1)
    const { request } = clubRequests.submitRequest(student.id, form)

    expect(clubRequests.approveRequest(request.id)).toEqual({ ok: true })

    const club = db.prepare('SELECT * FROM clubs WHERE club_name = ?').get('Chess Club')
    expect(club).toMatchObject({ admin_user_id: student.id, status: 'approved' })
    expect(clubRequests.listByUser(student.id)[0].status).toBe('approved')
    expect(users.findById(student.id).role).toBe('club_admin')
  })

  test('U20-b: does not downgrade a platform admin', () => {
    const admin = makeUser(1, 'platform_admin')
    const { request } = clubRequests.submitRequest(admin.id, form)
    clubRequests.approveRequest(request.id)
    expect(users.findById(admin.id).role).toBe('platform_admin')
  })

  test('U20-c: unknown id returns NOT_FOUND', () => {
    expect(clubRequests.approveRequest(9999)).toEqual({ error: 'NOT_FOUND' })
  })

  test('U20-d: cannot be approved twice', () => {
    const { request } = clubRequests.submitRequest(makeUser(1).id, form)
    clubRequests.approveRequest(request.id)

    expect(clubRequests.approveRequest(request.id)).toEqual({ error: 'ALREADY_REVIEWED' })
    expect(clubCount()).toBe(1)
  })

  test('U20-e: blocked if the club name was taken in the meantime', () => {
    const student = makeUser(1)
    const { request } = clubRequests.submitRequest(student.id, form)
    db.prepare('INSERT INTO clubs (admin_user_id, club_name) VALUES (?, ?)').run(student.id, 'chess club')

    expect(clubRequests.approveRequest(request.id)).toEqual({ error: 'NAME_TAKEN' })
    expect(clubRequests.listByUser(student.id)[0].status).toBe('pending')
    expect(users.findById(student.id).role).toBe('student')
  })
})

describe('rejectRequest', () => {
  test('U20-f: marks rejected, creates no club, role unchanged', () => {
    const student = makeUser(1)
    const { request } = clubRequests.submitRequest(student.id, form)

    expect(clubRequests.rejectRequest(request.id)).toEqual({ ok: true })
    expect(clubRequests.listByUser(student.id)[0].status).toBe('rejected')
    expect(clubCount()).toBe(0)
    expect(users.findById(student.id).role).toBe('student')
  })

  test('U20-g: NOT_FOUND and ALREADY_REVIEWED cases', () => {
    const { request } = clubRequests.submitRequest(makeUser(1).id, form)
    clubRequests.rejectRequest(request.id)

    expect(clubRequests.rejectRequest(9999)).toEqual({ error: 'NOT_FOUND' })
    expect(clubRequests.rejectRequest(request.id)).toEqual({ error: 'ALREADY_REVIEWED' })
    expect(clubRequests.approveRequest(request.id)).toEqual({ error: 'ALREADY_REVIEWED' })
  })
})

describe('listing', () => {
  test('listPending returns only pending; listByUser only that student\'s', () => {
    const a = makeUser(1)
    const b = makeUser(2)
    const reqA = clubRequests.submitRequest(a.id, form).request
    clubRequests.submitRequest(b.id, { ...form, clubName: 'Robotics Club' })
    clubRequests.approveRequest(reqA.id)

    expect(clubRequests.listPending().map((r) => r.clubName)).toEqual(['Robotics Club'])
    expect(clubRequests.listByUser(a.id).map((r) => r.clubName)).toEqual(['Chess Club'])
  })
})