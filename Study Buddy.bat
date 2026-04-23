@echo off
TITLE StudyBuddy Launcher
COLOR 0B

:: Navigate to the project directory
cd /d "C:\Users\Rowdy\Desktop\StudyBuddy"

:: Check if node_modules exists, if not, try to install
if not exist node_modules (
    echo node_modules not found. Installing dependencies...
    call npm install
)

:: Start the browser in a new window (pointing to your port)
start "" "http://localhost:3000"

:: Run the Node server
echo Starting Server...
node app.js

pause