@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Kids Chores - One-Click Installer
echo  ==========================================
echo.

rem ── Find Python 3 ─────────────────────────────────────────────────────────
set PYTHON=
for /f "delims=" %%i in ('python --version 2^>^&1') do (
    echo %%i | findstr /i "Python 3" >nul && set PYTHON=python
)
if not defined PYTHON (
    for /f "delims=" %%i in ('py -3 --version 2^>^&1') do (
        echo %%i | findstr /i "Python 3" >nul && set PYTHON=py -3
    )
)

rem ── Auto-install Python via winget if missing ──────────────────────────────
if not defined PYTHON (
    echo [1/3] Python not found. Installing via Windows Package Manager...
    winget install --id Python.Python.3.11 --accept-source-agreements --accept-package-agreements --silent
    if errorlevel 1 (
        echo.
        echo  ERROR: Could not install Python automatically.
        echo  Please download and install Python 3 from https://python.org
        echo  then run this installer again.
        echo.
        pause
        exit /b 1
    )
    rem Refresh PATH from registry after winget install
    for /f "skip=2 tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set USERPATH=%%b
    for /f "skip=2 tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set SYSPATH=%%b
    set "PATH=!SYSPATH!;!USERPATH!"
    set PYTHON=python
    echo     Python installed successfully.
) else (
    for /f "delims=" %%v in ('!PYTHON! --version 2^>^&1') do echo [1/3] Found: %%v
)

rem ── Create virtual environment ─────────────────────────────────────────────
if not exist ".venv\Scripts\python.exe" (
    echo [2/3] Creating virtual environment...
    !PYTHON! -m venv .venv
    if errorlevel 1 (
        echo  ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
) else (
    echo [2/3] Virtual environment already exists, skipping.
)

rem ── Install Python dependencies ────────────────────────────────────────────
echo [3/3] Installing dependencies ^(fastapi, uvicorn^)...
.venv\Scripts\pip.exe install -r requirements.txt --quiet --disable-pip-version-check
if errorlevel 1 (
    echo  ERROR: Failed to install dependencies.
    pause
    exit /b 1
)
echo     Dependencies installed.

rem ── Create desktop shortcut ────────────────────────────────────────────────
set SHORTCUT=%USERPROFILE%\Desktop\KidsChores.lnk
set LAUNCH="%~dp0launch.vbs"
set ICON=%~dp0icon.ico

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath='wscript.exe'; $s.Arguments='/nologo %LAUNCH%'; $s.IconLocation='%ICON%'; $s.WorkingDirectory='%~dp0'; $s.Description='Kids Chores App'; $s.Save()"

echo.
echo  ==========================================
echo   Installation complete!
echo.
echo   A shortcut called "KidsChores" was added
echo   to your Desktop.
echo.
echo   Double-click it to launch the app.
echo  ==========================================
echo.
pause
