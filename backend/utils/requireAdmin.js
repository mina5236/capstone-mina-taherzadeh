const { requireAuth } = require('./requireAuth')
const users = require('../data/users')

// Requires a valid session AND an active platform admin account.
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const user = users.findById(req.userId)

    if (!user || !user.isActive || user.role !== 'platform_admin') {
      return res.status(403).json({ message: 'Administrator access required.' })
    }

    return next()
  })
}

module.exports = { requireAdmin }