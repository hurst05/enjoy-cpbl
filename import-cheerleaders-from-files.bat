@echo off
chcp 65001 >nul
echo ========================================
echo       從 JSON 匯入啦啦隊班表
echo ========================================
echo 正在匯入...
echo.

call npm run import-cheerleaders -- %*

echo.
pause
