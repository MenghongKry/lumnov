import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { USE_HASH_ROUTER } from './lib/config'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'

import Welcome from './pages/Welcome'
import Listings from './pages/Listings'
import ListingDetail from './pages/ListingDetail'
import BookCheck from './pages/BookCheck'
import FeedPostDemo from './pages/FeedPostDemo'
import Login from './pages/Login'
import MyBookings from './pages/MyBookings'
import BookingDetail from './pages/BookingDetail'
import ChatInbox from './pages/ChatInbox'
import ChatThread from './pages/ChatThread'
import Profile from './pages/Profile'
import MyListings from './pages/landlord/MyListings'

import AddListing from './pages/landlord/AddListing'
import BookingRequests from './pages/landlord/BookingRequests'
import AdminQueue from './pages/admin/AdminQueue'
import NotFound from './pages/NotFound'

const Router = USE_HASH_ROUTER ? HashRouter : BrowserRouter

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* Public — no login needed */}
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/" element={<Listings />} />
            <Route path="/r/:code" element={<ListingDetail />} />
            <Route path="/demo/post/:code" element={<FeedPostDemo />} />
            <Route path="/login" element={<Login />} />

            {/* Renter */}
            <Route path="/r/:code/book" element={<RequireAuth title="Book a room check" reason="Sign in to book a free room check."><BookCheck /></RequireAuth>} />
            <Route path="/bookings" element={<RequireAuth title="My bookings" reason="Sign in to see your room checks."><MyBookings /></RequireAuth>} />
            <Route path="/bookings/:id" element={<RequireAuth title="Booking"><BookingDetail /></RequireAuth>} />

            {/* Shared */}
            <Route path="/chat" element={<RequireAuth title="Chat" reason="Sign in to see your messages."><ChatInbox /></RequireAuth>} />
            <Route path="/chat/:id" element={<RequireAuth title="Chat"><ChatThread /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth title="Profile"><Profile /></RequireAuth>} />

            {/* Landlord */}
            <Route path="/landlord" element={<RequireAuth role="landlord" title="My listings" reason="Landlords: sign in to manage your verified rooms."><MyListings /></RequireAuth>} />
            <Route path="/landlord/new" element={<RequireAuth role="landlord" title="Add a room"><AddListing /></RequireAuth>} />
            <Route path="/landlord/requests" element={<RequireAuth role="landlord" title="Booking requests"><BookingRequests /></RequireAuth>} />

            {/* Lumnov team */}
            <Route path="/admin" element={<RequireAuth role="admin" title="Check queue"><AdminQueue /></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}
