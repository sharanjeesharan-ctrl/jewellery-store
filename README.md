# Aurum Gallery — Jewellery Store landing page

Website 360 showcase by Viral Digital Labs. Static site (no build step).

- Live: https://jewellery-store.viralaiworld.com
- Contact on page: WhatsApp +91 98181 16918 · support@viraldigitallabs.in

## Structure
- `index.html` — the whole page (inline CSS/JS)
- `assets/img/` — product photography (cropped to remove the generator watermark)
- `assets/video/` — short motion reels rendered from the photography with ffmpeg

## Swapping in real product videos
Drop an MP4 into `assets/video/` and point the matching `<source src>` and `data-video` attribute in `index.html` at it. Keep files under ~5 MB, H.264, `+faststart`.

## Deploy
Connected to Vercel project `jewellery-store`; pushes to `main` deploy to production.
