@echo off
echo Starting services...

:: Start backend Flask server
start cmd /k "python app.py"

:: Wait for 2 seconds
timeout /t 2 /nobreak

:: Change to frontend directory and start frontend
cd frontend
start cmd /k "npm start"

echo All services started!
echo Backend running at: http://localhost:8000
echo Frontend running at: http://localhost:3000
