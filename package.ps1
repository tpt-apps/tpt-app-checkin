# Builds everything needed for a Gumroad release: the wasm/web app, the
# Tauri desktop installer(s), and a self-host ZIP bundle for phone/tablet
# use. Output lands in dist/.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

& "$root/build.ps1"

Push-Location "$root"
try {
    cargo tauri build
} finally {
    Pop-Location
}

$dist = "$root/dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null

$bundleDir = "$root/src-tauri/target/release/bundle"
Get-ChildItem -Recurse -Path $bundleDir -Include *.msi, *.exe, *.dmg, *.deb, *.AppImage, *.rpm -ErrorAction SilentlyContinue |
    Copy-Item -Destination $dist -Force

$selfHostZip = "$dist/tpt-app-checkin-web-selfhost.zip"
if (Test-Path $selfHostZip) { Remove-Item $selfHostZip }
Compress-Archive -Path "$root/web", "$root/SELF-HOSTING.md" -DestinationPath $selfHostZip

Write-Host "Release artifacts in $dist"
Get-ChildItem $dist | ForEach-Object { Write-Host " - $($_.Name)" }
