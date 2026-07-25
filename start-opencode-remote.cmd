@echo off
REM Double-click this to start the opencode LAN server for this repo.
REM Prints the phone URL and login, then stays open until you close it.
REM Details: opencode-remote-setup.txt
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\opencode_remote.ps1" -ShowPassword
echo.
echo Server stopped.
pause
