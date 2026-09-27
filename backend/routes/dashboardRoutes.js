const express = require('express')
const users = require('../data/users')

const router = express.Router()

// Mirrors frontend/src/DashboardPage.jsx - new accounts start with no data.
router.get('/dashboard/:userId', (req, res) => {
  const userId = Number(req.params.userId)
  const user = users.findById(userId)

  if (!user) {
    return res.status(404).json({
      message: 'User not found.'
    })
  }

  return res.status(200).json({
    stats: {
      eventsJoined: 0,
      clubsFollowed: 0,
      hoursActive: 0
    },
    upcomingEvents: [],
    popularClubs: []
  })
})

module.exports = router
