import { IS_DEMO } from './config'
import * as mock from './mockApi'
import * as real from './supabaseApi'

// Pages import `api` and never care whether it's the demo store or Supabase.
export const api = IS_DEMO ? mock : real
export { IS_DEMO }
