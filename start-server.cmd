@echo off
node "%~dp0scripts\serve-dist.mjs"
if errorlevel 1 (
  pause
  exit /b 1
)
