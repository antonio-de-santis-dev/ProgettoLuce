# Progetto Luce Business

Versione per imprese sul branch `simulatore-business`, con le stesse sezioni,
la stessa grafica e lo stesso flusso del programma domestico. Docker sulla porta
**8089**, progetto e volume separati (`luce-business`). Nessuna chiave amministratore.

## Avvio

```bash
git fetch origin
git switch simulatore-business
git pull --ff-only origin simulatore-business
docker compose up --build -d --wait
```

Apri **http://localhost:8089**. Se parti da zero, copia `.env.example` in `.env`
e imposta `DB_PASSWORD`. Se hai già un `.env`, conserva le impostazioni: puoi
aggiungere `BUSINESS_PORT=8089`; la vecchia `FRONTEND_PORT` non viene usata.
`BUSINESS_ADMIN_TOKEN` non serve più, non viene letto e può essere eliminato.
Non impostare `COMPOSE_PROJECT_NAME` uguale al progetto domestico.

```bash
docker compose logs -f backend
docker compose down
```

Non aggiungere `--volumes` per conservare i dati. Docker mantiene frontend e API
sulla stessa porta; backend e PostgreSQL restano nella rete interna. Il programma
domestico può continuare sulla porta 8088. Lo stack è un workspace locale condiviso.

## Le sette sezioni

| Sezione | Funzione |
| --- | --- |
| Confronto | Seleziona una bolletta salvata e un'offerta attiva, calcola e conserva il confronto. |
| Bollette clienti | Ragione sociale, partita IVA, POD, fornitore, potenza, totale precedente, IVA, altre partite e consumi mensili. |
| Offerte | Fornitore, nome, prezzo fisso/PUN+spread, monoraria/bioraria/trioraria, PCV e stato attivo. |
| Parametri gestore | Perdite, dispacciamento, trasporto fisso/potenza/energia, oneri fissi/potenza/energia e accisa. |
| Fonti ufficiali | Consultazione, sincronizzazione, indici PUN, riferimenti e revisioni delle correzioni. |
| Impostazioni PDF | Stili, colori, logo e dati consulente, anteprima multipagina e impostazioni salvate. |
| Storico | Confronti salvati, dettagli, snapshot e download dei PDF. |

Per iniziare: configura i **Parametri gestore**, crea un'**Offerta**, salva la
**Bolletta dell'impresa**, quindi selezionale nella sezione **Confronto**.

## Adattamenti business

- Il campo cliente è presentato come ragione sociale; partita IVA facoltativa di 11 cifre.
- La potenza è inserita dall'utente; nessun valore domestico da 3 kW precompilato.
- IVA iniziale 22%, modificabile: verificare l'aliquota della fornitura.
- Nuova quota oneri in €/kW/mese; trasporto potenza in €/kW/anno diviso per 12.
- Gli oneri variabili possono usare kWh netti oppure comprensivi delle perdite.
- Ogni mese può applicare o escludere tutte le quote fisse e di potenza, anche a consumi zero.
- Prezzi PUN espliciti per mese/fascia in €/kWh; nessun fallback stimato.
- I parametri ufficiali domestici non sono applicati al confronto business.
  Fonti ufficiali rimane disponibile per indici e consultazione; le componenti
  specifiche dell'impresa sono configurate in Parametri gestore.
- PDF con nome Progetto Luce Business, ragione sociale e partita IVA.

IVA nel confronto principale: unica aliquota scelta sulla bolletta. Accisa uniforme
configurabile; non sono calcolati automaticamente scaglioni, esenzioni o prorata
per giorni. L'annualizzazione ripete il periodo e non è una previsione.

## Simulazioni dettagliate già create

I dati della prima implementazione business sono conservati. Il link **Simulazione
dettagliata** nella pagina Confronto apre il modello con tariffe diverse per mese,
IVA per voce e componenti personalizzate. Le tariffe si gestiscono dal link nella
pagina Offerte; lo storico dettagliato è collegato dalla pagina Storico.
Queste funzioni aggiuntive non sostituiscono le sette sezioni originali.

## PDF e storico

Ogni confronto conserva input, offerta e parametri del momento del calcolo.
Modificarli non cambia i risultati salvati. Le impostazioni grafiche PDF sono
applicate all'esportazione, senza ricalcolare gli importi. Logo PNG/JPEG massimo 1 MB.

## Test

```bash
mvn -f backend/pom.xml verify
cd frontend
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

La CI verifica anche PostgreSQL, Docker sulla 8089 e persistenza dopo riavvio.
Il workflow Windows non è presente nel branch business: il pacchetto del collega
rimane nel branch `windows-portabile`.

La specifica iniziale non contiene tutti i corrispettivi del workbook originale.
Gli aggregati indicati riconciliano a 1.749,66 €, mentre il documento riporta
1.757,98 €: lo scarto di 8,32 € deve essere chiarito sui dati originali.
Nessuna tariffa reale è inventata o certificata dal programma.

Dettagli: [contratto business](docs/BUSINESS.md) e [verifiche](docs/REPORT_BUSINESS.md).
