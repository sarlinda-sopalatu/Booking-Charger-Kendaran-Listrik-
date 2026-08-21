param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$Email = "siti.rahayu@gmail.com",
  [string]$Password = "Password123!",
  [string]$Date = "",
  [bool]$AutoDateFromDb = $true
)

$ErrorActionPreference = "Stop"

function Get-StationDbCurrentDate {
  try {
    $dbDate = & docker exec ev-postgres-stations psql -U ev_user -d ev_stations -t -A -c "SELECT CURRENT_DATE;" 2>$null
    if ($LASTEXITCODE -ne 0) {
      return ""
    }

    $value = (($dbDate | Select-Object -Last 1) -as [string]).Trim()
    if ($value -match '^\d{4}-\d{2}-\d{2}$') {
      return $value
    }
  } catch {
    # Fallback ke host date bila docker/psql tidak tersedia.
  }

  return ""
}

if ([string]::IsNullOrWhiteSpace($Date)) {
  if ($AutoDateFromDb) {
    $dbDate = Get-StationDbCurrentDate
    if (-not [string]::IsNullOrWhiteSpace($dbDate)) {
      $Date = $dbDate
      Write-Host ("[INFO] Menggunakan tanggal DB station-service: {0}" -f $Date) -ForegroundColor DarkCyan
    }
  }

  if ([string]::IsNullOrWhiteSpace($Date)) {
    $Date = (Get-Date).ToString("yyyy-MM-dd")
  }
}

function Retry([scriptblock]$Action, [int]$Max = 4, [int]$Delay = 2) {
  $last = ""
  for ($i = 1; $i -le $Max; $i++) {
    try {
      return & $Action
    } catch {
      $last = $_.Exception.Message
      if ($i -lt $Max) {
        Start-Sleep -Seconds $Delay
      }
    }
  }

  throw $last
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Retry -Action { Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 20 } -Max 6
$token = $login.access_token
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "Login tidak mengembalikan access_token"
}

$headers = @{ Authorization = "Bearer $token" }
$stationsResp = Retry -Action { Invoke-RestMethod -Uri "$BaseUrl/stations" -Method Get -Headers $headers -TimeoutSec 20 } -Max 4
$stations = @()
if ($stationsResp.stations) { $stations = @($stationsResp.stations) }
elseif ($stationsResp.data -is [System.Array]) { $stations = @($stationsResp.data) }
elseif ($stationsResp -is [System.Array]) { $stations = @($stationsResp) }
if ($stations.Count -eq 0) { throw "Stations kosong" }
$stationId = $stations[0].id

$slotsResp = Retry -Action { Invoke-RestMethod -Uri "$BaseUrl/stations/$stationId/slots?date=$Date" -Method Get -Headers $headers -TimeoutSec 20 } -Max 4
$slots = @()
if ($slotsResp.slots) { $slots = @($slotsResp.slots) }
if ($slots.Count -eq 0 -and $slotsResp.chargers) {
  foreach ($c in $slotsResp.chargers) {
    if ($c.slots) {
      $slots += @($c.slots)
    }
  }
}

$available = @($slots | Where-Object { ("" + $_.status).ToUpperInvariant() -eq "AVAILABLE" })
if ($available.Count -eq 0) { throw "Tidak ada slot AVAILABLE" }
$slotId = $available[0].id

$createBody = @{ slot_id = $slotId; notes = "create-cancel test" } | ConvertTo-Json
$created = Retry -Action { Invoke-RestMethod -Uri "$BaseUrl/bookings" -Method Post -Headers $headers -ContentType "application/json" -Body $createBody -TimeoutSec 20 } -Max 4
$bookingId = ""
if ($created.id) { $bookingId = $created.id }
elseif ($created.booking.id) { $bookingId = $created.booking.id }
elseif ($created.data.id) { $bookingId = $created.data.id }
if ([string]::IsNullOrWhiteSpace($bookingId)) { throw "Create booking tidak mengembalikan id" }

Write-Host ("CREATE_OK booking_id={0}" -f $bookingId)

$cancel = Retry -Action { Invoke-RestMethod -Uri "$BaseUrl/bookings/$bookingId/cancel" -Method Put -Headers $headers -ContentType "application/json" -Body "{}" -TimeoutSec 20 } -Max 4
$cancelId = ""
$cancelStatus = ""
if ($cancel.id) {
  $cancelId = $cancel.id
  $cancelStatus = $cancel.status
} elseif ($cancel.booking) {
  $cancelId = $cancel.booking.id
  $cancelStatus = $cancel.booking.status
} elseif ($cancel.data) {
  $cancelId = $cancel.data.id
  $cancelStatus = $cancel.data.status
}

Write-Host ("CANCEL_OK booking_id={0} status={1}" -f $cancelId, $cancelStatus)
