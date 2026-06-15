@echo off
chcp 65001 >nul
echo ========================================
echo       啦啦隊班表同步工具
echo ========================================
echo 正在啟動...
echo.

call npm run sync-cheerleaders -- --force

echo.
pause
