param([string]$OutputRoot = 'dist-windows', [string]$JdkHome = $env:JAVA_HOME)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
if (-not [Environment]::Is64BitOperatingSystem -or $env:OS -ne 'Windows_NT') { throw 'Produrre il pacchetto su Windows x64.' }
$jar = Join-Path $repo 'backend\target\progetto-luce-0.1.0.jar'
if (-not (Test-Path -LiteralPath $jar)) { throw 'Prima compilare frontend e backend come indicato in docs/WINDOWS_PORTABILE.md.' }
if (-not [IO.Path]::IsPathRooted($OutputRoot)) { $OutputRoot = Join-Path $repo $OutputRoot }
$package = Join-Path $OutputRoot 'ProgettoLuce-Windows-x64'
if (Test-Path -LiteralPath $package) { throw 'Cartella di destinazione gia esistente: usare una nuova cartella per evitare di cancellare dati.' }
New-Item -ItemType Directory -Path (Join-Path $package 'app') -Force | Out-Null
Copy-Item -LiteralPath $jar -Destination (Join-Path $package 'app\progetto-luce.jar')
Copy-Item -Path (Join-Path $repo 'windows\*') -Destination $package
& "$JdkHome\bin\jlink.exe" --add-modules java.se,jdk.crypto.ec,jdk.unsupported,jdk.management,jdk.charsets,jdk.localedata --include-locales=en,it --strip-debug --no-header-files --no-man-pages --compress=2 --output (Join-Path $package 'runtime')
if ($LASTEXITCODE -ne 0) { throw 'Creazione runtime fallita.' }
# Temurin: includere anche eventuali DLL MSVC che non sono state copiate da jlink.
Get-ChildItem "$JdkHome\bin\*" -Include 'vcruntime*.dll','msvcp*.dll' | Copy-Item -Destination (Join-Path $package 'runtime\bin')
$revision = git -C $repo rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Revisione git non disponibile.' }
@("ProgettoLuce Windows x64", "Commit: $revision", "Creato UTC: $([DateTime]::UtcNow.ToString('o'))", "Java: $(Get-Content "$JdkHome\release" -Raw)") | Set-Content (Join-Path $package 'VERSIONE.txt') -Encoding UTF8
$zip = Join-Path $OutputRoot 'ProgettoLuce-Windows-x64.zip'
Compress-Archive -LiteralPath $package -DestinationPath $zip
(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash + '  ProgettoLuce-Windows-x64.zip' | Set-Content (Join-Path $OutputRoot 'SHA256.txt') -Encoding ASCII
Write-Host "Pacchetto creato: $zip"
