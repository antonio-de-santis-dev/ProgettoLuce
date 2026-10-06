# ProgettoLuce

Applicazione nuova per consulenti energetici: offerte, bollette clienti, parametri del gestore e confronto dei costi con dettaglio delle righe. Il progetto usa SimulatoreBolette esclusivamente come riferimento funzionale; il codice applicativo è stato scritto da zero.

## Cosa funziona

- Creazione, modifica, ricerca, attivazione e cancellazione offerte.
- Prezzo fisso e indicizzato PUN, con tariffe monorarie, biorarie e triorarie.
- Generazione delle voci energia e PCV nel backend, persistenza e aggiornamento senza orfani.
- Bollette con consumi F1/F2/F3 per ogni mese, PUN esplicito per fascia e altre partite.
- Configurazione dei parametri di trasporto, oneri, dispacciamento, perdite e accisa.
- Confronto sullo stesso consumo, grafico dei costi, righe di calcolo e stima annuale indicativa.
- Storico con snapshot immutabili di bolletta, offerta, parametri e risultato.
- Download PDF del confronto, disponibile nel risultato e nello storico.
- Controllo della versione sugli aggiornamenti e validazione degli input.

## Avvio rapido, senza installare PostgreSQL

Prerequisiti: **Java 17, Maven 3.6.3+ e Node.js 24**.

Primo terminale:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

Secondo terminale:

```bash
cd frontend
npm ci
npm run dev
```

Apri **http://localhost:5173**. API su http://localhost:8080.

Il profilo `demo` usa H2 su file in `backend/data`: i dati sopravvivono ai riavvii. È una modalità locale, non il database di produzione. Nessuna offerta o tariffa viene precaricata automaticamente.

Puoi anche avviare entrambi con `bash avvia-demo.sh`. Lo script controlla i prerequisiti e ferma i processi avviati quando premi Ctrl+C.

### Un esempio per provare il flusso

Con il backend in esecuzione:

```bash
python3 scripts/carica-esempio.py
```

Lo script crea dati **sintetici** riconoscibili. Se esiste già un profilo parametri, non lo sovrascrive. Scegli dal frontend la bolletta e l'offerta di esempio e premi **Calcola confronto**.

Con il profilo sintetico a zero: 600 kWh × 0,10 €/kWh + 120 €/anno ÷ 12 = **70 € imponibili**, 10% IVA = **77 € totale**, contro 200 € fatturati = **123 € risparmio del mese**. Questi numeri sono un caso di test, non un'offerta di mercato.

## Avvio con PostgreSQL e Docker Compose

Prerequisito: Docker con Compose v2.

```bash
cp .env.example .env
# Modifica DB_PASSWORD nel file .env
docker compose up --build -d --wait
```

Apri **http://localhost:8088**. Frontend e API condividono l'origine grazie a Nginx. PostgreSQL usa un volume persistente; backend e database non espongono porte sull'host.

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```

Il frontend è esposto sull'interfaccia locale. Autenticazione e pubblicazione Internet non fanno parte di questa fase.

### Backend locale su un PostgreSQL esistente

```bash
cd backend
export DB_URL='jdbc:postgresql://localhost:5432/progettoluce'
export DB_USER='luce'
export DB_PASSWORD='la-tua-password'
mvn spring-boot:run
```

Il database deve esistere ed essere accessibile. Flyway crea le tabelle con `V1__schema_iniziale.sql`; Hibernate verifica lo schema, senza modificarlo.

## Prima consulenza

1. **Parametri gestore:** inserisci valori applicabili alla fornitura, nome profilo e fonte. Tutti i valori sono espliciti, anche gli zeri.
2. **Offerte:** crea un'offerta. PCV espresso in €/anno; prezzi e spread in €/kWh, perdite escluse.
3. **Bollette clienti:** inserisci cliente, POD, potenza, totale e consumi mensili. Per un'offerta indicizzata inserisci il PUN delle fasce utilizzate.
4. **Confronto:** seleziona bolletta e offerta attiva. Il risultato viene salvato automaticamente.
5. **Storico:** riapri un risultato anche se le condizioni commerciali sono cambiate.

## Scaricare il risultato in PDF

Nel menu apri **Impostazioni PDF**: scegli uno dei quattro stili (Classico, Essenziale, Editoriale, Sintesi cliente), il colore, il logo PNG/JPEG e i recapiti del consulente. Premi **Salva impostazioni PDF**: la configurazione è salvata nel database e applicata automaticamente a ogni download, anche dallo storico e da altri browser. Le modifiche non salvate sono una bozza.

L’anteprima a destra usa un documento dimostrativo, disponibile anche senza confronti. Mostra **un foglio A4 intero alla volta**, con frecce precedente/successiva. Su mobile l’anteprima è sotto i controlli.

Dopo **Calcola confronto**, premi **Scarica PDF**. Lo stesso pulsante è disponibile nello **Storico**, dopo aver aperto un confronto. Non occorre scegliere nuovamente lo stile. La migration Flyway V2 crea automaticamente la tabella delle impostazioni all’avvio: conserva il volume PostgreSQL esistente.

Il documento A4 contiene cliente/POD, offerta, periodo, importi e risparmio, proiezione annuale indicativa, dettaglio delle righe, consumi/PUN e parametri utilizzati. Include font incorporati, intestazione e numeri di pagina. Usa i dati salvati del confronto: modifica o cancellazione delle condizioni originali non cambiano il documento. Le cifre vengono formattate per la stampa, senza ripetere il calcolo.

Endpoint: `GET /api/confronti/{id}/pdf` per il report con le impostazioni salvate e `POST /api/confronti/{id}/pdf` con opzioni grafiche per il report personalizzato, risposta `application/pdf` e nome `confronto-{id}.pdf`. I font DejaVu e la loro licenza sono inclusi nel backend; non servono browser o programmi PDF installati sul server.

## Regole e limiti del modello iniziale

Questo è un **simulatore parametrico**, non un motore certificato di fatturazione ARERA.

- Periodi composti da 1–12 mesi interi consecutivi; periodi parziali non implementati.
- Per ogni fascia si applicano le perdite alla quantità. Con il flag Excel, le perdite sono arrotondate a kWh interi per fascia.
- Per un indicizzato: `(PUN del mese e della fascia + spread) × kWh con perdite`. PUN mancante = errore, senza fallback.
- PCV annuale diviso per 12; quota potenza di trasporto in €/kW/anno divisa per 12.
- Trasporto variabile, oneri variabili e accisa usano i kWh netti. Dispacciamento usa i kWh con perdite.
- Accisa uniforme configurabile. Esenzioni, scaglioni, residenza e aliquote IVA miste non sono ancora modellati.
- IVA: unica aliquota della bolletta, applicata all'imponibile arrotondato. Altre partite imponibili prima dell'IVA, esenti dopo.
- Altre partite riportate sul costo proposto: valuta manualmente se una voce è davvero trasferibile. Il caso va trattato separatamente se non lo è.
- Stima annuale = risparmio periodo × 12 / mesi, senza stagionalità o previsione del PUN.
- Tutta la logica economica Java usa `BigDecimal`. Le API espongono decimali come stringhe; il browser li conserva come tali. Le conversioni numeriche del grafico servono solo alla visualizzazione.

## Test

```bash
cd backend
mvn verify
```

```bash
cd frontend
npm ci
npm test
npm run build
```

La CI esegue anche la suite backend su PostgreSQL reale. I test locali usano H2 in modalità PostgreSQL, le migration Flyway e `ddl-auto=validate`. La configurazione usa il mock maker subclass, perché non sono richiesti mock di classi finali o metodi statici e non serve un agent JVM.

Il job `compose` costruisce le immagini effettive, attende gli healthcheck e prova frontend, bundle, fallback SPA e API passando da Nginx. Crea il confronto sintetico da 77 € / 123 €, ricrea i container conservando il volume PostgreSQL e verifica che offerte, bollette e snapshot rimangano disponibili. I dati e il volume di questa prova sono isolati nel runner CI e rimossi al termine. Gli header di sicurezza vengono verificati su pagine, asset e API.

### Test nel browser

Dopo `mvn package` nel backend:

```bash
cd frontend
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright avvia backend e frontend di test su porte 8081 e 5174, con database in memoria separato. Il test crea parametri, offerta e bolletta dall'interfaccia, verifica 77 € e 123 € di risparmio, riapre lo storico e controlla il layout a 390 px. Screenshot in `frontend/test-results/`, pubblicati anche come artefatti CI.

## Documentazione

- [Architettura e contratto API](docs/ARCHITETTURA.md)
- [Report della prima versione](docs/REPORT_FASE_1.md)
- [PDF del risultato: implementazione e verifiche](docs/REPORT_PDF.md)
- [Editor PDF: stili, personalizzazione e verifiche](docs/REPORT_EDITOR_PDF.md)

Upload/OCR, confronto multi-offerta, dashboard KPI, autenticazione e ruoli sono fasi successive. La generazione del PDF del risultato è disponibile; il caricamento e la lettura automatica di bollette PDF non sono ancora implementati.
