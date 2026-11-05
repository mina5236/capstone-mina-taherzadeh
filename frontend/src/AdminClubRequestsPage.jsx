import { useEffect, useState } from 'react'
import './ProfilePage.css'
import './ClubRequestPage.css'
import { API } from './config.js'

function AdminClubRequestsPage({ user, onBack, onLogout }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [reviewingId, setReviewingId] = useState(null)

  const authHeaders = { Authorization: `Bearer ${user.sessionToken}` }

  const loadRequests = async () => {
    try {
      const response = await fetch(`${API}/admin/club-requests`, { headers: authHeaders })
      const data = await response.json()

      if (response.status === 401) {
        onLogout()
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load club requests.')
      }

      setRequests(data.requests)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [user.id])

  const review = async (requestId, action) => {
    if (reviewingId !== null) return

    setReviewingId(requestId)
    setMessage({ text: '', type: '' })

    try {
      const response = await fetch(`${API}/admin/club-requests/${requestId}/${action}`, {
        method: 'POST',
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
      await loadRequests()
      setReviewingId(null)
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

  return (
    <main className="profile-shell">
      <header className="profile-banner">
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to dashboard">
          ←
        </button>
        <h1>Club Requests</h1>
      </header>

      <div className="profile-body">
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}

        <section className="profile-card">
          <h2>🛡️ Pending Requests</h2>
          {requests.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">✅</span>
              <p>No pending club requests</p>
            </div>
          ) : (
            requests.map((item) => (
              <div className="profile-info-row" key={item.id}>
                <div>
                  <p className="profile-info-value">{item.clubName}</p>
                  <p className="profile-info-label">
                    👤 {item.requesterName} · 🆔 {item.studentId}
                  </p>
                  <p className="profile-info-label">✉️ {item.contactEmail}</p>
                  <p className="profile-info-label">📝 {item.description}</p>
                  <p className="profile-info-label">🎯 {item.purpose}</p>
                  <p className="profile-info-label">Submitted {item.submittedAt}</p>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={reviewingId !== null}
                    onClick={() => review(item.id, 'approve')}
                  >
                    {reviewingId === item.id ? 'Working...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={reviewingId !== null}
                    onClick={() => review(item.id, 'reject')}
                  >
                    Reject
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

export default AdminClubRequestsPage