import { useEffect, useState } from 'react'
import './DashboardPage.css'
import { API } from './config.js'

function EmptyStateCard({ icon, text }) {
  return (
    <div className="empty-state-card">
      <span className="empty-state-icon">{icon}</span>
      <p>{text}</p>
    </div>
  )
}

function getEventTime(date) {
  const timestamp = new Date(date.includes('T') ? date : date.replace(' ', 'T')).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function DashboardPage({ user, onLogout, onNavigate }) {
  const [events, setEvents] = useState([])
  const [now] = useState(() => Date.now())

  useEffect(() => {
    fetch(`${API}/events`, { headers: { Authorization: `Bearer ${user.sessionToken}` } })
      .then((res) => {
        if (res.status === 401) onLogout()
        return res.ok ? res.json() : { events: [] }
      })
      .then((data) => setEvents(data.events || []))
      .catch(() => {})
  }, [user.id, user.sessionToken, onLogout])

  const timedEvents = events
    .map((event) => ({ event, time: getEventTime(event.date) }))
    .filter(({ time }) => time !== null)
  const upcomingEvents = [
    ...timedEvents
      .filter(({ time }) => time >= now)
      .sort((a, b) => a.time - b.time),
    ...timedEvents
      .filter(({ time }) => time < now)
      .sort((a, b) => b.time - a.time)
  ]
    .slice(0, 2)
    .map(({ event }) => event)
  const registeredEvents = events.filter((item) => item.isRegistered)
  const popularClubs = []
  const stats = { eventsJoined: registeredEvents.length, clubsFollowed: 0, hoursActive: 0 }

  const [openMenu, setOpenMenu] = useState(null)

  const toggleMenu = (menu) => {
    setOpenMenu((current) => (current === menu ? null : menu))
  }

  const firstName = user?.fullName?.split(' ')[0] || 'there'

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="dashboard-logo" aria-hidden="true">🎪</span>
          <div>
            <p className="dashboard-brand-name">Campus Connect</p>
            <p className="dashboard-brand-tag">Find Your Community</p>
          </div>
        </div>

        <div className="dashboard-header-actions">
          <div className="dropdown-wrapper">
            <button
              type="button"
              className="dashboard-door"
              aria-label="Account"
              onClick={() => toggleMenu('account')}
            >
              🚪
            </button>

            {openMenu === 'account' && (
              <div className="dropdown-panel">
                <button type="button" className="dropdown-item" onClick={onLogout}>
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-body">
        <section className="dashboard-greeting">
          <h1>Hey, {firstName}! 👋</h1>
          <p>✨ Ready for some fun today? ✨</p>
        </section>

        <div className="dashboard-search">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input type="text" placeholder="Search events, clubs, or activities..." aria-label="Search" />
        </div>

        <section className="dashboard-stats">
          <div className="stat-card stat-pink">
            <span className="stat-icon" aria-hidden="true">📅</span>
            <p className="stat-label">Events Joined</p>
            <p className="stat-value">{stats.eventsJoined}</p>
          </div>
          <div className="stat-card stat-purple">
            <span className="stat-icon" aria-hidden="true">👥</span>
            <p className="stat-label">Clubs Followed</p>
            <p className="stat-value">{stats.clubsFollowed}</p>
          </div>
          <div className="stat-card stat-yellow">
            <span className="stat-icon" aria-hidden="true">⚡</span>
            <p className="stat-label">Hours Active</p>
            <p className="stat-value">{stats.hoursActive}</p>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>🎪 Upcoming Events</h2>
            <a href="#" className="section-link" onClick={(event) => {
                event.preventDefault()
                onNavigate('events')
              }}>View All →</a>
          </div>

          {upcomingEvents.length === 0 ? (
            <EmptyStateCard icon="📅" text="No upcoming events" />
          ) : (
            <div className="events-grid">
              {upcomingEvents.map((event) => (
                <button
                  type="button"
                  className="event-card"
                  key={event.id}
                  onClick={() => onNavigate('eventDetails', event.id)}
                >
                  <strong>{event.title}</strong>
                  <p>📅 {event.date}</p>
                  <p>🏛️ {event.clubName} · 📍 {event.location}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>⭐ Popular Clubs</h2>
            <a href="#" className="section-link">Explore All →</a>
          </div>

          {popularClubs.length === 0 ? (
            <EmptyStateCard icon="👥" text="No clubs joined yet" />
          ) : (
            <div className="clubs-grid">
              {popularClubs.map((club) => (
                <div className="club-card" key={club.id}>
                  {club.name}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="fab-wrapper">
        {openMenu === 'quickActions' && (
          <div className="dropdown-panel fab-menu">
            <button type="button" className="dropdown-item" onClick={() => onNavigate('profile')}>
              👤 My Profile &amp; Settings
            </button>
            <button type="button" className="dropdown-item" onClick={() => onNavigate('myEvents')}>
              🎉 My Registered Events
            </button>
                        <button type="button" className="dropdown-item" onClick={() => onNavigate('savedEvents')}>
              ⭐ My Wish List
            </button>
            <button type="button" className="dropdown-item" onClick={() => onNavigate('clubs')}>
              🏛️ Browse Clubs
            </button>
            <button type="button" className="dropdown-item " onClick={() => onNavigate('clubRequest')}>
              🎪 Request a New Club
            </button>
            
            {(user.role === 'club_admin' || user.role === 'platform_admin') && (
              <button type="button" className="dropdown-item" onClick={() => onNavigate('manageEvents')}>
                🎪 Manage My Events
              </button>
            )}
            {user.role === 'platform_admin' && (
              <button type="button" className="dropdown-item" onClick={() => onNavigate('adminDashboard')}>
                🛡️ Admin Panel
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          className="fab-button"
          aria-label="Quick actions"
          onClick={() => toggleMenu('quickActions')}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default DashboardPage
