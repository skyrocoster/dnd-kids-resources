@echo off
REM ============================================================================
REM D&D Stat Block Queue Worker - Manual Launch
REM ============================================================================
REM
REM Usage: Run this batch file to start just the queue worker
REM
REM NOTE: The Flask server should already be running separately!
REM
REM This will:
REM 1. Activate virtual environment
REM 2. Launch queue worker in a terminal window
REM
REM To stop: Press Ctrl+C in the terminal window
REM

title D&D Queue Worker - Manual Start
cd /d "%~dp0"

echo.
echo ============================================================
echo D&D Stat Block Queue Worker - Manual Launch
echo ============================================================
echo.
echo NOTE: Make sure Flask server is already running!
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

echo Starting Queue Worker...
echo Opening terminal: Background Job Processor
start "DnD Queue Worker" cmd /k "python _dev\queue_worker.py --verbose"

echo.
echo ✓ Queue worker terminal opened
echo.
echo Press Ctrl+C in the worker terminal to stop it.
echo.
pause
