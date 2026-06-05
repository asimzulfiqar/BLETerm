$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$release = Join-Path $root "release"
$unpacked = Join-Path $release "win-unpacked"
$zip = Join-Path $release "BLETerm-0.1.0-portable.zip"
$setup = Join-Path $release "BLETerm-Setup.exe"
$payloadZip = Join-Path $PSScriptRoot "bleterm-win-unpacked.zip"
$sed = Join-Path $PSScriptRoot "BLETerm-Setup.sed"

if (-not (Test-Path (Join-Path $unpacked "BLETerm.exe"))) {
  throw "Missing release\win-unpacked\BLETerm.exe. Build or restore the packaged app folder first."
}

Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $payloadZip -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $setup -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $release "~BLETerm-Setup.CAB") -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $release "~BLETerm-Setup.DDF") -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $release "~BLETerm-Setup.RPT") -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $release "~BLETerm-Setup_LAYOUT.INF") -Force -ErrorAction SilentlyContinue

Compress-Archive -Path (Join-Path $unpacked "*") -DestinationPath $zip -Force
Copy-Item -LiteralPath $zip -Destination $payloadZip -Force

$process = Start-Process -FilePath "iexpress.exe" -ArgumentList @("/N", "/Q", $sed) -PassThru
$process.WaitForExit()

$deadline = (Get-Date).AddMinutes(3)
while (-not (Test-Path $setup) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 2
}

if (-not (Test-Path $setup)) {
  throw "IExpress did not create $setup."
}

Get-Item $zip, $setup | Select-Object FullName, Length
