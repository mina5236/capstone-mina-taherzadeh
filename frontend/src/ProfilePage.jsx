import { useEffect, useState } from 'react'
import './ProfilePage.css'
import { API } from './config.js'
function formatMemberSince(createdAt) {
  if (!createdAt) return 'Recently'
  const date = new Date(createdAt.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return 'Recently'
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function ProfilePage({ user, onBack, onLogout , onProfileUpdated }) {
  const [profile, setProfile] = useState(null)
  const [clubs, setClubs] = useState([])
  const [events, setEvents] = useState([])
  const [cancellingId, setCancellingId] = useState(null)
  const [eventMessage, setEventMessage] = useState({ text: '', type: '' })
  const [points, setPoints] = useState(0)
  const [error, setError] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [formMessage, setFormMessage] = useState('')
  const [formMessageType, setFormMessageType] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API}/profile/${user.id}` , {
          headers: { Authorization: `Bearer ${user.sessionToken}` }
        })
        const data = await response.json()

        if (response.status === 401) {
          onLogout()
          return
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load profile.')
        }

        setProfile(data.user)
        setClubs(data.clubs)
        setEvents(data.events)
        setPoints(data.points)
        setForm({ fullName: data.user.fullName, email: data.user.email, password: '' })
      } catch (err) {
        setError(err.message)
      }
    }

    loadProfile()
  }, [user.id])

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveSettings = async (event) => {
    event.preventDefault()
    setFormMessage('')
    setFormMessageType('')

    if (!/^\p{L}+(?: \p{L}+)*$/u.test(form.fullName.trim())) {
      setFormMessageType('error')
      setFormMessage('Full name can only contain letters and spaces.')
      return
    }

    const payload = { fullName: form.fullName, email: form.email }
    if (form.password) {
      payload.password = form.password
    }

    try {
      const response = await fetch(`${API}/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' , 
           Authorization: `Bearer ${user.sessionToken}`},
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.status === 401) {
          onLogout()
          return
        }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile.')
      }

      setProfile(data.user)
      onProfileUpdated?.(data.user)
      setForm((prev) => ({ ...prev, password: '' }))
      setFormMessageType('success')
      setFormMessage('Profile updated successfully!')
    } catch (err) {
      setFormMessageType('error')
      setFormMessage(err.message)
    }
  }

  const handleCancelRegistration = async (eventId) => {
  if (cancellingId !== null) return

  setCancellingId(eventId)
  setEventMessage({ text: '', type: '' })

  try {
    const response = await fetch(`${API}/events/${eventId}/register`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user.sessionToken}` }
    })
    const data = await response.json()

    if (response.status === 401) {
      onLogout()
      return
    }

    if (!response.ok) {
      throw new Error(data.message || 'Failed to cancel registration.')
    }

    setEvents((prev) => prev.filter((item) => item.id !== eventId))
    setEventMessage({ text: data.message, type: 'success' })
  } catch (err) {
    setEventMessage({ text: err.message, type: 'error' })
  } finally {
    setCancellingId(null)
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

  if (!profile) {
    return null
  }

  return (
    <main className="profile-shell">
      <header className="profile-banner">
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to dashboard">
          ←
        </button>

        <div className="profile-avatar">
          <span aria-hidden="true">🧑‍🎓</span>
          <span className="profile-avatar-edit" aria-hidden="true">✏️</span>
        </div>

        <h1>{profile.fullName}</h1>
        <p className="profile-student-id">🆔 Student ID: {profile.studentId}</p>

        <div className="profile-stat-pills">
          <div className="profile-stat-pill">
            <span>🎉 Events</span>
            <strong>{events.length}</strong>
          </div>
          <div className="profile-stat-pill">
            <span>🏛️ Clubs</span>
            <strong>{clubs.length}</strong>
          </div>
          <div className="profile-stat-pill">
            <span>⭐ Points</span>
            <strong>{points}</strong>
          </div>
        </div>
      </header>

      <div className="profile-body">
        <section className="profile-card">
          <h2>📇 Account Information</h2>
          <div className="profile-info-row">
            <span className="profile-info-icon icon-pink">✉️</span>
            <div>
              <p className="profile-info-label">Email</p>
              <p className="profile-info-value">{profile.email}</p>
            </div>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-icon icon-purple">📅</span>
            <div>
              <p className="profile-info-label">Member Since</p>
              <p className="profile-info-value">{formatMemberSince(profile.memberSince)}</p>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <h2>🏛️ My Clubs</h2>
          {clubs.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">🏛️</span>
              <p>No clubs joined yet</p>
            </div>
          ) : (
            clubs.map((club) => (
              <div className="profile-info-row" key={club.id}>
                <span className="profile-info-icon">🏛️</span>
                <div>
                  <p className="profile-info-value">{club.name}</p>
                  <p className="profile-info-label">⭐ Member</p>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="profile-card">
          <h2>🎉 My Events</h2>
          {eventMessage.text && <p className={`form-message ${eventMessage.type}`}>{eventMessage.text}</p>}
          {events.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">🎉</span>
              <p>You haven't registered for any events yet</p>
            </div>
          ) : (
            events.map((event) => (
              <div className="profile-info-row" key={event.id}>
                <span className="profile-info-icon">🎉</span>
                <div>
                  <p className="profile-info-value">{event.title}</p>
                  <p className="profile-info-label">📅 {event.date}</p>
                  <p className="profile-info-label">🏛️ {event.clubName} · 📍 {event.location}</p>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={cancellingId === event.id}
                  onClick={() => handleCancelRegistration(event.id)}>
                  {cancellingId === event.id ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            ))
          )}
        </section>

        <button
          type="button"
          className="profile-action-row"
          onClick={() => setIsEditing((visible) => !visible)}
        >
          <span className="profile-info-icon icon-purple">⚙️</span>
          <span className="profile-action-label">Account Settings</span>
        </button>

        {isEditing && (
          <section className="profile-card">
            <form className="profile-settings-form" onSubmit={handleSaveSettings}>
              <label className="field-group" htmlFor="fullName">
                <span className="field-label">✦ Full Name</span>
                <div className="input-shell">
                  <input id="fullName" name="fullName" type="text" value={form.fullName} onChange={handleFormChange} />
                </div>
              </label>

              <label className="field-group" htmlFor="email">
                <span className="field-label">✉️ Email</span>
                <div className="input-shell">
                  <input id="email" name="email" type="email" value={form.email} onChange={handleFormChange} />
                </div>
              </label>

              <label className="field-group" htmlFor="password">
                <span className="field-label">🔒 New Password</span>
                <div className="input-shell">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleFormChange}
                    placeholder="Leave blank to keep current password"
                  />
                </div>
              </label>

              {formMessage && <p className={`form-message ${formMessageType}`}>{formMessage}</p>}

              <button type="submit" className="primary-btn">
                Save Changes
              </button>
            </form>
          </section>
        )}

        <button type="button" className="profile-action-row" onClick={onLogout}>
          <span className="profile-info-icon icon-red">🚪</span>
          <span className="profile-action-label profile-action-danger">Sign Out</span>
        </button>
      </div>
    </main>
  )
}

export default ProfilePage
