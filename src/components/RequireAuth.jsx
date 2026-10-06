import { useAuth } from '../context/AuthContext'
import { AuthForm } from './AuthSheet'
import { Spinner, TopBar, Empty } from './Bits'

// Wrap a page: shows sign-in inline if needed, and blocks the wrong role.
export default function RequireAuth({ children, role, title = 'Sign in', reason }) {
  const { user, ready, setUser } = useAuth()
  if (!ready) return <Spinner />
  if (!user) {
    return (
      <>
        <TopBar title={title} />
        <main className="page">
          <div className="card"><AuthForm reason={reason} defaultRole={role === 'landlord' ? 'landlord' : 'tenant'} onDone={setUser} /></div>
        </main>
      </>
    )
  }
  const roles = Array.isArray(role) ? role : role ? [role] : null
  if (roles && !roles.includes(user.role) && user.role !== 'admin') {
    return (
      <>
        <TopBar title={title} />
        <main className="page"><Empty icon="shield" title="This page is not for your account type">You are signed in as a {user.role === 'tenant' ? 'renter' : user.role}.</Empty></main>
      </>
    )
  }
  return children
}
