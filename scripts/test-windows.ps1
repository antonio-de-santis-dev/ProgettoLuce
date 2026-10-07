param([Parameter(Mandatory=$true)][string]$Package)
$ErrorActionPreference = 'Stop'
$env:BUSINESS_ADMIN_TOKEN = 'demo-business-local'
$repo = Split-Path $PSScriptRoot -Parent
$launcher = Join-Path $Package 'Launcher.ps1'
# I launcher devono funzionare con PowerShell 5.1 incluso in Windows.
function Launch($action) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Action $action -NoBrowser
    if ($LASTEXITCODE -ne 0) { throw "Launcher $action fallito" }
}
try {
    Launch 'Start'
    $state = Get-Content (Join-Path $Package 'data\session.json') -Raw | ConvertFrom-Json
    Launch 'Start'
    $state2 = Get-Content (Join-Path $Package 'data\session.json') -Raw | ConvertFrom-Json
    if ($state.ProcessId -ne $state2.ProcessId) { throw 'Il secondo avvio ha creato un altro processo.' }
    try {
        Invoke-RestMethod 'http://127.0.0.1:8088/portable/shutdown' -Method Post -Headers @{'X-Luce-Token'='incorrect'}
        throw 'Arresto non autorizzato accettato!'
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw }
    }
    # Una seconda copia non deve arrestare o utilizzare l'istanza gia aperta.
    $copy = Join-Path (Split-Path $Package -Parent) 'seconda copia'
    New-Item -ItemType Directory -Path $copy | Out-Null
    Copy-Item -LiteralPath $launcher -Destination $copy
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $copy 'Launcher.ps1') -NoBrowser
    if ($LASTEXITCODE -eq 0) { throw 'La seconda copia non ha segnalato la porta occupata.' }
    $status = Invoke-RestMethod 'http://127.0.0.1:8088/portable/status'
    if ($status.instance -ne $state.Instance) { throw 'Istanza originale alterata.' }
    python "$repo\scripts\carica-esempio.py" http://127.0.0.1:8088/api
    if ($LASTEXITCODE -ne 0) { throw 'Caricamento esempio fallito' }
    $snapshot = Join-Path $Package 'snapshot-test.json'
    python "$repo\scripts\verifica-compose.py" crea $snapshot
    if ($LASTEXITCODE -ne 0) { throw 'Verifica API/PDF fallita' }
    Launch 'Stop'
    Launch 'Stop'
    Launch 'Start'
    python "$repo\scripts\verifica-compose.py" verifica $snapshot
    if ($LASTEXITCODE -ne 0) { throw 'Persistenza dati non verificata' }
} finally {
    Launch 'Stop'
}
