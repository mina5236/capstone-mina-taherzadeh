import { useState } from 'react'
import './LoginPage.css'

const initialLogin = {
  email: '',
  password: '',
}

function LoginPage({ onLoginSuccess, onCreateAccount }) {
  const [login, setLogin] = useState(initialLogin)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

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

            <a href="#" className="forgot-link">
              Forgot password? 😬
            </a>

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
    </main>
  )
}

export default LoginPage
