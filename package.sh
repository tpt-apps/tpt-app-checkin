#!/usr/bin/env bash
# Builds everything needed for a Gumroad release: the wasm/web app, the
# Tauri desktop installer(s), and a self-host ZIP bundle for phone/tablet
# use. Output lands in dist/.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$root/build.sh"

(cd "$root" && cargo tauri build)

dist="$root/dist"
mkdir -p "$dist"

bundle_dir="$root/src-tauri/target/release/bundle"
find "$bundle_dir" \( -name '*.msi' -o -name '*.exe' -o -name '*.dmg' -o -name '*.deb' -o -name '*.AppImage' -o -name '*.rpm' \) \
  -exec cp {} "$dist/" \; 2>/dev/null || true

self_host_zip="$dist/tpt-app-checkin-web-selfhost.zip"
rm -f "$self_host_zip"
(cd "$root" && zip -r "$self_host_zip" web SELF-HOSTING.md -x 'web/vendor/.gitkeep')

echo "Release artifacts in $dist"
ls "$dist"
