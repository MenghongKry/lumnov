import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { BOOKING_STATUS, fmtShort, fmtSlot, fmtTime, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { Avatar, Empty, Spinner, StatusChip, TopBar } from '../components/Bits'
import { TenantCardBody } from '../components/TenantCard'
import Icon from '../components/Icons'

export default function BookingDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [b, setB] = useState(undefined)
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.getBooking(id).then(setB) }, [id])
  if (b === undefined) return <><TopBar title="Booking" back="/bookings" /><Spinner /></>
  if (b === null) return <><TopBar title="Booking" back="/bookings" /><Empty title="Booking not found" /></>

  const isLandlord = user.id === b.landlord_id
  const slotPassed = new Date(b.slot) < new Date()
  const update = async (patch) => { setBusy(true); setB(await api.updateBooking(b.id, patch)); setBusy(false) }
  const openChat = async () => {
    if (isLandlord) {
      const convs = await api.myConversations()
      const c = convs.find((x) => x.listing_id === b.listing_id && x.tenant_id === b.tenant_id)
      if (c) return nav(`/chat/${c.id}`)
      return nav('/chat')
    }
    const c = await api.getOrCreateConversation(b.listing_id)
    nav(`/chat/${c.id}`)
  }

  if (isLandlord) return <LandlordView b={b} update={update} busy={busy} slotPassed={slotPassed} openChat={openChat} />
  return <RenterView b={b} update={update} busy={busy} slotPassed={slotPassed} openChat={openChat} />
}

/* ------------------------------------------------------------------ */
/* Landlord view — unchanged                                            */
/* ------------------------------------------------------------------ */
function LandlordView({ b, update, busy, slotPassed, openChat }) {
  const steps = [
    { key: 'requested', label: 'Request sent' },
    { key: 'confirmed', label: 'Landlord confirmed' },
    { key: 'visited', label: 'You visited the room' },
  ]
  const order = { requested: 0, confirmed: 1, visited: 2 }
  const reached = order[b.status] ?? -1

  return (
    <>
      <TopBar title="Room check" back="/landlord/requests" />
      <main className="page">
        <div className="card">
          <div className="row between">
            <StatusChip map={BOOKING_STATUS} status={b.status} />
            <span className="tiny">Free room check</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{fmtSlot(b.slot)}</div>
          <Link to={`/r/${b.listing?.code}`} className="row" style={{ marginTop: 14, color: 'inherit' }}>
            <img className="thumb" src={b.listing?.photos?.[0]} alt="" />
            <div className="grow">
              <b>{b.listing?.title}</b>
              <div className="tiny">{b.listing?.address || b.listing?.area}</div>
              <div className="tiny">{money(b.listing?.price_usd)}/month · {b.listing?.code}</div>
            </div>
          </Link>
          {b.note && <p className="small muted" style={{ marginBottom: 0 }}>"{b.note}"</p>}
          <div className="row" style={{ marginTop: 14, gap: 8 }}>
            {b.listing?.map_url && <a className="btn secondary sm grow" href={b.listing.map_url} target="_blank" rel="noreferrer"><Icon name="map" size={16} /> Directions</a>}
            <button className="btn secondary sm grow" onClick={openChat}><Icon name="chat" size={16} /> Chat</button>
          </div>
        </div>

        <div className="section-title">Renter</div>
        <div className="card">
          <TenantCardBody tenantId={b.tenant_id} />
        </div>

        {!['declined', 'cancelled', 'no_show'].includes(b.status) && (
          <>
            <div className="section-title">Progress</div>
            <div className="card">
              {steps.map((s, i) => (
                <div key={s.key} className="row" style={{ padding: '6px 0' }}>
                  <div className={`step-dot ${i <= reached ? 'ok' : 'wait'}`}>
                    <Icon name={i <= reached ? 'check' : 'clock'} size={14} stroke={3} />
                  </div>
                  <span style={{ fontWeight: i <= reached ? 700 : 500, color: i <= reached ? 'var(--ink)' : 'var(--ink-3)' }}>{s.label}</span>
                </div>
              ))}
              <div className="row" style={{ padding: '6px 0' }}>
                <div className="step-dot"><Icon name="qr" size={14} /></div>
                <span className="muted">If you rent it: pay the landlord by KHQR</span>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 20 }}>
          {b.status === 'requested' && (
            <div className="row">
              <button className="btn danger grow" disabled={busy} onClick={() => update({ status: 'declined' })}>Decline</button>
              <button className="btn ok grow" disabled={busy} onClick={() => update({ status: 'confirmed' })}>Accept time</button>
            </div>
          )}
          {b.status === 'confirmed' && (
            <div className="row">
              <button className="btn danger grow" disabled={busy || !slotPassed} onClick={() => update({ status: 'no_show' })}>Didn't come</button>
              <button className="btn ok grow" disabled={busy || !slotPassed} onClick={() => update({ status: 'visited' })}>Mark visited</button>
            </div>
          )}
          {b.status === 'confirmed' && !slotPassed && <p className="tiny center">You can mark the visit after the booked time.</p>}
        </div>
      </main>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Renter view — redesigned as step 2 sheet                            */
/* ------------------------------------------------------------------ */
function RenterView({ b, update, busy, slotPassed, openChat }) {
  const isBad = ['declined', 'cancelled', 'no_show'].includes(b.status)
  const step2Done = ['confirmed', 'visited'].includes(b.status)
  const landlordName = b.landlord?.full_name
  const bkRef = `BK-${b.id.slice(-4).toUpperCase()}`

  const step2Title = {
    requested: 'Request sent',
    confirmed: 'Meetup confirmed',
    declined: 'Request declined',
    cancelled: 'Booking cancelled',
    no_show: 'Booking cancelled',
    visited: 'Visit completed',
  }[b.status] || 'Room check'

  const listingBack = b.listing?.code ? `/r/${b.listing.code}` : '/bookings'

  return (
    <div className="book-sheet">
      <div className="book-header">
        <div className="book-header-row">
          <span className="book-eyebrow">STEP 2 OF 2 · CONFIRMATION</span>
          <Link to={listingBack} className="icon-btn" aria-label="Close"><Icon name="x" /></Link>
        </div>
        <h2 className="book-title">{step2Title}</h2>
        <div className="book-stepper">
          <span className="book-step done">
            <span className="book-step-dot"><Icon name="check" size={12} stroke={3} /></span>
            <span>Details</span>
          </span>
          <span className={`book-step-line${step2Done ? ' done' : ''}`} />
          <span className={`book-step${step2Done ? ' done' : ' active'}`}>
            <span className="book-step-dot">
              {step2Done ? <Icon name="check" size={12} stroke={3} /> : '2'}
            </span>
            <span>Confirmed</span>
          </span>
        </div>
      </div>

      <div className="book-content">
        <StatusBanner b={b} landlordName={landlordName} />

        <div className="bk-ref">{bkRef}</div>

        {/* Room check card */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink-3)', marginBottom: 8 }}>ROOM CHECK</div>
          <div className="row between" style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: 16 }}>{b.listing?.title}</div>
              <div className="small row" style={{ gap: 4, color: 'var(--ink-2)', marginTop: 4 }}>
                <Icon name="map" size={13} style={{ flexShrink: 0 }} />
                <span>{b.listing?.address || b.listing?.area}</span>
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, flexShrink: 0, marginLeft: 10 }}>
              {money(b.listing?.price_usd)}<span style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink-3)' }}>/mo</span>
            </div>
          </div>
          <div className="two-tiles">
            <div className="tile">
              <div className="tile-label">APPOINTMENT</div>
              <div className="tile-value">{fmtShort(b.slot)}</div>
              <div className="tile-sub">{fmtTime(b.slot)} · {BOOKING_STATUS[b.status]?.label}</div>
            </div>
            <div className="tile">
              <div className="tile-label">RENTER</div>
              <div className="tile-value" style={{ fontSize: 14 }}>{b.tenant?.full_name}</div>
              <div className="tile-sub" style={{ color: b.tenant?.id_status === 'verified' ? 'var(--safe)' : 'var(--ink-3)' }}>
                {b.tenant?.id_status === 'verified' ? 'ID verified' : 'ID not verified'}
              </div>
            </div>
          </div>
        </div>

        {/* Landlord card */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink-3)', marginBottom: 10 }}>LANDLORD</div>
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={landlordName} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <b>{landlordName}</b>
                <span className="chip safe" style={{ fontSize: 11 }}>ID verified</span>
              </div>
              {b.landlord?.phone && (
                <div className="small" style={{ marginTop: 4, color: 'var(--ink-2)', userSelect: 'all' }}>{b.landlord.phone}</div>
              )}
            </div>
          </div>
          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="btn secondary sm grow" onClick={openChat}><Icon name="chat" size={15} /> Message</button>
            {b.status === 'confirmed' && b.landlord?.phone && (
              <a className="btn secondary sm grow" href={`tel:${b.landlord.phone.replace(/\s/g, '')}`}><Icon name="phone" size={15} /> Call</a>
            )}
          </div>
        </div>

        {/* Timeline */}
        {!isBad && (
          <>
            <div className="section-title">What happens next</div>
            <div className="card" style={{ marginBottom: 14 }}>
              <RenterTimeline b={b} landlordName={landlordName} />
            </div>
          </>
        )}

        {/* Visit checklist */}
        {b.status === 'confirmed' && !slotPassed && (
          <>
            <div className="section-title">At the visit, check that…</div>
            <div className="card small" style={{ lineHeight: 1.7, marginBottom: 14 }}>
              ✓ The room looks like the <b>Lumnov photos</b><br />
              ✓ The person you meet is <b>{landlordName}</b><br />
              ✓ Water, electricity and the lock work<br />
              ✓ You agree the deposit and price in writing<br />
              <b style={{ color: 'var(--bad)' }}>✗ Never pay before you have seen the room</b>
            </div>
          </>
        )}

        {/* Feedback */}
        {(b.status === 'visited' || (b.status === 'confirmed' && slotPassed)) && b.room_matched == null && (
          <Feedback onSubmit={update} busy={busy} />
        )}
        {b.room_matched != null && (
          <div className="success" style={{ marginTop: 16 }}>
            Thanks for your feedback{b.room_matched ? ' — it helps other renters trust this room.' : '. Our team will check this listing again.'}
          </div>
        )}

        {/* Cancel action */}
        {['requested', 'confirmed'].includes(b.status) && !slotPassed && (
          <button className="btn ghost block" style={{ marginTop: 8 }} disabled={busy} onClick={() => update({ status: 'cancelled' })}>
            Cancel this room check
          </button>
        )}

        {/* Footer */}
        <div className="booking-footer">
          <Link to="/bookings" className="btn ghost sm">← My bookings</Link>
          <button className="btn secondary sm" onClick={() => downloadIcs(b)}>
            <Icon name="calendar" size={14} /> Add to calendar
          </button>
          <Link to="/bookings" className="btn sm">Done</Link>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function StatusBanner({ b, landlordName }) {
  if (b.status === 'requested') return (
    <div className="status-banner status-requested">
      <div className="status-banner-head">
        <Icon name="clock" size={22} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div className="status-banner-title">Request sent — waiting for {landlordName}</div>
          <span className="chip warn" style={{ marginTop: 6, display: 'inline-flex' }}>WAITING</span>
        </div>
      </div>
      <p className="status-banner-sub">Most landlords answer within a few hours. We'll show it here and in Chat.</p>
    </div>
  )

  if (b.status === 'confirmed') return (
    <div className="status-banner status-confirmed">
      <div className="status-banner-head">
        <Icon name="check" size={22} style={{ color: 'var(--safe)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div className="status-banner-title" style={{ color: 'var(--safe)' }}>Meetup confirmed by {landlordName}</div>
          <span className="chip safe" style={{ marginTop: 6, display: 'inline-flex' }}>CONFIRMED</span>
        </div>
      </div>
    </div>
  )

  if (b.status === 'visited') return (
    <div className="status-banner status-confirmed">
      <div className="status-banner-head">
        <Icon name="check" size={22} style={{ color: 'var(--safe)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div className="status-banner-title" style={{ color: 'var(--safe)' }}>Visit completed</div>
          <span className="chip safe" style={{ marginTop: 6, display: 'inline-flex' }}>VISITED</span>
        </div>
      </div>
    </div>
  )

  const labels = {
    declined: 'Request declined by the landlord',
    cancelled: 'Booking cancelled',
    no_show: 'Booking cancelled (no-show)',
  }
  return (
    <div className="status-banner status-bad">
      <div className="status-banner-head">
        <Icon name="x" size={22} style={{ color: 'var(--bad)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div className="status-banner-title" style={{ color: 'var(--bad)' }}>{labels[b.status] || b.status}</div>
          <span className="chip bad" style={{ marginTop: 6, display: 'inline-flex' }}>{b.status.toUpperCase().replace('_', ' ')}</span>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Link to="/" className="btn secondary sm">Find another room</Link>
      </div>
    </div>
  )
}

function RenterTimeline({ b, landlordName }) {
  const done = [
    true,
    ['confirmed', 'visited'].includes(b.status),
    b.status === 'visited',
    false,
  ]
  const steps = [
    { label: 'Request sent', sub: null, icon: 'check' },
    {
      label: 'Landlord confirmed',
      sub: done[1] ? `${landlordName} will meet you on ${fmtShort(b.slot)} at ${fmtTime(b.slot)}` : null,
      icon: 'check',
    },
    { label: 'You visit the room', sub: null, icon: 'check' },
    { label: 'Pay the landlord by KHQR — only if you decide to rent', sub: null, icon: 'qr' },
  ]

  return (
    <>
      {steps.map((s, i) => (
        <div key={i} className="tl-item">
          <div className="tl-left">
            <div className={`tl-dot${done[i] ? ' done' : ''}`}>
              <Icon name={done[i] ? 'check' : (i === 3 ? 'qr' : 'clock')} size={12} stroke={done[i] ? 3 : 2} />
            </div>
            {i < steps.length - 1 && <div className={`tl-line${done[i] ? ' done' : ''}`} />}
          </div>
          <div className="tl-content">
            <b style={{ color: done[i] ? 'var(--ink)' : 'var(--ink-3)' }}>{s.label}</b>
            {s.sub && <div className="tl-sub">{s.sub}</div>}
          </div>
        </div>
      ))}
    </>
  )
}

function Feedback({ onSubmit, busy }) {
  const [matched, setMatched] = useState(null)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  return (
    <>
      <div className="section-title">After your visit</div>
      <div className="card">
        <b>Did the room match the listing?</b>
        <div className="row" style={{ marginTop: 10 }}>
          <button className={`btn grow ${matched === true ? 'ok' : 'secondary'}`} onClick={() => setMatched(true)}>Yes, it matched</button>
          <button className={`btn grow ${matched === false ? '' : 'secondary'}`} onClick={() => setMatched(false)}>No</button>
        </div>
        <div className="row" style={{ marginTop: 14, gap: 4 }} aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className="icon-btn" onClick={() => setRating(n)} aria-label={`${n} stars`} style={{ color: n <= rating ? '#f2a516' : '#d6d0cc' }}>
              <Icon name="star" fill="currentColor" size={26} stroke={1} />
            </button>
          ))}
        </div>
        <textarea className="input" style={{ marginTop: 10 }} value={review} onChange={(e) => setReview(e.target.value)} placeholder="Anything other renters should know? (optional)" />
        <button className="btn block" style={{ marginTop: 12 }} disabled={matched == null || busy}
          onClick={() => onSubmit({ room_matched: matched, rating: rating || null, review: review || null })}>Send feedback</button>
      </div>
    </>
  )
}

function downloadIcs(b) {
  const start = new Date(b.slot)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lumnov//Room Check//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Room check – ${b.listing?.title || ''}`,
    `LOCATION:${b.listing?.address || b.listing?.area || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'room-check.ics'; a.click()
  URL.revokeObjectURL(url)
}
