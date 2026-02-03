$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutPath = [System.IO.Path]::Combine($startupFolder, "WheatMillStartup.lnk")
$workingDirectory = "d:\Wheat-Mill"
$scriptPath = Join-Path $workingDirectory "start_dev.ps1"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
$shortcut.WorkingDirectory = $workingDirectory
$shortcut.Description = "Starts Wheat-Mill Servers on Startup"
$shortcut.Save()

Write-Host "Success! Wheat-Mill will now start automatically when you log in." -ForegroundColor Green
Write-Host "Shortcut created in: $shortcutPath" -ForegroundColor Cyan
