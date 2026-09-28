import { useState } from 'react'
import LoginPage from './LoginPage'
import DashboardPage from './DashboardPage'
import ProfilePage from './ProfilePage'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [view, setView] = useState('dashboard')

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    setView('dashboard')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setView('dashboard')
  }

  if (currentUser) {
    if (view === 'profile') {
      return <ProfilePage user={currentUser} onBack={() => setView('dashboard')} onLogout={handleLogout} />
    }

    return <DashboardPage user={currentUser} onLogout={handleLogout} onNavigate={setView} />
  }

  return <LoginPage onLoginSuccess={handleLoginSuccess} />
}

export default App
