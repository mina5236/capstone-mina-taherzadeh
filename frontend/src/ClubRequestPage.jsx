import { useEffect, useState } from 'react'
import './ProfilePage.css'
import './ClubRequestPage.css'

const API = 'http://localhost:3001/api'

function ClubRequestPage({ user, onBack, onLogout }) {
  const [form, setForm] = useState({
    clubName: '',
    description: '',
    contactEmail: user.email || '',
    purpose: ''
  })
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState({ text: '', type: '' })
  const [submitting, setSubmitting] = useState(false)

  const hasPending = requests.some((item) => item.status === 'pending')

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await fetch(`${API}/club-requests/mine`, {
          headers: { Authorization: `Bearer ${user.sessionToken}` }
        })
        const data = await response.json()

        if (response.status === 401) {
          onLogout()
          return
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load your requests.')
        }

        setRequests(data.requests)
      } catch (err) {
        setMessage({ text: err.message, type: 'error' })
      }
    }

    loadRequests()
  }, [user.id])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    setMessage({ text: '', type: '' })

    const clubName = form.clubName.trim()
    const description = form.description.trim()
    const purpose = form.purpose.trim()

    if (clubName.length < 3 || clubName.length > 60) {
      setMessage({ text: 'Club name must be between 3 and 60 characters.', type: 'error' })
      return
    }
    if (description.length < 20 || description.length > 500) {
      setMessage({ text: 'Club description must be between 20 and 500 characters.', type: 'error' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      setMessage({ text: 'Please enter a valid contact email address.', type: 'error' })
      return
    }
    if (purpose.length < 10 || purpose.length > 500) {
      setMessage({ text: "Please explain the club's purpose and planned activities (10 to 500 characters).", type: 'error' })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`${API}/club-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.sessionToken}`
        },
        body: JSON.stringify({ ...form, clubName, description, purpose })
      })
      const data = await response.json()

      if (response.status === 401) {
        onLogout()
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit request.')
      }

      setRequests((prev) => [data.request, ...prev])
      setForm({ clubName: '', description: '', contactEmail: user.email || '', purpose: '' })
      setMessage({ text: data.message, type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="profile-shell">
      <header className="profile-banner">
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to dashboard">
          ←
        </button>
        <h1>Request a New Club</h1>
      </header>

      <div className="profile-body">
        <section className="profile-card">
          <h2>🎪 Club Details</h2>

          {hasPending ? (
            <p className="form-message error">
              You already have a request waiting for review. You can submit another one after it is reviewed.
            </p>
          ) : (
            <form className="profile-settings-form" onSubmit={handleSubmit}>
              <label className="field-group" htmlFor="requesterName">
                <span className="field-label">✦ Your Name</span>
                <div className="input-shell">
                  <input id="requesterName" type="text" value={user.fullName || ''} readOnly />
                </div>
              </label>

              <label className="field-group" htmlFor="requesterStudentId">
                <span className="field-label">🆔 Student ID</span>
                <div className="input-shell">
                  <input id="requesterStudentId" type="text" value={user.studentId || ''} readOnly />
                </div>
              </label>

              <label className="field-group" htmlFor="clubName">
                <span className="field-label">🏛️ Proposed Club Name</span>
                <div className="input-shell">
                  <input id="clubName" name="clubName" type="text" value={form.clubName} onChange={handleChange} />
                </div>
              </label>

              <label className="field-group" htmlFor="description">
                <span className="field-label">📝 Club Description</span>
                <div className="input-shell">
                  <textarea id="description" name="description" value={form.description} onChange={handleChange} />
                </div>
              </label>

              <label className="field-group" htmlFor="contactEmail">
                <span className="field-label">✉️ Contact Email</span>
                <div className="input-shell">
                  <input id="contactEmail" name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} />
                </div>
              </label>

              <label className="field-group" htmlFor="purpose">
                <span className="field-label">🎯 Purpose and Planned Activities</span>
                <div className="input-shell">
                  <textarea id="purpose" name="purpose" value={form.purpose} onChange={handleChange} />
                </div>
              </label>

              {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}

              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          )}

          {hasPending && message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}
        </section>

        <section className="profile-card">
          <h2>📋 My Requests</h2>
          {requests.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">📋</span>
              <p>You haven't requested a club yet</p>
            </div>
          ) : (
            requests.map((item) => (
              <div className="profile-info-row" key={item.id}>
                <div>
                  <p className="profile-info-value">{item.clubName}</p>
                  <p className="profile-info-label">Submitted {item.submittedAt}</p>
                  <span className={`request-status status-${item.status}`}>{item.status}</span>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  )
}

export default ClubRequestPage