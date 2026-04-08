# Launch the D&D Kids Resources GUI Control Panel
# This script activates the virtual environment and runs the launcher GUI

$scriptPath = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$workspaceRoot = Split-Path -Parent -Path $scriptPath
Set-Location $workspaceRoot

# Check if venv exists
if (-not (Test-Path ".venv\Scripts\Activate.ps1")) {
    Write-Host "ERROR: Virtual environment not found at .venv\Scripts\Activate.ps1" -ForegroundColor Red
    Write-Host "Please run: python -m venv .venv" -ForegroundColor Yellow
    Write-Host "Then run: pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
& ".venv\Scripts\Activate.ps1"

# Run the GUI using pythonw.exe (windowless) without waiting
Start-Process pythonw.exe -ArgumentList "launcher_gui.py" -WindowStyle Hidden
exit 0
