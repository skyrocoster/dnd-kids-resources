@echo off
REM Launch the D&D Kids Resources GUI Control Panel
REM This script activates the virtual environment and runs the launcher GUI

REM Change to parent directory (workspace root)
cd /d "%~dp0\.."

REM Check if venv exists
if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found at .venv\Scripts\activate.bat
    echo Please run: python -m venv .venv
    echo Then run: pip install -r requirements.txt
    pause
    exit /b 1
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Run the GUI using pythonw.exe (windowless) without waiting
start "" pythonw.exe launcher_gui.py
exit /b 0
