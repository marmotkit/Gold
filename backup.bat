@echo off
setlocal

:: Set timestamp
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

:: Set backup directory
set BACKUP_DIR=..\Gold_Backup_%TIMESTAMP%

:: Create backup directory
echo Creating backup directory...
mkdir "%BACKUP_DIR%"

:: Copy all files except excluded ones
echo Copying files...
xcopy . "%BACKUP_DIR%\" /E /H /C /I /Y /EXCLUDE:backup_exclude.txt

:: Show completion message
echo.
echo Backup completed!
echo Backup directory: %BACKUP_DIR%
echo.

pause
