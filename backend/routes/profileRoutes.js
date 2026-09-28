const express = require('express')
const users = require('../data/users')
const { hashPassword, isValidPassword } = require('../utils/password')
const { isValidEmail } = require('../utils/validators')

const router = express.Router()

function toPublicProfile(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    studentId: user.studentId,
    profilePictureUrl: user.profilePictureUrl,
    memberSince: user.createdAt
  }
}

// Mirrors frontend/src/ProfilePage.jsx
router.get('/profile/:userId', (req, res) => {
  const userId = Number(req.params.userId)
  const user = users.findById(userId)

  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  // Clubs and Events tables don't exist yet, so a new account has none of either.
  return res.status(200).json({
    user: toPublicProfile(user),
    clubs: [],
    events: [],
    points: 0
  })
})

router.put('/profile/:userId', (req, res) => {
  const userId = Number(req.params.userId)
  const user = users.findById(userId)

  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  const { fullName, email, password } = req.body || {}
  const updates = {}

  if (fullName !== undefined) {
    const trimmedFullName = String(fullName).trim()
    if (trimmedFullName.length < 2) {
      return res.status(400).json({ message: 'Full name must be at least 2 characters long.' })
    }
    updates.fullName = trimmedFullName
  }

  if (email !== undefined) {
    const trimmedEmail = String(email).trim().toLowerCase()
    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({ message: 'Email must follow the format: username@domain.extension' })
    }
    const existing = users.findByEmail(trimmedEmail)
    if (existing && existing.id !== userId) {
      return res.status(409).json({ message: 'Email address is already registered.' })
    }
    updates.email = trimmedEmail
  }

  if (password) {
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.'
      })
    }
    updates.passwordHash = hashPassword(password)
  }

  const updatedUser = users.updateUser(userId, updates)

  return res.status(200).json({
    message: 'Profile updated successfully.',
    user: toPublicProfile(updatedUser)
  })
})

module.exports = router
