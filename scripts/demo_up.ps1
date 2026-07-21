<#
Starts a public demo: builds the frontend into frontend/dist, runs the
backend (which serves that build directly, single process), and opens a
cloudflared tunnel to it. Everything runs as background processes so this
terminal is free; stop with .\scripts\demo_down.ps1.

Requires the one-time cloudflared setup (tunnel created + DNS routed + a
config.yml under %USERPROFILE%\.cloudflared) to already be done.

Usage:
  .\scripts\demo_up.ps1                    # build frontend, start backend, start tunnel "dnd-kids"
  .\scripts\demo_up.ps1 -SkipBuild         # reuse the existing frontend/dist
  .\scripts\demo_up.ps1 -TunnelName other-tunnel -Port 8080
#>

param(
    [int]$Port = 8000,
    [string]$TunnelName = "dnd-kids",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendPidFile = Join-Path $RepoRoot ".demo-backend.pid"
$TunnelPidFile = Join-Path $RepoRoot ".demo-tunnel.pid"
$LogFile = Join-Path $RepoRoot "demo-backend.log"
$TunnelLogFile = Join-Path $RepoRoot "demo-tunnel.log"
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"

if (Test-Path $BackendPidFile) {
    $existingId = Get-Content $BackendPidFile
    if (Get-Process -Id $existingId -ErrorAction SilentlyContinue) {
        Write-Host "Demo backend already running (PID $existingId). Use .\scripts\demo_down.ps1 first." -ForegroundColor Yellow
        exit 1
    }
    Remove-Item $BackendPidFile
}

if (Test-Path $TunnelPidFile) {
    $existingId = Get-Content $TunnelPidFile
    if (Get-Process -Id $existingId -ErrorAction SilentlyContinue) {
        Write-Host "Demo tunnel already running (PID $existingId). Use .\scripts\demo_down.ps1 first." -ForegroundColor Yellow
        exit 1
    }
    Remove-Item $TunnelPidFile
}

if (-not (Test-Path $Python)) {
    Write-Host "Python venv not found at $Python — falling back to 'python' on PATH." -ForegroundColor Yellow
    $Python = "python"
}

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Host "cloudflared not found on PATH." -ForegroundColor Red
    exit 1
}

Push-Location $RepoRoot
try {
    if (-not $SkipBuild) {
        Write-Host "Building frontend..." -ForegroundColor Cyan
        Push-Location (Join-Path $RepoRoot "frontend")
        try {
            & cmd.exe /c "npm run build"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Frontend build failed." -ForegroundColor Red
                exit 1
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "Skipping frontend build (using existing frontend/dist)." -ForegroundColor Gray
    }

    # Start backend (FastAPI, serving frontend/dist)
    $backendProc = Start-Process -FilePath $Python `
        -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", $Port `
        -WorkingDirectory $RepoRoot `
        -RedirectStandardOutput $LogFile `
        -RedirectStandardError "$LogFile.err" `
        -PassThru -WindowStyle Hidden

    $backendProc.Id | Out-File -FilePath $BackendPidFile -Encoding ascii
    Start-Sleep -Seconds 2

    if (-not (Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue)) {
        Write-Host "Backend failed to start. Check $LogFile and $LogFile.err" -ForegroundColor Red
        Remove-Item $BackendPidFile -ErrorAction SilentlyContinue
        exit 1
    }
    Write-Host "Backend started (PID $($backendProc.Id)) at http://127.0.0.1:$Port" -ForegroundColor Green

    # Start cloudflared tunnel
    $tunnelProc = Start-Process -FilePath $cloudflared.Source `
        -ArgumentList "tunnel", "run", $TunnelName `
        -WorkingDirectory $RepoRoot `
        -RedirectStandardOutput $TunnelLogFile `
        -RedirectStandardError "$TunnelLogFile.err" `
        -PassThru -WindowStyle Hidden

    $tunnelProc.Id | Out-File -FilePath $TunnelPidFile -Encoding ascii
    Start-Sleep -Seconds 3

    if (-not (Get-Process -Id $tunnelProc.Id -ErrorAction SilentlyContinue)) {
        Write-Host "Tunnel failed to start. Check $TunnelLogFile and $TunnelLogFile.err" -ForegroundColor Red
        Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
        Remove-Item $BackendPidFile, $TunnelPidFile -ErrorAction SilentlyContinue
        exit 1
    }
    Write-Host "Tunnel '$TunnelName' started (PID $($tunnelProc.Id))." -ForegroundColor Green

    Write-Host "`nDemo is live. Stop it with .\scripts\demo_down.ps1" -ForegroundColor Cyan
    Write-Host "Logs: $LogFile and $TunnelLogFile" -ForegroundColor Gray
} finally {
    Pop-Location
}
