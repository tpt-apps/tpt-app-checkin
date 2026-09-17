#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

(cd "$root/wasm" && wasm-pack build --target web --out-dir pkg --release)

vendor="$root/web/vendor"
mkdir -p "$vendor"
cp "$root/wasm/pkg/tpt_app_checkin_wasm.js" "$vendor/tpt_app_checkin_wasm.js"
cp "$root/wasm/pkg/tpt_app_checkin_wasm_bg.wasm" "$vendor/tpt_app_checkin_wasm_bg.wasm"

echo "Built. Serve web/ over HTTP, e.g.:  npx serve web"
