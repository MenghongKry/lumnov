import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`       -> normal app for Vercel (BrowserRouter, Supabase if env vars set)
// `npm run build:demo`  -> one self-contained HTML file (HashRouter, demo data) for sharing a clickable demo
export default defineConfig(({ mode }) => ({
  plugins: mode === 'demo' ? [react(), viteSingleFile()] : [react()],
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
}))
