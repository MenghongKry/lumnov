import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { AMENITIES, AREAS, ROOM_TYPES } from '../../lib/config'
import { useAuth } from '../../context/AuthContext'
import { TopBar } from '../../components/Bits'
import Icon from '../../components/Icons'

const PROOF_TYPES = ['Hard title', 'Soft title', 'Lease / management contract', 'Electricity or water bill (EDC / PPWSA)', 'Sangkat letter']

export default function AddListing() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ title: '', room_type: 'Room', area: 'Toul Kork', address: '', price_usd: '', description: '', amenities: [], map_url: '' })
  const [photos, setPhotos] = useState([])
  const [previews, setPreviews] = useState([])
  const [idFile, setIdFile] = useState(null)
  const [proofType, setProofType] = useState(PROOF_TYPES[0])
  const [proofFile, setProofFile] = useState(null)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [created, setCreated] = useState(null)

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggle = (a) => setF({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] })

  useEffect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p))
    setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [photos])

  const needsId = user.id_status !== 'verified'
  const canNext = [
    f.title && f.area && f.price_usd > 0,
    photos.length > 0,
    (!needsId || idFile) && proofFile && agree,
  ][step]

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      const l = await api.createListing({ ...f, description: `${f.description}`.trim() }, { photos, idFile: needsId ? idFile : null, proofFile })
      setCreated(l)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  if (created) {
    return (
      <>
        <TopBar title="Sent for checking" />
        <main className="page center">
          <div className="avatar" style={{ width: 72, height: 72, margin: '20px auto 12px', background: 'var(--ok-soft)', color: 'var(--ok)' }}><Icon name="check" size={36} stroke={3} /></div>
          <h2 className="h2">Room sent to Lumnov</h2>
          <p className="muted">Your code is <b>{created.code}</b>. We'll check your documents within 24 hours and call you to plan a short visit.</p>
          <div className="card small" style={{ textAlign: 'left', marginTop: 16 }}>
            <b>Next steps</b>
            <ol style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Document check</li><li>Room visit by our team</li><li>Badge + QR ready in “My listings”</li>
            </ol>
          </div>
          <Link to="/landlord" className="btn block" style={{ marginTop: 20 }}>Go to my listings</Link>
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar title="Add a room" back="/landlord" />
      <main className="page" style={{ paddingBottom: 110 }}>
        <div className="steps">{[0, 1, 2].map((i) => <div key={i} className={i <= step ? 'on' : ''} />)}</div>
        <div className="tiny" style={{ marginBottom: 6 }}>Step {step + 1} of 3</div>

        {step === 0 && (
          <>
            <h2 className="h2">Room details</h2>
            <label className="field"><span>Title</span><input className="input" value={f.title} onChange={set('title')} placeholder="e.g. Bright single room near RUPP" maxLength={70} /></label>
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <label className="field grow"><span>Type</span>
                <select className="input" value={f.room_type} onChange={set('room_type')}>{ROOM_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label className="field grow"><span>Price ($/month)</span><input className="input" type="number" min="0" inputMode="numeric" value={f.price_usd} onChange={set('price_usd')} placeholder="120" /></label>
            </div>
            <label className="field"><span>Area (khan)</span>
              <select className="input" value={f.area} onChange={set('area')}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></label>
            <label className="field"><span>Address / landmark</span><input className="input" value={f.address} onChange={set('address')} placeholder="St. 516, near RUPP" /></label>
            <label className="field"><span>Google Maps link (optional)</span><input className="input" type="url" value={f.map_url} onChange={set('map_url')} placeholder="https://maps.app.goo.gl/…" /></label>
            <label className="field"><span>Description</span><textarea className="input" value={f.description} onChange={set('description')} placeholder="Floor, who it suits, rules, what's included…" /></label>
            <div className="field"><span>What's included</span>
              <div className="check-grid">
                {AMENITIES.map((a) => (
                  <label key={a}><input type="checkbox" checked={f.amenities.includes(a)} onChange={() => toggle(a)} /> {a}</label>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="h2">Photos</h2>
            <p className="muted small" style={{ marginTop: 0 }}>Use your own real photos. We compare them during the visit — stolen photos get rejected.</p>
            <label className="upload">
              <input type="file" accept="image/*" multiple onChange={(e) => setPhotos([...photos, ...Array.from(e.target.files)].slice(0, 8))} />
              <div className="row"><Icon name="camera" /> <b>Add photos</b></div>
              <div className="hint">Up to 8 photos · first photo is the cover</div>
            </label>
            {previews.length > 0 && (
              <div className="photo-strip" style={{ marginTop: 12 }}>
                {previews.map((p, i) => (
                  <div key={p} style={{ position: 'relative' }}>
                    <img src={p} alt={`Photo ${i + 1}`} />
                    <button className="icon-btn" aria-label="Remove photo" style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.55)', color: '#fff', width: 28, height: 28 }}
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="h2">Get verified</h2>
            <p className="muted small" style={{ marginTop: 0 }}>These documents are private. Only the Lumnov team sees them — renters only see “checked ✓”.</p>

            {needsId ? (
              <div className="field"><span>1. Your National ID or passport</span>
                <label className="upload"><input type="file" accept="image/*,application/pdf" onChange={(e) => setIdFile(e.target.files[0] || null)} />
                  <div className="row"><Icon name="id" /> <b>{idFile ? idFile.name : 'Upload ID photo'}</b></div></label>
              </div>
            ) : <div className="success">✓ Your ID is already verified</div>}

            <div className="field"><span>{needsId ? '2' : '1'}. Proof you can rent this room</span>
              <select className="input" value={proofType} onChange={(e) => setProofType(e.target.value)} style={{ marginBottom: 8 }}>
                {PROOF_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <label className="upload"><input type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files[0] || null)} />
                <div className="row"><Icon name="doc" /> <b>{proofFile ? proofFile.name : `Upload ${proofType.toLowerCase()}`}</b></div>
                <div className="hint">The name or address should match this room.</div></label>
            </div>

            <label className="row small" style={{ alignItems: 'flex-start', cursor: 'pointer', background: '#fff', padding: 12, borderRadius: 12, border: '1px solid var(--line)' }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ accentColor: 'var(--brand)', marginTop: 3 }} />
              <span>I have the right to rent this room, my photos are real, and I agree to a short visit by the Lumnov team.</span>
            </label>
            {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
          </>
        )}
      </main>

      <div className="sticky-cta">
        {step > 0 && <button className="btn secondary" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 2
          ? <button className="btn grow" disabled={!canNext} onClick={() => setStep(step + 1)}>Next</button>
          : <button className="btn grow" disabled={!canNext || busy} onClick={submit}>{busy ? 'Sending…' : 'Send for verification'}</button>}
      </div>
    </>
  )
}
