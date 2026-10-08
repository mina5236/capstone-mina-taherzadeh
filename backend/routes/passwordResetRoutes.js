const express = require('express')
const users = require('../data/users')
const passwordResetEmail = require('../services/passwordResetEmail')
const { hashPassword, isValidPassword } = require('../utils/password')
const { isValidEmail } = require('../utils/validators')
const {
  createPasswordResetToken,
  verifyPasswordResetToken,
  matchesPasswordResetUser,
} = require('../utils/passwordResetToken')

const router = express.Router()

router.post('/password-reset/request', async (req, res) => {
  const { email } = req.body || {}

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'A valid email address is required.' })
  }

  try {
    if (!passwordResetEmail.isConfigured()) {
      return res.status(503).json({
        message: 'Password reset email is temporarily unavailable. Please try again later.',
      })
    }

    const user = users.findByEmail(String(email).trim().toLowerCase())

    if (user) {
      await passwordResetEmail.sendPasswordResetEmail(
        user.email,
        createPasswordResetToken(user),
      )
    }
  } catch (error) {
    console.error('Unable to send password reset email:', error)
    return res.status(503).json({
      message: 'Password reset email is temporarily unavailable. Please try again later.',
    })
  }

  return res.status(200).json({
    message: 'If an account exists for this email, a password reset link will be sent.',
  })
})

router.post('/password-reset/confirm', (req, res) => {
  const { token, password } = req.body || {}

  if (!token || typeof token !== 'string' || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'A reset token and new password are required.' })
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.',
    })
  }

  try {
    const claims = verifyPasswordResetToken(token)
    const userId = claims?.sub

    if (!userId || !/^\d+$/.test(userId)) {
      return res.status(400).json({
        message: 'This password reset link is invalid or has expired. Request a new link.',
      })
    }

    const user = users.findById(Number(userId))

    if (!user || !matchesPasswordResetUser(claims, user)) {
      return res.status(400).json({
        message: 'This password reset link is invalid or has expired. Request a new link.',
      })
    }

    const updated = users.updatePasswordIfUnchanged(
      user.id,
      user.passwordHash,
      hashPassword(password),
    )

    if (!updated) {
      return res.status(400).json({
        message: 'This password reset link is invalid or has expired. Request a new link.',
      })
    }

    return res.status(200).json({ message: 'Password reset successful.' })
  } catch (error) {
    console.error('Unable to reset password:', error)
    return res.status(500).json({ message: 'Unable to reset password. Please try again.' })
  }
})

module.exports = router
