@echo off
echo ===================================================
echo Building Frontend and Syncing Completely to GitHub...
echo ===================================================

cd frontend
call npm run build
cd ..

echo Staging all modified, deleted, and untracked asset files...
git add -A

set /p msg="Enter commit message (default: Update live build and dashboard): "
if "%msg%"=="" set msg=Update live build and dashboard

git commit -m "%msg%"
git push origin main

echo ===================================================
echo Sync Complete! cPanel live server can now deploy.
echo ===================================================
pause
