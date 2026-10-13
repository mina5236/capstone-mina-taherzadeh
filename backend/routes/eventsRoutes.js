const express = require('express')
const events = require('../data/events')
const registrations = require('../data/registrations')
const { requireAuth } = require('../utils/requireAuth')

const router = express.Router()

function parseEventId(req) {
  const id = Number(req.params.eventId)
  return Number.isInteger(id) && id > 0 ? id : null
}

router.get('/events', requireAuth, (req, res) => {
  return res.status(200).json({ events: events.listEvents(req.userId) })
})

router.get('/events/:eventId', requireAuth, (req, res) => {
  const eventId = parseEventId(req)
  const event = eventId ? events.findEventById(eventId, req.userId) : null

  if (!event) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  return res.status(200).json({ event })
})

router.post('/events/:eventId/register', requireAuth, (req, res) => {
  const eventId = parseEventId(req)

  if (!eventId) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const result = registrations.registerUser(req.userId, eventId)

  if (result.error === 'NOT_FOUND') {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const event = events.findEventById(eventId, req.userId)

  if (result.error === 'ALREADY_REGISTERED') {
    return res.status(409).json({ message: 'You are already registered for this event.', event })
  }

  if (result.error === 'FULL') {
    return res.status(409).json({ message: 'This event is full.', event })
  }

  return res.status(201).json({ message: 'You are registered for this event.', event })
})

router.delete('/events/:eventId/register', requireAuth, (req, res) => {
  const eventId = parseEventId(req)

  if (!eventId) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const result = registrations.cancelRegistration(req.userId, eventId)
  const event = events.findEventById(eventId, req.userId)

  if (result.error === 'NOT_REGISTERED') {
    return res.status(404).json({ message: 'You are not registered for this event.', event })
  }

  return res.status(200).json({ message: 'Your registration has been cancelled.', event })
})

module.exports = router