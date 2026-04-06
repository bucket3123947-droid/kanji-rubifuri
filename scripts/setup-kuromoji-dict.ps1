param(
  [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
)

$ErrorActionPreference = "Stop"

Write-Host "ProjectRoot: $ProjectRoot"
Set-Location $ProjectRoot

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm が見つかりません。Node.js をインストールしてから再実行してください。"
}

if (-not (Test-Path "$ProjectRoot\package.json")) {
  npm init -y | Out-Null
}

if (-not (Test-Path "$ProjectRoot\node_modules\kuromoji")) {
  npm install kuromoji | Out-Null
}

$src = Join-Path $ProjectRoot "node_modules\kuromoji\dict"
$dst = Join-Path $ProjectRoot "dict"

if (-not (Test-Path $src)) {
  throw "辞書フォルダが見つかりません: $src"
}

if (Test-Path $dst) {
  Remove-Item -Recurse -Force $dst
}

Copy-Item -Recurse -Force $src $dst
Write-Host "OK: dict を作成しました -> $dst"
