import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { AREAS } from '../lib/config'
import { money, fmtShort } from '../lib/format'
import { Logo, Spinner, Empty, VerifiedPill } from '../components/Bits'
import Icon from '../components/Icons'
import { useAuth } from '../context/AuthContext'

const PRICES = [[0, 'Any price'], [80, 'Under $80'], [150, 'Under $150'], [250, 'Under $250']]

export default function Listings() {
  const { user, ready } = useAuth()
  const nav = useNavigate()
  const [area, setArea] = useState('')
  const [maxPrice, setMaxPrice] = useState(0)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!ready || user) return
    try {
      if (!localStorage.getItem('lumnov_welcome_seen')) {
        nav('/welcome', { replace: true })
      }
    } catch {}
  }, [ready, user, nav])

  useEffect(() => {
    let alive = true
    setRows(null)
    const t = setTimeout(() => api.listVerified({ area, maxPrice, q }).then((r) => alive && setRows(r)), 200)
    return () => { alive = false; clearTimeout(t) }
  }, [area, maxPrice, q])

  const onSubmit = (e) => {
    e.preventDefault()
    const code = q.trim().toUpperCase()
    if (/^LMN-\d+$/.test(code)) nav(`/r/${code}`)
  }

  return (
    <>
      <header className="topbar">
        <div className="grow"><Logo /></div>
        {!user && <Link to="/login" className="btn sm secondary">Sign in</Link>}
      </header>
      <main className="page">
        <h2 className="h2">Rooms checked by our team</h2>
        <p className="muted small" style={{ marginTop: 0 }}>Every room here was verified: landlord ID, right to rent, and the room itself.</p>

        <form onSubmit={onSubmit} className="row" style={{ background: '#fff', borderRadius: 12, padding: '4px 12px', border: '1px solid var(--line)', margin: '14px 0 12px' }}>
          <Icon name="search" size={18} style={{ color: 'var(--ink-3)' }} />
          <input className="grow" style={{ border: 0, outline: 'none', padding: '10px 0', background: 'transparent' }}
            placeholder="Search area, title, or code LMN-1001" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </form>

        <div className="pills" style={{ marginBottom: 8 }}>
          <button className={`pill${!area ? ' on' : ''}`} onClick={() => setArea('')}>All areas</button>
          {AREAS.map((a) => <button key={a} className={`pill${area === a ? ' on' : ''}`} onClick={() => setArea(a)}>{a}</button>)}
        </div>
        <div className="pills" style={{ marginBottom: 16 }}>
          {PRICES.map(([v, l]) => <button key={v} className={`pill${maxPrice === v ? ' on' : ''}`} onClick={() => setMaxPrice(v)}>{l}</button>)}
        </div>

        {!rows ? <Spinner /> : rows.length === 0 ? (
          <Empty icon="search" title="No verified rooms match">Try another area or price.</Empty>
        ) : rows.map((l) => <ListingCard key={l.id} l={l} />)}
      </main>
    </>
  )
}

export function ListingCard({ l }) {
  return (
    <Link to={`/r/${l.code}`} className="lcard">
      <div className="photo">
        <img src={l.photos[0]} alt={l.title} loading="lazy" />
        <VerifiedPill />
      </div>
      <div className="body">
        <div className="row between">
          <div className="price">{money(l.price_usd)}<small> /month</small></div>
          <span className="tiny">{l.code}</span>
        </div>
        <div className="title">{l.title}</div>
        <div className="row small muted" style={{ gap: 6 }}>
          <Icon name="map" size={15} /> {l.area} · {l.room_type}
        </div>
        <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
          {l.docs_checked && <span className="chip ok"><Icon name="check" size={12} stroke={3} /> ID & documents</span>}
          {l.room_checked ? <span className="chip ok"><Icon name="check" size={12} stroke={3} /> Room visited</span> : <span className="chip warn">Visit pending</span>}
          {l.verified_at && <span className="chip">Checked {fmtShort(l.verified_at)}</span>}
        </div>
      </div>
    </Link>
  )
}
