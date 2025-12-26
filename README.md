# Web HirrOfficial (MVP)

Website 1-page dengan UI/UX modern + pembayaran QRIS (Pakasir) via Vercel Serverless Functions.

## Struktur
- `index.html` — Intro → Hero (thumbnail 16:9 full width) → Produk → QRIS
- `tailwind.css` — custom styles (Tailwind utilities via CDN)
- `source/config.js` — katalog produk & harga (AMAN untuk browser)
- `api/` — endpoint serverless (pegang secrets)

## Environment Variables (Vercel)
Set di Vercel Project Settings → Environment Variables:

**Wajib (prod):**
- `PROJECT_PAKASIR`
- `APIKEY_PAKASIR`

**Opsional:**
- `BASE_URL_PAKASIR` (default: https://app.pakasir.com/api)
- `DEMO_MODE` (true/false) → kalau `true`, API tidak call Pakasir (buat testing UI)

> ⚠️ Jangan taruh API key di `source/config.js` atau file frontend lain.

## Cara deploy
1. Upload project ini ke GitHub
2. Import ke Vercel
3. Set env vars di Vercel
4. Deploy

## Edit harga & paket
Edit di `source/config.js` → bagian `PRODUCTS`.

## Testing tanpa Pakasir
Set `DEMO_MODE=true` di Vercel/Local. Di demo mode:
- QR dibuat dari string demo
- Status akan berubah jadi `PAID` setelah ~20 detik (berdasarkan timestamp orderId)

---
