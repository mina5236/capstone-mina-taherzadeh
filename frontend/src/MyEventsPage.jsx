import { useEffect, useState } from 'react'
import './ProfilePage.css'
import { API } from './config.js'

function MyEventsPage({ user, onBack, onBrowse, onLogout }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [cancellingId, setCancellingId] = useState(null)

  const headers = { Authorization: `Bearer ${user.sessionToken}` }

  useEffect(() => {
    fetch(`${API}/events`, { headers })
      .then((res) => {
        if (res.status === 401) onLogout()
        return res.ok ? res.json() : { events: [] }
      })
      .then((data) => setEvents(data.events.filter((item) => item.isRegistered)))
      .catch(() => setMessage({ text: 'Could not load your events.', type: 'error' }))
      .finally(() => setLoading(false))
  }, [user.id])

  const cancel = async (eventId) => {
    if (cancellingId !== null) return

    setCancellingId(eventId)
    setMessage({ text: '', type: '' })

    try {
      const res = await fetch(`${API}/events/${eventId}/register`, { method: 'DELETE', headers })
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Could not cancel. Please try again.')

      setEvents((prev) => prev.filter((item) => item.id !== eventId))
      setMessage({ text: data.message, type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return null

  return (
    <main className="profile-shell">
      <header className="profile-banner">
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to dashboard">
          ←
        </button>
        <h1>My Registered Events</h1>
      </header>

      <div className="profile-body">
        <section className="profile-card">
          <h2>🎉 Registered Events</h2>
          {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}

          {events.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">🎉</span>
              <p>You haven't registered for any events yet</p>
              <button type="button" className="primary-btn" onClick={onBrowse}>
                Browse Events
              </button>
            </div>
          ) : (
            events.map((item) => (
              <div className="profile-info-row" key={item.id}>
                <span className="profile-info-icon">🎉</span>
                <div>
                  <p className="profile-info-value">{item.title}</p>
                  <p className="profile-info-label">📅 {item.date}</p>
                  <p className="profile-info-label">🏛️ {item.clubName} · 📍 {item.location}</p>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={cancellingId === item.id}
                    onClick={() => cancel(item.id)}
                  >
                    {cancellingId === item.id ? 'Cancelling...' : 'Cancel'}
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

export default MyEventsPage