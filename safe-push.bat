@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\safe-push.ps1" %*
pause
