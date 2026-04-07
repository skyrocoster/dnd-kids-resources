@echo off
REM ============================================================================
REM Install PyQt5 for the Control Panel
REM ============================================================================

title Install PyQt5 - D&D Stat Block Queue Manager
cd /d "%~dp0"

echo.
echo ============================================================
echo Installing PyQt5
echo ============================================================
echo.

REM Check if venv exists
if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found at .venv\Scripts\activate.bat
    echo Creating virtual environment now...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

echo Installing PyQt5...
pip install PyQt5==5.15.9

if errorlevel 1 (
    echo ERROR: Failed to install PyQt5
    pause
    exit /b 1
)

echo.
echo ✓ PyQt5 installed successfully!
echo.
echo You can now run: launch_manager.bat
echo.
pause
