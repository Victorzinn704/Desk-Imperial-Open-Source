@echo off
setlocal

set "REPO_DIR=%~dp0.."
cd /d "%REPO_DIR%"

set "MODE=%~1"
if "%MODE%"=="" set "MODE=daily"
if /I "%MODE%"=="fast" goto mode_ok
if /I "%MODE%"=="daily" goto mode_ok
if /I "%MODE%"=="critical" goto mode_ok
if /I "%MODE%"=="custom" goto mode_ok
set "MODE=daily"

:mode_ok
shift
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-aider.ps1" -Mode %MODE% %*
exit /b %errorlevel%
