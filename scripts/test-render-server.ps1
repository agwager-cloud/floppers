param(
  [Parameter(Mandatory = $true)]
  [string]$RenderUrl
)

$ErrorActionPreference = 'Stop'
$healthUrl = "$($RenderUrl.TrimEnd('/'))/health"
Write-Host "Checking $healthUrl" -ForegroundColor Cyan
Write-Host 'A sleeping free service can take about one minute to respond.' -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 90
$response | ConvertTo-Json -Depth 4
