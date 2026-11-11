import { useEffect, useState } from 'react'
import './ProfilePage.css'
import './ClubRequestPage.css'
import { API } from './config.js'

// Club administration: list clubs and let the admin deactivate or reactivate them.
function AdminClubsPage({ user, onBack, onLogout }) {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [changingId, setChangingId] = useState(null)

  const authHeaders = { Authorization: `Bearer ${user.sessionToken}` }

  const loadClubs = async () => {
    try {
      const response = await fetch(`${API}/admin/clubs`, { headers: authHeaders })
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

  useEffect(() => {
    loadClubs()
  }, [user.id])

  const changeStatus = async (clubId, action) => {
    if (changingId !== null) return

    setChangingId(clubId)
    setMessage({ text: '', type: '' })

    try {
      const response = await fetch(`${API}/admin/clubs/${clubId}/${action}`, {
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
      await loadClubs()
      setChangingId(null)
    }
  }

  if (error) {
    return (
      <main className="profile-shell">
        <p className="form-message error">{error}</p>
        <button type="button" className="secondary-btn" onClick={onBack}>
          ← Back
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
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to admin dashboard">
          ←
        </button>
        <h1>Manage Clubs</h1>
      </header>

      <div className="profile-body">
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}

        <section className="profile-card">
          <h2>🏛️ All Clubs</h2>
          {clubs.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">🏛️</span>
              <p>No clubs yet</p>
            </div>
          ) : (
            clubs.map((item) => {
              const isActive = item.status === 'approved'

              return (
                <div className="profile-info-row" key={item.id}>
                  <div>
                    <p className="profile-info-value">{item.name}</p>
                    <p className="profile-info-label">
                      👤 {item.adminName} · ✉️ {item.adminEmail}
                    </p>
                    {item.description && <p className="profile-info-label">📝 {item.description}</p>}
                    <span className={`request-status status-${isActive ? 'active' : 'inactive'}`}>
                      {isActive ? 'active' : 'deactivated'}
                    </span>
                    <button
                      type="button"
                      className={isActive ? 'secondary-btn' : 'primary-btn'}
                      disabled={changingId !== null}
                      onClick={() => changeStatus(item.id, isActive ? 'deactivate' : 'reactivate')}
                    >
                      {changingId === item.id ? 'Working...' : isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}

export default AdminClubsPage