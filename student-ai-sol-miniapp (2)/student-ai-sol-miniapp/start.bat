@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  npm install
  if errorlevel 1 pause & exit /b 1
)
npm run dev
pause
