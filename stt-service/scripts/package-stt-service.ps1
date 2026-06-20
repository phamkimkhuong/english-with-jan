param(
  [string]$DestinationPath = "C:\tmp\english-with-jan-stt-service.zip"
)

$ErrorActionPreference = "Stop"
$serviceRoot = Split-Path -Parent $PSScriptRoot
$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("english-with-jan-stt-package-" + [System.Guid]::NewGuid().ToString("N"))

try {
  New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null

  foreach ($directory in @("app", "deploy", "scripts")) {
    Copy-Item -LiteralPath (Join-Path $serviceRoot $directory) -Destination (Join-Path $stagingRoot $directory) -Recurse -Force
  }

  foreach ($file in @(".env.example", "README.md", "requirements.txt")) {
    Copy-Item -LiteralPath (Join-Path $serviceRoot $file) -Destination (Join-Path $stagingRoot $file) -Force
  }

  Get-ChildItem -LiteralPath $stagingRoot -Recurse -Directory -Force |
    Where-Object { $_.Name -eq "__pycache__" -or $_.Name -eq ".pytest_cache" -or $_.Name -eq ".mypy_cache" } |
    Remove-Item -Recurse -Force

  Get-ChildItem -LiteralPath $stagingRoot -Recurse -File -Force |
    Where-Object { $_.Extension -in @(".pyc", ".pyo") } |
    Remove-Item -Force

  $destinationDirectory = Split-Path -Parent $DestinationPath
  if ($destinationDirectory) {
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
  }

  if (Test-Path -LiteralPath $DestinationPath) {
    try {
      Remove-Item -LiteralPath $DestinationPath -Force
    }
    catch {
      $baseName = [System.IO.Path]::GetFileNameWithoutExtension($DestinationPath)
      $extension = [System.IO.Path]::GetExtension($DestinationPath)
      $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
      $DestinationPath = Join-Path $destinationDirectory "$baseName-$timestamp$extension"
      Write-Warning "Default destination is locked. Writing package to $DestinationPath instead."
    }
  }

  Compress-Archive -Path (Join-Path $stagingRoot "*") -DestinationPath $DestinationPath -Force
  Get-Item -LiteralPath $DestinationPath | Select-Object FullName, Length, LastWriteTime
}
finally {
  if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  }
}