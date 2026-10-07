# Verifica del simulatore business

Implementazione sul branch `simulatore-business`, da `windows-portabile` (`9060e1e`).

## Copertura funzionale

Anagrafica impresa, POD, potenza, consumi mensili F1/F2/F3, mesi consecutivi,
profili con decorrenza e fonte, componenti configurabili, perdite per fascia,
energia fissa/PUN+spread, quote di potenza, IVA per aliquota, altre partite,
confronto e annualizzazione, storico paginato e PDF multipagina.

Revisioni tariffarie con controllo di versione e snapshot immutabili dei risultati.
Modifica dei profili riservata alla chiave amministratore. Interfaccia desktop/mobile.
Database H2 business separato nell'avvio demo e Windows; PostgreSQL con Docker.

## Controlli locali

- Backend: 69 test, inclusi 12 nuovi test del modulo business.
- Frontend: 27 test, inclusi 5 nuovi test business; compilazione TypeScript/Vite.
- Browser Chromium: profilo, simulazione, confronto, download PDF, storico,
  aggiornamento tariffario e conservazione del risultato, revisioni, assenza di
  overflow orizzontale e apertura/chiusura del menu a 390 px.
- PDF: estrazione del testo e controllo visivo delle tre pagine del caso sintetico.
- JAR integrato: API, header, route SPA, calcolo, PDF e persistenza dopo riavvio.
- Script Python: verifica della sintassi.

Caso sintetico di due mesi: gennaio senza quote/consumi; febbraio 600 kWh,
perdite 60 kWh, energia 0,10 €/kWh, PCV 120 €/anno, IVA 22%.
Attesi: imponibile 76 €, IVA 16,72 €, totale 92,72 €, differenza 107,28 € rispetto
alla fattura di 200 €, annualizzazione 643,68 €.

## Controlli su GitHub

Prima esecuzione completata con successo sul commit `4f5b6ac`: backend H2/
PostgreSQL, frontend/browser, Compose con riavvio e pacchetto Windows.

I workflow verificano H2, PostgreSQL, stack Compose e riavvio persistente;
quello Windows compila il pacchetto con Java incluso e prova launcher, PDF,
persistenza e browser sul pacchetto reale. Gli esiti sono consultabili nella
scheda Actions del branch; i controlli locali non sostituiscono queste piattaforme.

## Limiti della ricostruzione

Manca il workbook originale con tutti i corrispettivi. Il documento di riferimento
presenta aggregati che riconciliano a 1.749,66 €, a fronte di 1.757,98 € indicati:
lo scarto di 8,32 € non viene nascosto con una correzione arbitraria.
Le tariffe reali, la fiscalità e i riferimenti Excel devono essere validati sui dati
originali. Il modello iniziale è una bozza e non contiene prezzi di mercato.
Scaglioni, esenzioni e prorata giornalieri non sono determinati automaticamente.


## Correzione della distribuzione

Il business si avvia con Docker sulla porta 8089 e progetto Compose `luce-business`.
La variabile dedicata `BUSINESS_PORT` evita di ereditare `FRONTEND_PORT=8088` dal
programma domestico. La CI usa 8089 per calcolo, PDF e persistenza.
Il workflow del pacchetto Windows è rimosso da questo branch; la versione del
collega rimane nel branch `windows-portabile`. I risultati Windows sopra citati
si riferiscono alla prima implementazione, non alla distribuzione richiesta.


## Riallineamento al programma domestico

Ripristinate le sette sezioni e l'editor PDF completo. Rimossa la chiave di
amministrazione da backend, frontend, Compose, ambienti e script.
Aggiunte partita IVA, oneri di potenza mensili, base oneri con/senza perdite e
controllo quote fisse/potenza per mese. Le migrazioni sono additive e conservano
i dati. Il modulo dettagliato precedente è raggiungibile da link nelle sezioni
principali; il programma domestico e il branch Windows non sono modificati.

Un test API senza profilo domestico percorre parametri, offerta, bolletta, confronto,
PDF e storico, controllando partita IVA, mesi senza quote, oneri di potenza e
immutabilità dopo aggiornamento. Test browser del flusso principale e dell'editor
PDF, oltre alle simulazioni dettagliate senza chiave.

Verifica locale della revisione: 70 test backend (compreso il flusso business
senza profilo domestico), 27 frontend, 2 percorsi browser desktop/mobile con
editor PDF, logo, colori, esportazione e storico. Build frontend senza warning
di bundle oltre 500 kB. Caso principale: 600 kWh, potenza 17,8 kW, PCV 120 €/anno,
oneri potenza 2 €/kW/mese, energia 0,10 €/kWh e perdite zero: 128,83 € IVA inclusa.
Con perdite 10% e gli stessi oneri di potenza: 136,15 €.
