@echo off
setlocal
set "INSTALL_DIR=%LOCALAPPDATA%\Programs\BLETerm"
set "ZIP_FILE=%~dp0bleterm-win-unpacked.zip"

if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
mkdir "%INSTALL_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ZIP_FILE%' -DestinationPath '%INSTALL_DIR%' -Force"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\BLETerm.lnk'); $s.TargetPath='%INSTALL_DIR%\BLETerm.exe'; $s.WorkingDirectory='%INSTALL_DIR%'; $s.Save()"

start "" "%INSTALL_DIR%\BLETerm.exe"
endlocal
