param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

Write-Host "ProjectRoot: $ProjectRoot"
Set-Location $ProjectRoot

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm not found. Please install Node.js, then re-run."
}

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
  npm init -y | Out-Null
}

if (-not (Test-Path (Join-Path $ProjectRoot "node_modules\kuromoji"))) {
  npm install kuromoji | Out-Null
}

$src = Join-Path (Join-Path (Join-Path $ProjectRoot "node_modules") "kuromoji") "dict"
$dst = Join-Path $ProjectRoot "dict"

if (-not (Test-Path $src)) {
  throw "Dictionary folder not found: $src"
}

if (Test-Path $dst) {
  Remove-Item -Recurse -Force $dst
}

Copy-Item -Recurse -Force $src $dst
Write-Host "OK: created dict -> $dst"
