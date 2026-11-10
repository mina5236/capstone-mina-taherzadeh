import { useEffect, useState } from 'react'
import './ProfilePage.css'
import './ClubRequestPage.css'
import { API } from './config.js'

// Admin home: totals (F3.5) and links to the admin tools.
function AdminDashboardPage({ user, onBack, onLogout, onNavigate }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${API}/admin/stats`, {
          headers: { Authorization: `Bearer ${user.sessionToken}` }
        })
        const data = await response.json()

        if (response.status === 401) {
          onLogout()
          return
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load the dashboard numbers.')
        }

        setStats(data.stats)
      } catch (err) {
        setError(err.message)
      }
    }

    loadStats()
  }, [user.id])

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

  return (
    <main className="profile-shell">
      <header className="profile-banner">
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to dashboard">
          ←
        </button>
        <h1>Admin Dashboard</h1>

        <div className="profile-stat-pills">
          <div className="profile-stat-pill">
            <span>🏛️ Active Clubs</span>
            <strong>{stats ? stats.activeClubs : '–'}</strong>
          </div>
          <div className="profile-stat-pill">
            <span>🎓 Student Users</span>
            <strong>{stats ? stats.studentUsers : '–'}</strong>
          </div>
        </div>
      </header>

      <div className="profile-body">
        <section className="profile-card">
          <h2>🛠️ Admin Tools</h2>
          <button type="button" className="primary-btn" onClick={() => onNavigate('adminRequests')}>
            🛡️ Review Club Requests
          </button>
          <button type="button" className="secondary-btn" onClick={() => onNavigate('adminUsers')}>
            👥 Manage Users
          </button>
          <button type="button" className="secondary-btn" onClick={() => onNavigate('adminClubs')}>
            🏛️ Manage Clubs
          </button>
        </section>
      </div>
    </main>
  )
}

export default AdminDashboardPage