@echo off
echo 開始清理...
echo.

echo 刪除 node_modules...
if exist node_modules rd /s /q node_modules

echo 刪除 package-lock.json...
if exist package-lock.json del /f package-lock.json

echo 清理 npm 緩存...
call npm cache clean --force

echo 安裝依賴...
call npm install --legacy-peer-deps

echo 啟動應用...
call npm start

pause
