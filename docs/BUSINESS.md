# Simulatore Business — implementazione

## Origine e ambito

Branch `simulatore-business`, base `windows-portabile` commit `9060e1e`. Specifica: PDF “Analisi del file e specifica per una web app”, derivato da SIMULATOREBUSINESSLUCE.xlsx. Il workbook originale non è stato fornito; non sono ricostruite le sue tariffe né dichiarata equivalenza alle formule incoerenti.

Moduli business autonomi; infrastruttura, componenti UI, decimali, font, Flyway, Docker e portable derivano da ProgettoLuce. Il main non viene modificato. La modalità domestica non è esposta senza attivare esplicitamente il profilo `domestico`; la sincronizzazione delle fonti domestiche è disabilitata nella modalità business.

## Modello e persistenza

- `BusinessModels`: DTO validati per profili, voci, mesi, partite, risultati e riepiloghi.
- `BusinessEngine`: calcolo puro BigDecimal, senza repository o chiamate remote.
- `BusinessProfile`: configurazione JSON, `@Version`; contiene tutte le voci in un unico aggregato versionato.
- `business_revisioni_profili`: copia del profilo a ogni salvataggio con numero versione e timestamp. Nessuna cancellazione dei profili nell'API attuale.
- `BusinessSimulation`: snapshot JSON, timestamp a microsecondi per stabilità PostgreSQL/H2 e colonne di riepilogo.
- `BusinessService`: transazioni, controllo versioni, decorrenza, revisione e salvataggio dello snapshot; letture paginabili dello storico, dettaglio separato.
- `BusinessPdf`: PDFBox con DejaVu incorporati, intestazioni, righe e pagine numerate.
- Flyway `V4__simulatore_business.sql`: tabelle aggiuntive, senza modificare V1/V2/V3 né cancellare dati domestici.

## Basi di quantità

| Base | Quantità | Unità del prezzo |
|---|---|---|
| KWH_FASCIA | Consumi netti della fascia selezionata | €/kWh |
| PERDITE_FASCIA | Somma delle perdite arrotondate per singola fascia, secondo selezione | €/kWh |
| KWH_NETTI | F1 + F2 + F3 | €/kWh |
| KWH_CON_PERDITE | Consumi + perdite | €/kWh |
| KW_MESE | Potenza × flag quote mensili | €/kW/mese |
| KW_ANNO | Potenza × flag quote / 12 | €/kW/anno |
| QUOTA_MESE | Flag quote (0 oppure 1) | €/POD/mese |
| QUOTA_ANNO | Flag quote / 12 | €/POD/anno |

Fasce: F0 totale, F1, F2, F3, F23=F2+F3. Perdite = consumo × coefficiente per ciascuna F1/F2/F3; scala 0 se flag Excel, altrimenti scala 8. Indicizzazione ammessa sulle basi per fascia: corrispettivo memorizzato = spread; prezzo effettivo = PUN esplicito + spread. Per indicizzare il totale usare KWH_FASCIA/F0.

Perdite separate e energia hanno corrispettivi distinti configurabili. È responsabilità della configurazione evitare una doppia inclusione delle perdite o delle componenti già comprese nel contratto.

## IVA e riconciliazione

Importo riga = quantità × prezzo, scala 8 HALF_UP. Le altre partite possono essere negative; esente richiede aliquota zero. Un importo a IVA zero imponibile è distinto da un esente. Le basi per aliquota negative e un totale negativo vengono rifiutati.

Somma precisa delle righe imponibili per aliquota → base a 2 decimali → imposta a 2 decimali. Totale = somma basi + somma imposte + esenti a centesimi. Subtotali mensili arrotondati sono descrittivi; la riconciliazione avviene sulle basi dell'intero periodo, non sommando subtotali arrotondati per mese/categoria.

Il risultato conserva tutte le quantità/prezzi, profili completi e versioni, input, IVA e avvisi. La percentuale di risparmio è nulla se la fattura precedente è zero; le incidenze sono nulle se il totale simulato è zero. La stima annualizzata usa il numero di mesi simulati, compresi quelli configurati con quote/consumi zero.

Il test del riferimento usa quote sintetiche per riprodurre i soli aggregati 988,20/382,20/63,75; non sono tariffe ricostruite. Risultato riconciliato 1.749,66; differenza 8,32 rispetto al valore salvato Excel. Nessuna correzione automatica delle aliquote originali o aggiunta artificiale.

## API

| Metodo | Percorso | Comportamento |
|---|---|---|
| GET | /api/business/profili | Lista profili con versione |
| POST | /api/business/profili | Crea profilo; richiede X-Business-Admin |
| PUT | /api/business/profili/{id} | Aggiorna con versione corrente; crea revisione |
| GET | /api/business/profili/{id}/revisioni | Copie storiche del profilo |
| POST | /api/business/simulazioni | Calcola e salva; 201 e Location |
| GET | /api/business/simulazioni?pagina=0&dimensione=20 | Riepiloghi, senza dati dettagliati nel payload |
| GET | /api/business/simulazioni/{id} | Snapshot completo, no-store |
| GET | /api/business/simulazioni/{id}/pdf | PDF dello snapshot, no-store |

Paginazione: pagina >=0, dimensione 1–100. Input sconosciuti sono rifiutati da Jackson. Status: 400 validazione/dominio, 403 chiave errata, 404 assente, 409 versione obsoleta, 503 chiave backend non configurata.

## Sicurezza e avvio

Modifica profili: chiave server da BUSINESS_ADMIN_TOKEN, confronto a tempo costante, inviata nell'header dal frontend; mai inserita nel bundle o nello storage browser. La UI acquisisce la chiave, ma la verifica autorevole avviene sul server al salvataggio. Bozza/verificato è una classificazione interna, non una firma o certificazione.

Demo e portable bind su loopback, DB business distinto. Docker frontend su loopback, DB/backend non pubblicati, chiave amministratore richiesta. CSP, nosniff e protezione dall'incorporamento conservate. Il progetto rimane un workspace locale condiviso: non ci sono utenti, segregazione per consulente o protezione delle letture delle simulazioni per utente. Per uso Internet occorre un progetto di autenticazione completo.

## Collaudo

Nuovi test: aggregati riconciliati del documento; IVA mista/esenti/accrediti; perdite Excel; quote di potenza e annuali; mesi/scadenza; PUN mancante/esplicito; zero/negativi; profili diversi/bozza; permessi API; versioni obsolete e revisioni; snapshot/PDF immutabili; payload storico leggero. Test browser: creazione tariffa, due mesi, quote zero/gennaio, risultato 92,72, differenza 107,28, annualizzazione 643,68, download PDF, riapertura storico e layout mobile.

Le vecchie suite domestiche sono conservate; i vecchi E2E sono spostati in frontend/domestico-e2e come riferimento. Il nuovo workflow verifica il programma business. Le verifiche Windows vengono eseguite in GitHub Actions, non in Linux.
