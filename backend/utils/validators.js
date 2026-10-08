function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(String(email).trim())
}

function isValidStudentId(studentId) {
  return /^\d{8}$/.test(String(studentId).trim())
}

// Letters only, with single spaces between words (e.g. "Mina Taherzadeh").
function isValidFullName(fullName) {
  return /^\p{L}+(?: \p{L}+)*$/u.test(String(fullName).trim())
}

module.exports = { isValidEmail, isValidStudentId, isValidFullName }
