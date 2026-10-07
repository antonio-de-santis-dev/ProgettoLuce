# Versione portabile Windows

Pacchetto per Windows 10/11 x64 (Intel/AMD), sul branch `simulatore-business`.
Distribuzione ZIP con runtime Temurin 17.0.20+8 incluso, JAR Spring Boot con interfaccia
React compilata, H2 persistente, launcher PowerShell 5.1 e istruzioni.
Non richiede installazioni o diritti amministratore. Non destinato a Windows ARM/32 bit.

## Utilizzo

Estrarre tutto lo ZIP in una cartella scrivibile, poi aprire `Avvia ProgettoLuce.cmd`.
Il browser si apre su `http://127.0.0.1:8088`. Chiudere con `Ferma ProgettoLuce.cmd`.
I dati si conservano in `data/luce-business.mv.db`; log in `logs/`.
Lo ZIP parte vuoto, senza dati personali. `DATI-DI-TEST.txt` contiene
un caso sintetico da inserire a mano (totale 92,72 euro, differenza 107,28 euro).

Il profilo `portable` limita l'ascolto a localhost. Frontend e API usano la stessa porta.
Le route React note hanno fallback su index.html, senza intercettare API inesistenti.
L'arresto e abilitato soltanto per questo profilo e protetto da un token casuale per
sessione; il launcher verifica processo e istanza prima di arrestare. Non termina
altri processi Java. La chiusura e controllata, senza taskkill forzato.

Simulazioni e PDF sono disponibili offline. Tariffe e PUN sono inseriti manualmente.
Per modificare le tariffe, la chiave locale predefinita è `demo-business-local`.
La versione H2 serve ai test locali e non sostituisce la verifica PostgreSQL in CI.
Il database business è separato da quello domestico.
I criteri di esecuzione aziendali possono bloccare gli script: rivolgersi al responsabile IT.

## Backup e aggiornamenti

Arrestare prima, poi copiare l'intera cartella come backup. Per aggiornare sostituire
app, runtime e launcher, conservando data. Non sovrascrivere i dati con quelli delle
cartelle utilizzate per i test CI e non aprire il database con versioni precedenti
alle migrazioni applicate. Non spostare la cartella mentre il servizio gira.

## Build su Windows (solo sviluppatore)

Richiede JDK Temurin 17 x64, Maven, Node 24 e Git. Il collega non li deve installare.

```powershell
cd frontend
npm ci
npm run build
cd ..
New-Item -ItemType Directory -Force backend/src/main/resources/static
Copy-Item -Recurse frontend/dist/* backend/src/main/resources/static/
mvn -B -f backend/pom.xml verify
./scripts/package-windows.ps1
```

Il runtime viene prodotto con jlink (Java SE, TLS EC, management, charset e locale italiano).
Le licenze Java rimangono in runtime/legal; revisione e versione in VERSIONE.txt.
La cartella di output deve essere nuova: lo script non cancella cartelle esistenti.

## Verifica automatica

Il workflow `Pacchetto Windows portabile` compila e testa su Windows, poi estrae lo ZIP
in un percorso con spazi/accenti e usa PowerShell 5.1. Verifica avvio ripetuto, porta
occupata, rifiuto shutdown senza token, API, calcolo business, PDF e storico dopo
arresto/riavvio. Esegue anche la suite browser desktop/mobile sul pacchetto reale.
Il pacchetto pubblicato non e la copia in cui sono stati inseriti i dati di test.
La CI ordinaria continua a verificare Docker e PostgreSQL.
