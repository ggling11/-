@echo off
rem Hap test build 0.1.0 - start with Direct3D 12 (use this if the normal exe does not start)
cd /d "%~dp0"
"%~dp0hap_test.console.exe" --rendering-driver d3d12
pause
