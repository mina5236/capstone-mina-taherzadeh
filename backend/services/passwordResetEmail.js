const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
const MAX_ATTEMPTS = 4
const ATTEMPT_TIMEOUT_MS = 5000

function isConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL)
}

// The provider can have IPs that hang on some networks; a short timeout plus retry reaches a working one.
async function postWithRetry(url, options) {
  let lastError

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

async function sendPasswordResetEmail(email, token) {
  if (!isConfigured()) {
    throw new Error('BREVO_API_KEY and BREVO_SENDER_EMAIL must be configured.')
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const resetUrl = new URL('/', frontendUrl)
  resetUrl.searchParams.set('resetToken', token)

  const response = await postWithRetry(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || 'Campus Connect',
      },
      to: [{ email }],
      subject: 'Reset your Campus Connect password',
      textContent: `Use this link to reset your Campus Connect password. It expires in 30 minutes:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
      htmlContent: `<p>Use the link below to reset your Campus Connect password. It expires in 30 minutes.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Brevo API error ${response.status}: ${body}`)
  }
}

module.exports = { isConfigured, sendPasswordResetEmail }