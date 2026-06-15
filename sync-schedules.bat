@echo off
chcp 65001 >nul
echo ========================================
echo         中職賽程同步工具
echo ========================================
echo 正在啟動...
echo.

call npm run sync-schedules -- --force

echo.
pause
