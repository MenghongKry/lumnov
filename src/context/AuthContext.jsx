import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import AuthSheet from '../components/AuthSheet'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [sheet, setSheet] = useState(null) // { reason, role }
  const pending = useRef(null)

  useEffect(() => {
    let alive = true
    api.getSessionUser().then((u) => { if (alive) { setUser(u); setReady(true) } }).catch(() => setReady(true))
    const off = api.onAuthChange((u) => setUser(u))
    return () => { alive = false; off && off() }
  }, [])

  const refresh = useCallback(async () => setUser(await api.getSessionUser()), [])

  // Ask for login only when needed (Chat / Book), then continue where the user was.
  const requireAuth = useCallback((reason = 'Sign in to continue', role = 'tenant') => {
    if (user) return Promise.resolve(user)
    return new Promise((resolve, reject) => {
      pending.current = { resolve, reject }
      setSheet({ reason, role })
    })
  }, [user])

  const onSheetDone = (u) => {
    setSheet(null); setUser(u)
    pending.current?.resolve(u); pending.current = null
  }
  const onSheetClose = () => {
    setSheet(null)
    pending.current?.reject(new Error('cancelled')); pending.current = null
  }

  return (
    <AuthCtx.Provider value={{ user, ready, refresh, requireAuth, setUser }}>
      {children}
      {sheet && <AuthSheet reason={sheet.reason} defaultRole={sheet.role} onDone={onSheetDone} onClose={onSheetClose} />}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
