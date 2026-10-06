import { Link } from 'react-router-dom'
import { Empty, TopBar } from '../components/Bits'

export default function NotFound() {
  return (
    <>
      <TopBar title="Not found" back="/" />
      <main className="page">
        <Empty icon="search" title="This page doesn't exist">
          <Link to="/" className="btn sm" style={{ marginTop: 14 }}>Go to verified rooms</Link>
        </Empty>
      </main>
    </>
  )
}
