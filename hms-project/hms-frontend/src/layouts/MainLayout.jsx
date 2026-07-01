import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/rooms', icon: '🛏️', label: 'Rooms' },
  { to: '/guests', icon: '👥', label: 'Guests' },
  { to: '/bookings', icon: '📅', label: 'Bookings' },
  { to: '/billing', icon: '💳', label: 'Billing' },
  { to: '/reports', icon: '📈', label: 'Reports' },
]

export default function MainLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = (user?.fullName || user?.username || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">G</div>
          <div>
            <h2>GrandStay</h2>
            <p>Hotel Management</p>
          </div>
        </div>

        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div>
            <strong>{user?.fullName}</strong>
            <span>{user?.role}</span>
          </div>
        </div>

        <div className="nav-section">Main Menu</div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <button type="button" className="nav-link logout" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          Logout
        </button>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button type="button" className="menu-toggle" onClick={() => setSidebarOpen((o) => !o)}>
            ☰
          </button>
          <div className="topbar-left">
            <h1>GrandStay HMS</h1>
            <p className="topbar-sub">Premium Hotel Management System</p>
          </div>
          <div className="topbar-profile">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-info">
              <strong>{user?.fullName}</strong>
              <span>{user?.role}</span>
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
