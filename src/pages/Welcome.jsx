import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icons'
import { PUBLIC_HOST } from '../lib/config'

export const markWelcomeSeen = () => { try { localStorage.setItem('lumnov_welcome_seen', '1') } catch {} }

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Welcome() {
  const nav = useNavigate()
  const noAnim = reducedMotion()
  const [splashOut, setSplashOut] = useState(false)
  const [splashGone, setSplashGone] = useState(noAnim)
  const [code, setCode] = useState('')

  useEffect(() => {
    if (noAnim) return
    const t = setTimeout(() => setSplashOut(true), 1200)
    return () => clearTimeout(t)
  }, [noAnim])

  const skip = () => setSplashOut(true)

  const goTo = (path) => { markWelcomeSeen(); nav(path) }

  const onCode = (e) => {
    e.preventDefault()
    let c = code.trim().toUpperCase()
    if (/^\d+$/.test(c)) c = `LMN-${c}`
    markWelcomeSeen()
    nav(`/r/${c}`)
  }

  return (
    <>
      {!splashGone && (
        <div
          className={`welcome-splash${splashOut ? ' out' : ''}`}
          onClick={skip}
          onTransitionEnd={() => setSplashGone(true)}
          aria-hidden="true"
        >
          <svg viewBox="0 0 120 160" fill="none" strokeLinecap="round" className="splash-mark" aria-hidden="true">
            <circle cx="60" cy="110" r="34.5" stroke="rgba(255,255,255,0.35)" strokeWidth="27" />
            <line className="ray ray1" x1="60" y1="11" x2="60" y2="38" stroke="white" strokeWidth="14" />
            <line className="ray ray2" x1="19" y1="25" x2="32" y2="38" stroke="white" strokeWidth="14" />
            <line className="ray ray3" x1="101" y1="25" x2="88" y2="38" stroke="white" strokeWidth="14" />
          </svg>
          <img src="/brand/lumnov-wordmark-white.png" alt="Lumnov" className="splash-wordmark" />
        </div>
      )}

      <div className="welcome-page">
        <div className="welcome-logo-wrap">
          <img src="/brand/lumnov-logo.png" alt="Lumnov — verified rooms you can trust" className="welcome-logo" />
        </div>

        <h1 className="welcome-headline">Rent rooms you can trust in Phnom Penh</h1>

        <ul className="welcome-trust">
          <li>
            <Icon name="shield" size={20} />
            <span>Landlord ID and right to rent checked</span>
          </li>
          <li>
            <Icon name="camera" size={20} />
            <span>Rooms visited and photographed by our team</span>
          </li>
          <li>
            <Icon name="calendar" size={20} />
            <span>Free room check. Never pay before you've seen the room</span>
          </li>
        </ul>

        <div className="field" style={{ marginBottom: 20 }}>
          <span>Have a code from a Facebook post?</span>
          <form onSubmit={onCode} className="welcome-code-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="LMN-1001"
              aria-label="Room code"
              autoCapitalize="characters"
              className="input"
              style={{ borderRadius: 12 }}
            />
            <button type="submit" className="btn" style={{ borderRadius: 12, flexShrink: 0 }} disabled={!code.trim()}>
              Check
            </button>
          </form>
        </div>

        <div className="welcome-actions">
          <button className="btn block" onClick={() => goTo('/')}>Find a verified room</button>
          <button className="btn secondary block" onClick={() => goTo('/landlord/new')}>
            I&rsquo;m a landlord — verify my room
          </button>
        </div>

        <p className="welcome-signin">
          Already have an account?{' '}
          <Link to="/login" onClick={markWelcomeSeen}>Sign in</Link>
        </p>

        <footer className="welcome-footer">
          Lumnov never holds your money &middot; {PUBLIC_HOST}
        </footer>
      </div>
    </>
  )
}
