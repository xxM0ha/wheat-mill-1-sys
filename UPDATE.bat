@echo off
echo ==========================================
echo    Updating Wheat-Mill Project
echo ==========================================

echo [1/3] Pulling latest changes from GitHub...
git pull origin main

echo.
echo [2/3] Checking for backend updates...
cd backend
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    python manage.py migrate
    deactivate
) else (
    echo Virtual environment not found, skipping backend update.
)
cd ..

echo.
echo [3/3] Checking for frontend updates...
cd frontend
if exist node_modules (
    call npm install
) else (
    echo Node modules not found, skipping frontend update.
)
cd ..

echo.
echo ==========================================
echo    Update Complete!
echo ==========================================
pause
