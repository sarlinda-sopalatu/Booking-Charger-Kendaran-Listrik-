param(
  [string]$Email = "siti.rahayu@gmail.com",
  [string]$Password = "Password123!"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

Write-Host "[STEP] Demo flow (login -> stations -> slots -> booking)" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "test-demo-flow.ps1") -Email $Email -Password $Password
if ($LASTEXITCODE -ne 0) {
  throw "Demo flow gagal"
}

Write-Host "[STEP] Booking lifecycle (create -> cancel)" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "test-booking-create-cancel.ps1") -Email $Email -Password $Password
if ($LASTEXITCODE -ne 0) {
  throw "Booking lifecycle gagal"
}

Write-Host "[OK] Semua smoke test lulus." -ForegroundColor Green
