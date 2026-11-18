import { useEffect, useState } from 'react'
import './ProfilePage.css'
import './ClubRequestPage.css'
import { API } from './config.js'
import ClubEventForm from './ClubEventForm'
import ClubEventStudents from './ClubEventStudents'

// Club admin home for events: list, create, edit, delete and see registered students.
function ClubEventsPage({ user, onBack, onLogout }) {
  const [events, setEvents] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [screen, setScreen] = useState('list') // 'list' | 'form' | 'students'
  const [selected, setSelected] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const authHeaders = { Authorization: `Bearer ${user.sessionToken}` }

  const loadAll = async () => {
    try {
      const [eventsResponse, clubsResponse] = await Promise.all([
        fetch(`${API}/club-admin/events`, { headers: authHeaders }),
        fetch(`${API}/club-admin/clubs`, { headers: authHeaders })
      ])

      if (eventsResponse.status === 401 || clubsResponse.status === 401) {
        onLogout()
        return
      }

      const eventsData = await eventsResponse.json()
      const clubsData = await clubsResponse.json()

      if (!eventsResponse.ok) throw new Error(eventsData.message || 'Failed to load your events.')
      if (!clubsResponse.ok) throw new Error(clubsData.message || 'Failed to load your clubs.')

      setEvents(eventsData.events)
      setClubs(clubsData.clubs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [user.id])

  const handleSaved = (text) => {
    setMessage({ text, type: 'success' })
    setScreen('list')
    setSelected(null)
    loadAll()
  }

  const handleDelete = async (item) => {
    if (deletingId !== null) return

    const warning =
      item.currentCount > 0
        ? `Delete "${item.title}"? ${item.currentCount} registered student(s) will lose their registration.`
        : `Delete "${item.title}"?`

    if (!window.confirm(warning)) return

    setDeletingId(item.id)
    setMessage({ text: '', type: '' })

    try {
      const response = await fetch(`${API}/club-admin/events/${item.id}`, {
        method: 'DELETE',
        headers: authHeaders
      })
      const data = await response.json()

      if (response.status === 401) {
        onLogout()
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong. Please try again.')
      }

      setMessage({ text: data.message, type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      await loadAll()
      setDeletingId(null)
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

  if (screen === 'form') {
    return (
      <ClubEventForm
        user={user}
        clubs={clubs}
        event={selected}
        onCancel={() => {
          setScreen('list')
          setSelected(null)
        }}
        onSaved={handleSaved}
        onLogout={onLogout}
      />
    )
  }

  if (screen === 'students') {
    return (
      <ClubEventStudents
        user={user}
        event={selected}
        onBack={() => {
          setScreen('list')
          setSelected(null)
        }}
        onLogout={onLogout}
      />
    )
  }

  return (
    <main className="profile-shell">
      <header className="profile-banner">
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to dashboard">
          ←
        </button>
        <h1>Manage Events</h1>
      </header>

      <div className="profile-body">
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}

        <section className="profile-card">
          <h2>🎪 My Events</h2>

          {clubs.length === 0 ? (
            <p className="request-note">You need an active club before you can create events.</p>
          ) : (
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setSelected(null)
                setScreen('form')
              }}
            >
              ＋ Create Event
            </button>
          )}

          {events.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">🎪</span>
              <p>You haven't created any events yet</p>
            </div>
          ) : (
            events.map((item) => (
              <div className="profile-info-row" key={item.id}>
                <div>
                  <p className="profile-info-value">{item.title}</p>
                  <p className="profile-info-label">
                    📅 {item.date} · 📍 {item.location} · 🏛️ {item.clubName}
                  </p>
                  <p className="profile-info-label">
                    👥 {item.currentCount} / {item.maxCapacity} registered
                  </p>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setSelected(item)
                      setScreen('students')
                    }}
                  >
                    View Students
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setSelected(item)
                      setScreen('form')
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={deletingId !== null}
                    onClick={() => handleDelete(item)}
                  >
                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
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

export default ClubEventsPage