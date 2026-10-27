process.env.JWT_SECRET = 'jest-session-secret-with-at-least-32-characters'

const request = require('supertest')

jest.mock('../data/users', () => ({
  findByEmail: jest.fn(),
  findByStudentId: jest.fn(),
  findById: jest.fn(),
  insertUser: jest.fn(),
  updateLastLogin: jest.fn(),
  updateUser: jest.fn(),
}))

const users = require('../data/users')
const { hashPassword } = require('../utils/password')
const { createSessionToken } = require('../utils/sessionToken')
const app = require('./testApp')

const existingUser = {
  id: 12,
  fullName: 'Mina Taherzadeh',
  email: 'mina.taherzadeh@test.com',
  studentId: '00092277',
  createdAt: '2026-01-15 10:00:00',
}
const auth = { Authorization: `Bearer ${createSessionToken(existingUser)}` }

describe('PUT /profile/:userId', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    users.findById.mockReturnValue(existingUser)
    users.findByEmail.mockReturnValue(null)
    users.updateUser.mockImplementation((id, updates) => ({ ...existingUser, ...updates }))
  })

  test('U12: saves a changed name, email and password', async () => {
    const response = await request(app)
      .put('/profile/12')
      .set(auth)
      .send({ fullName: 'Mina Updated', email: 'Mina.Updated@test.com', password: 'NewPassword1' })

    expect(response.status).toBe(200)
    expect(response.body.user).toMatchObject({ fullName: 'Mina Updated', email: 'mina.updated@test.com' })
    expect(users.updateUser).toHaveBeenCalledWith(12, {
      fullName: 'Mina Updated',
      email: 'mina.updated@test.com',
      passwordHash: hashPassword('NewPassword1'),
    })
  })

  test('rejects a name containing digits', async () => {
    const response = await request(app).put('/profile/12').set(auth).send({ fullName: 'Mina123' })

    expect(response.status).toBe(400)
    expect(users.updateUser).not.toHaveBeenCalled()
  })

  test('rejects an invalid email', async () => {
    const response = await request(app).put('/profile/12').set(auth).send({ email: 'mina@' })

    expect(response.status).toBe(400)
    expect(users.updateUser).not.toHaveBeenCalled()
  })

  test('rejects a weak password', async () => {
    const response = await request(app).put('/profile/12').set(auth).send({ password: 'pass123' })

    expect(response.status).toBe(400)
    expect(users.updateUser).not.toHaveBeenCalled()
  })

  test('rejects an email that belongs to another account', async () => {
    users.findByEmail.mockReturnValue({ id: 99, email: 'taken@test.com' })

    const response = await request(app).put('/profile/12').set(auth).send({ email: 'taken@test.com' })

    expect(response.status).toBe(409)
    expect(users.updateUser).not.toHaveBeenCalled()
  })

  test('does not allow editing another user or editing without a token', async () => {
    const other = await request(app).put('/profile/13').set(auth).send({ fullName: 'Someone Else' })
    const none = await request(app).put('/profile/12').send({ fullName: 'Someone Else' })

    expect(other.status).toBe(403)
    expect(none.status).toBe(401)
  })
})