const express = require('express')
const users = require('../data/users')
const { hashPassword, isValidPassword } = require('../utils/password')
const { isValidEmail, isValidStudentId } = require('../utils/validators')

const router = express.Router()

// Mirrors frontend/src/SignUpPage.jsx
router.post('/signup', (req, res) => {
  const { fullName, email, studentId, password } = req.body || {}

  if (!fullName || !email || !studentId || !password) {
    return res.status(400).json({
      message: 'Full name, email, student ID, and password are required.'
    })
  }

  const trimmedFullName = String(fullName).trim()
  const trimmedEmail = String(email).trim().toLowerCase()
  const trimmedStudentId = String(studentId).trim()

  if (trimmedFullName.length < 2) {
    return res.status(400).json({
      message: 'Full name must be at least 2 characters long.'
    })
  }

  if (!isValidEmail(trimmedEmail)) {
    return res.status(400).json({
      message: 'Email must follow the format: username@domain.extension'
    })
  }

  if (users.findByEmail(trimmedEmail)) {
    return res.status(409).json({
      message: 'Email address is already registered.'
    })
  }

  if (!isValidStudentId(trimmedStudentId)) {
    return res.status(400).json({
      message: 'Student ID must be exactly 8 numeric digits.'
    })
  }

  if (users.findByStudentId(trimmedStudentId)) {
    return res.status(409).json({
      message: 'Student ID is already associated with an existing account.'
    })
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.'
    })
  }

  const newUser = users.insertUser({
    fullName: trimmedFullName,
    email: trimmedEmail,
    studentId: trimmedStudentId,
    passwordHash: hashPassword(password)
  })

  return res.status(201).json({
    message: 'Registration successful.',
    user: {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      studentId: newUser.studentId
    }
  })
})

module.exports = router
