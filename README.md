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
docker compose up --build -d
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

### Test nel browser

Dopo `mvn package` nel backend:

```bash
cd frontend
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright avvia backend e frontend di test su porte 8081 e 5174, con database in memoria separato. Il test crea parametri, offerta e bolletta dall'interfaccia, verifica 77 € e 123 € di risparmio, riapre lo storico e controlla il layout a 390 px. Screenshot in `frontend/test-results/`, pubblicati anche come artefatti CI.

## Documentazione

- [Architettura e contratto API](docs/ARCHITETTURA.md)
- [Report della prima versione](docs/REPORT_FASE_1.md)

PDF, upload/OCR, confronto multi-offerta, dashboard KPI, autenticazione e ruoli sono fasi successive; non sono presenti in questa prima versione.
