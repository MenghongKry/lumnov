import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthForm } from '../components/AuthSheet'
import { Logo } from '../components/Bits'

export default function Login() {
  const nav = useNavigate()
  const { setUser } = useAuth()
  const done = (u) => {
    setUser(u)
    nav(u?.role === 'landlord' ? '/landlord' : u?.role === 'admin' ? '/admin' : '/', { replace: true })
  }
  return (
    <>
      <header className="topbar"><Logo /></header>
      <main className="page">
        <h2 className="h2">Welcome to Lumnov</h2>
        <p className="muted" style={{ marginTop: 0 }}>Rent rooms you can trust in Phnom Penh. Landlords: verify your rooms and get serious renters.</p>
        <div className="card" style={{ marginTop: 16 }}><AuthForm onDone={done} /></div>
      </main>
    </>
  )
}
