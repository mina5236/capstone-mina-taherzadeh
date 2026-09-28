import { useState } from 'react'
import './DashboardPage.css'

function EmptyStateCard({ icon, text }) {
  return (
    <div className="empty-state-card">
      <span className="empty-state-icon">{icon}</span>
      <p>{text}</p>
    </div>
  )
}

function DashboardPage({ user, onLogout, onNavigate }) {
  // New accounts start with no joined events, no followed clubs, and no active hours yet.
  const upcomingEvents = []
  const popularClubs = []
  const notifications = []
  const stats = {
    eventsJoined: 0,
    clubsFollowed: 0,
    hoursActive: 0,
  }

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
              className="dashboard-bell"
              aria-label="Notifications"
              onClick={() => toggleMenu('notifications')}
            >
              🔔
            </button>

            {openMenu === 'notifications' && (
              <div className="dropdown-panel">
                {notifications.length === 0 ? (
                  <p className="dropdown-empty">No notifications yet</p>
                ) : (
                  notifications.map((note) => <p key={note.id}>{note.text}</p>)
                )}
              </div>
            )}
          </div>

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
            <a href="#" className="section-link">View All →</a>
          </div>

          {upcomingEvents.length === 0 ? (
            <EmptyStateCard icon="📅" text="No upcoming events" />
          ) : (
            <div className="events-grid">
              {upcomingEvents.map((event) => (
                <div className="event-card" key={event.id}>
                  {event.title}
                </div>
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
            <button type="button" className="dropdown-item">
              🎉 My Registered Events
            </button>
            <button type="button" className="dropdown-item">
              🎪 Request a New Club
            </button>
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
