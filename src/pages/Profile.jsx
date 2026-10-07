import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtDate } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { Avatar, TopBar } from '../components/Bits'
import Icon from '../components/Icons'

const ID_TEXT = {
  none: { tone: 'warn', label: 'Not verified', text: 'Verify your ID once. Landlords accept verified renters faster.' },
  pending: { tone: 'warn', label: 'Checking…', text: 'We received your ID. Our team usually checks it within 24 hours.' },
  verified: { tone: 'ok', label: 'ID verified', text: 'Your ID is verified. Landlords see a green check next to your name.' },
  rejected: { tone: 'bad', label: 'Not accepted', text: 'We could not read your ID. Please upload a clearer photo.' },
}

export default function Profile() {
  const { user, refresh } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ full_name: user.full_name || '', phone: user.phone || '', fb_profile_url: user.fb_profile_url || '' })
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState(null)
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setSaved(false) }
  const roleLabel = { tenant: 'Renter', landlord: 'Landlord', admin: 'Lumnov team' }[user.role]
  const idInfo = ID_TEXT[user.id_status] || ID_TEXT.none

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    await api.updateMyProfile(form); await refresh()
    setBusy(false); setSaved(true)
  }
  const upload = async () => {
    setBusy(true); await api.uploadMyId(file); await refresh(); setBusy(false); setFile(null)
  }
  const logout = async () => { await api.signOut(); nav('/') }

  return (
    <>
      <TopBar title="Profile" />
      <main className="page">
        <div className="card row">
          <Avatar name={user.full_name} />
          <div className="grow">
            <b>{user.full_name || 'No name yet'}</b>
            <div className="tiny">{roleLabel} · since {fmtDate(user.created_at)}</div>
          </div>
          <span className={`chip ${idInfo.tone}`}>{idInfo.label}</span>
        </div>

        {/* GET VERIFIED */}
        <div className="section-title">Get verified</div>
        <div className="card">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="avatar" style={{ borderRadius: 12 }}><Icon name="id" /></div>
            <div className="grow">
              <b>Identity check</b>
              <p className="small muted" style={{ margin: '4px 0 0' }}>{idInfo.text}</p>
            </div>
          </div>
          {['none', 'rejected'].includes(user.id_status) && (
            <>
              <label className="upload" style={{ marginTop: 14 }}>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files[0] || null)} />
                <div className="row"><Icon name="camera" /> <b>{file ? file.name : 'Take a photo of your National ID or passport'}</b></div>
                <div className="hint">Only the Lumnov team can see it. It is never shown to landlords or posted anywhere.</div>
              </label>
              <button className="btn block" style={{ marginTop: 12 }} disabled={!file || busy} onClick={upload}>{busy ? 'Uploading…' : 'Send for checking'}</button>
            </>
          )}
        </div>

        {user.role === 'landlord' && (
          <Link to="/landlord/new" className="card row" style={{ color: 'inherit', marginTop: 12 }}>
            <div className="avatar" style={{ borderRadius: 12 }}><Icon name="plus" /></div>
            <div className="grow"><b>Verify a room</b><div className="tiny">Add a room and get your Lumnov badge</div></div>
            <Icon name="back" style={{ transform: 'rotate(180deg)', color: 'var(--ink-3)' }} />
          </Link>
        )}

        <div className="section-title">Your details</div>
        <form className="card" onSubmit={save}>
          {saved && <div className="success">Saved</div>}
          <label className="field"><span>Full name</span><input className="input" value={form.full_name} onChange={set('full_name')} /></label>
          <label className="field"><span>Phone</span><input className="input" type="tel" value={form.phone} onChange={set('phone')} /></label>
          {user.role === 'landlord' && (
            <label className="field"><span>Facebook profile link</span><input className="input" type="url" value={form.fb_profile_url} onChange={set('fb_profile_url')} placeholder="https://facebook.com/your.name" />
              <div className="hint">Shown on your listings so renters can match the post to you.</div></label>
          )}
          <div className="tiny" style={{ marginBottom: 12 }}>Email: {user.email}</div>
          <button className="btn block" disabled={busy}>Save</button>
        </form>

        <button className="btn ghost block" style={{ marginTop: 16 }} onClick={logout}><Icon name="logout" size={18} /> Sign out</button>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/welcome" className="tiny" style={{ color: 'var(--ink-3)' }}>About Lumnov</Link>
        </div>
      </main>
    </>
  )
}
