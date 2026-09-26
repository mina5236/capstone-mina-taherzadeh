import { useState } from 'react'
import LoginPage from './LoginPage'
import DashboardPage from './DashboardPage'

function App() {
  const [currentUser, setCurrentUser] = useState(null)

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
  }

  if (currentUser) {
    return <DashboardPage user={currentUser} />
  }

  return <LoginPage onLoginSuccess={handleLoginSuccess} />
}

export default App
