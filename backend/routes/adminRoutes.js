const express = require('express')
const users = require('../data/users')
const clubs = require('../data/clubs')
const { requireAdmin } = require('../utils/requireAdmin')

const router = express.Router()

// Never send password hashes to the browser.
function toPublicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    studentId: user.studentId,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt
  }
}

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

// F3.5: totals for the admin dashboard.
router.get('/admin/stats', requireAdmin, (req, res) => {
  return res.status(200).json({
    stats: { activeClubs: clubs.countActive(), studentUsers: users.countStudents() }
  })
})

// F3.4: list every account.
router.get('/admin/users', requireAdmin, (req, res) => {
  return res.status(200).json({ users: users.listAll().map(toPublicUser) })
})

// F3.4: deactivate (makeActive = false) or reactivate (makeActive = true) an account.
function changeUserStatus(makeActive) {
  return (req, res) => {
    const targetId = parseId(req.params.userId)
    const target = targetId ? users.findById(targetId) : null

    if (!target) {
      return res.status(404).json({ message: 'User not found.' })
    }
    if (target.id === req.userId) {
      return res.status(400).json({ message: 'You cannot change your own account status.' })
    }
    if (target.role === 'platform_admin') {
      return res.status(403).json({ message: 'Administrator accounts cannot be changed here.' })
    }
    if (target.isActive === makeActive) {
      return res.status(409).json({
        message: makeActive ? 'This account is already active.' : 'This account is already deactivated.'
      })
    }

    const updated = users.setActive(target.id, makeActive)

    return res.status(200).json({
      message: makeActive ? 'Account reactivated.' : 'Account deactivated.',
      user: toPublicUser(updated)
    })
  }
}

router.post('/admin/users/:userId/deactivate', requireAdmin, changeUserStatus(false))
router.post('/admin/users/:userId/reactivate', requireAdmin, changeUserStatus(true))

// Club administration: list every club.
router.get('/admin/clubs', requireAdmin, (req, res) => {
  return res.status(200).json({ clubs: clubs.listAll() })
})

// Club administration: deactivate a club (its events are hidden) or bring it back.
function changeClubStatus(makeActive) {
  return (req, res) => {
    const clubId = parseId(req.params.clubId)
    const club = clubId ? clubs.findById(clubId) : null

    if (!club) {
      return res.status(404).json({ message: 'Club not found.' })
    }
    if ((club.status === 'approved') === makeActive) {
      return res.status(409).json({
        message: makeActive ? 'This club is already active.' : 'This club is already deactivated.'
      })
    }

    const updated = clubs.setStatus(club.id, makeActive ? 'approved' : 'inactive')

    return res.status(200).json({
      message: makeActive
        ? 'Club reactivated. Its events are visible again.'
        : 'Club deactivated. Its events are hidden from students.',
      club: updated
    })
  }
}

router.post('/admin/clubs/:clubId/deactivate', requireAdmin, changeClubStatus(false))
router.post('/admin/clubs/:clubId/reactivate', requireAdmin, changeClubStatus(true))

module.exports = router