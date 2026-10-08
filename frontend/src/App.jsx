import { useState } from 'react'
import LoginPage from './LoginPage'
import SignUpPage from './SignUpPage'
import DashboardPage from './DashboardPage'
import ProfilePage from './ProfilePage'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const resetToken = new URLSearchParams(window.location.search).get('resetToken')
  const [view, setView] = useState('dashboard')

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    setView('dashboard')
  }

  const handleLogout = () => {
    if (currentUser?.sessionToken) {
      // Best effort: the user is logged out locally even if this request fails.
      void (async () => {
        try {
          await fetch('http://localhost:3001/api/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${currentUser.sessionToken}` },
          })
        } catch {
          // ignored on purpose
        }
      })()
    }

    setCurrentUser(null)
    setView('dashboard')
  }

  const clearResetToken = () => {
    window.history.replaceState({}, '', window.location.pathname)
  }

  if (currentUser) {
    if (view === 'profile') {
      return <ProfilePage user={currentUser} onBack={() => setView('dashboard')} onLogout={handleLogout} />
    }

    return <DashboardPage user={currentUser} onLogout={handleLogout} onNavigate={setView} />
  }

  if (view === 'signup') {
    return <SignUpPage onBackToLogin={() => setView('login')} />
  }

  return (
    <LoginPage
      onLoginSuccess={handleLoginSuccess}
      onCreateAccount={() => setView('signup')}
      resetToken={resetToken}
      onResetTokenCleared={clearResetToken}
    />
  )
}

export default App
