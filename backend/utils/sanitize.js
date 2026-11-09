// Removes hidden control characters and surrounding spaces from user text.
function cleanText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
}

// True if the text contains characters used to write HTML tags.
function hasMarkup(value) {
  return /[<>]/.test(String(value ?? ''))
}

module.exports = { cleanText, hasMarkup }