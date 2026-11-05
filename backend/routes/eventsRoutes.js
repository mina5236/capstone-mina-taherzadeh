const express = require('express')
const events = require('../data/events')
const registrations = require('../data/registrations')
const { requireAuth } = require('../utils/requireAuth')

const router = express.Router()

function parseEventId(req) {
  const id = Number(req.params.eventId)
  return Number.isInteger(id) && id > 0 ? id : null
}

//Returns all events, with isRegistered for this user
router.get('/events', requireAuth, (req, res) => {
  return res.status(200).json({ events: events.listEvents(req.userId) })
})

//Returns one event, or 404 - events list
router.get('/events/:eventId', requireAuth, (req, res) => {
  const eventId = parseEventId(req)
  const event = eventId ? events.findEventById(eventId, req.userId) : null

  if (!event) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  return res.status(200).json({ event })
})

//Calls registerUser. The answer is 404, 409 already registered, 409 full, or 201 with “You are registered for this event.” The latest event data always comes back
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

//Calls cancelRegistration. The answer is 404 if you weren’t registered, or 200 “Your registration has been cancelled.”
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