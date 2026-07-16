$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Stopping local Node processes so Windows can remove the incomplete install..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

if (Test-Path "node_modules") {
  Write-Host "Removing incomplete node_modules..." -ForegroundColor Cyan
  cmd /c "rmdir /s /q node_modules"
}

Write-Host "Installing from the public npm registry..." -ForegroundColor Cyan
npm install --registry=https://registry.npmjs.org/
if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }

Write-Host "`nInstall complete. Starting Foster's Floppers..." -ForegroundColor Green
npm run dev
