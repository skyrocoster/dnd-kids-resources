<#
Stops the demo backend and cloudflared tunnel started by demo_up.ps1.

Usage:
  .\scripts\demo_down.ps1
#>

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendPidFile = Join-Path $RepoRoot ".demo-backend.pid"
$TunnelPidFile = Join-Path $RepoRoot ".demo-tunnel.pid"

$backendStopped = $false
$tunnelStopped = $false

if (Test-Path $BackendPidFile) {
    $backendPid = Get-Content $BackendPidFile
    $backendProcess = Get-Process -Id $backendPid -ErrorAction SilentlyContinue

    if ($backendProcess) {
        Stop-Process -Id $backendPid -Force
        $backendStopped = $true
        Write-Host "Demo backend stopped (PID $backendPid)." -ForegroundColor Green
    } else {
        Write-Host "Demo backend process (PID $backendPid) not found." -ForegroundColor Yellow
    }
    Remove-Item $BackendPidFile -ErrorAction SilentlyContinue
}

if (Test-Path $TunnelPidFile) {
    $tunnelPid = Get-Content $TunnelPidFile
    $tunnelProcess = Get-Process -Id $tunnelPid -ErrorAction SilentlyContinue

    if ($tunnelProcess) {
        Stop-Process -Id $tunnelPid -Force
        $tunnelStopped = $true
        Write-Host "Tunnel stopped (PID $tunnelPid)." -ForegroundColor Green
    } else {
        Write-Host "Tunnel process (PID $tunnelPid) not found." -ForegroundColor Yellow
    }
    Remove-Item $TunnelPidFile -ErrorAction SilentlyContinue
}

if (-not $backendStopped -and -not $tunnelStopped) {
    Write-Host "No demo processes appear to be running (or weren't started with demo_up.ps1)." -ForegroundColor Yellow
    exit 0
}
