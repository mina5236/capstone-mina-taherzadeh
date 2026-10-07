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
const app = require('./testApp')

const validSignup = {
  fullName: 'Mina Taherzadeh',
  email: 'Mina.taherzadeh@test.com',
  studentId: '00092277',
  password: 'Password1',
}

describe('POST /signup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    users.findByEmail.mockReturnValue(null)
    users.findByStudentId.mockReturnValue(null)
    users.insertUser.mockImplementation((user) => ({ id: 1, ...user }))
  })

  test('U1: accepts a correctly formatted email', async () => {
    const response = await request(app).post('/signup').send(validSignup)

    expect(response.status).toBe(201)
    expect(users.insertUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'mina.taherzadeh@test.com',
    }))
  })

  test('U2: rejects an invalid email format', async () => {
    const response = await request(app)
      .post('/signup')
      .send({ ...validSignup, email: 'mina@' })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/email/i)
    expect(users.insertUser).not.toHaveBeenCalled()
  })

  test('U3: blocks registration for an existing email', async () => {
    users.findByEmail.mockReturnValue({ id: 7, email: 'mina.taherzadeh@test.com' })

    const response = await request(app).post('/signup').send(validSignup)

    expect(response.status).toBe(409)
    expect(response.body.message).toMatch(/already registered/i)
    expect(users.insertUser).not.toHaveBeenCalled()
  })

  test('U4: accepts an eight-digit numeric student ID, including leading zeroes', async () => {
    const response = await request(app).post('/signup').send(validSignup)

    expect(response.status).toBe(201)
    expect(users.insertUser).toHaveBeenCalledWith(expect.objectContaining({
      studentId: '00092277',
    }))
  })

  test('U5: rejects a student ID containing letters', async () => {
    const response = await request(app)
      .post('/signup')
      .send({ ...validSignup, studentId: '1234ABCD' })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/8 numeric digits/i)
    expect(users.insertUser).not.toHaveBeenCalled()
  })

  test('U6: blocks registration for an existing student ID', async () => {
    users.findByStudentId.mockReturnValue({ id: 7, studentId: '00092277' })

    const response = await request(app).post('/signup').send(validSignup)

    expect(response.status).toBe(409)
    expect(response.body.message).toMatch(/already associated/i)
    expect(users.insertUser).not.toHaveBeenCalled()
  })

  test('U7: accepts a password with uppercase, lowercase, and a number', async () => {
    const response = await request(app).post('/signup').send(validSignup)

    expect(response.status).toBe(201)
    expect(users.insertUser).toHaveBeenCalled()
  })

  test('U8: rejects a weak password', async () => {
    const response = await request(app)
      .post('/signup')
      .send({ ...validSignup, password: 'pass123' })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/password/i)
    expect(users.insertUser).not.toHaveBeenCalled()
  })
})