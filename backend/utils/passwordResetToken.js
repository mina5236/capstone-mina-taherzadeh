const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const secret =
  process.env.PASSWORD_RESET_SECRET ||
  process.env.JWT_SECRET ||
  crypto.randomBytes(32).toString('hex')

function passwordVersion(passwordHash) {
  return crypto.createHmac('sha256', secret).update(passwordHash).digest('hex')
}

function createPasswordResetToken(user) {
  return jwt.sign(
    {
      email: user.email,
      passwordVersion: passwordVersion(user.passwordHash),
    },
    secret,
    {
      subject: String(user.id),
      issuer: 'campus-connect',
      audience: 'password-reset',
      expiresIn: '30m',
    },
  )
}

function verifyPasswordResetToken(token) {
  try {
    return jwt.verify(token, secret, {
      issuer: 'campus-connect',
      audience: 'password-reset',
    })
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return null
    }

    throw error
  }
}

function matchesPasswordResetUser(claims, user) {
  return (
    claims.sub === String(user.id) &&
    claims.email === user.email &&
    claims.passwordVersion === passwordVersion(user.passwordHash)
  )
}

module.exports = {
  createPasswordResetToken,
  verifyPasswordResetToken,
  matchesPasswordResetUser,
}
