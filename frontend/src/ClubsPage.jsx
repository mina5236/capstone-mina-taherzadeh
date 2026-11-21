import { useEffect, useState } from 'react'
import './ProfilePage.css'
import { API } from './config.js'

// F5.1: browse the active clubs and see the events of each club.
function ClubsPage({ user, onBack, onLogout }) {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [selectedClub, setSelectedClub] = useState(null)
  const [opening, setOpening] = useState(false)

  const authHeaders = { Authorization: `Bearer ${user.sessionToken}` }

  useEffect(() => {
    const loadClubs = async () => {
      try {
        const response = await fetch(`${API}/clubs`, { headers: authHeaders })
        const data = await response.json()

        if (response.status === 401) {
          onLogout()
          return
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load clubs.')
        }

        setClubs(data.clubs)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadClubs()
  }, [user.id])

  // Loads one club with its events.
  const openClub = async (clubId) => {
    if (opening) return

    setOpening(true)
    setMessage({ text: '', type: '' })

    try {
      const response = await fetch(`${API}/clubs/${clubId}`, { headers: authHeaders })
      const data = await response.json()

      if (response.status === 401) {
        onLogout()
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Could not open this club.')
      }

      setSelectedClub(data.club)
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setOpening(false)
    }
  }

  if (error) {
    return (
      <main className="profile-shell">
        <p className="form-message error">{error}</p>
        <button type="button" className="secondary-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </main>
    )
  }

  if (loading) {
    return null
  }

  if (selectedClub) {
    return (
      <main className="profile-shell">
        <header className="profile-banner">
          <button
            type="button"
            className="profile-back-btn"
            onClick={() => setSelectedClub(null)}
            aria-label="Back to clubs"
          >
            ←
          </button>
          <h1>{selectedClub.name}</h1>
        </header>

        <div className="profile-body">
          <section className="profile-card">
            <h2>📋 About This Club</h2>
            <p className="profile-info-value">{selectedClub.description || 'No description provided.'}</p>
          </section>

          <section className="profile-card">
            <h2>🎪 Events</h2>
            {selectedClub.events.length === 0 ? (
              <div className="profile-empty-state">
                <span aria-hidden="true">🎪</span>
                <p>This club has no events yet</p>
              </div>
            ) : (
              selectedClub.events.map((item) => (
                <div className="profile-info-row" key={item.id}>
                  <span className="profile-info-icon">🎉</span>
                  <div>
                    <p className="profile-info-value">{item.title}</p>
                    <p className="profile-info-label">
                      📅 {item.date} · 📍 {item.location}
                    </p>
                    <p className="profile-info-label">
                      👥 {item.currentCount} / {item.maxCapacity} registered
                    </p>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="profile-shell">
      <header className="profile-banner">
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to dashboard">
          ←
        </button>
        <h1>Campus Clubs</h1>
      </header>

      <div className="profile-body">
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}

        <section className="profile-card">
          <h2>🏛️ All Clubs</h2>
          {clubs.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">🏛️</span>
              <p>No clubs available yet</p>
            </div>
          ) : (
            clubs.map((club) => (
              <div className="profile-info-row" key={club.id}>
                <span className="profile-info-icon">🏛️</span>
                <div>
                  <p className="profile-info-value">{club.name}</p>
                  {club.description && <p className="profile-info-label">{club.description}</p>}
                  <p className="profile-info-label">
                    🎪 {club.eventCount} {club.eventCount === 1 ? 'event' : 'events'}
                  </p>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={opening}
                    onClick={() => openClub(club.id)}
                  >
                    View Club
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  )
}

export default ClubsPage