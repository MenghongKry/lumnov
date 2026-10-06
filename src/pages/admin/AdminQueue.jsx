import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { LISTING_STATUS, ago, money } from '../../lib/format'
import { Avatar, Empty, Spinner, StatusChip, TopBar } from '../../components/Bits'
import Icon from '../../components/Icons'

const KIND = { landlord_id: 'Landlord ID', tenant_id: 'Renter ID', right_to_rent: 'Right to rent' }

// Lumnov team screen: approve documents, record the room visit, handle reports.
export default function AdminQueue() {
  const [q, setQ] = useState(null)
  const [tab, setTab] = useState('listings')
  const load = () => api.adminQueue().then(setQ)
  useEffect(() => { load() }, [])

  return (
    <>
      <TopBar title="Check queue" />
      <main className="page">
        <div className="seg" style={{ marginBottom: 16 }}>
          <button className={tab === 'listings' ? 'on' : ''} onClick={() => setTab('listings')}>Rooms{q ? ` (${q.listings.length})` : ''}</button>
          <button className={tab === 'people' ? 'on' : ''} onClick={() => setTab('people')}>IDs{q ? ` (${q.people.length})` : ''}</button>
          <button className={tab === 'reports' ? 'on' : ''} onClick={() => setTab('reports')}>Reports{q ? ` (${q.reports.length})` : ''}</button>
        </div>
        {!q ? <Spinner /> : (
          <>
            {tab === 'listings' && (q.listings.length ? q.listings.map((l) => <ListingReview key={l.id} l={l} onChange={load} />)
              : <Empty icon="shield" title="All rooms checked" />)}
            {tab === 'people' && (q.people.length ? q.people.map((p) => <PersonReview key={p.id} p={p} onChange={load} />)
              : <Empty icon="id" title="No IDs waiting" />)}
            {tab === 'reports' && (q.reports.length ? q.reports.map((r) => (
              <div key={r.id} className="card" style={{ marginBottom: 12 }}>
                <div className="row between"><span className="chip bad">{r.reason}</span><span className="tiny">{ago(r.created_at)}</span></div>
                {r.details && <p className="small" style={{ marginBottom: 0 }}>{r.details}</p>}
                <Link to={`/r/${r.listing?.code}`} className="tiny" style={{ display: 'block', marginTop: 8 }}>{r.listing?.code} · {r.listing?.title}</Link>
              </div>
            )) : <Empty icon="flag" title="No reports" />)}
          </>
        )}
      </main>
    </>
  )
}

function Docs({ docs }) {
  if (!docs?.length) return <p className="tiny">No documents uploaded.</p>
  return (
    <div className="photo-strip" style={{ marginTop: 10 }}>
      {docs.map((d) => (
        <a key={d.id} href={d.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
          {d.url ? <img src={d.url} alt={KIND[d.kind]} /> : <div className="thumb" />}
          <div className="tiny" style={{ marginTop: 4 }}>{KIND[d.kind]}</div>
        </a>
      ))}
    </div>
  )
}

function ListingReview({ l, onChange }) {
  const [busy, setBusy] = useState(false)
  const run = async (fn) => { setBusy(true); await fn(); await onChange(); setBusy(false) }
  const patch = (p) => run(() => api.adminUpdateListing(l.id, p))

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <img className="thumb" src={l.photos[0]} alt="" />
        <div className="grow">
          <div className="row between"><span className="tiny">{l.code}</span><StatusChip map={LISTING_STATUS} status={l.status} /></div>
          <Link to={`/r/${l.code}`} style={{ fontWeight: 700, color: 'inherit', display: 'block', marginTop: 4 }}>{l.title}</Link>
          <div className="tiny">{l.address || l.area} · {money(l.price_usd)}</div>
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Avatar name={l.landlord?.full_name} sm />
        <div className="grow small"><b>{l.landlord?.full_name}</b><div className="tiny">{l.landlord?.phone} · ID {l.landlord?.id_status}</div></div>
        {l.landlord?.phone && <a className="btn secondary sm" href={`tel:${l.landlord.phone.replace(/\s/g, '')}`}><Icon name="phone" size={15} /></a>}
      </div>

      <div className="section-title" style={{ marginTop: 14 }}>Level 1 · Documents</div>
      <Docs docs={l.docs} />
      <label className="row small" style={{ marginTop: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={l.docs_checked} disabled={busy} style={{ accentColor: 'var(--brand)' }}
          onChange={(e) => patch({ docs_checked: e.target.checked })} />
        ID matches the landlord and the proof matches this address
      </label>

      <div className="section-title">Level 2 · Room visit</div>
      <label className="upload" style={{ padding: 12 }}>
        <input type="file" accept="image/*" multiple capture="environment" onChange={(e) => run(() => api.adminUploadCheckerPhotos(l.id, Array.from(e.target.files)))} />
        <div className="row small"><Icon name="camera" size={18} /> <b>Upload our visit photos ({l.lumnov_photos?.length || 0})</b></div>
      </label>
      <label className="row small" style={{ marginTop: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={l.room_checked} disabled={busy} style={{ accentColor: 'var(--brand)' }}
          onChange={(e) => patch({ room_checked: e.target.checked })} />
        Visited: room exists, matches the photos, landlord met in person
      </label>

      {l.status === 'pending' && (
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn danger sm grow" disabled={busy} onClick={() => patch({ status: 'rejected' })}>Reject</button>
          <button className="btn ok sm grow" disabled={busy || !l.docs_checked} onClick={() => patch({ status: 'verified' })}>Publish badge</button>
        </div>
      )}
      {l.status === 'pending' && !l.docs_checked && <p className="tiny center">Check the documents before publishing. The visit can follow.</p>}
    </div>
  )
}

function PersonReview({ p, onChange }) {
  const [busy, setBusy] = useState(false)
  const set = async (s) => { setBusy(true); await api.adminSetIdStatus(p.id, s); await onChange(); setBusy(false) }
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row">
        <Avatar name={p.full_name} sm />
        <div className="grow"><b>{p.full_name}</b><div className="tiny">{p.role === 'tenant' ? 'Renter' : 'Landlord'} · {p.phone}</div></div>
      </div>
      <Docs docs={p.docs} />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn danger sm grow" disabled={busy} onClick={() => set('rejected')}>Reject</button>
        <button className="btn ok sm grow" disabled={busy} onClick={() => set('verified')}>Approve ID</button>
      </div>
    </div>
  )
}
