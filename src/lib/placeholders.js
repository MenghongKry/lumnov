// Simple illustrated room "photos" for demo mode (no external images needed).
export function roomPhoto(hue = 20, variant = 0, label = '') {
  const wall = `hsl(${hue} 45% 88%)`
  const wall2 = `hsl(${hue} 40% 80%)`
  const floor = `hsl(${hue + 10} 30% 62%)`
  const accent = `hsl(${hue} 65% 52%)`
  const bed = variant % 2 === 0
    ? `<rect x="250" y="250" width="260" height="80" rx="10" fill="#fff"/><rect x="250" y="235" width="80" height="30" rx="8" fill="${accent}" opacity=".8"/><rect x="240" y="320" width="280" height="22" rx="6" fill="${wall2}"/>`
    : `<rect x="70" y="250" width="150" height="90" rx="8" fill="${wall2}"/><rect x="80" y="225" width="130" height="30" rx="6" fill="#fff"/><rect x="330" y="200" width="180" height="140" rx="6" fill="#fff" opacity=".9"/><rect x="345" y="215" width="150" height="70" rx="4" fill="${accent}" opacity=".35"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="${wall}"/>
  <rect y="330" width="600" height="70" fill="${floor}"/>
  <rect x="${variant % 2 ? 360 : 70}" y="70" width="150" height="120" rx="6" fill="#bfe3f7" stroke="#fff" stroke-width="10"/>
  <line x1="${variant % 2 ? 435 : 145}" y1="70" x2="${variant % 2 ? 435 : 145}" y2="190" stroke="#fff" stroke-width="6"/>
  ${bed}
  <circle cx="${variant % 2 ? 120 : 520}" cy="120" r="18" fill="${accent}" opacity=".6"/>
  ${label ? `<text x="20" y="385" font-family="sans-serif" font-size="18" fill="#fff" opacity=".9">${label}</text>` : ''}
</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
