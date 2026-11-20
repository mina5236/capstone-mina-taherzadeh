const express = require('express')
const clubs = require('../data/clubs')
const { requireAuth } = require('../utils/requireAuth')

const router = express.Router()

// F5.1: all active clubs.
router.get('/clubs', requireAuth, (req, res) => {
  return res.status(200).json({ clubs: clubs.listApproved() })
})

// F5.1: one active club with its events.
router.get('/clubs/:clubId', requireAuth, (req, res) => {
  const clubId = Number(req.params.clubId)
  const club = Number.isInteger(clubId) && clubId > 0 ? clubs.findApproved(clubId) : null

  if (!club) {
    return res.status(404).json({ message: 'Club not found.' })
  }

  return res.status(200).json({ club })
})

module.exports = router