// Generates shareable badge images on a <canvas> (no server needed).
import QRCode from 'qrcode'

const ORANGE = '#DD4C28'

export const qrDataUrl = (text, size = 512) =>
  QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d1d1f', light: '#ffffff' } })

const loadImg = (src) => new Promise((res, rej) => {
  const img = new Image(); img.crossOrigin = 'anonymous'
  img.onload = () => res(img); img.onerror = rej; img.src = src
})

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

function drawCheck(ctx, cx, cy, r, bg = '#fff', fg = ORANGE) {
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = fg; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(cx - r * 0.45, cy + r * 0.02); ctx.lineTo(cx - r * 0.1, cy + r * 0.38); ctx.lineTo(cx + r * 0.5, cy - r * 0.35); ctx.stroke()
}

// The pill badge: [✓ Verified by Lumnov | QR], with the short link underneath.
export async function badgePng(code, link) {
  const W = 1200, H = 420
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = ORANGE; roundRect(ctx, 20, 20, W - 40, 300, 150); ctx.fill()
  drawCheck(ctx, 170, 170, 90)
  ctx.fillStyle = '#fff'; ctx.font = '600 44px system-ui, sans-serif'; ctx.fillText('Verified by', 290, 150)
  ctx.font = '800 84px system-ui, sans-serif'; ctx.fillText('Lumnov', 290, 235)
  const qr = await loadImg(await qrDataUrl(link, 400))
  ctx.fillStyle = '#fff'; roundRect(ctx, W - 300, 45, 250, 250, 24); ctx.fill()
  ctx.drawImage(qr, W - 290, 55, 230, 230)
  ctx.fillStyle = '#1d1d1f'; ctx.font = '600 40px system-ui, sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(`${code} · ${link.replace(/^https?:\/\//, '')}`, W / 2, 385)
  return c.toDataURL('image/png')
}

// Stamps a rounded card (bottom-right, on top of the photo) with QR + details.
// Output keeps the photo's original aspect ratio — no extra canvas area added.
export async function stampedPhotoPng(photoUrl, code, link, { verifiedAt } = {}) {
  const img = await loadImg(photoUrl)
  const W = 1080
  const H = Math.round(W * (img.height / img.width || 0.75))
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, W, H)

  const side     = Math.min(W, H)
  const cardW    = Math.round(side * 0.40)
  const pad      = Math.round(cardW * 0.07)
  const gap      = Math.round(cardW * 0.025)
  const cardR    = Math.round(cardW * 0.10)
  const margin   = Math.round(side * 0.03)
  const maxCW    = cardW - pad * 2

  const hVerifiedSz = Math.round(cardW * 0.065)
  const hLumnovSz   = Math.round(cardW * 0.09)
  const subtitleSz  = Math.round(cardW * 0.045)
  const qrBlockW    = Math.round(cardW * 0.70)
  const qrInnerMgn  = Math.round(cardW * 0.04)
  const qrImgSize   = qrBlockW - qrInnerMgn * 2
  const codeSz      = Math.round(cardW * 0.055)
  const baseLinkSz  = Math.round(cardW * 0.042)
  const dateSz      = Math.round(cardW * 0.038)
  const checkR      = Math.round(hVerifiedSz * 0.65)

  const VERIFIED_LABEL = 'VERIFIED BY '
  const LUMNOV_LABEL   = 'Lumnov'

  // Scale header row down until it fits within cardW - 2*pad
  let hScale = 1.0
  const measureHdr = (s) => {
    const vSz = Math.round(hVerifiedSz * s), cR = Math.round(checkR * s)
    ctx.letterSpacing = `${Math.round(vSz * 0.04)}px`
    ctx.font = `600 ${vSz}px system-ui,sans-serif`
    const vW = ctx.measureText(VERIFIED_LABEL).width
    ctx.letterSpacing = '0px'
    ctx.font = `800 ${Math.round(hLumnovSz * s)}px system-ui,sans-serif`
    return cR * 2 + Math.round(cR * 0.5) + vW + ctx.measureText(LUMNOV_LABEL).width
  }
  while (hScale > 0.5 && measureHdr(hScale) > maxCW) hScale -= 0.02
  ctx.letterSpacing = '0px'

  const fVSz  = Math.round(hVerifiedSz * hScale)
  const fLSz  = Math.round(hLumnovSz * hScale)
  const fCR   = Math.round(checkR * hScale)
  const fCGap = Math.round(fCR * 0.5)

  // Scale link down until it fits
  const linkLabel = link.replace(/^https?:\/\//, '')
  let fLinkSz = baseLinkSz
  ctx.font = `400 ${fLinkSz}px system-ui,sans-serif`
  while (ctx.measureText(linkLabel).width > maxCW && fLinkSz > 8) {
    fLinkSz--; ctx.font = `400 ${fLinkSz}px system-ui,sans-serif`
  }

  const dateLabel = verifiedAt
    ? 'Checked ' + new Date(verifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  // Compute card height from content
  const hH = Math.max(fCR * 2, fLSz * 1.2)
  const sH = subtitleSz * 1.2
  const cH = codeSz * 1.2
  const lH = fLinkSz * 1.2
  const dH = dateSz * 1.2
  const rows = [hH, sH, qrBlockW, cH, lH, ...(dateLabel ? [dH] : [])]
  const cardH = Math.round(
    pad + rows.reduce((a, h, i) => a + h + (i < rows.length - 1 ? gap : 0), 0) + pad
  )

  // Card position: right edge 3.5% from right, bottom at 80% of H
  let cardX = W - cardW - Math.round(W * 0.035)
  cardX = Math.max(margin, Math.min(W - cardW - margin, cardX))
  let cardY = Math.round(H * 0.80) - cardH
  cardY = Math.max(margin, Math.min(H - cardH - margin, cardY))

  // Shadow + card fill
  ctx.save()
  ctx.shadowColor   = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur    = cardW * 0.04
  ctx.shadowOffsetY = cardW * 0.015
  ctx.fillStyle     = 'rgba(221,76,40,0.88)'
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR); ctx.fill()
  ctx.restore()

  // QR: H-level error correction, pure black on white so phones scan it
  const qrImg = await loadImg(await QRCode.toDataURL(link, {
    width: 600, margin: 1, errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' },
  }))

  // Draw card content
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = '#fff'
  const cx = cardX + Math.round(cardW / 2)
  let y = cardY + pad

  // 1. Header: check-circle + "VERIFIED BY " + "Lumnov"
  ctx.letterSpacing = `${Math.round(fVSz * 0.04)}px`
  ctx.font = `600 ${fVSz}px system-ui, -apple-system, "Segoe UI", sans-serif`
  const vW = ctx.measureText(VERIFIED_LABEL).width
  ctx.letterSpacing = '0px'
  ctx.font = `800 ${fLSz}px system-ui, -apple-system, "Segoe UI", sans-serif`
  const lW = ctx.measureText(LUMNOV_LABEL).width
  const hStartX = cx - Math.round((fCR * 2 + fCGap + vW + lW) / 2)
  const hMidY   = y + Math.round(hH / 2)
  drawCheck(ctx, hStartX + fCR, hMidY, fCR)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#fff'
  ctx.letterSpacing = `${Math.round(fVSz * 0.04)}px`
  ctx.font = `600 ${fVSz}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.fillText(VERIFIED_LABEL, hStartX + fCR * 2 + fCGap, hMidY)
  ctx.letterSpacing = '0px'
  ctx.font = `800 ${fLSz}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.fillText(LUMNOV_LABEL, hStartX + fCR * 2 + fCGap + vW, hMidY)
  y += hH + gap

  // 2. Subtitle
  ctx.textAlign     = 'center'
  ctx.font          = `600 ${subtitleSz}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.letterSpacing = `${Math.round(subtitleSz * 0.06)}px`
  ctx.globalAlpha   = 0.92
  ctx.fillText('SCAN HERE FOR BOOKING', cx, y + Math.round(sH / 2))
  ctx.globalAlpha   = 1.0
  ctx.letterSpacing = '0px'
  y += sH + gap

  // 3. QR block
  const qrX = Math.round(cx - qrBlockW / 2)
  ctx.fillStyle = '#fff'
  roundRect(ctx, qrX, y, qrBlockW, qrBlockW, Math.round(cardW * 0.03)); ctx.fill()
  ctx.drawImage(qrImg, qrX + qrInnerMgn, y + qrInnerMgn, qrImgSize, qrImgSize)
  y += qrBlockW + gap

  // 4. Listing code
  ctx.fillStyle = '#fff'
  ctx.font      = `700 ${codeSz}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.fillText(code, cx, y + Math.round(cH / 2))
  y += cH + gap

  // 5. Short link (scanner fallback for phones that can't scan own screen)
  ctx.font = `400 ${fLinkSz}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.fillText(linkLabel, cx, y + Math.round(lH / 2))
  y += lH

  // 6. Verified date
  if (dateLabel) {
    y += gap
    ctx.globalAlpha = 0.85
    ctx.font        = `400 ${dateSz}px system-ui, -apple-system, "Segoe UI", sans-serif`
    ctx.fillText(dateLabel, cx, y + Math.round(dH / 2))
    ctx.globalAlpha = 1.0
  }

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign    = 'left'
  return c.toDataURL('image/png')
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a'); a.href = dataUrl; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
}
