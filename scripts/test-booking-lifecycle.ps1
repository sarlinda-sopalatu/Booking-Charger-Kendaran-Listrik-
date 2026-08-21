param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$Email = "siti.rahayu@gmail.com",
  [string]$Password = "Password123!"
)

$ErrorActionPreference = "Stop"

function Resolve-Items([object]$ListResp) {
  if ($ListResp.bookings) { return @($ListResp.bookings) }
  if ($ListResp.data.bookings) { return @($ListResp.data.bookings) }
  if ($ListResp.data -is [System.Array]) { return @($ListResp.data) }
  if ($ListResp -is [System.Array]) { return @($ListResp) }
  return @()
}

$body = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 20
$token = $login.access_token
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "Login tidak mengembalikan access_token"
}

$headers = @{ Authorization = "Bearer $token" }
$list = Invoke-RestMethod -Uri "$BaseUrl/bookings" -Method Get -Headers $headers -TimeoutSec 20
$items = Resolve-Items -ListResp $list
if ($items.Count -eq 0) {
  throw "List booking kosong"
}

$target = $items[0]
if ([string]::IsNullOrWhiteSpace($target.id)) {
  throw "Booking dari list tidak memiliki id"
}

Write-Host ("LIST_OK count={0} target={1} status={2}" -f $items.Count, $target.id, $target.status)

$cancel = Invoke-RestMethod -Uri "$BaseUrl/bookings/$($target.id)/cancel" -Method Put -Headers $headers -ContentType "application/json" -Body "{}" -TimeoutSec 20
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

Write-Host ("CANCEL_OK id={0} status={1}" -f $cancelId, $cancelStatus)
