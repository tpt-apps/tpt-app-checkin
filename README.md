# TPT Check-in

Offline QR ticket check-in for events. Import a ticket list, scan attendees
in with a camera, and track attendance. Ships as a Windows desktop installer
(Mac/Linux via Tauri too, once built on those platforms), with a
self-hostable web bundle included for phone/tablet door-scanning. Built on
the [`tpt-barcode`](https://github.com/tpt-solutions/tpt-barcode) engine.

See [GUMROAD.md](GUMROAD.md) for the product listing copy,
[PRIVACY.md](PRIVACY.md) for the privacy statement shipped in-app, and
[SELF-HOSTING.md](SELF-HOSTING.md) for the buyer-facing phone/tablet setup
steps (also included inside the self-host ZIP).

## Repo layout

- `wasm/` — Rust crate exposing `scan_rgba` (camera-frame QR decode) and
  `encode_qr_svg` (test-ticket generation) over `wasm-bindgen`. Depends on
  `tpt-barcode` via a pinned git rev (see `wasm/Cargo.toml`).
- `web/` — the app itself: plain HTML/ES modules (no bundler), `lib/db.js`
  (IndexedDB-backed ticket/attendance store), `manifest.json` + `sw.js` for
  PWA installability and offline caching, `vendor/` for the built wasm
  output (generated, not checked in). This is also the frontend Tauri
  wraps, and what ships as the self-host bundle.
- `src-tauri/` — the desktop app shell (Tauri 2). `frontendDist` points at
  `../web`; no custom Rust commands — camera access and all app logic run
  in the webview exactly as in a browser (WebView2 supports `getUserMedia`).
- `build.sh` / `build.ps1` — runs `wasm-pack build --target web` and copies
  the output into `web/vendor/`.
- `package.sh` / `package.ps1` — runs the wasm build, `cargo tauri build`,
  and zips `web/` + `SELF-HOSTING.md` into a self-host bundle; all release
  artifacts land in `dist/`.
- `deploy/` — static hosting config, for anyone who wants to host `web/`
  themselves at a fixed URL instead of using the self-host ZIP flow.

## Build & run locally (browser, for development)

Requires `wasm-pack` (`cargo install wasm-pack`).

```sh
./build.sh        # or build.ps1 on Windows
npx serve web      # camera access requires a secure context — localhost is fine
```

Then open the printed URL on a device with a camera (or use a desktop
browser's built-in webcam for testing). To pick up changes, re-run the
build script.

## Build the desktop app / full release

Requires `tauri-cli` (`cargo install tauri-cli --version "^2"`).

```sh
./package.sh       # or package.ps1 on Windows
```

Produces, in `dist/`: the Windows installer(s) (`.msi`/`.exe`) when run on
Windows (`.dmg` on Mac, `.deb`/`.AppImage`/`.rpm` on Linux, when run there —
Tauri only builds installers for the OS it's running on), and
`tpt-app-checkin-web-selfhost.zip`.

To just run the desktop app without building an installer, during
development: `cargo tauri dev` (after `./build.sh` has populated
`web/vendor/` at least once).

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
