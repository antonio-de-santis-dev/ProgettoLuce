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
