import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { Empty, Spinner, TopBar, VerifiedPill } from '../components/Bits'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icons'

const HOURS = [8, 9, 10, 11, 13, 14, 15, 16, 17, 18]

export default function BookCheck() {
  const { code } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [l, setL] = useState(null)
  const [dayIdx, setDayIdx] = useState(0)
  const [hour, setHour] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { api.getListingByCode(code).then(setL) }, [code])

  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0); return d
  }), [])

  if (!l) return <><TopBar title="Book a room check" back /><Spinner /></>
  if (user.role === 'landlord') return <><TopBar title="Book a room check" back={`/r/${code}`} /><main className="page"><Empty icon="user" title="Room checks are booked from a renter account">You're signed in as a landlord. Sign out and use a renter account to book.</Empty></main></>

  const slotDate = (h) => { const d = new Date(days[dayIdx]); d.setHours(h, 0, 0, 0); return d }
  const isPast = (h) => slotDate(h).getTime() < Date.now() + 60 * 60 * 1000

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      const b = await api.createBooking({ listingId: l.id, slot: slotDate(hour).toISOString(), note })
      nav(`/bookings/${b.id}?new=1`, { replace: true })
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <>
      <TopBar title="Book a free room check" back={`/r/${code}`} />
      <main className="page" style={{ paddingBottom: 120 }}>
        <div className="card row">
          <img className="thumb" src={l.photos[0]} alt="" />
          <div className="grow">
            <VerifiedPill />
            <div style={{ fontWeight: 700, marginTop: 6 }}>{l.title}</div>
            <div className="tiny">{l.area} · {money(l.price_usd)}/month · {l.code}</div>
          </div>
        </div>

        <div className="section-title">Pick a day</div>
        <div className="days">
          {days.map((d, i) => (
            <button key={i} className={dayIdx === i ? 'on' : ''} onClick={() => { setDayIdx(i); setHour(null) }}>
              <span>{i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
              <b>{d.getDate()}</b>
              <span>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
            </button>
          ))}
        </div>

        <div className="section-title">Pick a time</div>
        <div className="slots">
          {HOURS.map((h) => (
            <button key={h} disabled={isPast(h)} className={hour === h ? 'on' : ''} onClick={() => setHour(h)}>
              {String(h).padStart(2, '0')}:00
            </button>
          ))}
        </div>

        <label className="field" style={{ marginTop: 20 }}>
          <span>Message to the landlord (optional)</span>
          <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I'm a student at RUPP, moving in November." />
        </label>

        <div className="card small" style={{ background: 'var(--ok-soft)', boxShadow: 'none', color: 'var(--ok)' }}>
          <div className="row" style={{ fontWeight: 700 }}><Icon name="shield" size={18} /> This is free — no payment now</div>
          <div style={{ marginTop: 4 }}>You only pay the landlord by KHQR after you've seen the room and decided to rent it.</div>
        </div>
        {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
      </main>
      <div className="sticky-cta">
        <div className="grow small">
          {hour != null ? <><b>{slotDate(hour).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b> at <b>{String(hour).padStart(2, '0')}:00</b></> : <span className="muted">Choose a time</span>}
        </div>
        <button className="btn" disabled={hour == null || busy} onClick={submit}>{busy ? 'Sending…' : 'Send request'}</button>
      </div>
    </>
  )
}
