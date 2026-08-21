param(
  [string]$ComposeFile = "infrastructure/docker-compose.yml",
  [int]$DockerReadyTimeoutSec = 240,
  [int]$ComposeRetry = 2,
  [switch]$CoreOnly,
  [switch]$KeepRunning,
  [switch]$NoCompose
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarnLine([string]$Message) {
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Test-DockerReady {
  # External commands do not throw on non-zero exit in PowerShell by default,
  # so we validate by exit code and non-empty server response.
  $server = & docker info --format "{{.ServerVersion}}" 2>$null
  if ($LASTEXITCODE -ne 0) {
    return $false
  }

  return -not [string]::IsNullOrWhiteSpace($server)
}

function Start-DockerDesktopService {
  try {
    $svc = Get-Service -Name "com.docker.service" -ErrorAction Stop
    if ($svc.Status -ne "Running") {
      Write-Step "Menyalakan service com.docker.service ..."
      Start-Service -Name "com.docker.service" -ErrorAction Stop
    }
  } catch {
    Write-WarnLine "Tidak bisa mengakses com.docker.service (kemungkinan butuh Run as Administrator): $($_.Exception.Message)"
  }
}

function Start-DockerDesktopProcess {
  $exeCandidates = @(
    "$Env:ProgramFiles\\Docker\\Docker\\Docker Desktop.exe",
    "$Env:LocalAppData\\Programs\\Docker\\Docker\\Docker Desktop.exe"
  )

  $running = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
  if ($running) {
    Write-Step "Proses Docker Desktop sudah berjalan."
    return
  }

  foreach ($exe in $exeCandidates) {
    if (Test-Path -Path $exe) {
      Write-Step "Menjalankan Docker Desktop: $exe"
      Start-Process -FilePath $exe | Out-Null
      return
    }
  }

  throw "Docker Desktop.exe tidak ditemukan. Pastikan Docker Desktop terpasang."
}

function Wait-DockerReady([int]$TimeoutSec) {
  Write-Step "Menunggu Docker Engine siap (timeout ${TimeoutSec}s) ..."
  $sw = [System.Diagnostics.Stopwatch]::StartNew()

  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
    if (Test-DockerReady) {
      Write-Step "Docker Engine siap."
      return
    }

    Start-Sleep -Seconds 3
  }

  throw "Docker Engine belum siap dalam ${TimeoutSec} detik. Coba restart Windows lalu jalankan script ini lagi."
}

function Start-Compose([string]$File, [bool]$OnlyCore) {
  if (-not (Test-Path -Path $File)) {
    throw "Compose file tidak ditemukan: $File"
  }

  for ($attempt = 1; $attempt -le ($ComposeRetry + 1); $attempt++) {
    if ($OnlyCore) {
      Write-Step "Tahap 1/2: menyalakan infrastruktur inti (percobaan ke-$attempt) ..."
      if ($KeepRunning) {
        & docker compose -f $File up -d --no-recreate rabbitmq redis postgres-users postgres-stations postgres-bookings
      } else {
        & docker compose -f $File up -d rabbitmq redis postgres-users postgres-stations postgres-bookings
      }

      if ($LASTEXITCODE -eq 0) {
        Write-Step "Menunggu postgres/rabbitmq/redis siap (maks 180 detik) ..."
        $infraReady = $false
        for ($i = 0; $i -lt 36; $i++) {
          $psOut = & docker compose -f $File ps --format json 2>$null
          if ($LASTEXITCODE -ne 0) {
            Start-Sleep -Seconds 5
            continue
          }

          try {
            $rows = $psOut | ConvertFrom-Json
            if ($rows -isnot [System.Array]) { $rows = @($rows) }

            $targets = @('rabbitmq','redis','postgres-users','postgres-stations','postgres-bookings')
            $ok = $true
            foreach ($svc in $targets) {
              $row = $rows | Where-Object { $_.Service -eq $svc } | Select-Object -First 1
              if (-not $row) { $ok = $false; break }
              $healthy = ($row.Health -eq 'healthy')
              $running = ($row.State -eq 'running')
              if (-not ($healthy -or $running)) { $ok = $false; break }
            }

            if ($ok) {
              $infraReady = $true
              break
            }
          } catch {
            # Ignore transient parsing issues and retry.
          }

          Start-Sleep -Seconds 5
        }

        if (-not $infraReady) {
          Write-WarnLine "Infrastruktur belum sehat penuh, lanjutkan tahap app dengan kemungkinan retry."
        }

        Write-Step "Tahap 2/2: menyalakan app inti ..."
        if ($KeepRunning) {
          # In unstable daemon/IO conditions, dependency health may flap for minutes.
          # Use --no-deps so app containers can stay running while infra recovers.
          & docker compose -f $File up -d --no-recreate --no-deps user-service station-service booking-service api-gateway frontend
        } else {
          & docker compose -f $File up -d user-service station-service booking-service api-gateway frontend
        }
      }
    } else {
      Write-Step "Menjalankan seluruh service dari compose, percobaan ke-$attempt ..."
      if ($KeepRunning) {
        & docker compose -f $File up -d --no-recreate
      } else {
        & docker compose -f $File up -d
      }
    }

    if ($LASTEXITCODE -eq 0) {
      break
    }

    if ($attempt -le $ComposeRetry) {
      Write-WarnLine "docker compose up gagal (exit $LASTEXITCODE), retry 5 detik lagi ..."
      Start-Sleep -Seconds 5
    } else {
      throw "docker compose up gagal setelah $attempt percobaan (exit $LASTEXITCODE)"
    }
  }

  Write-Step "Status service:"
  & docker compose -f $File ps

  if ($LASTEXITCODE -ne 0) {
    throw "docker compose ps gagal dengan exit code $LASTEXITCODE"
  }
}

try {
  Write-Step "Mulai otomatisasi Docker ..."
  Start-DockerDesktopService
  Start-DockerDesktopProcess
  Wait-DockerReady -TimeoutSec $DockerReadyTimeoutSec

  if (-not $NoCompose) {
    Start-Compose -File $ComposeFile -OnlyCore:$CoreOnly
  } else {
    Write-Step "Mode NoCompose aktif. Tidak menjalankan docker compose."
  }

  Write-Host "[OK] Selesai." -ForegroundColor Green
} catch {
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  Write-WarnLine "Tips cepat: jalankan Docker Desktop sebagai Administrator jika service/daemon sering 500/503."
  exit 1
}
