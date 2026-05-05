@echo off
REM Start Battle Server (UDP)
REM Make sure Redis is running first!

cd /d "%~dp0"
echo Starting Starveli Battle Server on port 9338 (UDP)...
echo.
echo Make sure Redis is running! If not, start it in another terminal.
echo.
node index.js
pause
