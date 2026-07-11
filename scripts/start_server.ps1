<#
Starts both the frontend dev server (Vite @ 5173) and backend (FastAPI @ 8000)
as background processes, so this terminal is free to keep using.

Usage:
  .\scripts\start_server.ps1              # start backend on 8000, frontend on 5173
  .\scripts\start_server.ps1 -Port 8080    # start backend on a different port
#>

param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendPidFile = Join-Path $RepoRoot ".server.pid"
$FrontendPidFile = Join-Path $RepoRoot ".frontend.pid"
$LogFile = Join-Path $RepoRoot "server.log"
$FrontendLogFile = Join-Path $RepoRoot "frontend.log"
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"

# Check for existing processes
if (Test-Path $BackendPidFile) {
    $existingId = Get-Content $BackendPidFile
    if (Get-Process -Id $existingId -ErrorAction SilentlyContinue) {
        Write-Host "Server already running (PID $existingId). Use .\scripts\stop_server.ps1 first." -ForegroundColor Yellow
        exit 1
    }
    Remove-Item $BackendPidFile
}

if (Test-Path $FrontendPidFile) {
    $existingId = Get-Content $FrontendPidFile
    if (Get-Process -Id $existingId -ErrorAction SilentlyContinue) {
        Write-Host "Frontend dev server already running (PID $existingId). Use .\scripts\stop_server.ps1 first." -ForegroundColor Yellow
        exit 1
    }
    Remove-Item $FrontendPidFile
}

if (-not (Test-Path $Python)) {
    Write-Host "Python venv not found at $Python — falling back to 'python' on PATH." -ForegroundColor Yellow
    $Python = "python"
}

Push-Location $RepoRoot
try {
    # Start backend (FastAPI)
    $backendProc = Start-Process -FilePath $Python `
        -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--port", $Port `
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

    # Start frontend (Vite dev server)
    $frontendProc = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "npm", "run", "dev" `
        -WorkingDirectory (Join-Path $RepoRoot "frontend") `
        -RedirectStandardOutput $FrontendLogFile `
        -RedirectStandardError "$FrontendLogFile.err" `
        -PassThru -WindowStyle Hidden

    $frontendProc.Id | Out-File -FilePath $FrontendPidFile -Encoding ascii
    Start-Sleep -Seconds 8

    if (-not (Get-Process -Id $frontendProc.Id -ErrorAction SilentlyContinue)) {
        Write-Host "Frontend dev server failed to start. Check $FrontendLogFile and $FrontendLogFile.err" -ForegroundColor Red
        Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
        Remove-Item $BackendPidFile, $FrontendPidFile -ErrorAction SilentlyContinue
        exit 1
    }
    Write-Host "Frontend dev server started (PID $($frontendProc.Id)) at http://127.0.0.1:5173" -ForegroundColor Green
    Write-Host "(Note: first startup may take 10-15s for dependency bundling)" -ForegroundColor Gray

    Write-Host "`nBoth servers running:" -ForegroundColor Cyan
    Write-Host "  Backend:  http://127.0.0.1:$Port" -ForegroundColor Green
    Write-Host "  Frontend: http://127.0.0.1:5173" -ForegroundColor Green
    Write-Host "`nLogs: $LogFile and $FrontendLogFile" -ForegroundColor Gray
} finally {
    Pop-Location
}
