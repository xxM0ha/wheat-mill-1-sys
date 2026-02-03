Write-Host "Stopping Wheat-Mill development servers..." -ForegroundColor Yellow

# Kill Django/Python processes
$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "Stopped Django server (python.exe)" -ForegroundColor Green
}

# Kill Node/Vite processes
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "Stopped Vite server (node.exe)" -ForegroundColor Green
}

Write-Host "All development servers stopped!" -ForegroundColor Green
Start-Sleep -Seconds 2
