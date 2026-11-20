@echo off
setlocal
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ and add it to PATH.
    if "%~1"=="" pause
    exit /b 1
)
python "%~dp0scripts\start.py" %*
set "NEXUS_EXIT=%ERRORLEVEL%"
if not "%NEXUS_EXIT%"=="0" if "%~1"=="" pause
exit /b %NEXUS_EXIT%
