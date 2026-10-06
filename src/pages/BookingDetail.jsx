import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { BOOKING_STATUS, fmtSlot, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { Avatar, Empty, Spinner, StatusChip, TopBar } from '../components/Bits'
import { TenantCardBody } from '../components/TenantCard'
import Icon from '../components/Icons'

export default function BookingDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
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

  const steps = [
    { key: 'requested', label: 'Request sent' },
    { key: 'confirmed', label: 'Landlord confirmed' },
    { key: 'visited', label: 'You visited the room' },
  ]
  const order = { requested: 0, confirmed: 1, visited: 2 }
  const reached = order[b.status] ?? -1

  return (
    <>
      <TopBar title="Room check" back={isLandlord ? '/landlord/requests' : '/bookings'} />
      <main className="page">
        {params.get('new') && b.status === 'requested' && (
          <div className="success"><b>Request sent!</b> The landlord will confirm your time. We'll show it here and in Chat.</div>
        )}

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
          {b.note && <p className="small muted" style={{ marginBottom: 0 }}>“{b.note}”</p>}
          <div className="row" style={{ marginTop: 14, gap: 8 }}>
            {b.listing?.map_url && <a className="btn secondary sm grow" href={b.listing.map_url} target="_blank" rel="noreferrer"><Icon name="map" size={16} /> Directions</a>}
            <button className="btn secondary sm grow" onClick={openChat}><Icon name="chat" size={16} /> Chat</button>
          </div>
        </div>

        {/* who you're meeting */}
        <div className="section-title">{isLandlord ? 'Renter' : 'Landlord'}</div>
        <div className="card">
          {isLandlord ? <TenantCardBody tenantId={b.tenant_id} /> : (
            <div className="row">
              <Avatar name={b.landlord?.full_name} />
              <div className="grow"><b>{b.landlord?.full_name}</b><div className="tiny">ID verified by Lumnov</div></div>
              {b.landlord?.phone && b.status === 'confirmed' && <a className="btn secondary sm" href={`tel:${b.landlord.phone.replace(/\s/g, '')}`}><Icon name="phone" size={16} /> Call</a>}
            </div>
          )}
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

        {/* renter: checklist before the visit */}
        {!isLandlord && b.status === 'confirmed' && !slotPassed && (
          <>
            <div className="section-title">At the visit, check that…</div>
            <div className="card small" style={{ lineHeight: 1.7 }}>
              ✓ The room looks like the <b>Lumnov photos</b><br />
              ✓ The person you meet is <b>{b.landlord?.full_name}</b><br />
              ✓ Water, electricity and the lock work<br />
              ✓ You agree the deposit and price in writing<br />
              <b style={{ color: 'var(--bad)' }}>✗ Never pay before you have seen the room</b>
            </div>
          </>
        )}

        {/* renter: feedback after the visit -> Level 3 "confirmed by renters" */}
        {!isLandlord && (b.status === 'visited' || (b.status === 'confirmed' && slotPassed)) && b.room_matched == null && (
          <Feedback onSubmit={update} busy={busy} />
        )}
        {!isLandlord && b.room_matched != null && (
          <div className="success" style={{ marginTop: 16 }}>Thanks for your feedback{b.room_matched ? ' — it helps other renters trust this room.' : '. Our team will check this listing again.'}</div>
        )}

        {/* actions */}
        <div style={{ marginTop: 20 }}>
          {isLandlord && b.status === 'requested' && (
            <div className="row">
              <button className="btn danger grow" disabled={busy} onClick={() => update({ status: 'declined' })}>Decline</button>
              <button className="btn ok grow" disabled={busy} onClick={() => update({ status: 'confirmed' })}>Accept time</button>
            </div>
          )}
          {isLandlord && b.status === 'confirmed' && (
            <div className="row">
              <button className="btn danger grow" disabled={busy || !slotPassed} onClick={() => update({ status: 'no_show' })}>Didn't come</button>
              <button className="btn ok grow" disabled={busy || !slotPassed} onClick={() => update({ status: 'visited' })}>Mark visited</button>
            </div>
          )}
          {isLandlord && b.status === 'confirmed' && !slotPassed && <p className="tiny center">You can mark the visit after the booked time.</p>}
          {!isLandlord && ['requested', 'confirmed'].includes(b.status) && !slotPassed && (
            <button className="btn ghost block" disabled={busy} onClick={() => update({ status: 'cancelled' })}>Cancel this room check</button>
          )}
        </div>
      </main>
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
