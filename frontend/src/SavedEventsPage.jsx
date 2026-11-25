import { useEffect, useState } from 'react'
import './ProfilePage.css'
import { API } from './config.js'

// F5.4: the student's wish list. Loads /events and keeps only the isSaved ones.
function SavedEventsPage({ user, onBack, onBrowse, onOpenEvent, onLogout }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [removingId, setRemovingId] = useState(null)

  const headers = { Authorization: `Bearer ${user.sessionToken}` }

  useEffect(() => {
    fetch(`${API}/events`, { headers })
      .then((res) => {
        if (res.status === 401) onLogout()
        return res.ok ? res.json() : { events: [] }
      })
      .then((data) => setEvents(data.events.filter((item) => item.isSaved)))
      .catch(() => setMessage({ text: 'Could not load your saved events.', type: 'error' }))
      .finally(() => setLoading(false))
  }, [user.id])

  // Sends DELETE, removes the event from the list, shows the confirmation.
  const remove = async (eventId) => {
    if (removingId !== null) return

    setRemovingId(eventId)
    setMessage({ text: '', type: '' })

    try {
      const res = await fetch(`${API}/events/${eventId}/save`, { method: 'DELETE', headers })
      const data = await res.json()

      if (res.status === 401) {
        onLogout()
        return
      }

      if (!res.ok) throw new Error(data.message || 'Could not remove the event. Please try again.')

      setEvents((prev) => prev.filter((item) => item.id !== eventId))
      setMessage({ text: data.message, type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) return null

  return (
    <main className="profile-shell">
      <header className="profile-banner">
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to dashboard">
          ←
        </button>
        <h1>My Wish List</h1>
      </header>

      <div className="profile-body">
        <section className="profile-card">
          <h2>⭐ Saved Events</h2>
          {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}

          {events.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">⭐</span>
              <p>You haven't saved any events yet</p>
              <button type="button" className="primary-btn" onClick={onBrowse}>
                Browse Events
              </button>
            </div>
          ) : (
            events.map((item) => (
              <div className="profile-info-row" key={item.id}>
                <span className="profile-info-icon">⭐</span>
                <div>
                  <p className="profile-info-value">{item.title}</p>
                  <p className="profile-info-label">📅 {item.date}</p>
                  <p className="profile-info-label">
                    🏛️ {item.clubName} · 📍 {item.location}
                    {item.isRegistered ? ' · ✅ Registered' : ''}
                  </p>
                  <button type="button" className="secondary-btn" onClick={() => onOpenEvent(item.id)}>
                    View Event
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={removingId === item.id}
                    onClick={() => remove(item.id)}
                  >
                    {removingId === item.id ? 'Removing...' : 'Remove'}
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

export default SavedEventsPage