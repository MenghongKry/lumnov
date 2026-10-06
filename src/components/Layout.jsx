import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Icon from './Icons'
import { useAuth } from '../context/AuthContext'
import { api, IS_DEMO } from '../lib/api'

const NAV = {
  guest: [['/', 'home', 'Rooms'], ['/bookings', 'calendar', 'Bookings'], ['/chat', 'chat', 'Chat'], ['/profile', 'user', 'Profile']],
  tenant: [['/', 'home', 'Rooms'], ['/bookings', 'calendar', 'Bookings'], ['/chat', 'chat', 'Chat'], ['/profile', 'user', 'Profile']],
  landlord: [['/landlord', 'list', 'My listings'], ['/landlord/requests', 'inbox', 'Requests'], ['/chat', 'chat', 'Chat'], ['/profile', 'user', 'Profile']],
  admin: [['/admin', 'shield', 'Check queue'], ['/', 'home', 'Rooms'], ['/chat', 'chat', 'Chat'], ['/profile', 'user', 'Profile']],
}

// Screens with their own bottom bar (sticky CTA / chat composer) hide the nav.
const HIDE_NAV = [/^\/r\//, /^\/chat\/.+/, /^\/demo/, /\/book$/, /^\/landlord\/new/]

export default function Layout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const items = NAV[user?.role || 'guest']
  const hide = HIDE_NAV.some((r) => r.test(pathname))
  const [sure, setSure] = useState(false)

  return (
    <div className="app">
      {IS_DEMO && !pathname.startsWith('/demo') && (
        <div className="demo-banner">
          <span>Demo mode{user ? ` · ${user.full_name} (${user.role === 'tenant' ? 'renter' : user.role})` : ' · not signed in'}</span>
          <span className="row" style={{ gap: 6 }}>
            <NavLink to="/demo/post/LMN-1001" style={{ color: '#fff', fontSize: 12, textDecoration: 'underline' }}>Start story</NavLink>
            <button onClick={() => { if (sure) { api.resetDemo(); setSure(false) } else { setSure(true); setTimeout(() => setSure(false), 3000) } }}>{sure ? 'Tap again to reset' : 'Reset'}</button>
          </span>
        </div>
      )}
      <Outlet />
      {!hide && (
        <nav className="bottom-nav" aria-label="Main">
          {items.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end={to === '/' || to === '/landlord'}>
              <Icon name={icon} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
