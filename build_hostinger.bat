@echo off
echo ==========================================
echo LeadFlow Pro - Hostinger Build Script
echo ==========================================

echo.
echo [1/4] Building the frontend...
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
echo [2/4] Preparing deployment folder...
if exist hostinger_build rmdir /s /q hostinger_build
mkdir hostinger_build

echo.
echo [3/4] Copying files...
:: Copy the backend folder
xcopy /E /I /Y backend hostinger_build\backend > nul
:: Copy the compiled React frontend files
xcopy /E /I /Y frontend\dist\* hostinger_build\ > nul
:: Copy the .htaccess file for routing
copy /Y .htaccess hostinger_build\.htaccess > nul

echo.
echo [4/4] Creating ZIP file (This may take a moment)...
if exist deploy_hostinger.zip del /q deploy_hostinger.zip
powershell -nologo -noprofile -command "Compress-Archive -Path 'hostinger_build\*' -DestinationPath 'deploy_hostinger.zip'"

echo.
echo Cleaning up temporary folder...
rmdir /s /q hostinger_build

echo.
echo ==========================================
echo SUCCESS: deploy_hostinger.zip has been created!
echo ==========================================
echo Please upload deploy_hostinger.zip to your Hostinger public_html folder and extract it there.
pause
