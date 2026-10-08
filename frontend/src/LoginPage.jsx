import { useState } from 'react'
import './LoginPage.css'

const initialLogin = {
  email: '',
  password: '',
}

function LoginPage({ onLoginSuccess, onCreateAccount, resetToken, onResetTokenCleared }) {
  const [login, setLogin] = useState(initialLogin)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [showResetModal, setShowResetModal] = useState(Boolean(resetToken))
  const [resetEmail, setResetEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetMessageType, setResetMessageType] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLogin((prev) => ({ ...prev, [name]: value }))
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setMessageType('')

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: login.email,
          password: login.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.')
      }

      setMessageType('success')
      setMessage(`Welcome back, ${data.user.fullName}!`)
      setLogin(initialLogin)
      onLoginSuccess?.({ ...data.user, sessionToken: data.token })
    } catch (error) {
      setMessageType('error')
      setMessage(error.message)
    }
  }

  const closeResetModal = () => {
    setShowResetModal(false)
    if (resetToken) onResetTokenCleared?.()
  }

  const handleResetSubmit = async (event) => {
    event.preventDefault()
    setResetMessage('')
    setResetMessageType('')

    if (resetToken && newPassword !== confirmNewPassword) {
      setResetMessageType('error')
      setResetMessage('Passwords do not match.')
      return
    }

    setResetSubmitting(true)

    try {
      const response = await fetch(
        `http://localhost:3001/api/password-reset/${resetToken ? 'confirm' : 'request'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            resetToken
              ? { token: resetToken, password: newPassword }
              : { email: resetEmail },
          ),
        },
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to request a password reset.')
      }

      setResetMessageType('success')
      setResetMessage(data.message)
      if (resetToken) {
        setNewPassword('')
        setConfirmNewPassword('')
      }
    } catch (error) {
      setResetMessageType('error')
      setResetMessage(error.message)
    } finally {
      setResetSubmitting(false)
    }
  }

  const openResetModal = () => {
    setResetEmail(login.email)
    setResetMessage('')
    setResetMessageType('')
    setShowResetModal(true)
  }

  return (
    <main className="page-shell">
      <section className="login-card">
        <header className="brand-block">
          <div className="brand-badge" aria-label="Campus Connect logo">
            <span className="tent">🎪</span>
          </div>

          <h1 className="title-line">
            Campus Connect ✦
          </h1>

          <p className="subtitle">Join the fun &amp; make memories! 🌈</p>
        </header>

        <section className="login-panel">
          <h2>Welcome Back! 👋</h2>

          <p className="intro-text">Let&apos;s continue the adventure! 🚀</p>

          <form className="login-form" onSubmit={handleLoginSubmit}>
            <label className="field-group" htmlFor="email">
              <span className="field-label">✉️ Email</span>
              <div className="input-shell">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={login.email}
                  onChange={handleLoginChange}
                  placeholder="Enter your email"
                  aria-label="Email"
                />
              </div>
            </label>

            <label className="field-group" htmlFor="password">
              <span className="field-label">🔒 Password</span>
              <div className="input-shell password-shell">
                <input
                  id="password"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={login.password}
                  onChange={handleLoginChange}
                  placeholder="Enter your password"
                  aria-label="Password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowLoginPassword((visible) => !visible)}
                >
                  👁️
                </button>
              </div>
            </label>

            {message && <p className={`form-message ${messageType}`}>{message}</p>}

            <button type="button" className="forgot-link" onClick={openResetModal}>
              Forgot password? 😬
            </button>

            <button type="submit" className="primary-btn">
              Sign In 🎉
            </button>

            <div className="divider">✦ New to Campus? ✦</div>

            <button type="button" className="secondary-btn" onClick={onCreateAccount}>
              Create Account 🎊
            </button>
          </form>
        </section>

        <footer className="legal-text">
          <span>
            By continuing, you agree to our <a href="#">Terms &amp; Privacy</a>
            <span className="wrap-text">Policy</span>
          </span>
        </footer>
      </section>
      {showResetModal && (
        <div
          className="reset-modal-backdrop"
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeResetModal()
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeResetModal()
          }}
        >
          <section
            className="reset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <button
              type="button"
              className="reset-modal-close"
              aria-label="Close password reset"
              onClick={closeResetModal}
            >
              ×
            </button>
            <h2 id="reset-modal-title">{resetToken ? 'Reset Password' : 'Forgot Password?'}</h2>
            <p>
              {resetToken
                ? 'Choose a new password for your account.'
                : 'Enter your account email and we’ll send you a secure reset link.'}
            </p>
            <form onSubmit={handleResetSubmit}>
              {!resetToken && (
                <label className="field-group" htmlFor="resetEmail">
                  <span className="field-label">✉️ Email</span>
                  <div className="input-shell">
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      placeholder="Enter your account email"
                      autoComplete="email"
                      aria-label="Email to reset"
                      autoFocus
                      required
                    />
                  </div>
                </label>
              )}
              {resetToken && (
                <>
                  <label className="field-group" htmlFor="newPassword">
                    <span className="field-label">🔒 New Password</span>
                    <div className="input-shell">
                      <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Create a new password"
                        minLength="8"
                        pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}"
                        title="Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number."
                        aria-label="New password"
                        autoFocus
                        required
                      />
                    </div>
                  </label>
                  <label className="field-group" htmlFor="confirmNewPassword">
                    <span className="field-label">🔐 Confirm New Password</span>
                    <div className="input-shell">
                      <input
                        id="confirmNewPassword"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(event) => setConfirmNewPassword(event.target.value)}
                        placeholder="Re-enter new password"
                        aria-label="Confirm new password"
                        required
                      />
                    </div>
                  </label>
                </>
              )}
              {resetMessage && (
                <p className={`form-message ${resetMessageType}`} role="status">
                  {resetMessage}
                </p>
              )}
              <button type="submit" className="primary-btn" disabled={resetSubmitting}>
                {resetSubmitting
                  ? 'Sending…'
                  : resetToken
                    ? 'Update Password'
                    : 'Send Reset Link'}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default LoginPage
