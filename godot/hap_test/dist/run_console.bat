@echo off
rem Hap test build 0.1.0 - start with a console window that stays open (driver order: Vulkan, D3D12, OpenGL)
cd /d "%~dp0"
"%~dp0hap_test.console.exe"
pause
