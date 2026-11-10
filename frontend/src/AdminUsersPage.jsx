import { useEffect, useState } from 'react'
import './ProfilePage.css'
import './ClubRequestPage.css'
import { API } from './config.js'

// F3.4: list accounts and let the admin deactivate or reactivate them.
function AdminUsersPage({ user, onBack, onLogout }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [changingId, setChangingId] = useState(null)

  const authHeaders = { Authorization: `Bearer ${user.sessionToken}` }

  const loadAccounts = async () => {
    try {
      const response = await fetch(`${API}/admin/users`, { headers: authHeaders })
      const data = await response.json()

      if (response.status === 401) {
        onLogout()
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load users.')
      }

      setAccounts(data.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [user.id])

  const changeStatus = async (accountId, action) => {
    if (changingId !== null) return

    setChangingId(accountId)
    setMessage({ text: '', type: '' })

    try {
      const response = await fetch(`${API}/admin/users/${accountId}/${action}`, {
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
      await loadAccounts()
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
        <h1>Manage Users</h1>
      </header>

      <div className="profile-body">
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}

        <section className="profile-card">
          <h2>👥 All Accounts</h2>
          {accounts.map((item) => {
            const protectedAccount = item.role === 'platform_admin' || item.id === user.id

            return (
              <div className="profile-info-row" key={item.id}>
                <div>
                  <p className="profile-info-value">{item.fullName}</p>
                  <p className="profile-info-label">
                    🆔 {item.studentId} · ✉️ {item.email}
                  </p>
                  <p className="profile-info-label">Role: {item.role.replace('_', ' ')}</p>
                  <span className={`request-status status-${item.isActive ? 'active' : 'inactive'}`}>
                    {item.isActive ? 'active' : 'deactivated'}
                  </span>
                  {!protectedAccount && (
                    <button
                      type="button"
                      className={item.isActive ? 'secondary-btn' : 'primary-btn'}
                      disabled={changingId !== null}
                      onClick={() => changeStatus(item.id, item.isActive ? 'deactivate' : 'reactivate')}
                    >
                      {changingId === item.id ? 'Working...' : item.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </main>
  )
}

export default AdminUsersPage