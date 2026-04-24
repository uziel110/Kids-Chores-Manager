@echo off
echo.
echo  ==========================================
echo   Syncing shared/ to kids-chores-android
echo  ==========================================
echo.

cd /d "%~dp0"

echo [1/2] Updating shared-split branch...
git subtree split --prefix=shared --branch shared-split

echo [2/2] Pulling into Android repo...
cd /d "%~dp0..\kids-chores-android"
git subtree pull --prefix=shared "%~dp0" shared-split --squash -m "Sync shared from kids-chores"

echo.
echo  Done! shared/ is now synced to kids-chores-android.
echo.
pause
