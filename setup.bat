@echo off
REM Smart Inventory Management - Quick Setup Script (Windows)
REM Make sure MongoDB is running before executing this script

echo.
echo ========================================
echo Smart Inventory Management
echo MongoDB Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo [1/4] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed

echo.
echo [2/4] Waiting for MongoDB connection...
timeout /t 2 /nobreak

echo.
echo [3/4] Importing CSV data to MongoDB...
python import_data.py
if errorlevel 1 (
    echo Error: Failed to import data
    echo Make sure MongoDB is running on localhost:27017
    pause
    exit /b 1
)
echo ✓ Data imported

echo.
echo [4/4] Starting Flask application...
echo Application will run on http://localhost:5000
echo.
echo Press CTRL+C to stop the server
echo.

python app.py
