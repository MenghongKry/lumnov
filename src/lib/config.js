const env = import.meta.env

export const SUPABASE_URL = env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || ''

// Demo mode = no Supabase keys (or forced for the shareable demo build).
export const IS_DEMO = Boolean(env.VITE_FORCE_DEMO) || !SUPABASE_URL || !SUPABASE_ANON_KEY
export const USE_HASH_ROUTER = Boolean(env.VITE_HASH_ROUTER)

// Base URL printed inside QR codes and share links.
export const PUBLIC_URL = (env.VITE_PUBLIC_URL || 'https://lumnov.vercel.app').replace(/\/$/, '')

export const PUBLIC_HOST = PUBLIC_URL.replace(/^https?:\/\//, '')

export const listingLink = (code) => `${PUBLIC_URL}/r/${code}`

export const AREAS = ['Toul Kork', 'Russey Keo', 'Sen Sok', 'Chamkar Mon', 'Daun Penh', 'Por Senchey', 'Mean Chey', 'Chbar Ampov']
export const AMENITIES = ['Wi-Fi', 'Air conditioning', 'Fan', 'Private bathroom', 'Shared bathroom', 'Moto parking', 'Kitchen', 'Water included', 'Electricity included', 'Security guard', 'Laundry']
export const ROOM_TYPES = ['Room', 'Shared room', 'Studio', 'Apartment']
export const REPORT_REASONS = ['Photos don\'t match the room', 'Asked me to pay before viewing', 'Landlord is not the person shown', 'Room is no longer available', 'Price is different', 'Something else']
