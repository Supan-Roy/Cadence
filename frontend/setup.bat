@echo off
REM Cadence Frontend Setup Script for Windows

echo.
echo 🎵 Cadence Frontend - Installation
echo ===================================
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js/npm found
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Installation complete!
    echo.
    echo 🚀 To start the development server, run:
    echo    npm run dev
    echo.
    echo 📝 Make sure the backend is running on http://127.0.0.1:8000
    echo.
    pause
) else (
    echo.
    echo ❌ Installation failed!
    echo.
    pause
    exit /b 1
)
