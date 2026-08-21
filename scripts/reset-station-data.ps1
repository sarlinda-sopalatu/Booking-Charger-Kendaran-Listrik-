param(
  [string]$DbContainer = "ev-postgres-stations",
  [string]$DbUser = "ev_user",
  [string]$DbName = "ev_stations",
  [string]$SeedFile = "seeds/station-service/seed_stations.sql"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$seedPath = Join-Path $repoRoot $SeedFile

if (-not (Test-Path -Path $seedPath)) {
  throw "Seed file tidak ditemukan: $seedPath"
}

$truncateSql = @"
TRUNCATE TABLE slots, chargers, stations RESTART IDENTITY CASCADE;
"@

$truncateSql | docker exec -i $DbContainer psql -U $DbUser -d $DbName
if ($LASTEXITCODE -ne 0) {
  throw "Gagal truncate tabel station-service"
}

Get-Content -Raw $seedPath | docker exec -i $DbContainer psql -U $DbUser -d $DbName
if ($LASTEXITCODE -ne 0) {
  throw "Gagal apply seed resmi station-service"
}

Write-Host "[OK] Reset station data selesai menggunakan seed resmi." -ForegroundColor Green
