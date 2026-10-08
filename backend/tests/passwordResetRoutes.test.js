const request = require('supertest')

process.env.PASSWORD_RESET_SECRET = 'jest-password-reset-secret-with-at-least-32-characters'

jest.mock('../data/users', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  updatePasswordIfUnchanged: jest.fn(),
}))

jest.mock('../services/passwordResetEmail', () => ({
  isConfigured: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}))

const users = require('../data/users')
const emailService = require('../services/passwordResetEmail')
const { hashPassword } = require('../utils/password')
const { createPasswordResetToken, verifyPasswordResetToken } = require('../utils/passwordResetToken')
const app = require('./testApp')

const existingUser = {
  id: 12,
  email: 'mina.taherzadeh@test.com',
  passwordHash: hashPassword('Password1'),
}

describe('password reset routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    emailService.isConfigured.mockReturnValue(true)
    emailService.sendPasswordResetEmail.mockResolvedValue()
    users.findByEmail.mockReturnValue(existingUser)
    users.findById.mockReturnValue(existingUser)
    users.updatePasswordIfUnchanged.mockReturnValue(true)
  })

  test('U11: sends a reset link to an existing email without returning the token', async () => {
    const response = await request(app)
      .post('/password-reset/request')
      .send({ email: 'Mina.Taherzadeh@test.com' })

    expect(response.status).toBe(200)
    expect(response.body.message).toMatch(/if an account exists/i)
    expect(users.findByEmail).toHaveBeenCalledWith(existingUser.email)
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1)

    const [sentTo, sentToken] = emailService.sendPasswordResetEmail.mock.calls[0]
    expect(sentTo).toBe(existingUser.email)
    expect(verifyPasswordResetToken(sentToken)).toMatchObject({ sub: String(existingUser.id) })
    expect(response.body).not.toHaveProperty('token')
  })

  test('returns the same response when an account does not exist', async () => {
    users.findByEmail.mockReturnValue(null)

    const response = await request(app)
      .post('/password-reset/request')
      .send({ email: 'unknown@test.com' })

    expect(response.status).toBe(200)
    expect(response.body.message).toMatch(/if an account exists/i)
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  test('rejects malformed email addresses and unavailable SMTP configuration', async () => {
    const invalidEmailResponse = await request(app)
      .post('/password-reset/request')
      .send({ email: 'not-an-email' })

    expect(invalidEmailResponse.status).toBe(400)
    expect(users.findByEmail).not.toHaveBeenCalled()

    emailService.isConfigured.mockReturnValue(false)
    const unavailableResponse = await request(app)
      .post('/password-reset/request')
      .send({ email: existingUser.email })

    expect(unavailableResponse.status).toBe(503)
    expect(users.findByEmail).not.toHaveBeenCalled()
  })

  test('accepts an unexpired verification token and changes the password', async () => {
    const token = createPasswordResetToken(existingUser)
    const response = await request(app)
      .post('/password-reset/confirm')
      .send({ token, password: 'NewPassword1' })

    expect(response.status).toBe(200)
    expect(users.updatePasswordIfUnchanged).toHaveBeenCalledWith(
      existingUser.id,
      existingUser.passwordHash,
      hashPassword('NewPassword1'),
    )
  })

  test('rejects weak passwords, invalid tokens, and previously used tokens', async () => {
    const token = createPasswordResetToken(existingUser)
    const weakPasswordResponse = await request(app)
      .post('/password-reset/confirm')
      .send({ token, password: 'weak' })

    expect(weakPasswordResponse.status).toBe(400)
    expect(users.updatePasswordIfUnchanged).not.toHaveBeenCalled()

    const invalidTokenResponse = await request(app)
      .post('/password-reset/confirm')
      .send({ token: 'invalid-token', password: 'NewPassword1' })

    expect(invalidTokenResponse.status).toBe(400)
    expect(users.findById).not.toHaveBeenCalled()

    users.updatePasswordIfUnchanged.mockReturnValue(false)
    const usedTokenResponse = await request(app)
      .post('/password-reset/confirm')
      .send({ token, password: 'NewPassword1' })

    expect(usedTokenResponse.status).toBe(400)
    expect(usedTokenResponse.body.message).toMatch(/invalid or has expired/i)
  })
})
