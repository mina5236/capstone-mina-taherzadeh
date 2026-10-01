const { randomBytes } = require('crypto')
const jwt = require('jsonwebtoken')

const secret = process.env.JWT_SECRET || randomBytes(32).toString('hex')

function createSessionToken(user) {
  return jwt.sign(
    { email: user.email },
    secret,
    {
      subject: String(user.id),
      issuer: 'campus-connect',
      expiresIn: '1h',
    }
  )
}

module.exports = { createSessionToken }