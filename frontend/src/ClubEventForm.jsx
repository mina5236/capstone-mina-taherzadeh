import { useState } from 'react'
import './ProfilePage.css'
import './ClubRequestPage.css'
import { API } from './config.js'

function todayAsText() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// F4.1 + F4.2: one form for creating a new event or editing an existing one.
function ClubEventForm({ user, clubs, event, onCancel, onSaved, onLogout }) {
  const isEditing = event !== null

  const [form, setForm] = useState({
    clubId: isEditing ? event.clubId : clubs[0]?.id || '',
    title: isEditing ? event.title : '',
    description: isEditing ? event.description || '' : '',
    date: isEditing ? event.date.slice(0, 10) : '',
    time: isEditing ? event.date.slice(11, 16) : '',
    location: isEditing ? event.location : '',
    maxCapacity: isEditing ? String(event.maxCapacity) : ''
  })
  const [message, setMessage] = useState({ text: '', type: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validate = () => {
    const title = form.title.trim()
    const description = form.description.trim()
    const location = form.location.trim()
    const capacity = Number(form.maxCapacity)

    if (title.length < 3 || title.length > 100) return 'Event title must be between 3 and 100 characters.'
    if (description.length < 10 || description.length > 1000) return 'Event description must be between 10 and 1000 characters.'
    if (!form.date) return 'Please choose a date.'
    if (!form.time) return 'Please choose a time.'
    if (location.length < 2 || location.length > 100) return 'Location must be between 2 and 100 characters.'
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
      return 'Maximum capacity must be a whole number between 1 and 1000.'
    }
    if (isEditing && capacity < event.currentCount) {
      return `Capacity cannot be lower than the ${event.currentCount} students already registered.`
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const problem = validate()
    if (problem) {
      setMessage({ text: problem, type: 'error' })
      return
    }

    setSubmitting(true)
    setMessage({ text: '', type: '' })

    try {
      const response = await fetch(
        isEditing ? `${API}/club-admin/events/${event.id}` : `${API}/club-admin/events`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.sessionToken}`
          },
          body: JSON.stringify({
            clubId: Number(form.clubId),
            title: form.title,
            description: form.description,
            date: form.date,
            time: form.time,
            location: form.location,
            maxCapacity: Number(form.maxCapacity)
          })
        }
      )
      const data = await response.json()

      if (response.status === 401) {
        onLogout()
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong. Please try again.')
      }

      onSaved(data.message)
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
      setSubmitting(false)
    }
  }

  return (
    <main className="profile-shell">
      <header className="profile-banner">
        <button type="button" className="profile-back-btn" onClick={onCancel} aria-label="Back to my events">
          ←
        </button>
        <h1>{isEditing ? 'Edit Event' : 'Create Event'}</h1>
      </header>

      <div className="profile-body">
        <section className="profile-card">
          <form className="profile-settings-form" onSubmit={handleSubmit}>
            {!isEditing && (
              <label className="field-group" htmlFor="clubId">
                <span className="field-label">🏛️ Club</span>
                <div className="input-shell input-shell-select">
                  <select id="clubId" name="clubId" value={form.clubId} onChange={handleChange}>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            )}

            <label className="field-group" htmlFor="title">
              <span className="field-label">🎉 Event Title</span>
              <div className="input-shell">
                <input id="title" name="title" type="text" value={form.title} onChange={handleChange} />
              </div>
            </label>

            <label className="field-group" htmlFor="description">
              <span className="field-label">📝 Description</span>
              <div className="input-shell">
                <textarea id="description" name="description" value={form.description} onChange={handleChange} />
              </div>
            </label>

            <label className="field-group" htmlFor="date">
              <span className="field-label">📅 Date</span>
              <div className="input-shell input-shell-date">
                <input
                  id="date"
                  name="date"
                  type="date"
                  min={isEditing ? undefined : todayAsText()}
                  value={form.date}
                  onChange={handleChange}
                />
              </div>
            </label>

            <label className="field-group" htmlFor="time">
              <span className="field-label">⏰ Time</span>
              <div className="input-shell input-shell-time">
                <input id="time" name="time" type="time" value={form.time} onChange={handleChange} />
              </div>
            </label>

            <label className="field-group" htmlFor="location">
              <span className="field-label">📍 Location</span>
              <div className="input-shell">
                <input id="location" name="location" type="text" value={form.location} onChange={handleChange} />
              </div>
            </label>

            <label className="field-group" htmlFor="maxCapacity">
              <span className="field-label">👥 Maximum Capacity</span>
              <div className="input-shell">
                <input
                  id="maxCapacity"
                  name="maxCapacity"
                  type="number"
                  min="1"
                  max="1000"
                  value={form.maxCapacity}
                  onChange={handleChange}
                />
              </div>
            </label>

            {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}

            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Event'}
            </button>
            <button type="button" className="secondary-btn" onClick={onCancel}>
              Cancel
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default ClubEventForm