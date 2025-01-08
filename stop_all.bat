@echo off
echo Stopping services...

:: Kill all Python and Node.js processes
taskkill /F /IM python.exe /T
taskkill /F /IM node.exe /T

echo All services stopped!
