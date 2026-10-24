@echo off
rem Hap test build 0.1.0 - start with OpenGL (Compatibility renderer, last resort)
cd /d "%~dp0"
"%~dp0hap_test.console.exe" --rendering-driver opengl3 --rendering-method gl_compatibility
pause
