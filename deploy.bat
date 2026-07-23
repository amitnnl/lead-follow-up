@echo off
echo ==========================================
echo LeadFlow Pro - Sync and Deploy Script
echo ==========================================

echo.
echo [1/3] Building the frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Frontend build failed!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/3] Adding changes to Git...
git add .

echo.
echo [3/3] Committing and Pushing...
git commit -m "fix: resolve API authentication and missing DB columns for WhatsApp deployment"
git push
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Git push failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo SUCCESS: Deployment Complete!
echo ==========================================
pause
