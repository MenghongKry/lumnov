import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { listingLink } from '../lib/config'
import { money, fmtDate } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { Avatar, Spinner, TopBar } from '../components/Bits'
import VerificationBlock from '../components/VerificationBlock'
import ReportSheet from '../components/ReportSheet'
import Icon from '../components/Icons'

// The page the QR / short link opens. Public: no login needed to view.
export default function ListingDetail() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { user, requireAuth } = useAuth()
  const [l, setL] = useState(undefined)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [report, setReport] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    api.getListingByCode(code).then((x) => {
      if (!alive) return
      setL(x)
      if (x?.status === 'verified') api.logEvent(x.id, 'view', params.get('src') || 'app')
    })
    return () => { alive = false }
  }, [code])

  if (l === undefined) return <><TopBar title={code} back="/" /><Spinner /></>
  if (l === null) return <NotLumnov code={code} />

  const mine = user && user.id === l.landlord_id

  const chat = async () => {
    api.logEvent(l.id, 'click_chat')
    try {
      await requireAuth('Sign in to message the landlord. It takes 30 seconds.')
      const c = await api.getOrCreateConversation(l.id)
      nav(`/chat/${c.id}`)
    } catch { /* closed sheet */ }
  }
  const book = async () => {
    api.logEvent(l.id, 'click_book')
    try {
      await requireAuth('Sign in to book a free room check.')
      nav(`/r/${l.code}/book`)
    } catch { /* closed sheet */ }
  }
  const share = async () => {
    const url = listingLink(l.code)
    try {
      if (navigator.share) await navigator.share({ title: l.title, text: `Verified by Lumnov: ${l.title}`, url })
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    } catch { /* user cancelled */ }
  }

  return (
    <>
      <TopBar title={l.code} back="/" right={
        <>
          <button className="icon-btn" aria-label="Share" onClick={share}><Icon name={copied ? 'check' : 'share'} /></button>
          <button className="icon-btn" aria-label="Report" onClick={() => setReport(true)}><Icon name="flag" /></button>
        </>
      } />
      <main className="page flush" style={{ paddingBottom: 110 }}>
        <div className="gallery-wrap">
          <div className="gallery" onScroll={(e) => setPhotoIdx(Math.round(e.target.scrollLeft / e.target.clientWidth))}>
            {l.photos.map((p, i) => <img key={i} src={p} alt={`${l.title} photo ${i + 1}`} />)}
          </div>
          <span className="gallery-count">{photoIdx + 1} / {l.photos.length}</span>
        </div>

        <div style={{ padding: 16 }}>
          {mine && <div className="success">This is your listing. Renters see this page when they scan your QR.</div>}

          <VerificationBlock l={l} />

          <div style={{ marginTop: 20 }}>
            <div className="row between">
              <span className="chip">{l.room_type}</span>
              <span className="tiny">{l.code}</span>
            </div>
            <h2 className="h2" style={{ marginTop: 8 }}>{l.title}</h2>
            <div className="row muted small" style={{ gap: 6 }}><Icon name="map" size={16} /> {l.address || l.area}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 10 }}>{money(l.price_usd)}<span className="muted" style={{ fontSize: 15, fontWeight: 500 }}> /month</span></div>
          </div>

          <div className="section-title">Is this the same landlord?</div>
          <div className="card">
            <div className="row">
              <Avatar name={l.landlord?.full_name} />
              <div className="grow">
                <div className="row" style={{ gap: 6 }}><b>{l.landlord?.full_name}</b>{l.landlord?.id_status === 'verified' && <Icon name="check" size={16} stroke={3} style={{ color: 'var(--ok)' }} />}</div>
                <div className="tiny">ID verified · on Lumnov since {fmtDate(l.landlord?.created_at)}</div>
              </div>
            </div>
            {l.landlord?.fb_profile_url && (
              <a href={l.landlord.fb_profile_url} target="_blank" rel="noreferrer" className="btn secondary sm block" style={{ marginTop: 12 }}>
                Open their Facebook profile to compare
              </a>
            )}
            <p className="tiny" style={{ marginBottom: 0 }}>The post you saw should come from this person. If not, report it.</p>
          </div>

          {l.lumnov_photos?.length > 0 && (
            <>
              <div className="section-title">Photos taken by Lumnov</div>
              <div className="photo-strip">{l.lumnov_photos.map((p, i) => <img key={i} src={p} alt={`Lumnov check photo ${i + 1}`} />)}</div>
              <p className="tiny">Compare these with the photos in the post. They should show the same room.</p>
            </>
          )}

          <div className="section-title">About this room</div>
          <p style={{ marginTop: 0, lineHeight: 1.5 }}>{l.description}</p>
          {l.amenities?.length > 0 && <div className="amenities">{l.amenities.map((a) => <span key={a}>{a}</span>)}</div>}

          {l.map_url && (
            <a className="btn secondary block" style={{ marginTop: 16 }} href={l.map_url} target="_blank" rel="noreferrer"><Icon name="map" size={18} /> Open in Maps</a>
          )}

          <div className="section-title">How booking works</div>
          <div className="card small">
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Pick a time for a <b>free room check</b>.</li>
              <li>The landlord confirms. You visit and see the room.</li>
              <li>Only if you like it, pay the landlord directly by <b>KHQR</b>. Lumnov never holds your money.</li>
            </ol>
          </div>

          <button className="btn ghost block" style={{ marginTop: 16 }} onClick={() => setReport(true)}><Icon name="flag" size={18} /> Report this listing</button>
        </div>
      </main>

      {mine ? (
        <div className="sticky-cta"><Link to="/landlord" className="btn block">Back to my listings</Link></div>
      ) : l.status === 'verified' && (
        <div className="sticky-cta">
          <div className="price">{money(l.price_usd)}<small>per month</small></div>
          <button className="btn secondary" onClick={chat} aria-label="Chat with landlord"><Icon name="chat" size={18} /> Chat</button>
          <button className="btn grow" onClick={book}>Book free check</button>
        </div>
      )}

      {report && <ReportSheet listing={l} onClose={() => setReport(false)} />}
    </>
  )
}

// A scanned code that isn't in Lumnov = possible fake badge. Say so loudly.
function NotLumnov({ code }) {
  return (
    <>
      <TopBar title="Not found" back="/" />
      <main className="page">
        <div className="not-verified">
          <div className="row" style={{ fontWeight: 800, fontSize: 18 }}><Icon name="info" /> {code} is not a verified Lumnov listing</div>
          <p style={{ margin: '8px 0 0' }}>If a post shows a "Verified by Lumnov" badge with this code, the badge may be fake. Do not send any money.</p>
        </div>
        <Link to="/" className="btn block" style={{ marginTop: 16 }}>See real verified rooms</Link>
      </main>
    </>
  )
}
