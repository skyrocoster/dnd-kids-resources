# D&D Kids Resources - Flask Server Starter
# This script starts the Flask development server

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "D&D Kids Resources - Flask Server" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Get the script directory and go up to the root
$scriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent -Path $scriptDir
Set-Location $rootDir

# Activate virtual environment if it exists
$venvPath = Join-Path $rootDir ".venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & $venvPath
} else {
    Write-Host "⚠ Virtual environment not found at: $venvPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Flask server..." -ForegroundColor Green
Write-Host "Server will be available at: http://localhost:8000" -ForegroundColor Green
Write-Host ""

# Start the Flask server
python server_flask.py

# If the script reaches here, the server has stopped
Write-Host ""
Write-Host "Server stopped." -ForegroundColor Yellow
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
