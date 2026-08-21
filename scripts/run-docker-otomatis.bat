@echo off
setlocal
cd /d "%~dp0.."
powershell -ExecutionPolicy Bypass -File ".\scripts\run-docker-otomatis.ps1" -CoreOnly -KeepRunning
exit /b %errorlevel%
