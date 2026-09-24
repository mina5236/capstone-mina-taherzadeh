import { useState } from 'react'
import './App.css'
import LoginPage from './LoginPage'
import DashboardPage from './DashboardPage'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  if (isAuthenticated) {
    return <DashboardPage />
  }

  return <LoginPage onLoginSuccess={handleLoginSuccess} />
}

export default App
