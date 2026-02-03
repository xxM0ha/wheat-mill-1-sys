Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\Start Wheat-Mill Dev.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "powershell.exe"
oLink.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -Command ""& { $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); Set-Location 'd:\Wheat-Mill'; .\start_dev.ps1 }"""
oLink.WorkingDirectory = "d:\Wheat-Mill"
oLink.Description = "Start Wheat-Mill Development Servers"
oLink.IconLocation = "powershell.exe,0"
oLink.Save

WScript.Echo "Shortcut created on Desktop: Start Wheat-Mill Dev.lnk"
