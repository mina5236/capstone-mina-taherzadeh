import { useState } from 'react'
import LoginPage from './LoginPage'
import SignUpPage from './SignUpPage'
import DashboardPage from './DashboardPage'
import ProfilePage from './ProfilePage'
import EventsPage from './EventsPage'
import MyEventsPage from './MyEventsPage'
import ClubRequestPage from './ClubRequestPage'
import AdminClubRequestsPage from './AdminClubRequestsPage'
import AdminDashboardPage from './AdminDashboardPage'
import AdminUsersPage from './AdminUsersPage'
import AdminClubsPage from './AdminClubsPage'
import ClubEventsPage from './ClubEventsPage'
import ClubsPage from './ClubsPage'
import SavedEventsPage from './SavedEventsPage'
import { API } from './config.js'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const resetToken = new URLSearchParams(window.location.search).get('resetToken')
  const [view, setView] = useState('dashboard')
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [eventOrigin, setEventOrigin] = useState('dashboard')

  const openEvent = (eventId, origin) => {
    setEventOrigin(origin)
    setSelectedEventId(eventId)
    setView('eventDetails')
  }

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    setView('dashboard')
  }

  const handleLogout = () => {
    if (currentUser?.sessionToken) {
      // Best effort: the user is logged out locally even if this request fails.
      void (async () => {
        try {
          await fetch(`${API}/logout`, {
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

  const handleProfileUpdated = (updatedUser) => {
    setCurrentUser((prev) => ({ ...prev, ...updatedUser }))
  }

  const clearResetToken = () => {
    window.history.replaceState({}, '', window.location.pathname)
  }

  if (currentUser) {
    if (view === 'profile') {
      return <ProfilePage user={currentUser} onBack={() => setView('dashboard')} onLogout={handleLogout} onProfileUpdated={handleProfileUpdated}/>
    }

    if (view === 'events') {
      return <EventsPage user={currentUser} onBack={() => setView('dashboard')} onLogout={handleLogout} />
    }

    if (view === 'eventDetails') {
      return (
        <EventsPage
          user={currentUser}
          initialEventId={selectedEventId}
          onBack={() => setView(eventOrigin)}
          onLogout={handleLogout}
        />
      )
    }

    if (view === 'myEvents') {
      return <MyEventsPage user={currentUser} onBack={() => setView('dashboard')} onBrowse={() => setView('events')} onLogout={handleLogout}/>
    }

    if (view === 'clubRequest') {
      return <ClubRequestPage user={currentUser} onBack={() => setView('dashboard')} onLogout={handleLogout} />
      }
      
    if (view === 'manageEvents') {
      return <ClubEventsPage user={currentUser} onBack={() => setView('dashboard')} onLogout={handleLogout} />
    }
    
    if (view === 'adminDashboard') {
      return <AdminDashboardPage user={currentUser} onBack={() => setView('dashboard')} onLogout={handleLogout} onNavigate={setView} />
    }

    if (view === 'adminRequests') {
      return <AdminClubRequestsPage user={currentUser} onBack={() => setView('adminDashboard')} onLogout={handleLogout} />
    }

    if (view === 'adminUsers') {
      return <AdminUsersPage user={currentUser} onBack={() => setView('adminDashboard')} onLogout={handleLogout} />
    }

    if (view === 'adminClubs') {
      return <AdminClubsPage user={currentUser} onBack={() => setView('adminDashboard')} onLogout={handleLogout} />
    }

    if (view === 'clubs') {
      return (
        <ClubsPage
          user={currentUser}
          onBack={() => setView('dashboard')}
          onOpenEvent={(eventId) => openEvent(eventId, 'clubs')}
          onLogout={handleLogout}
        />
      )
    }

    if (view === 'savedEvents') {
      return (
        <SavedEventsPage
          user={currentUser}
          onBack={() => setView('dashboard')}
          onBrowse={() => setView('events')}
          onOpenEvent={(eventId) => openEvent(eventId, 'savedEvents')}
          onLogout={handleLogout}
        />
      )
    }

    return (
      <DashboardPage
        user={currentUser}
        onLogout={handleLogout}
        onNavigate={(target, eventId) => {
          if (target === 'eventDetails') {
            openEvent(eventId, 'dashboard')
          } else {
            setView(target)
          }
        }}
      />
    )
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
