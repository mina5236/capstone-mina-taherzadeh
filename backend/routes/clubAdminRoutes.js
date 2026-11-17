const express = require('express')
const clubEvents = require('../data/clubEvents')
const { requireClubAdmin } = require('../utils/requireClubAdmin')
const { cleanText, hasMarkup } = require('../utils/sanitize')

const router = express.Router()

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

// Cleans and checks the event form: title, description, date, time, location, capacity.
function readEventForm(body) {
  const title = cleanText(body.title)
  const description = cleanText(body.description)
  const location = cleanText(body.location)
  const date = String(body.date || '').trim()
  const time = String(body.time || '').trim()
  const maxCapacity = Number(body.maxCapacity)

  if ([title, description, location].some(hasMarkup)) {
    return { error: 'Please remove "<" and ">" characters from the form.' }
  }
  if (title.length < 3 || title.length > 100) {
    return { error: 'Event title must be between 3 and 100 characters.' }
  }
  if (description.length < 10 || description.length > 1000) {
    return { error: 'Event description must be between 10 and 1000 characters.' }
  }
  if (!isValidDate(date)) {
    return { error: 'Please choose a valid date.' }
  }
  if (!isValidTime(time)) {
    return { error: 'Please choose a valid time.' }
  }
  if (location.length < 2 || location.length > 100) {
    return { error: 'Location must be between 2 and 100 characters.' }
  }
  if (!Number.isInteger(maxCapacity) || maxCapacity < 1 || maxCapacity > 1000) {
    return { error: 'Maximum capacity must be a whole number between 1 and 1000.' }
  }

  return { values: { title, description, location, eventDate: `${date} ${time}:00`, maxCapacity } }
}

// Clubs this admin runs (for the create form).
router.get('/club-admin/clubs', requireClubAdmin, (req, res) => {
  return res.status(200).json({ clubs: clubEvents.listClubsByAdmin(req.userId) })
})

// All events of this admin's clubs.
router.get('/club-admin/events', requireClubAdmin, (req, res) => {
  return res.status(200).json({ events: clubEvents.listByAdmin(req.userId) })
})

// F4.1: create an event.
router.post('/club-admin/events', requireClubAdmin, (req, res) => {
  const body = req.body || {}
  const clubId = parseId(body.clubId)

  if (!clubId) {
    return res.status(400).json({ message: 'Please choose a club.' })
  }

  const form = readEventForm(body)

  if (form.error) {
    return res.status(400).json({ message: form.error })
  }

  const result = clubEvents.createEvent(req.userId, { clubId, ...form.values })

  if (result.error) {
    return res.status(403).json({ message: 'You can only create events for your own active clubs.' })
  }

  return res.status(201).json({ message: 'Event created.', event: result.event })
})

// F4.2: edit an event.
router.put('/club-admin/events/:eventId', requireClubAdmin, (req, res) => {
  const eventId = parseId(req.params.eventId)

  if (!eventId) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const form = readEventForm(req.body || {})

  if (form.error) {
    return res.status(400).json({ message: form.error })
  }

  const result = clubEvents.updateEvent(eventId, req.userId, form.values)

  if (result.error === 'NOT_FOUND') {
    return res.status(404).json({ message: 'Event not found.' })
  }
  if (result.error === 'CAPACITY_TOO_LOW') {
    return res.status(409).json({
      message: `Capacity cannot be lower than the ${result.registered} students already registered.`
    })
  }

  return res.status(200).json({ message: 'Event updated.', event: result.event })
})

// F4.3: delete an event.
router.delete('/club-admin/events/:eventId', requireClubAdmin, (req, res) => {
  const eventId = parseId(req.params.eventId)
  const result = eventId ? clubEvents.deleteEvent(eventId, req.userId) : { error: 'NOT_FOUND' }

  if (result.error) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  return res.status(200).json({ message: 'Event deleted.' })
})

// F4.4: students registered for an event.
router.get('/club-admin/events/:eventId/registrations', requireClubAdmin, (req, res) => {
  const eventId = parseId(req.params.eventId)
  const result = eventId ? clubEvents.listRegistrations(eventId, req.userId) : null

  if (!result) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  return res.status(200).json(result)
})

module.exports = router