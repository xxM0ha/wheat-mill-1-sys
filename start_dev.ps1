Write-Host "Starting Wheat-Mill project in dev mode..." -ForegroundColor Green

Write-Host "Checking for updates from GitHub..." -ForegroundColor Yellow
git pull origin main

# Function to check if a URL is responding
function Test-UrlReady {
    param ($url, $maxAttempts = 30)
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        try {
            # Use -UseBasicParsing to avoid IE engine initialization overhead
            $response = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 1 -ErrorAction Stop -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                return $true
            }
        }
        catch {
            # URL not ready yet
        }
        $attempt++
        Start-Sleep -Milliseconds 300
    }
    return $false
}

# Backend Setup
Write-Host "--- Preparing Backend ---" -ForegroundColor Cyan
Push-Location backend

# Check if venv exists
if (-not (Test-Path ".\venv\Scripts\python.exe")) {
    Write-Host "Error: venv not found. Please create it first with: python -m venv venv" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Start Django Server in background (hidden window)
# Added --noreload to significantly speed up initial Django startup
Write-Host "Starting Django Server..."
$backendProcess = Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "manage.py", "runserver", "--noreload" -WorkingDirectory $PWD -WindowStyle Hidden -PassThru

Pop-Location

# Frontend Setup
Write-Host "--- Preparing Frontend ---" -ForegroundColor Cyan
Push-Location frontend

# Start Vite Server in background (hidden window)
Write-Host "Starting Vite Server..."
$frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $PWD -WindowStyle Hidden -PassThru

Pop-Location

# Wait for servers concurrently
Write-Host ""
Write-Host "Waiting for servers to be ready..." -ForegroundColor Cyan

$frontendReady = $false
$browserOpened = $false

# Quick check loop
for ($i = 0; $i -lt 30; $i++) {
    if (-not $frontendReady) {
        if (Test-UrlReady "http://localhost:5173" -maxAttempts 1) {
            $frontendReady = $true
            Write-Host "[OK] Vite server is ready. Opening browser..." -ForegroundColor Green
            Start-Process "http://localhost:5173"
            $browserOpened = $true
        }
    }
    
    # Check backend in background just for the console log
    if (Test-UrlReady "http://127.0.0.1:8000" -maxAttempts 1) {
        Write-Host "[OK] Django server is ready" -ForegroundColor Green
        break
    }
    
    Start-Sleep -Seconds 1
}

# Fallback open browser if it didn't open yet
if (-not $browserOpened) {
    Start-Process "http://localhost:5173"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Wheat-Mill is running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servers are running in the background." -ForegroundColor Yellow
Write-Host "To stop the servers, run stop_dev.ps1 or use Task Manager." -ForegroundColor Yellow

