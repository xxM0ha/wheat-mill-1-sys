$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutPath = [System.IO.Path]::Combine($startupFolder, "WheatMillStartup.lnk")

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath
    Write-Host "Wheat-Mill has been removed from startup." -ForegroundColor Yellow
} else {
    Write-Host "Wheat-Mill was not found in the startup folder." -ForegroundColor Gray
}
