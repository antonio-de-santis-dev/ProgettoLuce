# Report Fase 1 — Prima versione da zero

## Risultato

ProgettoLuce è stato implementato come applicazione nuova, seguendo il chiarimento dell'utente. SimulatoreBolette è stato consultato solo come riferimento funzionale: nessun codice legacy è stato importato.

La prima versione comprende offerte, bollette mensili, parametri configurabili, confronto e storico. Non comprende le fasi successive della roadmap.

## Architettura finale

Frontend React → API validata → servizio transazionale → OffertaVociFactory → Offerta + voci → database → ricaricamento repository → ConfrontoService → MotoreCalcolo → snapshot storico.

Fonte osservata (bolletta) separata da condizioni dell'offerta e parametri del gestore. Conversione commerciale nel backend, nessuna logica di business nei controller. Tutti i calcoli economici Java in BigDecimal.

## Compatibilità legacy

Non applicabile: ProgettoLuce non conteneva backend, frontend o API. Il riferimento non è stato modificato. Non sono stati importati BollettaCalculator e `/api/simulazioni`.

## Database

Creata migration **V1__schema_iniziale.sql**: offerte, voci, bollette, mesi, parametri, confronti, vincoli e indici. Nessuna migration preesistente da modificare. Hibernate `validate`, Open Session in View disattivato.

## Verifiche locali

- **35 test backend**, passati senza failure/error/skipped: factory 12, motore 10, integrazione API 13.
- Test di tutte le sei combinazioni prezzo fisso/PUN × monoraria/bioraria/trioraria.
- Persistenza verificata tramite query SQL, EntityManager pulito e reload della relazione padre/figlio.
- Confronto eseguito via REST con valori attesi BigDecimal. La mancanza di voci dopo cancellazione SQL provoca errore, evitando il falso risparmio.
- Update offerta con cambio tariffa, eliminazione orfani, versione obsoleta 409 e cancellazione cascade.
- Bollette: update mesi senza duplicazioni, mesi non consecutivi rifiutati.
- Storico invariato dopo modifica prezzi e cancellazione di offerta/bolletta.
- **9 test frontend**: campi dinamici, payload e decimali, errori backend, somme decimali, routing SPA e 404.
- Build TypeScript/Vite di produzione e package eseguibile backend.
- Script shell controllato con `bash -n`; script esempio compilato con Python.

## Verifiche ulteriori

Workflow CI predisposto per test su **PostgreSQL reale** e test **Playwright** di una consulenza completa su desktop/mobile, con screenshot.

L'ambiente locale non dispone di Docker e impedisce l'avvio di Chrome tramite socket Unix. Il tentativo Playwright locale si è fermato prima di eseguire azioni sulla pagina; non è un test superato. Le verifiche CI verranno riportate dopo averne letto l'esito.

## Warning e limiti

- Warning npm sul proxy HTTP configurato nell'ambiente di esecuzione: esterno al repository.
- Nei log Hibernate la diagnostica del pool mostra alcuni valori `undefined/unknown`; startup, Flyway e validazione schema riescono.
- Il mock maker subclass evita la dipendenza dall'attach agent JVM, non necessaria per questa suite.
- I parametri sono espliciti, senza seed presentati come tariffe nazionali aggiornate.
- Nessuna certificazione ARERA/Excel dichiarata. Esenzioni, scaglioni, periodi parziali e IVA mista sono fuori scope.
- PUN manuale per mese/fascia. Stima annuale indicativa, con formula e limiti visibili.
- Archivi senza paginazione: da introdurre quando i volumi lo richiedono.
- Autenticazione, PDF, OCR, multi-offerta, dashboard e deploy cloud non implementati.

## Stato

Implementazione e verifiche locali completate. Verifiche PostgreSQL/browser CI in attesa: **FASE 1 NON COMPLETATA** finché questi controlli non saranno confermati.

## File modificati

Repository iniziale: rimosso il segnaposto `a.txt`. Nessun file applicativo preesistente modificato.

## Nuovi file

- `.env.example`
- `.github/workflows/ci.yml`
- `.gitignore`
- `README.md`
- `avvia-demo.sh`
- `backend/.dockerignore`
- `backend/Dockerfile`
- `backend/pom.xml`
- `backend/src/main/java/it/progettoluce/LuceApplication.java`
- `backend/src/main/java/it/progettoluce/bollette/BollettaConcorrente.java`
- `backend/src/main/java/it/progettoluce/bollette/BollettaController.java`
- `backend/src/main/java/it/progettoluce/bollette/BollettaRepository.java`
- `backend/src/main/java/it/progettoluce/bollette/BollettaRequest.java`
- `backend/src/main/java/it/progettoluce/bollette/BollettaService.java`
- `backend/src/main/java/it/progettoluce/bollette/MeseBolletta.java`
- `backend/src/main/java/it/progettoluce/bollette/MeseRequest.java`
- `backend/src/main/java/it/progettoluce/calcolo/MotoreCalcolo.java`
- `backend/src/main/java/it/progettoluce/calcolo/RisultatoCalcolo.java`
- `backend/src/main/java/it/progettoluce/confronti/Confronto.java`
- `backend/src/main/java/it/progettoluce/confronti/ConfrontoController.java`
- `backend/src/main/java/it/progettoluce/confronti/ConfrontoRepository.java`
- `backend/src/main/java/it/progettoluce/confronti/ConfrontoService.java`
- `backend/src/main/java/it/progettoluce/offerte/Fascia.java`
- `backend/src/main/java/it/progettoluce/offerte/Offerta.java`
- `backend/src/main/java/it/progettoluce/offerte/OffertaController.java`
- `backend/src/main/java/it/progettoluce/offerte/OffertaRepository.java`
- `backend/src/main/java/it/progettoluce/offerte/OffertaRequest.java`
- `backend/src/main/java/it/progettoluce/offerte/OffertaResponse.java`
- `backend/src/main/java/it/progettoluce/offerte/OffertaService.java`
- `backend/src/main/java/it/progettoluce/offerte/OffertaVociFactory.java`
- `backend/src/main/java/it/progettoluce/offerte/Prezzi.java`
- `backend/src/main/java/it/progettoluce/offerte/TipoOfferta.java`
- `backend/src/main/java/it/progettoluce/offerte/TipoTariffa.java`
- `backend/src/main/java/it/progettoluce/offerte/VoceCorrispettivo.java`
- `backend/src/main/java/it/progettoluce/parametri/ParametriController.java`
- `backend/src/main/java/it/progettoluce/parametri/ParametriGestore.java`
- `backend/src/main/java/it/progettoluce/parametri/ParametriRepository.java`
- `backend/src/main/java/it/progettoluce/parametri/ParametriRequest.java`
- `backend/src/main/java/it/progettoluce/parametri/ParametriService.java`
- `backend/src/main/java/it/progettoluce/shared/ApiExceptionHandler.java`
- `backend/src/main/java/it/progettoluce/shared/DecimalJsonConfiguration.java`
- `backend/src/main/java/it/progettoluce/shared/JsonCodec.java`
- `backend/src/main/java/it/progettoluce/shared/NotFoundException.java`
- `backend/src/main/resources/application-demo.yml`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/db/migration/V1__schema_iniziale.sql`
- `backend/src/test/java/it/progettoluce/ApiEndToEndTest.java`
- `backend/src/test/java/it/progettoluce/calcolo/MotoreCalcoloTest.java`
- `backend/src/test/java/it/progettoluce/offerte/OffertaVociFactoryTest.java`
- `backend/src/test/resources/application-test.yml`
- `backend/src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker`
- `compose.yaml`
- `docs/ARCHITETTURA.md`
- `docs/REPORT_FASE_1.md`
- `frontend/.dockerignore`
- `frontend/Dockerfile`
- `frontend/e2e/consulenza.spec.ts`
- `frontend/index.html`
- `frontend/nginx.conf`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/playwright.config.ts`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/components/RisultatoView.tsx`
- `frontend/src/components/ui.tsx`
- `frontend/src/domain.ts`
- `frontend/src/main.tsx`
- `frontend/src/pages/BollettePage.tsx`
- `frontend/src/pages/ConfrontoPage.tsx`
- `frontend/src/pages/OffertePage.tsx`
- `frontend/src/pages/ParametriPage.tsx`
- `frontend/src/pages/StoricoPage.tsx`
- `frontend/src/styles.css`
- `frontend/src/test/App.test.tsx`
- `frontend/src/test/OffertaForm.test.tsx`
- `frontend/src/test/domain.test.ts`
- `frontend/src/test/setup.ts`
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `scripts/carica-esempio.py`
