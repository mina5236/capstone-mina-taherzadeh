const express = require('express')
const users = require('../data/users')
const { hashPassword } = require('../utils/password')
const { createSessionToken, verifySessionToken, revokeSessionToken } = require('../utils/sessionToken')

const router = express.Router()

// Mirrors frontend/src/LoginPage.jsx
router.post('/login', (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required.'
    })
  }

  const trimmedEmail = String(email).trim().toLowerCase()
  const user = users.findByEmail(trimmedEmail)

  if (!user) {
    return res.status(401).json({
      message: 'Invalid email or password.'
    })
  }

  const enteredHash = hashPassword(password)

  if (user.passwordHash !== enteredHash) {
    return res.status(401).json({
      message: 'Invalid email or password.'
    })
  }

  users.updateLastLogin(user.id)
  const token = createSessionToken(user)

  return res.status(200).json({
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      studentId: user.studentId
    }
  })
})

router.post('/logout', (req, res) => {
  const match = /^Bearer (.+)$/.exec(req.get('Authorization') || '')
  const claims = match ? verifySessionToken(match[1]) : null

  if (!claims) {
    return res.status(401).json({
      message: 'Invalid or expired session.'
    })
  }

  revokeSessionToken(claims)

  return res.status(200).json({
    message: 'Logged out.'
  })
})

module.exports = router
