const request = require('supertest')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = 'jest-session-secret-with-at-least-32-characters'

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
const app = require('./testApp')

const existingUser = {
  id: 12,
  fullName: 'Mina Taherzadeh',
  email: 'mina.taherzadeh@test.com',
  studentId: '00092277',
  passwordHash: hashPassword('Password1'),
}

describe('POST /login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    users.findByEmail.mockReturnValue(existingUser)
  })

  test('U9: accepts valid credentials and returns an expiring session token', async () => {
    const response = await request(app).post('/login').send({
      email: 'Mina.Taherzadeh@test.com',
      password: 'Password1',
    })

    expect(response.status).toBe(200)
    expect(response.body.user).toEqual({
      id: existingUser.id,
      fullName: existingUser.fullName,
      email: existingUser.email,
      studentId: existingUser.studentId,
    })
    expect(typeof response.body.token).toBe('string')

    const claims = jwt.verify(response.body.token, process.env.JWT_SECRET)
    expect(claims).toMatchObject({
      sub: String(existingUser.id),
      email: existingUser.email,
      iss: 'campus-connect',
    })
    expect(claims.exp).toBeGreaterThan(claims.iat)
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(60 * 60)
    expect(users.findByEmail).toHaveBeenCalledWith(existingUser.email)
    expect(users.updateLastLogin).toHaveBeenCalledWith(existingUser.id)
  })

  test('rejects an incorrect password', async () => {
    const response = await request(app).post('/login').send({
      email: existingUser.email,
      password: 'WrongPassword1',
    })

    expect(response.status).toBe(401)
    expect(response.body.message).toMatch(/invalid email or password/i)
    expect(response.body.token).toBeUndefined()
    expect(users.updateLastLogin).not.toHaveBeenCalled()
  })

  test('rejects missing credentials', async () => {
    const response = await request(app).post('/login').send({ email: existingUser.email })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/required/i)
  })
})