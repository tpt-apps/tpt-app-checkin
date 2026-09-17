# TPT Check-in

Offline QR ticket check-in for events. Import a ticket list, scan attendees
in with a phone/tablet camera, and track attendance — entirely client-side,
installable as an offline-capable PWA. Built on the
[`tpt-barcode`](https://github.com/tpt-solutions/tpt-barcode) engine.

See [GUMROAD.md](GUMROAD.md) for the product listing copy and
[PRIVACY.md](PRIVACY.md) for the privacy statement shipped in-app.

## Repo layout

- `wasm/` — Rust crate exposing `scan_rgba` (camera-frame QR decode) and
  `encode_qr_svg` (test-ticket generation) over `wasm-bindgen`. Depends on
  `tpt-barcode` via a pinned git rev (see `wasm/Cargo.toml`).
- `web/` — the app itself: plain HTML/ES modules (no bundler), `lib/db.js`
  (IndexedDB-backed ticket/attendance store), `manifest.json` + `sw.js` for
  PWA installability and offline caching, `vendor/` for the built wasm
  output (generated, not checked in).
- `build.sh` / `build.ps1` — runs `wasm-pack build --target web` and copies
  the output into `web/vendor/`.
- `deploy/` — static hosting config for deploying `web/` as-is.

## Build & run locally

Requires `wasm-pack` (`cargo install wasm-pack`).

```sh
./build.sh        # or build.ps1 on Windows
npx serve web      # camera access requires a secure context — localhost is fine
```

Then open the printed URL on a device with a camera (or use a desktop
browser's built-in webcam for testing). To pick up changes, re-run the
build script.

## Updating the `tpt-barcode` dependency

`wasm/Cargo.toml` pins an exact commit of `tpt-barcode` via `rev = "..."`.
Bump it deliberately:

```sh
cd wasm
# edit Cargo.toml's rev, then:
cargo update -p tpt-barcode --precise <new-rev>
```

## License

The app itself is proprietary — see [LICENSE](LICENSE). `tpt-barcode` (a
separate repository) is dual MIT/Apache-2.0 licensed.
