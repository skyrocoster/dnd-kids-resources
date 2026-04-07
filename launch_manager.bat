@echo off
REM ============================================================================
REM D&D Stat Block Queue Manager - Control Panel Only
REM ============================================================================
REM
REM Usage: Run this batch file to start the control panel
REM
REM NOTE: This launches ONLY the control panel for the queue worker.
REM The Flask server should be running separately.
REM
REM This will:
REM 1. Activate the virtual environment
REM 2. Ensure PyQt5 is installed
REM 3. Launch the desktop control panel for queue worker management
REM
REM The control panel allows you to:
REM   - Start/Stop/Restart the queue worker
REM   - Monitor queue statistics in real-time
REM   - View recent jobs and their status
REM   - See worker process logs
REM

title D&D Stat Block Queue Manager - Control Panel
cd /d "%~dp0"

echo.
echo ============================================================
echo D&D Stat Block Queue Manager - Control Panel
echo ============================================================
echo.
echo NOTE: Make sure the Flask server is running separately!
echo Run: python server_flask.py
echo.

REM Check if venv exists
if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found at .venv\Scripts\activate.bat
    echo Please run: python -m venv .venv
    pause
    exit /b 1
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Check if PyQt5 is installed
python -c "import PyQt5" >nul 2>&1
if errorlevel 1 (
    echo PyQt5 not found. Installing...
    pip install PyQt5==5.15.9
    if errorlevel 1 (
        echo ERROR: Failed to install PyQt5
        pause
        exit /b 1
    )
)

echo Starting launcher application...
echo.

REM Launch the PyQt5 control panel
python _dev\launcher_app.py

REM Clean up on exit
echo.
echo Control panel closed. Exiting...
pause
