param(
    [ValidateSet('Start','Stop')][string]$Action = 'Start',
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$stateFile = Join-Path $root 'data\session.json'
$baseUrl = 'http://127.0.0.1:8088'
# Serializza doppi clic contemporanei per questa cartella, senza richiedere privilegi.
$hash = [System.Security.Cryptography.SHA256]::Create()
$key = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant()))).Replace('-', '')
$mutex = New-Object System.Threading.Mutex($false, "Local\ProgettoLuce-$key")
$locked = $false

function Read-State {
    if (Test-Path -LiteralPath $stateFile) {
        return Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    }
    return $null
}
function Get-OwnedProcess($state) {
    if ($null -eq $state) { return $null }
    $process = Get-Process -Id $state.ProcessId -ErrorAction SilentlyContinue
    if ($null -eq $process) { return $null }
    $expected = Join-Path $root 'runtime\bin\java.exe'
    if ($process.Path -ne $expected -or $process.StartTime.ToUniversalTime().Ticks.ToString() -ne $state.StartTicks) {
        throw 'Il PID salvato appartiene a un altro processo. Nessun processo e stato arrestato. Controllare data\session.json.'
    }
    return $process
}
function Test-Ready($state) {
    try {
        $status = Invoke-RestMethod "$baseUrl/portable/status" -TimeoutSec 2
        $health = Invoke-RestMethod "$baseUrl/actuator/health" -TimeoutSec 2
        return $status.instance -eq $state.Instance -and $health.status -eq 'UP'
    } catch { return $false }
}
function Wait-Ready($state) {
    for ($i=0; $i -lt 120; $i++) {
        if ($null -eq (Get-OwnedProcess $state)) { throw 'Avvio non riuscito. Consultare logs\app.log e logs\error.log.' }
        if (Test-Ready $state) { return }
        Start-Sleep -Seconds 1
    }
    throw 'Avvio ancora in corso o bloccato: consultare logs\app.log. Usare Ferma ProgettoLuce prima di riprovare.'
}
try {
    try { $locked = $mutex.WaitOne(1000) } catch [System.Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { throw 'Un altro avvio o arresto e gia in corso. Attendere e riprovare.' }
    $state = Read-State
    $process = Get-OwnedProcess $state
    if ($Action -eq 'Stop') {
        if ($null -eq $process) {
            Remove-Item -LiteralPath $stateFile -ErrorAction SilentlyContinue
            Write-Host 'ProgettoLuce e gia fermo.'
            exit 0
        }
        if (-not (Test-Ready $state)) {
            throw 'Il servizio non risponde ancora. Attendere che termini l’avvio e riprovare; consultare i log in caso di errore.'
        }
        Invoke-RestMethod "$baseUrl/portable/shutdown" -Method Post -Headers @{'X-Luce-Token'=$state.Token} -TimeoutSec 5 | Out-Null
        if (-not $process.WaitForExit(45000)) { throw 'Arresto non completato: controllare i log. Nessun altro processo e stato terminato.' }
        Remove-Item -LiteralPath $stateFile -ErrorAction SilentlyContinue
        Write-Host 'ProgettoLuce fermato. I dati sono conservati nella cartella data.'
        exit 0
    }
    if ($null -ne $process) {
        Wait-Ready $state
        Write-Host 'ProgettoLuce e gia aperto.'
        if (-not $NoBrowser) { Start-Process "$baseUrl/" }
        exit 0
    }
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback,8088)
    try { $listener.Start() } catch { throw 'La porta 8088 e occupata. Chiudere l’altra applicazione o un’altra copia di ProgettoLuce e riprovare.' }
    finally { $listener.Stop() }
    foreach ($folder in @('data','logs')) {
        New-Item -ItemType Directory -Force -Path (Join-Path $root $folder) | Out-Null
    }
    $java = Join-Path $root 'runtime\bin\java.exe'
    $jar = Join-Path $root 'app\progetto-luce.jar'
    if (-not (Test-Path -LiteralPath $java) -or -not (Test-Path -LiteralPath $jar)) {
        throw 'Pacchetto incompleto. Estrarre tutto lo ZIP, non soltanto i file di avvio.'
    }
    $token = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $instance = [Guid]::NewGuid().ToString()
    $oldToken = $env:LUCE_PORTABLE_TOKEN
    $oldInstance = $env:LUCE_PORTABLE_INSTANCE
    try {
        $env:LUCE_PORTABLE_TOKEN = $token
        $env:LUCE_PORTABLE_INSTANCE = $instance
        $process = Start-Process -FilePath $java -ArgumentList @('-Xms64m','-Xmx512m','-Dfile.encoding=UTF-8','-jar',('"' + $jar + '"'),'--spring.profiles.active=portable') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $root 'logs\app.log') -RedirectStandardError (Join-Path $root 'logs\error.log')
    } finally {
        $env:LUCE_PORTABLE_TOKEN = $oldToken
        $env:LUCE_PORTABLE_INSTANCE = $oldInstance
    }
    $state = @{ProcessId=$process.Id; StartTicks=$process.StartTime.ToUniversalTime().Ticks.ToString(); Token=$token; Instance=$instance}
    $state | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
    Write-Host 'Avvio di ProgettoLuce in corso...'
    Wait-Ready $state
    Write-Host "ProgettoLuce pronto: $baseUrl"
    if (-not $NoBrowser) { Start-Process "$baseUrl/" }
    exit 0
} catch {
    Write-Host ('ERRORE: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
