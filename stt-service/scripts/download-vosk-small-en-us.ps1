$ErrorActionPreference = "Stop"

$serviceRoot = Split-Path -Parent $PSScriptRoot
$modelsDir = Join-Path $serviceRoot "models"
$modelName = "vosk-model-small-en-us-0.15"
$zipPath = Join-Path $modelsDir "$modelName.zip"
$modelPath = Join-Path $modelsDir $modelName
$url = "https://alphacephei.com/vosk/models/$modelName.zip"

New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null

if (Test-Path -LiteralPath $modelPath) {
    Write-Host "Model already exists: $modelPath"
    exit 0
}

Write-Host "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "Extracting $zipPath"
Expand-Archive -LiteralPath $zipPath -DestinationPath $modelsDir -Force

Remove-Item -LiteralPath $zipPath -Force
Write-Host "Model ready: $modelPath"
