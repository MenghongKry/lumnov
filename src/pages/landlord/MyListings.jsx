import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { listingLink } from '../../lib/config'
import { LISTING_STATUS, fmtDate, money } from '../../lib/format'
import { badgePng, stampedPhotoPng, downloadDataUrl } from '../../lib/badge'
import { useAuth } from '../../context/AuthContext'
import { Empty, Spinner, StatusChip, TopBar } from '../../components/Bits'
import Icon from '../../components/Icons'

export default function MyListings() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [stats, setStats] = useState({})
  const [requests, setRequests] = useState(0)

  useEffect(() => {
    api.myListings().then(async (r) => {
      setRows(r)
      setStats(await api.listingStats(r.map((l) => l.id)))
    })
    api.landlordRequests().then((b) => setRequests(b.filter((x) => x.status === 'requested').length))
  }, [])

  return (
    <>
      <TopBar title="My listings" right={<Link to="/landlord/new" className="btn sm"><Icon name="plus" size={16} /> Add room</Link>} />
      <main className="page">
        <p className="muted small" style={{ marginTop: 0 }}>Hi {user.full_name?.split(' ')[0]}! Add your Lumnov badge to every Facebook post so renters can check you.</p>

        {requests > 0 && (
          <Link to="/landlord/requests" className="card row" style={{ background: 'var(--brand)', color: '#fff', marginBottom: 12 }}>
            <Icon name="inbox" />
            <div className="grow"><b>{requests} new room-check request{requests > 1 ? 's' : ''}</b><div className="small" style={{ opacity: .9 }}>Accept or decline the time</div></div>
            <Icon name="back" style={{ transform: 'rotate(180deg)' }} />
          </Link>
        )}

        {!rows ? <Spinner /> : rows.length === 0 ? (
          <Empty icon="list" title="No rooms yet">
            Add your first room. We'll check it and give you a Verified badge.
            <br /><Link to="/landlord/new" className="btn sm" style={{ marginTop: 14 }}>Add a room</Link>
          </Empty>
        ) : rows.map((l) => <ListingManage key={l.id} l={l} s={stats[l.id]} />)}
      </main>
    </>
  )
}

function ListingManage({ l, s }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
      <Link to={`/r/${l.code}`} className="row" style={{ padding: 14, color: 'inherit', alignItems: 'flex-start' }}>
        <img className="thumb" src={l.photos[0]} alt="" />
        <div className="grow">
          <div className="row between"><span className="tiny">{l.code}</span><StatusChip map={LISTING_STATUS} status={l.status} /></div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{l.title}</div>
          <div className="tiny">{l.area} · {money(l.price_usd)}/month</div>
        </div>
      </Link>

      {l.status === 'verified' && (
        <div style={{ padding: '0 14px 14px' }}>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className={`chip ${l.docs_checked ? 'ok' : 'warn'}`}>{l.docs_checked ? '✓' : '…'} Documents</span>
            <span className={`chip ${l.room_checked ? 'ok' : 'warn'}`}>{l.room_checked ? '✓' : '…'} Room visit</span>
            <span className={`chip ${l.tenant_confirmed_count ? 'ok' : ''}`}>{l.tenant_confirmed_count} renter confirms</span>
          </div>
          <div className="tiny" style={{ marginTop: 8 }}>Verified {fmtDate(l.verified_at)} · renew before {fmtDate(l.expires_at)}</div>
          {s && (
            <div className="stats">
              <div><b>{s.view}</b><span>Views</span></div>
              <div><b>{s.click_chat}</b><span>Chats</span></div>
              <div><b>{s.click_book}</b><span>Book taps</span></div>
              <div><b>{s.bookings}</b><span>Bookings</span></div>
            </div>
          )}
          <button className="btn block" style={{ marginTop: 12 }} onClick={() => setOpen(!open)}>
            <Icon name="qr" size={18} /> {open ? 'Hide badge' : 'Get badge for Facebook post'}
          </button>
          {open && <BadgeKit l={l} />}
        </div>
      )}

      {l.status === 'pending' && (
        <div style={{ padding: '0 14px 14px' }}>
          <div className="badge-preview small">
            <b>What happens next</b>
            <ol style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>We check your ID and documents (within 24h)</li>
              <li>Our team visits the room and takes photos</li>
              <li>Your badge + QR appear here — add them to your posts</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

// Everything a landlord needs to put the badge on Facebook / Khmer24 / Telegram.
function BadgeKit({ l }) {
  const link = listingLink(l.code)
  const [badge, setBadge] = useState(null)
  const [preview, setPreview] = useState(null)
  const [copied, setCopied] = useState('')
  const [selected, setSelected] = useState(() => new Set([0]))
  const [downloading, setDownloading] = useState(false)
  const caption = `✅ Verified by Lumnov — ${l.code}\n${l.title}, ${l.area} · $${l.price_usd}/month\nCheck the landlord & room here: ${link}\nBook a free room check. Never pay before viewing.`

  useEffect(() => {
    badgePng(l.code, link).then(setBadge)
    if (l.photos[0]) stampedPhotoPng(l.photos[0], l.code, link, { verifiedAt: l.verified_at }).then(setPreview)
  }, [l.code, link, l.verified_at])

  const toggle = (i) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard blocked */ }
    setCopied(what); setTimeout(() => setCopied(''), 1800)
  }

  const downloadSelected = async () => {
    setDownloading(true)
    const indices = [...selected].sort()
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i]
      const url = await stampedPhotoPng(l.photos[idx], l.code, link, { verifiedAt: l.verified_at })
      downloadDataUrl(url, `${l.code}-photo-${idx + 1}-with-badge.png`)
      if (i < indices.length - 1) await new Promise((r) => setTimeout(r, 400))
    }
    setDownloading(false)
  }

  return (
    <div className="badge-preview" style={{ marginTop: 12 }}>
      {l.photos[0] && (
        <div style={{ marginBottom: 10 }}>
          {preview
            ? <img src={preview} alt="Preview with QR badge" style={{ width: '100%', borderRadius: 8 }} />
            : <div style={{ aspectRatio: '4/3', background: '#eee', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' , opacity: 50}}><Spinner /></div>
          }
        </div>
      )}
      {badge ? <img src={badge} alt={`Lumnov badge for ${l.code}`} style={{ width: '60%' }} /> : <Spinner />}

      {l.photos.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p className="tiny" style={{ margin: '0 0 6px', fontWeight: 600 }}>Select photos to stamp with badge:</p>
          <div className="row wrap" style={{ gap: 6 }}>
            {l.photos.map((src, i) => (
              <div
                key={i}
                onClick={() => toggle(i)}
                style={{
                  position: 'relative', cursor: 'pointer', borderRadius: 6, overflow: 'hidden',
                  outline: selected.has(i) ? '2.5px solid var(--brand)' : '2.5px solid transparent',
                }}
              >
                <img src={src} alt={`photo ${i + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', display: 'block' }} />
                {selected.has(i) && (
                  <div style={{ position: 'absolute', top: 3, right: 3, background: 'var(--brand)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={11} style={{ color: '#fff' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stack" style={{ marginTop: 12 }}>
        <button
          className="btn secondary block sm"
          disabled={selected.size === 0 || downloading}
          onClick={downloadSelected}
        >
          <Icon name="camera" size={16} />
          {downloading ? 'Downloading…' : `Download photo${selected.size !== 1 ? 's' : ''} with QR for Facebook (${selected.size})`}
        </button>
        <button className="btn secondary block sm" disabled={!badge} onClick={() => downloadDataUrl(badge, `${l.code}-lumnov-badge.png`)}><Icon name="download" size={16} /> Download badge + QR</button>
        <button className="btn secondary block sm" onClick={() => copy(caption, 'caption')}><Icon name="copy" size={16} /> {copied === 'caption' ? 'Copied!' : 'Copy post text with link'}</button>
        <button className="btn ghost block sm" onClick={() => copy(link, 'link')}>{copied === 'link' ? 'Copied!' : link}</button>
      </div>
      <p className="tiny" style={{ marginBottom: 0 }}>
        Tip: renters on a phone can't scan a QR on their own screen. Always paste the <b>link in your post text</b>, and use the QR on printed signs at the room.
      </p>
    </div>
  )
}
