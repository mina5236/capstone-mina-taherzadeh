const { verifySessionToken } = require('./sessionToken')
const users = require('../data/users')

// Requires a valid session from an active account and puts the user's id on req.userId.
function requireAuth(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.get('Authorization') || '')
  const claims = match ? verifySessionToken(match[1]) : null

  if (!claims) {
    return res.status(401).json({ message: 'Invalid or expired session.' })
  }

  const user = users.findById(Number(claims.sub))

  if (!user || user.isActive === false) {
    return res.status(401).json({ message: 'This account is no longer active.' })
  }

  req.userId = Number(claims.sub)
  return next()
}

module.exports = { requireAuth }