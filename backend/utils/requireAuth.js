const { verifySessionToken } = require('./sessionToken')

// Requires a valid session and puts the logged-in user's id on req.userId.
function requireAuth(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.get('Authorization') || '')
  const claims = match ? verifySessionToken(match[1]) : null

  if (!claims) {
    return res.status(401).json({ message: 'Invalid or expired session.' })
  }

  req.userId = Number(claims.sub)
  return next()
}

module.exports = { requireAuth }