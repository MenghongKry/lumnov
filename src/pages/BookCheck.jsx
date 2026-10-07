import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { Empty, Spinner } from '../components/Bits'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icons'

const HOURS = [8, 9, 10, 11, 13, 14, 15, 16, 17, 18]
const PURPOSES = ['Student', 'Working professional', 'Factory worker', 'Couple / family']

export default function BookCheck() {
  const { code } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [l, setL] = useState(null)
  const [dayIdx, setDayIdx] = useState(0)
  const [hour, setHour] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [purpose, setPurpose] = useState(null)
  const [note, setNote] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { api.getListingByCode(code).then(setL) }, [code])
  useEffect(() => {
    if (user) { setName(user.full_name || ''); setPhone(user.phone || '') }
  }, [user])

  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0); return d
  }), [])

  const slotDate = (h) => { const d = new Date(days[dayIdx]); d.setHours(h, 0, 0, 0); return d }
  const isPast = (h) => slotDate(h).getTime() < Date.now() + 60 * 60 * 1000
  const canSubmit = hour != null && agreed && !busy

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      const prefix = purpose ? `[${purpose}] ` : ''
      const b = await api.createBooking({ listingId: l.id, slot: slotDate(hour).toISOString(), note: prefix + note })
      nav(`/bookings/${b.id}?new=1`, { replace: true })
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  const sharedHeader = (title, onClose) => (
    <div className="book-header">
      <div className="book-header-row">
        <span className="book-eyebrow">STEP 1 OF 2 · YOUR DETAILS</span>
        <button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
      </div>
      {title && <h2 className="book-title">{title}</h2>}
      {title && (
        <div className="book-stepper">
          <span className="book-step active">
            <span className="book-step-dot">1</span>
            <span>Details</span>
          </span>
          <span className="book-step-line" />
          <span className="book-step">
            <span className="book-step-dot">2</span>
            <span>Confirmed</span>
          </span>
        </div>
      )}
    </div>
  )

  if (!l) return (
    <div className="book-sheet">
      {sharedHeader(null, () => nav(-1))}
      <Spinner />
    </div>
  )

  if (user.role === 'landlord') return (
    <div className="book-sheet">
      {sharedHeader('Book a free room check', () => nav(`/r/${code}`))}
      <div className="book-content">
        <Empty icon="user" title="Room checks are booked from a renter account">
          You're signed in as a landlord. Sign out and use a renter account to book.
        </Empty>
      </div>
    </div>
  )

  return (
    <div className="book-sheet">
      {sharedHeader('Book a free room check', () => nav(`/r/${code}`))}

      <div className="book-content">
        <div className="safety-box">
          <div className="safety-box-head">
            <Icon name="shield" size={18} />
            <b>Free room check — no payment</b>
          </div>
          <p className="safety-box-body">
            Lumnov never takes your money. Pay the landlord by KHQR only after you've seen the room.
          </p>
        </div>

        <div className="listing-strip">
          <span className="small">Landlord: <b>{l.landlord?.full_name}</b> · {l.area}</span>
          <span style={{ fontWeight: 700, flexShrink: 0 }}>{money(l.price_usd)}/mo</span>
        </div>

        <div className="section-title">Your details</div>
        <label className="field">
          <span>Full name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
        </label>
        <label className="field">
          <span>Phone / Telegram</span>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+855 …" type="tel" />
        </label>

        {user.id_status === 'verified' ? (
          <div className="id-row id-verified">
            <Icon name="check" size={15} stroke={3} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>ID verified — the landlord sees "ID verified", never your ID number</span>
          </div>
        ) : (
          <div className="id-row">
            <Icon name="info" size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--ink-3)' }} />
            <span>
              ID not verified yet — landlords accept verified renters faster.{' '}
              <Link to="/profile">Verify now →</Link>
            </span>
          </div>
        )}

        <div className="section-title" style={{ marginTop: 20 }}>Preferred date</div>
        <div className="days">
          {days.map((d, i) => (
            <button key={i} className={dayIdx === i ? 'on' : ''} onClick={() => { setDayIdx(i); setHour(null) }}>
              <span>{i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
              <b>{d.getDate()}</b>
              <span>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
            </button>
          ))}
        </div>

        <div className="section-title">Preferred time</div>
        <div className="slots">
          {HOURS.map((h) => (
            <button key={h} disabled={isPast(h)} className={hour === h ? 'on' : ''} onClick={() => setHour(h)}>
              {String(h).padStart(2, '0')}:00
            </button>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: 20 }}>Rental purpose</div>
        <div className="purpose-chips">
          {PURPOSES.map((p) => (
            <button key={p} className={`purpose-chip${purpose === p ? ' on' : ''}`} onClick={() => setPurpose(p === purpose ? null : p)}>
              {p}
            </button>
          ))}
        </div>

        <label className="field" style={{ marginTop: 16 }}>
          <span>Message to the landlord (optional)</span>
          <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I need to move in before November." />
        </label>

        <label className="consent-row">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span className="small">
            I agree to meet the landlord at the booked time and to share my name, phone and ID-verified status with <b>{l.landlord?.full_name}</b>.
          </span>
        </label>

        {err && <div className="error">{err}</div>}
      </div>

      <div className="book-footer">
        <button className="btn ghost" onClick={() => nav(`/r/${code}`)}>Cancel</button>
        <button className="btn grow" disabled={!canSubmit} onClick={submit}>
          {busy ? 'Sending…' : 'Send request →'}
        </button>
      </div>
    </div>
  )
}
