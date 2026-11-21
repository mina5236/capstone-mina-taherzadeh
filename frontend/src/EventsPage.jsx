import { useEffect, useState } from 'react'
import './ProfilePage.css'
import { API } from './config.js'

function EventsPage({ user, onBack, onLogout }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)

  const authHeaders = { Authorization: `Bearer ${user.sessionToken}` }

  useEffect(() => {
    //Loads all events
    const loadEvents = async () => {
      try {
        const response = await fetch(`${API}/events`, { headers: authHeaders })
        const data = await response.json()

        if (response.status === 401) {
          onLogout()
          return
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load events.')
        }

        setEvents(data.events)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [user.id])

  //Replaces one event in the list with the fresh copy from the server
  const updateEvent = (updated) => {
    setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  //Sends POST (register) or DELETE (cancel)
  const changeRegistration = async (eventId, method) => {
    if (submitting) return

    setSubmitting(true)
    setMessage({ text: '', type: '' })

    try {
      const response = await fetch(`${API}/events/${eventId}/register`, { method, headers: authHeaders })
      const data = await response.json()

      if (response.status === 401) {
        onLogout()
        return
      }

      // The server sends the latest event data even on errors, so counts stay correct.
      if (data.event) {
        updateEvent(data.event)
      }

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong. Please try again.')
      }

      setMessage({ text: data.message, type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }


    //Sends POST (save) or DELETE (remove) for the wish list - F5.4
  const changeSaved = async (eventId, method) => {
    if (saving) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const response = await fetch(`${API}/events/${eventId}/save`, { method, headers: authHeaders })
      const data = await response.json()

      if (response.status === 401) {
        onLogout()
        return
      }

      if (data.event) {
        updateEvent(data.event)
      }

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong. Please try again.')
      }

      setMessage({ text: data.message, type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // F5.5: share an event
  const shareText = (item) => `${item.title} - ${item.date} at ${item.location} (${item.clubName}) #CampusConnect`
  const shareLink = () => window.location.origin + window.location.pathname

  const shareOnX = (item) => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText(item))}&url=${encodeURIComponent(shareLink())}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Instagram has no web share link, so the text is copied to paste into a post or story.
  const copyForInstagram = async (item) => {
    try {
      await navigator.clipboard.writeText(`${shareText(item)} ${shareLink()}`)
      setMessage({ text: 'Event details copied. Paste them into your Instagram post or story.', type: 'success' })
    } catch {
      setMessage({ text: 'Could not copy automatically. Please copy the event details by hand.', type: 'error' })
    }
  }

  const selectEvent = (id) => {
    setSelectedId(id)
    setMessage({ text: '', type: '' })
  }

  const selected = events.find((item) => item.id === selectedId)

  const feedback = message.text && <p className={`form-message ${message.type}`}>{message.text}</p>

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

  if (selected) {
    const isFull = selected.currentCount >= selected.maxCapacity
    const spotsLeft = Math.max(selected.maxCapacity - selected.currentCount, 0)

    return (
      <main className="profile-shell">
        <header className="profile-banner">
          <button type="button" className="profile-back-btn" onClick={() => selectEvent(null)} aria-label="Back to events">
            ←
          </button>
          <h1>{selected.title}</h1>
          <p className="profile-student-id">🏛️ {selected.clubName}</p>
        </header>

        <div className="profile-body">
          <section className="profile-card">
            <h2>📋 Event Details</h2>
            <div className="profile-info-row">
              <div>
                <p className="profile-info-label">Description</p>
                <p className="profile-info-value">{selected.description || 'No description provided.'}</p>
              </div>
            </div>
            <div className="profile-info-row">
              <div>
                <p className="profile-info-label">Date</p>
                <p className="profile-info-value">📅 {selected.date}</p>
              </div>
            </div>
            <div className="profile-info-row">
              <div>
                <p className="profile-info-label">Location</p>
                <p className="profile-info-value">📍 {selected.location}</p>
              </div>
            </div>
            <div className="profile-info-row">
              <div>
                <p className="profile-info-label">Spots</p>
                <p className="profile-info-value">
                  {selected.currentCount} / {selected.maxCapacity} registered ({spotsLeft} left)
                </p>
              </div>
            </div>
          </section>

          {feedback}

          {selected.isRegistered ? (
            <button
              type="button"
              className="secondary-btn"
              disabled={submitting}
              onClick={() => changeRegistration(selected.id, 'DELETE')}
            >
              {submitting ? 'Cancelling...' : 'Cancel Registration'}
            </button>
          ) : (
            <button
              type="button"
              className="primary-btn"
              disabled={submitting || isFull}
              onClick={() => changeRegistration(selected.id, 'POST')}
            >
              {isFull ? 'Event Full' : submitting ? 'Registering...' : 'Register'}
            </button>
          )}
          
          <button
            type="button"
            className="secondary-btn"
            disabled={saving}
            onClick={() => changeSaved(selected.id, selected.isSaved ? 'DELETE' : 'POST')}
          >
            {selected.isSaved ? '★ Saved (click to remove)' : '☆ Save Event'}
          </button>
          <button type="button" className="secondary-btn" onClick={() => shareOnX(selected)}>
            🐦 Share on X
          </button>
          <button type="button" className="secondary-btn" onClick={() => copyForInstagram(selected)}>
            📸 Copy for Instagram
          </button>
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
        <h1>Campus Events</h1>
      </header>

      <div className="profile-body">
        <section className="profile-card">
          <h2>🎪 All Events</h2>
          {events.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">🎪</span>
              <p>No events available yet</p>
            </div>
          ) : (
            events.map((item) => (
              <div className="profile-info-row" key={item.id}>
                <span className="profile-info-icon">🎉</span>
                <div>
                  <p className="profile-info-value">{item.title}</p>
                  <p className="profile-info-label">
                    📅 {item.date} · 🏛️ {item.clubName}
                    {item.isRegistered ? ' · ✅ Registered' : ''}
                    {item.isSaved ? ' · ⭐ Saved' : ''}
                  </p>
                  <button type="button" className="secondary-btn" onClick={() => selectEvent(item.id)}>
                    View Details
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

export default EventsPage