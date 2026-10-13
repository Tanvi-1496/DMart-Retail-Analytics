@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
if "%PORT%"=="" set PORT=5173
echo Starting DMart Analytics Frontend on http://localhost:%PORT% ...
call npm run dev
