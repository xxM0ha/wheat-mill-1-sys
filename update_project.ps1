# Wheat-Mill Project Update Script

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Updating Wheat-Mill Project" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Pull from Git
Write-Host "`n[1/3] Pulling latest changes from GitHub..." -ForegroundColor Yellow
git pull origin main

# 2. Update Backend
Write-Host "`n[2/3] Checking for backend updates..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
$venvActivate = Join-Path $backendPath "venv\Scripts\Activate.ps1"

if (Test-Path $venvActivate) {
    Set-Location $backendPath
    & $venvActivate
    Write-Host "Updating Python dependencies..." -ForegroundColor Gray
    pip install -r requirements.txt
    Write-Host "Applying database migrations..." -ForegroundColor Gray
    python manage.py migrate
    deactivate
    Set-Location $PSScriptRoot
} else {
    Write-Host "Virtual environment not found, skipping backend update." -ForegroundColor Red
}

# 3. Update Frontend
Write-Host "`n[3/3] Checking for frontend updates..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"

if (Test-Path (Join-Path $frontendPath "node_modules")) {
    Set-Location $frontendPath
    Write-Host "Updating Node dependencies..." -ForegroundColor Gray
    npm install
    Set-Location $PSScriptRoot
} else {
    Write-Host "Node modules not found, skipping frontend update." -ForegroundColor Red
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "   Update Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

Read-Host -Prompt "Press Enter to exit"
