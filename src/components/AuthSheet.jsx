import { useState } from 'react'
import Sheet from './Sheet'
import { api, IS_DEMO } from '../lib/api'

export function AuthForm({ defaultRole = 'tenant', defaultMode = 'signin', onDone, reason }) {
  const [mode, setMode] = useState(defaultMode)
  const [role, setRole] = useState(defaultRole)
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const u = mode === 'signup' ? await api.signUp({ ...form, role }) : await api.signIn(form)
      onDone(u)
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }
  const demo = async (r) => { setBusy(true); onDone(await api.demoSignIn(r)) }

  return (
    <div>
      {reason && <p className="muted" style={{ marginTop: 0 }}>{reason}</p>}
      <div className="seg" style={{ marginBottom: 16 }}>
        <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')}>Sign in</button>
        <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>Create account</button>
      </div>
      {err && <div className="error">{err}</div>}
      <form onSubmit={submit}>
        {mode === 'signup' && (
          <>
            <div className="field">
              <span>I am a…</span>
              <div className="seg">
                <button type="button" className={role === 'tenant' ? 'on' : ''} onClick={() => setRole('tenant')}>Renter</button>
                <button type="button" className={role === 'landlord' ? 'on' : ''} onClick={() => setRole('landlord')}>Landlord</button>
              </div>
            </div>
            <label className="field"><span>Full name</span><input className="input" required value={form.fullName} onChange={set('fullName')} placeholder="e.g. Sreyneang Kim" /></label>
            <label className="field"><span>Phone number</span><input className="input" required type="tel" value={form.phone} onChange={set('phone')} placeholder="012 345 678" /></label>
          </>
        )}
        <label className="field"><span>Email</span><input className="input" required type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" autoComplete="email" /></label>
        <label className="field"><span>Password</span><input className="input" required type="password" minLength={6} value={form.password} onChange={set('password')} placeholder="At least 6 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
        <button className="btn block" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      </form>
      {IS_DEMO && (
        <>
          <div className="divider" />
          <p className="tiny center" style={{ marginTop: 0 }}>Demo mode — skip typing and continue as:</p>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn secondary sm grow" onClick={() => demo('tenant')}>Renter</button>
            <button type="button" className="btn secondary sm grow" onClick={() => demo('landlord')}>Landlord</button>
            <button type="button" className="btn secondary sm grow" onClick={() => demo('admin')}>Lumnov admin</button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AuthSheet({ reason, defaultRole, onDone, onClose }) {
  return (
    <Sheet onClose={onClose} label="Sign in">
      <h3>Sign in to Lumnov</h3>
      <AuthForm reason={reason} defaultRole={defaultRole} onDone={onDone} />
    </Sheet>
  )
}
