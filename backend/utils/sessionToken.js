const { randomBytes, randomUUID } = require('crypto')
const jwt = require('jsonwebtoken')

const secret = process.env.JWT_SECRET || randomBytes(32).toString('hex')

// Revoked session ids and their expiry (seconds). Kept in memory because tokens only live 1 hour.
const revokedSessions = new Map()

function createSessionToken(user) {
  return jwt.sign(
    { email: user.email },
    secret,
    {
      subject: String(user.id),
      issuer: 'campus-connect',
      jwtid: randomUUID(),
      expiresIn: '1h',
    }
  )
}

function verifySessionToken(token) {
  try {
    const claims = jwt.verify(token, secret, { issuer: 'campus-connect' })

    // Requiring a session id also rejects other token types signed with the same secret.
    if (!claims.jti || revokedSessions.has(claims.jti)) return null

    return claims
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return null

    throw error
  }
}

function revokeSessionToken(claims) {
  const now = Math.floor(Date.now() / 1000)

  for (const [id, expiresAt] of revokedSessions) {
    if (expiresAt <= now) revokedSessions.delete(id)
  }

  revokedSessions.set(claims.jti, claims.exp)
}

module.exports = { createSessionToken, verifySessionToken, revokeSessionToken }