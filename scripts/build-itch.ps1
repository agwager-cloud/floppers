param(
  [Parameter(Mandatory = $true)]
  [string]$RenderUrl
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ReleaseDir = Join-Path $ProjectRoot 'release'
$StagingDir = Join-Path $ReleaseDir 'itch-staging'
$OutputZip = Join-Path $ReleaseDir 'Fosters-Floppers-itch.zip'

try {
  $uri = [System.Uri]$RenderUrl.TrimEnd('/')
} catch {
  throw 'RenderUrl must be a valid URL, for example https://fosters-floppers-server.onrender.com'
}

if ($uri.Scheme -ne 'https') {
  throw 'Use the HTTPS Render service URL. The itch.io client will connect using secure WSS.'
}

$wsUrl = "wss://$($uri.Authority)$($uri.AbsolutePath.TrimEnd('/'))"
Write-Host "Building Foster's Floppers for itch.io" -ForegroundColor Cyan
Write-Host "WebSocket server: $wsUrl" -ForegroundColor Yellow

Push-Location $ProjectRoot
$previousWsUrl = $env:VITE_WS_URL
try {
  $env:VITE_WS_URL = $wsUrl
  npm run build -w client
  if ($LASTEXITCODE -ne 0) { throw 'The client production build failed.' }

  if (Test-Path $StagingDir) { Remove-Item $StagingDir -Recurse -Force }
  New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null
  Copy-Item (Join-Path $ProjectRoot 'client\dist\*') $StagingDir -Recurse -Force

  $indexPath = Join-Path $StagingDir 'index.html'
  if (-not (Test-Path $indexPath)) { throw 'The itch.io package does not contain index.html at its root.' }

  $indexContents = Get-Content $indexPath -Raw
  if ($indexContents -match '(src|href)="/assets/') {
    throw 'The production build contains absolute asset paths. Check client/vite.config.ts base setting.'
  }

  if (Test-Path $OutputZip) { Remove-Item $OutputZip -Force }
  Compress-Archive -Path (Join-Path $StagingDir '*') -DestinationPath $OutputZip -CompressionLevel Optimal

  Write-Host ''
  Write-Host 'Itch.io ZIP created successfully:' -ForegroundColor Green
  Write-Host $OutputZip -ForegroundColor Green
  Write-Host ''
  Write-Host 'Upload this ZIP as an HTML Game. index.html is at the archive root.'
} finally {
  if ($null -eq $previousWsUrl) {
    Remove-Item Env:\VITE_WS_URL -ErrorAction SilentlyContinue
  } else {
    $env:VITE_WS_URL = $previousWsUrl
  }
  Pop-Location
}
