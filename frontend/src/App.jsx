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
