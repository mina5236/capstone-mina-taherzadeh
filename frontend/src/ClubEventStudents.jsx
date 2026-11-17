import { useEffect, useState } from 'react'
import './ProfilePage.css'
import './ClubRequestPage.css'
import { API } from './config.js'

// F4.4: the students registered for one event.
function ClubEventStudents({ user, event, onBack, onLogout }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch(`${API}/club-admin/events/${event.id}/registrations`, {
          headers: { Authorization: `Bearer ${user.sessionToken}` }
        })
        const data = await response.json()

        if (response.status === 401) {
          onLogout()
          return
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load registered students.')
        }

        setStudents(data.students)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [event.id])

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
        <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Back to my events">
          ←
        </button>
        <h1>Registered Students</h1>
        <p className="profile-student-id">
          {event.title} · {students.length} / {event.maxCapacity} registered
        </p>
      </header>

      <div className="profile-body">
        <section className="profile-card">
          <h2>🎓 Students</h2>
          {students.length === 0 ? (
            <div className="profile-empty-state">
              <span aria-hidden="true">🎓</span>
              <p>No students have registered yet</p>
            </div>
          ) : (
            students.map((student) => (
              <div className="profile-info-row" key={student.studentId}>
                <div>
                  <p className="profile-info-value">{student.fullName}</p>
                  <p className="profile-info-label">
                    🆔 {student.studentId} · ✉️ {student.email}
                  </p>
                  <p className="profile-info-label">Registered {student.registeredAt}</p>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  )
}

export default ClubEventStudents