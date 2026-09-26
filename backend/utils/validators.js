function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(String(email).trim())
}

function isValidStudentId(studentId) {
  return /^\d{8}$/.test(String(studentId).trim())
}

module.exports = { isValidEmail, isValidStudentId }
