const express = require('express')
const clubRequests = require('../data/clubRequests')
const { requireAuth } = require('../utils/requireAuth')
const { requireAdmin } = require('../utils/requireAdmin')
const { isValidEmail } = require('../utils/validators')

const router = express.Router()

function readRequestForm(body) {
  const clubName = String(body.clubName || '').trim()
  const description = String(body.description || '').trim()
  const contactEmail = String(body.contactEmail || '').trim().toLowerCase()
  const purpose = String(body.purpose || '').trim()

  if (clubName.length < 3 || clubName.length > 60) {
    return { error: 'Club name must be between 3 and 60 characters.' }
  }
  if (description.length < 20 || description.length > 500) {
    return { error: 'Club description must be between 20 and 500 characters.' }
  }
  if (!isValidEmail(contactEmail)) {
    return { error: 'Please enter a valid contact email address.' }
  }
  if (purpose.length < 10 || purpose.length > 500) {
    return { error: "Please explain the club's purpose and planned activities (10 to 500 characters)." }
  }

  return { values: { clubName, description, contactEmail, purpose } }
}

function parseRequestId(req) {
  const id = Number(req.params.requestId)
  return Number.isInteger(id) && id > 0 ? id : null
}

// Student: submit a request. Name and student ID come from the logged-in account.
router.post('/club-requests', requireAuth, (req, res) => {
  const form = readRequestForm(req.body || {})

  if (form.error) {
    return res.status(400).json({ message: form.error })
  }

  const result = clubRequests.submitRequest(req.userId, form.values)

  if (result.error === 'ALREADY_PENDING') {
    return res.status(409).json({ message: 'You already have a club request waiting for review.' })
  }

  if (result.error === 'NAME_TAKEN') {
    return res.status(409).json({ message: 'A club with this name already exists or has been requested.' })
  }

  return res.status(201).json({
    message: 'Your club request has been submitted. An administrator will review it soon.',
    request: result.request
  })
})

// Student: see their own requests and their status.
router.get('/club-requests/mine', requireAuth, (req, res) => {
  return res.status(200).json({ requests: clubRequests.listByUser(req.userId) })
})

// Platform admin: pending requests.
router.get('/admin/club-requests', requireAdmin, (req, res) => {
  return res.status(200).json({ requests: clubRequests.listPending() })
})

function reviewResponse(res, result, successMessage) {
  if (result.error === 'NOT_FOUND') {
    return res.status(404).json({ message: 'Club request not found.' })
  }

  if (result.error === 'ALREADY_REVIEWED') {
    return res.status(409).json({ message: 'This request has already been reviewed.' })
  }

  if (result.error === 'NAME_TAKEN') {
    return res.status(409).json({ message: 'A club with this name already exists.' })
  }

  return res.status(200).json({ message: successMessage })
}

router.post('/admin/club-requests/:requestId/approve', requireAdmin, (req, res) => {
  const requestId = parseRequestId(req)

  if (!requestId) {
    return res.status(404).json({ message: 'Club request not found.' })
  }

  return reviewResponse(res, clubRequests.approveRequest(requestId), 'Club request approved. The club is now active.')
})

router.post('/admin/club-requests/:requestId/reject', requireAdmin, (req, res) => {
  const requestId = parseRequestId(req)

  if (!requestId) {
    return res.status(404).json({ message: 'Club request not found.' })
  }

  return reviewResponse(res, clubRequests.rejectRequest(requestId), 'Club request rejected.')
})

module.exports = router