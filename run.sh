@echo off
REM Run backend
start cmd /k "cd backend && npm i && npm run dev"
REM Run frontend
start cmd /k "cd frontend/Dashboard && npm i && npm run dev"