import { useNavigate } from 'react-router-dom'
import Icon from './Icons'
import { initials } from '../lib/format'

export function VerifiedPill({ large }) {
  return (
    <span className={`vpill${large ? ' lg' : ''}`}>
      <span className="ck"><Icon name="check" size={large ? 15 : 11} stroke={3.5} style={{ color: 'var(--brand)' }} /></span>
      Verified by Lumnov
    </span>
  )
}

export function StatusChip({ map, status }) {
  const s = map[status] || { label: status, tone: '' }
  return <span className={`chip ${s.tone}`}>{s.label}</span>
}

export function Avatar({ name, sm }) {
  return <div className={`avatar${sm ? ' sm' : ''}`}>{initials(name)}</div>
}

export function Spinner() { return <div className="spinner" role="status" aria-label="Loading" /> }

export function Empty({ icon = 'info', title, children }) {
  return (
    <div className="empty">
      <div className="icon"><Icon name={icon} size={26} /></div>
      <b>{title}</b>
      {children && <div className="small" style={{ marginTop: 6 }}>{children}</div>}
    </div>
  )
}

export function TopBar({ title, back, right }) {
  const nav = useNavigate()
  return (
    <header className="topbar">
      {back && (
        <button className="icon-btn" aria-label="Back" onClick={() => (window.history.length > 1 ? nav(-1) : nav(typeof back === 'string' ? back : '/'))}>
          <Icon name="back" />
        </button>
      )}
      <h1>{title}</h1>
      {right}
    </header>
  )
}

export function Logo({ size = 26 }) {
  return <img src="/brand/lumnov-wordmark.png" alt="Lumnov" height={size} style={{ display: 'block' }} />
}
