param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$Email = "budi.santoso@gmail.com",
  [string]$Password = "Password123!",
  [string]$Date = "",
  [bool]$AutoDateFromDb = $true,
  [string]$Notes = "demo auto booking"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[STEP] $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Fail([string]$Message) {
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Invoke-Api {
  param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [hashtable]$Headers,
    [object]$Body
  )

  try {
    if ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Depth 8
      return Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ContentType "application/json" -Body $json -TimeoutSec 20
    }

    return Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -TimeoutSec 20
  } catch {
    $msg = $_.Exception.Message
    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $statusText = $_.Exception.Response.StatusDescription
        throw "HTTP $statusCode $statusText dari ${Url}"
      } catch {
        throw "Request gagal ke ${Url}: $msg"
      }
    }

    throw "Request gagal ke ${Url}: $msg"
  }
}

function Invoke-WithRetry {
  param(
    [Parameter(Mandatory=$true)][scriptblock]$Action,
    [int]$MaxAttempts = 4,
    [int]$DelaySec = 2,
    [string]$Label = "request"
  )

  $lastError = ""
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      return & $Action
    } catch {
      $lastError = $_.Exception.Message
      if ($attempt -lt $MaxAttempts) {
        Write-Host ("[RETRY] {0} attempt {1}/{2}: {3}" -f $Label, $attempt, $MaxAttempts, $lastError) -ForegroundColor Yellow
        Start-Sleep -Seconds $DelaySec
      }
    }
  }

  throw "${Label} gagal setelah ${MaxAttempts} percobaan: ${lastError}"
}

function Get-TokenFromLogin {
  param([object]$LoginResp)

  $candidates = @(
    $LoginResp.access_token,
    $LoginResp.token,
    $LoginResp.jwt,
    $LoginResp.data.access_token,
    $LoginResp.data.token,
    $LoginResp.result.access_token,
    $LoginResp.result.token
  )

  foreach ($c in $candidates) {
    if (-not [string]::IsNullOrWhiteSpace($c)) {
      return $c
    }
  }

  return ""
}

function Get-StationsArray {
  param([object]$Resp)

  if ($Resp -is [System.Array]) { return @($Resp) }
  if ($Resp.stations) { return @($Resp.stations) }
  if ($Resp.data -is [System.Array]) { return @($Resp.data) }
  if ($Resp.data.stations) { return @($Resp.data.stations) }
  if ($Resp.result -is [System.Array]) { return @($Resp.result) }

  return @()
}

function Get-SlotsArray {
  param([object]$Resp)

  $slots = @()

  if ($Resp.slots) {
    $slots += @($Resp.slots)
  }

  if ($Resp.data.slots) {
    $slots += @($Resp.data.slots)
  }

  if ($slots.Count -eq 0) {
    $chargers = @()
    if ($Resp.chargers) { $chargers = @($Resp.chargers) }
    elseif ($Resp.data.chargers) { $chargers = @($Resp.data.chargers) }

    foreach ($c in $chargers) {
      if ($c.slots) {
        $slots += @($c.slots)
      }
    }
  }

  return @($slots)
}

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

try {
  Write-Step "Login"
  $login = Invoke-WithRetry -Label "login" -MaxAttempts 6 -DelaySec 2 -Action {
    Invoke-Api -Method "Post" -Url "$BaseUrl/auth/login" -Body @{ email = $Email; password = $Password }
  }
  $token = Get-TokenFromLogin -LoginResp $login
  if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Login sukses HTTP tapi access token tidak ditemukan pada response"
  }
  Write-Ok "Login berhasil"

  $headers = @{ Authorization = "Bearer $token" }

  Write-Step "List stations"
  $stationsResp = Invoke-WithRetry -Label "list-stations" -MaxAttempts 4 -DelaySec 2 -Action {
    Invoke-Api -Method "Get" -Url "$BaseUrl/stations" -Headers $headers
  }
  $stations = Get-StationsArray -Resp $stationsResp
  if ($stations.Count -eq 0) {
    throw "Tidak ada station dari endpoint /stations"
  }
  $station = $stations[0]
  if ([string]::IsNullOrWhiteSpace($station.id)) {
    throw "Station pertama tidak memiliki id"
  }
  Write-Ok ("Station dipilih: {0} ({1})" -f $station.id, $station.name)

  Write-Step "List slots"
  $slotsResp = Invoke-WithRetry -Label "list-slots" -MaxAttempts 4 -DelaySec 2 -Action {
    Invoke-Api -Method "Get" -Url "$BaseUrl/stations/$($station.id)/slots?date=$Date" -Headers $headers
  }
  $slots = Get-SlotsArray -Resp $slotsResp
  if ($slots.Count -eq 0) {
    throw "Tidak ada slot pada station terpilih untuk tanggal $Date"
  }

  $available = @($slots | Where-Object {
    $s = "" + $_.status
    $s.ToUpperInvariant() -eq "AVAILABLE"
  })

  if ($available.Count -eq 0) {
    throw "Slot ada, tapi tidak ada yang AVAILABLE"
  }

  $slot = $available[0]
  if ([string]::IsNullOrWhiteSpace($slot.id)) {
    throw "Slot terpilih tidak memiliki id"
  }
  Write-Ok ("Slot dipilih: {0} {1}-{2}" -f $slot.id, $slot.start_time, $slot.end_time)

  Write-Step "Create booking"
  $bookingResp = Invoke-WithRetry -Label "create-booking" -MaxAttempts 4 -DelaySec 2 -Action {
    Invoke-Api -Method "Post" -Url "$BaseUrl/bookings" -Headers $headers -Body @{ slot_id = $slot.id; notes = $Notes }
  }

  $bookingId = ""
  if ($bookingResp.id) { $bookingId = $bookingResp.id }
  elseif ($bookingResp.booking.id) { $bookingId = $bookingResp.booking.id }
  elseif ($bookingResp.data.id) { $bookingId = $bookingResp.data.id }

  if ([string]::IsNullOrWhiteSpace($bookingId)) {
    throw "Create booking response tidak memiliki booking id"
  }

  Write-Ok ("Booking berhasil: $bookingId")
  Write-Host "\n=== DEMO FLOW SUCCESS ===" -ForegroundColor Green
  Write-Host ("email={0}" -f $Email)
  Write-Host ("station_id={0}" -f $station.id)
  Write-Host ("slot_id={0}" -f $slot.id)
  Write-Host ("booking_id={0}" -f $bookingId)
} catch {
  Write-Fail $_.Exception.Message
  exit 1
}
