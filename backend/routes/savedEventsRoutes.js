const express = require('express')
const events = require('../data/events')
const savedEvents = require('../data/savedEvents')
const { requireAuth } = require('../utils/requireAuth')

const router = express.Router()

function parseEventId(req) {
  const id = Number(req.params.eventId)
  return Number.isInteger(id) && id > 0 ? id : null
}

// F5.4: save an event. The latest event data always comes back so the page stays in sync.
router.post('/events/:eventId/save', requireAuth, (req, res) => {
  const eventId = parseEventId(req)
  const result = eventId ? savedEvents.saveEvent(req.userId, eventId) : { error: 'NOT_FOUND' }

  if (result.error === 'NOT_FOUND') {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const event = events.findEventById(eventId, req.userId)

  if (result.error === 'ALREADY_SAVED') {
    return res.status(409).json({ message: 'This event is already in your wish list.', event })
  }

  return res.status(201).json({ message: 'Event saved to your wish list.', event })
})

// F5.4: remove an event from the wish list.
router.delete('/events/:eventId/save', requireAuth, (req, res) => {
  const eventId = parseEventId(req)
  const result = eventId ? savedEvents.unsaveEvent(req.userId, eventId) : { error: 'NOT_SAVED' }

  if (result.error) {
    return res.status(404).json({ message: 'This event is not in your wish list.' })
  }

  return res.status(200).json({
    message: 'Event removed from your wish list.',
    event: events.findEventById(eventId, req.userId)
  })
})

module.exports = router