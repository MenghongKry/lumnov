// DEMO MODE backend: same functions as supabaseApi.js, but data lives in the browser.
// Lets you click through every screen with no Supabase project.
import { roomPhoto } from './placeholders'

const KEY = 'lumnov-demo-v1'
const day = 86400000
const iso = (ms) => new Date(ms).toISOString()
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms))

function at(daysFromNow, hour) {
  const d = new Date(Date.now() + daysFromNow * day)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function seed() {
  const now = Date.now()
  const L1 = 'u-landlord-sokha', L2 = 'u-landlord-dara', T = 'u-tenant-demo', T2 = 'u-tenant-vanna', A = 'u-admin'
  const profiles = [
    { id: L1, email: 'landlord@demo.com', full_name: 'Sokha Chan', phone: '012 345 678', fb_profile_url: 'https://facebook.com/sokha.chan.rooms', role: 'landlord', id_status: 'verified', created_at: iso(now - 40 * day) },
    { id: L2, email: 'dara@demo.com', full_name: 'Dara Lim', phone: '096 222 333', fb_profile_url: 'https://facebook.com/dara.lim.apartment', role: 'landlord', id_status: 'verified', created_at: iso(now - 70 * day) },
    { id: T, email: 'tenant@demo.com', full_name: 'Sreyneang Kim', phone: '089 456 789', role: 'tenant', id_status: 'none', created_at: iso(now - 3 * day) },
    { id: T2, email: 'vanna@demo.com', full_name: 'Vanna Heng', phone: '070 111 222', role: 'tenant', id_status: 'verified', created_at: iso(now - 12 * day) },
    { id: A, email: 'admin@demo.com', full_name: 'Lumnov Team', phone: '', role: 'admin', id_status: 'verified', created_at: iso(now - 90 * day) },
  ]
  const base = { amenities: [], lumnov_photos: [], map_url: '', tenant_confirmed_count: 0, docs_checked: false, room_checked: false, verified_at: null, expires_at: null }
  const listings = [
    { ...base, id: 'l-1001', code: 'LMN-1001', landlord_id: L1, title: 'Bright single room near RUPP', area: 'Toul Kork', address: 'St. 516, near Royal University of Phnom Penh', price_usd: 120, room_type: 'Room',
      description: 'Quiet room on the 2nd floor, 5 minutes by moto to RUPP and ITC. Good for students. Landlord lives downstairs.',
      amenities: ['Wi-Fi', 'Fan', 'Private bathroom', 'Moto parking', 'Water included'],
      photos: [roomPhoto(20, 0), roomPhoto(30, 1), roomPhoto(15, 2)], lumnov_photos: [roomPhoto(20, 0, 'Taken by Lumnov · 28 Sep'), roomPhoto(30, 1, 'Taken by Lumnov · 28 Sep')],
      map_url: 'https://maps.google.com/?q=Royal+University+of+Phnom+Penh', status: 'verified', docs_checked: true, room_checked: true, tenant_confirmed_count: 3,
      verified_at: iso(now - 8 * day), expires_at: iso(now + 175 * day), created_at: iso(now - 20 * day) },
    { ...base, id: 'l-1002', code: 'LMN-1002', landlord_id: L2, title: 'Studio with AC and kitchen', area: 'Sen Sok', address: 'Borey Peng Huoth, Sen Sok', price_usd: 180, room_type: 'Studio',
      description: 'New studio with air conditioning, small kitchen and balcony. Security guard 24h. Electricity at state price.',
      amenities: ['Wi-Fi', 'Air conditioning', 'Kitchen', 'Private bathroom', 'Security guard', 'Moto parking'],
      photos: [roomPhoto(200, 1), roomPhoto(210, 0)], lumnov_photos: [roomPhoto(200, 1, 'Taken by Lumnov · 2 Oct')],
      map_url: 'https://maps.google.com/?q=Sen+Sok+Phnom+Penh', status: 'verified', docs_checked: true, room_checked: true, tenant_confirmed_count: 1,
      verified_at: iso(now - 4 * day), expires_at: iso(now + 179 * day), created_at: iso(now - 15 * day) },
    { ...base, id: 'l-1003', code: 'LMN-1003', landlord_id: L1, title: 'Shared room for 2 students', area: 'Russey Keo', address: 'Near St. 598, Russey Keo', price_usd: 60, room_type: 'Shared room',
      description: 'Room for two, $60 per person. Fan, shared bathroom, quiet street.',
      amenities: ['Fan', 'Shared bathroom', 'Wi-Fi', 'Moto parking'],
      photos: [roomPhoto(120, 0), roomPhoto(110, 1)], status: 'verified', docs_checked: true, room_checked: false,
      verified_at: iso(now - 2 * day), expires_at: iso(now + 181 * day), created_at: iso(now - 6 * day) },
    { ...base, id: 'l-1004', code: 'LMN-1004', landlord_id: L1, title: 'Room near ITC with balcony', area: 'Toul Kork', address: 'Russian Blvd, near ITC', price_usd: 140, room_type: 'Room',
      description: 'Room with balcony and private bathroom. Waiting for Lumnov check.',
      amenities: ['Wi-Fi', 'Air conditioning', 'Private bathroom'],
      photos: [roomPhoto(280, 0)], status: 'pending', created_at: iso(now - 1 * day) },
  ]
  const bookings = [
    { id: 'b-1', listing_id: 'l-1002', tenant_id: T, landlord_id: L2, slot: at(2, 10), note: 'Can I come with my sister?', status: 'confirmed', room_matched: null, rating: null, review: null, created_at: iso(now - day) },
    { id: 'b-2', listing_id: 'l-1001', tenant_id: T2, landlord_id: L1, slot: at(1, 16), note: 'I am a 2nd year student at RUPP.', status: 'requested', room_matched: null, rating: null, review: null, created_at: iso(now - 3600000 * 5) },
  ]
  const conversations = [
    { id: 'c-1', listing_id: 'l-1002', tenant_id: T, landlord_id: L2, created_at: iso(now - 2 * day) },
    { id: 'c-2', listing_id: 'l-1001', tenant_id: T2, landlord_id: L1, created_at: iso(now - day) },
  ]
  const messages = [
    { id: 'm-1', conversation_id: 'c-1', sender_id: T, body: 'Hello, is the studio still available for November?', created_at: iso(now - 2 * day) },
    { id: 'm-2', conversation_id: 'c-1', sender_id: L2, body: 'Yes, still available. You can book a free room check on Lumnov.', created_at: iso(now - 2 * day + 600000) },
    { id: 'm-3', conversation_id: 'c-2', sender_id: T2, body: 'Hi bong, is water included in the $120?', created_at: iso(now - day) },
  ]
  const verification_docs = [
    { id: 'd-1', owner_id: L1, listing_id: 'l-1004', kind: 'landlord_id', path: 'demo/landlord-id.jpg', preview: roomPhoto(40, 3, 'National ID (demo)'), created_at: iso(now - day) },
    { id: 'd-2', owner_id: L1, listing_id: 'l-1004', kind: 'right_to_rent', path: 'demo/title.jpg', preview: roomPhoto(60, 2, 'Soft title (demo)'), created_at: iso(now - day) },
  ]
  const events = []
  ;['l-1001', 'l-1002', 'l-1003'].forEach((lid, i) => {
    for (let k = 0; k < [46, 31, 12][i]; k++) events.push({ listing_id: lid, type: 'view', source: k % 3 ? 'link' : 'qr', created_at: iso(now - (k % 7) * day) })
    for (let k = 0; k < [9, 6, 2][i]; k++) events.push({ listing_id: lid, type: 'click_book', source: 'app', created_at: iso(now - (k % 7) * day) })
    for (let k = 0; k < [7, 4, 1][i]; k++) events.push({ listing_id: lid, type: 'click_chat', source: 'app', created_at: iso(now - (k % 7) * day) })
  })
  return { profiles, listings, bookings, conversations, messages, verification_docs, reports: [], events, session: null, nextCode: 1005 }
}

// ---------- tiny persistent store ----------
let db
function load() {
  if (db) return db
  try { const raw = localStorage.getItem(KEY); if (raw) db = JSON.parse(raw) } catch { /* storage blocked */ }
  if (!db) db = seed()
  return db
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore quota / blocked */ } }
const listeners = new Set()
function emit(topic, payload) { save(); listeners.forEach((l) => l(topic, payload)) }
function on(fn) { listeners.add(fn); return () => listeners.delete(fn) }

export function resetDemo() { db = seed(); save(); emit('auth'); emit('data') }

const me = () => { const s = load().session; return s ? load().profiles.find((p) => p.id === s) : null }
const requireMe = () => { const u = me(); if (!u) throw new Error('Please sign in first'); return u }
const profile = (id) => { const p = load().profiles.find((x) => x.id === id); if (!p) return null; const { email, password, ...rest } = p; return rest }
const withLandlord = (l) => ({ ...l, landlord: profile(l.landlord_id) })
const listingLite = (id) => { const l = load().listings.find((x) => x.id === id); return l && { id: l.id, code: l.code, title: l.title, area: l.area, address: l.address, photos: l.photos, map_url: l.map_url, price_usd: l.price_usd } }
const bookingFull = (b) => ({ ...b, listing: listingLite(b.listing_id), tenant: profile(b.tenant_id), landlord: profile(b.landlord_id) })

const readFile = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })

// ---------- AUTH ----------
export async function getSessionUser() { await wait(30); return me() }
export function onAuthChange(cb) { return on((t) => { if (t === 'auth') cb(me()) }) }

export async function signUp({ email, password, fullName, phone, role }) {
  await wait()
  const d = load()
  if (d.profiles.some((p) => p.email?.toLowerCase() === email.toLowerCase())) throw new Error('This email already has an account. Sign in instead.')
  const p = { id: uid(), email, password, full_name: fullName, phone, role: role === 'landlord' ? 'landlord' : 'tenant', id_status: 'none', created_at: new Date().toISOString() }
  d.profiles.push(p); d.session = p.id; emit('auth'); return p
}
export async function signIn({ email }) {
  await wait()
  const d = load()
  const p = d.profiles.find((x) => x.email?.toLowerCase() === email.toLowerCase())
  if (!p) throw new Error('No account with this email. Try demo@… accounts or sign up.')
  d.session = p.id; emit('auth'); return p
}
export async function demoSignIn(role) {
  const map = { tenant: 'u-tenant-demo', landlord: 'u-landlord-sokha', admin: 'u-admin' }
  load().session = map[role]; emit('auth'); return me()
}
export async function signOut() { load().session = null; emit('auth') }

// ---------- PROFILE ----------
export async function updateMyProfile(patch) {
  await wait(); const u = requireMe()
  const { full_name, phone, fb_profile_url } = patch
  Object.assign(u, { full_name, phone, fb_profile_url }); emit('auth'); return u
}
export async function uploadMyId(file) {
  await wait(300); const u = requireMe()
  const preview = await readFile(file)
  load().verification_docs.push({ id: uid(), owner_id: u.id, listing_id: null, kind: u.role === 'landlord' ? 'landlord_id' : 'tenant_id', path: file.name, preview, created_at: new Date().toISOString() })
  u.id_status = 'pending'; emit('auth'); return u
}
export async function getTenantCard(tenantId) {
  await wait()
  const p = profile(tenantId)
  const visits = load().bookings.filter((b) => b.tenant_id === tenantId && b.status === 'visited').length
  const noShows = load().bookings.filter((b) => b.tenant_id === tenantId && b.status === 'no_show').length
  return { ...p, visits, noShows }
}

// ---------- LISTINGS ----------
export async function listVerified({ area = '', maxPrice = 0, q = '' } = {}) {
  await wait()
  return load().listings
    .filter((l) => l.status === 'verified')
    .filter((l) => !area || l.area === area)
    .filter((l) => !maxPrice || l.price_usd <= maxPrice)
    .filter((l) => !q || (l.title + l.area + l.code).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(withLandlord)
}
export async function getListingByCode(code) {
  await wait()
  const u = me()
  const l = load().listings.find((x) => x.code.toLowerCase() === String(code).toLowerCase())
  if (!l) return null
  if (l.status !== 'verified' && !(u && (u.id === l.landlord_id || u.role === 'admin'))) return null
  return withLandlord(l)
}
export async function myListings() {
  await wait(); const u = requireMe()
  return load().listings.filter((l) => l.landlord_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(withLandlord)
}
export async function createListing(data, { photos = [], idFile = null, proofFile = null } = {}) {
  await wait(400); const u = requireMe()
  if (u.role !== 'landlord' && u.role !== 'admin') throw new Error('Only landlords can add listings')
  const d = load()
  const photoUrls = await Promise.all(photos.map(readFile))
  const l = {
    id: uid(), code: 'LMN-' + d.nextCode++, landlord_id: u.id,
    title: data.title, area: data.area, address: data.address, price_usd: Number(data.price_usd), room_type: data.room_type,
    description: data.description, amenities: data.amenities || [], map_url: data.map_url || '',
    photos: photoUrls.length ? photoUrls : [roomPhoto(Math.floor(Math.random() * 360), 0)],
    lumnov_photos: [], status: 'pending', docs_checked: false, room_checked: false, tenant_confirmed_count: 0,
    verified_at: null, expires_at: null, created_at: new Date().toISOString(),
  }
  d.listings.push(l)
  for (const [file, kind] of [[idFile, 'landlord_id'], [proofFile, 'right_to_rent']]) {
    if (file) d.verification_docs.push({ id: uid(), owner_id: u.id, listing_id: l.id, kind, path: file.name, preview: await readFile(file), created_at: new Date().toISOString() })
  }
  emit('data'); return l
}
export async function logEvent(listingId, type, source = 'app') {
  load().events.push({ listing_id: listingId, type, source, created_at: new Date().toISOString() }); save()
}
export async function listingStats(listingIds) {
  await wait(50)
  const out = {}
  listingIds.forEach((id) => { out[id] = { view: 0, click_chat: 0, click_book: 0, bookings: 0 } })
  load().events.forEach((e) => { if (out[e.listing_id]) out[e.listing_id][e.type]++ })
  load().bookings.forEach((b) => { if (out[b.listing_id]) out[b.listing_id].bookings++ })
  return out
}

// ---------- BOOKINGS ----------
export async function createBooking({ listingId, slot, note }) {
  await wait(300); const u = requireMe()
  const l = load().listings.find((x) => x.id === listingId)
  const b = { id: uid(), listing_id: listingId, tenant_id: u.id, landlord_id: l.landlord_id, slot, note, status: 'requested', room_matched: null, rating: null, review: null, created_at: new Date().toISOString() }
  load().bookings.push(b); emit('data'); return b
}
export async function myBookings() {
  await wait(); const u = requireMe()
  return load().bookings.filter((b) => b.tenant_id === u.id).sort((a, b) => b.slot.localeCompare(a.slot)).map(bookingFull)
}
export async function landlordRequests() {
  await wait(); const u = requireMe()
  return load().bookings.filter((b) => b.landlord_id === u.id).sort((a, b) => a.slot.localeCompare(b.slot)).map(bookingFull)
}
export async function getBooking(id) {
  await wait(); const u = requireMe()
  const b = load().bookings.find((x) => x.id === id)
  if (!b || ![b.tenant_id, b.landlord_id].includes(u.id) && u.role !== 'admin') return null
  return bookingFull(b)
}
export async function updateBooking(id, patch) {
  await wait(); requireMe()
  const b = load().bookings.find((x) => x.id === id)
  const wasMatched = b.room_matched === true
  Object.assign(b, patch)
  if (patch.room_matched === true && !wasMatched) {
    const l = load().listings.find((x) => x.id === b.listing_id); l.tenant_confirmed_count++
  }
  emit('data'); return bookingFull(b)
}

// ---------- CHAT ----------
function convFull(c) {
  const msgs = load().messages.filter((m) => m.conversation_id === c.id)
  return { ...c, listing: listingLite(c.listing_id), tenant: profile(c.tenant_id), landlord: profile(c.landlord_id), last_message: msgs[msgs.length - 1] || null }
}
export async function getOrCreateConversation(listingId) {
  await wait(); const u = requireMe(); const d = load()
  let c = d.conversations.find((x) => x.listing_id === listingId && x.tenant_id === u.id)
  if (!c) {
    const l = d.listings.find((x) => x.id === listingId)
    c = { id: uid(), listing_id: listingId, tenant_id: u.id, landlord_id: l.landlord_id, created_at: new Date().toISOString() }
    d.conversations.push(c); emit('data')
  }
  return c
}
export async function myConversations() {
  await wait(); const u = requireMe()
  return load().conversations.filter((c) => c.tenant_id === u.id || c.landlord_id === u.id).map(convFull)
    .sort((a, b) => (b.last_message?.created_at || b.created_at).localeCompare(a.last_message?.created_at || a.created_at))
}
export async function getConversation(id) { await wait(); const c = load().conversations.find((x) => x.id === id); return c ? convFull(c) : null }
export async function listMessages(conversationId) {
  await wait(50); return load().messages.filter((m) => m.conversation_id === conversationId)
}
export async function sendMessage(conversationId, body) {
  const u = requireMe(); const d = load()
  const m = { id: uid(), conversation_id: conversationId, sender_id: u.id, body, created_at: new Date().toISOString() }
  d.messages.push(m); emit('message', m)
  // demo: landlord auto-replies once so the chat feels alive
  const c = d.conversations.find((x) => x.id === conversationId)
  if (c && u.id === c.tenant_id && !d.messages.some((x) => x.conversation_id === c.id && x.sender_id === c.landlord_id)) {
    setTimeout(() => {
      const r = { id: uid(), conversation_id: c.id, sender_id: c.landlord_id, body: 'Thanks for your message! The room is still available. You can book a free room check and come see it.', created_at: new Date().toISOString() }
      d.messages.push(r); emit('message', r)
    }, 1500)
  }
  return m
}
export function subscribeMessages(conversationId, cb) {
  return on((t, m) => { if (t === 'message' && m.conversation_id === conversationId) cb(m) })
}

// ---------- REPORTS ----------
export async function reportListing(listingId, reason, details) {
  await wait(); const u = me()
  load().reports.push({ id: uid(), listing_id: listingId, reporter_id: u?.id || null, reason, details, created_at: new Date().toISOString() }); emit('data')
}

// ---------- ADMIN ----------
export async function adminQueue() {
  await wait(); const d = load()
  const docsFor = (pred) => d.verification_docs.filter(pred).map((x) => ({ ...x, url: x.preview }))
  return {
    listings: d.listings.filter((l) => l.status === 'pending' || (l.status === 'verified' && !l.room_checked)).map((l) => ({ ...withLandlord(l), docs: docsFor((x) => x.listing_id === l.id || (x.owner_id === l.landlord_id && x.kind === 'landlord_id')) })),
    people: d.profiles.filter((p) => p.id_status === 'pending').map((p) => ({ ...profile(p.id), docs: docsFor((x) => x.owner_id === p.id && !x.listing_id) })),
    reports: d.reports.map((r) => ({ ...r, listing: listingLite(r.listing_id) })),
  }
}
export async function adminUpdateListing(id, patch) {
  await wait(); const l = load().listings.find((x) => x.id === id)
  Object.assign(l, patch)
  if (patch.status === 'verified') { l.verified_at = new Date().toISOString(); l.expires_at = new Date(Date.now() + 182 * day).toISOString() }
  emit('data'); return l
}
export async function adminUploadCheckerPhotos(id, files) {
  await wait(300); const l = load().listings.find((x) => x.id === id)
  l.lumnov_photos = [...l.lumnov_photos, ...(await Promise.all(files.map(readFile)))]; emit('data'); return l
}
export async function adminSetIdStatus(userId, status) {
  await wait(); const p = load().profiles.find((x) => x.id === userId); p.id_status = status; emit('auth'); emit('data')
}
