# ProgettoLuce Business

Simulatore locale della fornitura elettrica per imprese, sviluppato sul branch **simulatore-business** a partire da `windows-portabile` (`9060e1e`). Interfaccia e motore business separati dalla versione domestica; nessun merge su main.

## Funzioni

- Ragione sociale, POD, partita IVA facoltativa, potenza, fattura precedente e 1–12 mesi consecutivi.
- Consumi F1/F2/F3 e profilo tariffario distinto per mese.
- Energia fissa o PUN + spread con indici espliciti in €/kWh.
- Perdite configurabili, anche ROUND a kWh interi per fascia.
- Trasporto/oneri per kWh, quote fisse e quote di potenza in €/kW/mese o €/kW/anno.
- IVA per singola voce, riepilogo per aliquota, altre partite imponibili/esenti e accrediti.
- Profili con decorrenza, scadenza, fonte, verifica interna e revisioni.
- Modifica tariffe protetta da chiave amministratore; versione obsoleta = 409.
- Risultato, categorie, incidenze, differenza e annualizzazione; storico paginato e PDF da snapshot.

## Avvio locale senza Docker

Prerequisiti: **Java 17 JDK, Maven 3.6.3+ e Node.js 24**.

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

In un secondo terminale:

```bash
cd frontend
npm ci
npm run dev
```

Apri **http://localhost:5173**. Il backend demo ascolta soltanto su `127.0.0.1:8080`; il database H2 persistente usa `backend/data/luce-business`, distinto da quello domestico.

In **Offerte e tariffe**, premi **Sblocca tariffe**. Per la sola demo locale la chiave predefinita è `demo-business-local`. Per impostarne una personale, esporta `BUSINESS_ADMIN_TOKEN` prima di avviare il backend. Non inviare né committare la chiave. Nel frontend rimane in memoria soltanto per quella pagina/sessione e il server la verifica a ogni modifica.

Lo script `bash avvia-demo.sh` può avviare entrambi i servizi se i prerequisiti sono disponibili.

## Docker e PostgreSQL

```bash
cp .env.example .env
# Imposta DB_PASSWORD e BUSINESS_ADMIN_TOKEN, con valori diversi e non vuoti.
docker compose -p luce-business up --build -d --wait
```

Apri **http://localhost:8088**. Il progetto `luce-business` usa un volume separato. Prima libera la porta se il programma domestico o il pacchetto Windows la stanno usando. Non sono richieste nuove porte per il simulatore.

```bash
docker compose -p luce-business logs -f backend
docker compose -p luce-business down
```

Non aggiungere `--volumes` se vuoi conservare i dati. Per esporre l'applicazione come servizio pubblico occorrono utenti, autorizzazione sulle simulazioni e isolamento fra consulenti: la chiave protegge le tariffe, non costituisce un sistema multiutente.

## Prima simulazione

1. Crea un profilo in **Offerte e tariffe**, indicando prezzi, unità, fonti e decorrenza. Il modello è una bozza: corrispettivi zero, aliquota 22% e perdite 10% sono campi modificabili, non tariffe certificate.
2. Verifica separatamente energia e perdite: lo stesso prezzo deve essere impostato su entrambe se così previsto dal contratto. Evita di aggiungere perdite già comprese in una voce.
3. Imposta le quote business anche in potenza. Le quote annuali vengono divise per 12 dal motore.
4. Nel **Simulatore**, inserisci dati dell'impresa, potenza, importo precedente e consumi; scegli un profilo valido per ciascun mese.
5. Controlla quote fisse e fiscalità; conferma che la fattura precedente sia confrontabile. Premi **Calcola e salva simulazione**.
6. Consulta risultato, IVA, dettaglio mensile e righe. Scarica il PDF o riapri il risultato nello **Storico**.

Per un caso sintetico, con backend acceso:

```bash
python3 scripts/carica-esempio.py
```

Il caso crea gennaio con consumi/quote zero e febbraio con 600 kWh, perdite 10%, prezzo 0,10 €/kWh, PCV 120 €/anno e IVA 22%: imponibile **76 €**, totale **92,72 €**, differenza contro 200 € **107,28 €**, annualizzazione su due mesi **643,68 €**. I dati sono esclusivamente di test. Lo script crea nuovi record a ogni esecuzione. Con Docker indica `http://127.0.0.1:8088/api` ed esporta la chiave amministratore del tuo `.env`.

## Scelte rispetto alla specifica

La specifica allegata descrive un Excel ma non contiene tutti i corrispettivi originali. Il motore non inventa quelle tariffe e non riproduce riferimenti come `F80129` o `K132`. Ogni aliquota è esplicita, comprese le differenze 10%/22%.

Gli aggregati descritti nel documento, **1.434,15 € imponibili + 315,51 € IVA**, producono **1.749,66 €**, non 1.757,98 €. Rimane una differenza di **8,32 €** da spiegare nel workbook originale. Il test usa quei subtotali come fixture aggregata, non come ricostruzione delle tariffe Excel. Con fattura precedente 1.811,79 €, quel caso riconciliato dà 62,13 € di differenza e 372,78 € annualizzati.

“Verificato internamente” indica una verifica annotata dall'amministratore; non è certificazione fiscale. Un profilo non verificato rimane utilizzabile per simulazioni, con stato **Bozza** su UI, storico e PDF.

## Regole e limiti

- Righe a otto decimali, `HALF_UP`. Le basi vengono sommate e arrotondate a centesimi **per aliquota**, poi l'IVA è calcolata per ciascuna base. Totale = basi arrotondate + IVA + partite esenti.
- Le percentuali di incidenza delle categorie sono sul totale IVA inclusa. Le categorie sono importi prima dell'IVA e le altre partite includono gli esenti; la quota IVA completa la composizione.
- Mesi interi consecutivi: non si calcolano prorata giornalieri, scaglioni/esenzioni accisa o fiscalità automaticamente. Le voci e le aliquote vanno configurate e verificate per la fornitura.
- Il controllo delle quote mensili riguarda tutte le quote fisse/di potenza; non offre prorata diversi per ogni componente.
- PUN inserito per mese/fascia: nessun fallback automatico a valori domestici o indici stimati.
- La partita IVA è controllata nel formato, non nel checksum o nel registro fiscale.
- Annualizzazione = differenza × 12 / mesi. Per due mesi equivale a ×6; non è una previsione.
- Input e profili sono conservati nel risultato; modificare le tariffe non cambia lo storico. I PDF sono generati da questi dati, senza ricalcolo.

## Test

```bash
mvn -f backend/pom.xml verify
cd frontend
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

La CI verifica anche PostgreSQL e Compose con dati sintetici. I test precedenti del motore domestico restano come regressione nel repository; i suoi controller sono abilitati soltanto con il profilo `domestico` e non sono esposti nell'avvio business standard. La UI domestica è conservata come riferimento in `DomesticApp.tsx`, non è la UI dell'app avviata.

## Windows

Il workflow **Pacchetto Windows portabile** costruisce frontend e backend, incorpora la UI nel JAR, crea il runtime Java e verifica launcher, API, PDF, persistenza e browser su Windows. È attivato anche dai push su `simulatore-business`. Il profilo portable conserva H2 in `data/luce-business` e apre `http://127.0.0.1:8088`. Le istruzioni di packaging sono in `docs/WINDOWS_PORTABILE.md`; lo ZIP deve essere estratto interamente.

## Documentazione tecnica

Vedi [specifica e contratto del modulo business](docs/BUSINESS.md). I vecchi report del progetto domestico documentano il riferimento di partenza, non le nuove schermate business.
