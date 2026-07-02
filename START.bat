@echo off
rem WC26 Command Center — double-click to launch
cd /d "%~dp0"
start "WC26 server" /min python -m http.server 8642 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" http://localhost:8642/
echo Server running at http://localhost:8642 (window minimized). Close that window to stop.
