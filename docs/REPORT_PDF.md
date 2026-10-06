# PDF del risultato — Fase 2

## Funzione

Il pulsante **Scarica PDF** esporta il confronto corrente e i confronti riaperti dallo storico. Il documento contiene dati cliente/POD, condizioni dell'offerta, periodo, costi, risparmio, proiezione annuale, righe di calcolo, consumi/PUN, parametri e limiti della simulazione.

Il report usa lo snapshot salvato: nessun ricalcolo e nessuna dipendenza dalle offerte, bollette o parametri correnti. La cancellazione delle sorgenti non impedisce il download storico. Le quantità e i corrispettivi di dettaglio mantengono la precisione originale; i riepiloghi sono formattati a centesimi.

## Implementazione

- Endpoint `GET /api/confronti/{id}/pdf`: allegato `application/pdf`, nome `confronto-{id}.pdf`, cache disabilitata; 404 se il confronto non esiste.
- `ConfrontoPdfController`: recupero dello snapshot e risposta HTTP.
- `ConfrontoPdfRenderer`: generazione A4 in memoria con Apache PDFBox 3.0.8, righe paginate e intestazioni delle tabelle ripetute.
- Font DejaVu incorporati, con licenza inclusa: nessuna installazione di font o strumenti PDF richiesta nel container.
- `ScaricaPdf`: componente React condiviso, caricamento, errori JSON ricevuti come blob, download e rilascio dell'URL temporaneo.
- Nessuna nuova tabella o migration. Il calcolo economico e lo schema esistente restano invariati.

## Verifiche locali

- **39 test backend superati**: suite economica/API esistente, endpoint PDF da snapshot con sorgenti eliminate, font incorporati, accenti e simboli, importi, zero/maggior costo, testo lungo e paginazione.
- **12 test frontend superati**, incluso nome del file, chiamata sul confronto selezionato, errori binari e risposta non PDF.
- Package Java e build TypeScript/Vite di produzione completati.
- PDF di esempio renderizzato e ispezionato: **2 pagine**. Documento di prova con 120 righe e note lunghe: **6 pagine**, nessun testo fuori dalla pagina.

## Verifiche CI

La CI verifica PostgreSQL, download Playwright dal risultato e dallo storico, e PDF tramite Nginx nello stack Compose anche dopo la ricreazione dei container. Esito da aggiornare dopo la conclusione dei job.

## Limiti

Il documento è una simulazione parametrica, non una fattura o un preventivo contrattuale. Conserva i limiti tariffari della fase 1. Il font non copre ogni scrittura e simbolo: i caratteri non disponibili sono rappresentati da `?`, con avviso nel PDF; gli originali restano nello snapshot. La data del confronto è mostrata nel fuso Europe/Rome.

Upload, estrazione delle bollette e OCR non fanno parte di questa modifica. L'applicazione conserva il modello di accesso attuale; autenticazione e ruoli restano una fase successiva.

## File

Nuovi: `ConfrontoPdfController.java`, `ConfrontoPdfRenderer.java`, `ConfrontoPdfRendererTest.java`, `ScaricaPdf.tsx`, `ScaricaPdf.test.tsx`, font e licenza in `backend/src/main/resources/fonts`, questo report.

Modificati: `backend/pom.xml`, `ApiEndToEndTest.java`, `RisultatoView.tsx`, `styles.css`, `e2e/consulenza.spec.ts`, `scripts/verifica-compose.py`, `README.md`, `docs/ARCHITETTURA.md`.
