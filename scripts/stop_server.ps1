<#
Stops both the backend and frontend dev servers started by start_server.ps1.

Usage:
  .\scripts\stop_server.ps1
#>

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendPidFile = Join-Path $RepoRoot ".server.pid"
$FrontendPidFile = Join-Path $RepoRoot ".frontend.pid"

$backendStopped = $false
$frontendStopped = $false

# Stop backend
if (Test-Path $BackendPidFile) {
    $backendPid = Get-Content $BackendPidFile
    $backendProcess = Get-Process -Id $backendPid -ErrorAction SilentlyContinue

    if ($backendProcess) {
        Stop-Process -Id $backendPid -Force
        $backendStopped = $true
        Write-Host "Backend stopped (PID $backendPid)." -ForegroundColor Green
    } else {
        Write-Host "Backend process (PID $backendPid) not found." -ForegroundColor Yellow
    }
    Remove-Item $BackendPidFile -ErrorAction SilentlyContinue
}

# Stop frontend
if (Test-Path $FrontendPidFile) {
    $frontendPid = Get-Content $FrontendPidFile
    $frontendProcess = Get-Process -Id $frontendPid -ErrorAction SilentlyContinue

    if ($frontendProcess) {
        Stop-Process -Id $frontendPid -Force
        $frontendStopped = $true
        Write-Host "Frontend dev server stopped (PID $frontendPid)." -ForegroundColor Green
    } else {
        Write-Host "Frontend process (PID $frontendPid) not found." -ForegroundColor Yellow
    }
    Remove-Item $FrontendPidFile -ErrorAction SilentlyContinue
}

if (-not $backendStopped -and -not $frontendStopped) {
    Write-Host "No servers appear to be running (or weren't started with start_server.ps1)." -ForegroundColor Yellow
    exit 0
}
