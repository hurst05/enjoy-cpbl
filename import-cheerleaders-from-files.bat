@echo off
chcp 65001 >nul
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo ========================================
echo       從 JSON 匯入啦啦隊班表
echo ========================================

:: 1. 拖曳資料夾或檔案到 .bat 圖示上時，直接執行
if not "%~1"=="" (
  echo 檢測到傳入路徑: %*
  echo 正在執行匯入...
  call npm run import-cheerleaders -- %*
  goto END
)

:: 2. 自動掃描 doc/exportCheerSchedule 下的所有月份資料夾 (降冪排序，最新在最前)
set "COUNT=0"
echo 偵測到現有月份資料夾：
for /f "delims=" %%D in ('dir /b /ad /o-n "doc\exportCheerSchedule" 2^>nul') do (
  set /a COUNT+=1
  set "MONTH_!COUNT!=%%D"
  if !COUNT!==1 (
    echo   [!COUNT!] %%D ^(最新 - 按 Enter 預設執行^)
  ) else (
    echo   [!COUNT!] %%D
  )
)

if "%COUNT%"=="0" (
  echo 未找到月份子資料夾，正在匯入 doc/exportCheerSchedule/ 全部檔案...
  call npm run import-cheerleaders
  goto END
)

echo   ----------------------------------------
echo   [A] 全部月份匯入
echo   [D] 模擬檢查 (Dry-run 最新月份)
echo.

set "CHOICE="
set /p "CHOICE=請選擇 [預設 1]: "

if "!CHOICE!"=="" set "CHOICE=1"
for /f "tokens=1" %%a in ("!CHOICE!") do set "CHOICE=%%a"
if "!CHOICE!"=="" set "CHOICE=1"

if /i "!CHOICE!"=="A" (
  echo.
  echo [執行] 匯入全部月份...
  call npm run import-cheerleaders
  goto END
)

if /i "!CHOICE!"=="D" (
  echo.
  echo [執行] 模擬檢查 !MONTH_1!...
  call npm run import-cheerleaders -- --dry-run --dir "doc/exportCheerSchedule/!MONTH_1!"
  goto END
)

call set "TARGET_MONTH=%%MONTH_!CHOICE!%%"
if "!TARGET_MONTH!"=="" (
  if "!CHOICE!"=="1" set "TARGET_MONTH=!MONTH_1!"
  if "!CHOICE!"=="2" set "TARGET_MONTH=!MONTH_2!"
  if "!CHOICE!"=="3" set "TARGET_MONTH=!MONTH_3!"
  if "!CHOICE!"=="4" set "TARGET_MONTH=!MONTH_4!"
  if "!CHOICE!"=="5" set "TARGET_MONTH=!MONTH_5!"
  if "!CHOICE!"=="6" set "TARGET_MONTH=!MONTH_6!"
)

if not "!TARGET_MONTH!"=="" (
  echo.
  echo [執行] 匯入 !TARGET_MONTH! 班表資料...
  call npm run import-cheerleaders -- --dir "doc/exportCheerSchedule/!TARGET_MONTH!"
  goto END
)

echo 無效選項，已取消。

:END
echo.
pause


