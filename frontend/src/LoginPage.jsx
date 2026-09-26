import { useState } from 'react'

const initialSignup = {
  fullName: '',
  email: '',
  studentId: '',
  password: '',
  confirmPassword: '',
}

const initialLogin = {
  email: '',
  password: '',
}

function LoginPage({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [signup, setSignup] = useState(initialSignup)
  const [login, setLogin] = useState(initialLogin)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const handleSignupChange = (event) => {
    const { name, value } = event.target
    setSignup((prev) => ({ ...prev, [name]: value }))
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLogin((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignupSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setMessageType('')

    if (signup.password !== signup.confirmPassword) {
      setMessageType('error')
      setMessage('Passwords do not match.')
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: signup.fullName,
          email: signup.email,
          studentId: signup.studentId,
          password: signup.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed.')
      }

      setMessageType('success')
      setMessage('Account created successfully!')
      setSignup(initialSignup)
      setIsSignUp(false)
    } catch (error) {
      setMessageType('error')
      setMessage(error.message)
    }
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
      onLoginSuccess?.(data.user)
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

          <p className="subtitle">
            {isSignUp ? 'Create your campus story ✧' : 'Join the fun & make memories! 🌈'}
          </p>
        </header>

        {isSignUp ? (
          <section className="login-panel">
            <h2>Sign Up 👋</h2>

            <p className="intro-text">Let&apos;s build your new campus adventure 🚀</p>

            <form className="login-form signup-form" onSubmit={handleSignupSubmit}>
              <label className="field-group" htmlFor="fullName">
                <span className="field-label">✦ Full Name</span>
                <div className="input-shell">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={signup.fullName}
                    onChange={handleSignupChange}
                    placeholder="Enter your full name"
                    aria-label="Full Name"
                  />
                </div>
              </label>

              <label className="field-group" htmlFor="signupEmail">
                <span className="field-label">✉️ Email</span>
                <div className="input-shell">
                  <input
                    id="signupEmail"
                    name="email"
                    type="email"
                    value={signup.email}
                    onChange={handleSignupChange}
                    placeholder="name@college.ca"
                    aria-label="Email"
                  />
                </div>
              </label>

              <label className="field-group" htmlFor="studentId">
                <span className="field-label">🆔 Student ID</span>
                <div className="input-shell">
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    value={signup.studentId}
                    onChange={handleSignupChange}
                    placeholder="Enter 8-digit student ID"
                    aria-label="Student ID"
                  />
                </div>
              </label>

              <label className="field-group" htmlFor="signupPassword">
                <span className="field-label">🔒 Password</span>
                <div className="input-shell password-shell">
                  <input
                    id="signupPassword"
                    name="password"
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signup.password}
                    onChange={handleSignupChange}
                    placeholder="Create a password"
                    minLength="8"
                    pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}"
                    title="Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number."
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSignupPassword((visible) => !visible)}
                  >
                    👁️
                  </button>
                </div>
                  <span className="password-hint">
                    At least 8 characters, including uppercase, lowercase, and a number.
                  </span>
              </label>

              <label className="field-group" htmlFor="confirmPassword">
                <span className="field-label">🔐 Confirm Password</span>
                <div className="input-shell password-shell">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={signup.confirmPassword}
                    onChange={handleSignupChange}
                    placeholder="Re-enter password"
                    aria-label="Confirm password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                  >
                    👁️
                  </button>
                </div>
              </label>

              {message && <p className={`form-message ${messageType}`}>{message}</p>}

              <button type="submit" className="primary-btn">
                Create Account 🎉
              </button>

              <button type="button" className="secondary-btn login-switch" onClick={() => setIsSignUp(false)}>
                Already have an account?
              </button>
            </form>
          </section>
        ) : (
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

              <button type="button" className="secondary-btn" onClick={() => setIsSignUp(true)}>
                Create Account 🎊
              </button>
            </form>
          </section>
        )}

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
