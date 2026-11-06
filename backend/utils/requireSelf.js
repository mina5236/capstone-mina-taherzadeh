const { verifySessionToken } = require('./sessionToken')
const users = require('../data/users')

// Only lets a logged-in, active user touch their own :userId.
function requireSelf(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.get('Authorization') || '')
  const claims = match ? verifySessionToken(match[1]) : null

  if (!claims) {
    return res.status(401).json({ message: 'Invalid or expired session.' })
  }

  const user = users.findById(Number(claims.sub))

  if (!user || user.isActive === false) {
    return res.status(401).json({ message: 'This account is no longer active.' })
  }

  if (claims.sub !== String(req.params.userId)) {
    return res.status(403).json({ message: 'You can only access your own profile.' })
  }

  req.auth = claims
  return next()
}

module.exports = { requireSelf }