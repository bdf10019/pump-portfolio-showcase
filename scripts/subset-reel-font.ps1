param([Parameter(Mandatory=$true)][string]$SourceFont)
$ErrorActionPreference = 'Stop'
$taskEntryRoot = Split-Path -Parent $PSScriptRoot
$taskFontSource = (Resolve-Path -LiteralPath $SourceFont).Path
$taskTextSources = @('reel.html','src/reel.ts','src/reel-contract.ts','src/reel-panels.ts')
$taskText = ($taskTextSources | ForEach-Object {Get-Content -LiteralPath (Join-Path $taskEntryRoot $_) -Raw -Encoding utf8}) -join "`n"
$taskCodes = (([char[]]$taskText | ForEach-Object {[int]$_} | Sort-Object -Unique) | ForEach-Object {'U+{0:X4}' -f $_}) -join ','
$taskFontOutput = Join-Path $taskEntryRoot 'public/assets/fonts/pump-wenkai-regular.woff'
# FontTools is a pre-existing local tool, not a new project dependency.
& pyftsubset $taskFontSource "--unicodes=$taskCodes" --flavor=woff "--output-file=$taskFontOutput" '--layout-features=*' '--name-IDs=*' '--name-languages=*' --notdef-glyph --notdef-outline
if ($LASTEXITCODE -ne 0) {throw '字型子集建立失敗'}
Get-Item -LiteralPath $taskFontOutput | Select-Object Name,Length
Get-FileHash -LiteralPath $taskFontSource -Algorithm SHA256
Get-FileHash -LiteralPath $taskFontOutput -Algorithm SHA256
