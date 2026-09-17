# Using TPT Check-in on a phone or tablet

The desktop installer (Windows `.msi`/`.exe`, and Mac/Linux when available)
is the main way to run TPT Check-in. If you'd also like it on a phone or
tablet — handy for staff scanning tickets at the door with their own
devices — this download includes a `web/` folder — the same app, as a plain
website — that you can put online yourself in under a minute, for free,
with no account:

1. Go to **https://app.netlify.com/drop** in your browser.
2. Drag the `web` folder from this download onto that page.
3. Netlify gives you an instant `https://...netlify.app` link — open it on
   the phone or tablet you'll be scanning with.
4. **iPhone/iPad (Safari):** tap the Share icon → "Add to Home Screen".
   **Android/Chrome:** tap the install icon in the address bar, or the menu
   → "Install app".

It now behaves like a native app — its own icon, full-screen, and it keeps
working with no internet connection after that first visit (camera
scanning and attendance tracking are both fully local to each device).

This works on **any device with a modern browser** — Android, iPhone/iPad,
Chromebooks, and yes, RISC-V or other unusual Linux tablets too. It's plain
web technology (HTML/CSS/JavaScript/WebAssembly), not tied to any specific
CPU architecture — nothing platform-specific to install.

**Multi-device note:** each installed copy (desktop or self-hosted) keeps
its own local attendance data. If several staff are scanning at once,
export each device's attendance CSV at the end of the event and merge them
— there's no built-in live sync between devices in this version.

You're not required to use Netlify specifically — any static file host
works (GitHub Pages, Cloudflare Pages, your own web server, etc.). Netlify
Drop is just the fastest option that needs no account.

Nothing about this depends on TPT Solutions' own servers staying online —
once you've hosted your copy, it's yours to keep running indefinitely.
