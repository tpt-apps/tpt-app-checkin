$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Push-Location "$root/wasm"
try {
    wasm-pack build --target web --out-dir pkg --release
} finally {
    Pop-Location
}

$vendor = "$root/web/vendor"
New-Item -ItemType Directory -Force -Path $vendor | Out-Null

Copy-Item "$root/wasm/pkg/tpt_app_checkin_wasm.js" "$vendor/tpt_app_checkin_wasm.js" -Force
Copy-Item "$root/wasm/pkg/tpt_app_checkin_wasm_bg.wasm" "$vendor/tpt_app_checkin_wasm_bg.wasm" -Force

Write-Host "Built. Serve web/ over HTTP, e.g.:  npx serve web"
