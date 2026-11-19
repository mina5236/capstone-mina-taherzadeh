const { requireAuth } = require('./requireAuth')
const users = require('../data/users')

// Requires a logged-in club administrator. Platform admins are allowed too
// (they can own a club, like the demo club). Ownership of each club is checked in the routes.
function requireClubAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const user = users.findById(req.userId)

    if (!user || !['club_admin', 'platform_admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Club administrator access required.' })
    }

    return next()
  })
}

module.exports = { requireClubAdmin }