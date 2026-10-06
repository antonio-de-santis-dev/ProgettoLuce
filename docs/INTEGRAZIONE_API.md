# Integrazione dei parametri ufficiali

## Stato del progetto e dei rami

Il 6 ottobre 2026 la versione approvata del simulatore, dei PDF e dell’editor PDF è stata consolidata su `main` (commit `a63743f975a7caad50b12e6e2016666ec001ae33`). Le tre PR precedenti sono state integrate in ordine; la verifica GitHub Actions su questo commit è passata: backend H2/PostgreSQL, frontend, browser e Docker con persistenza.

`integrazioneAPI` nasce esattamente da quel commit. L’integrazione delle fonti si prova su questo ramo prima di portarla su `main`.

La revisione ha coperto il motore decimale, le sei combinazioni prezzo fisso/PUN e mono/bi/trioraria, validazioni e conflitti di modifica, migrazioni e persistenza, snapshot dello storico, generazione/anteprima PDF, impostazioni salvate, interfaccia mobile e Docker. Il programma resta un simulatore per uso locale, non un sistema di fatturazione certificato; autenticazione e permessi per pubblicazione multiutente non sono ancora implementati.

## Avvio del ramo

```bash
git fetch origin
git switch integrazioneAPI
git pull --ff-only origin integrazioneAPI
# Conserva il tuo .env e la password PostgreSQL già configurata.
FRONTEND_PORT=8089 docker compose -p progettoluce-api up -d --build
```

Apri `http://localhost:8089/fonti`. Il nome di progetto `progettoluce-api` crea un volume PostgreSQL separato per provare il ramo; la versione main può restare in esecuzione sulla porta 8088. Inserisci i dati di test in questo ambiente.

Flyway aggiunge la migrazione V3. Se scegli invece di usare il database principale, le tabelle esistenti non vengono cancellate, ma il vecchio codice main non può riaprire quel database aggiornato senza una procedura di ripristino: usa l’ambiente separato durante la prova. Non usare `docker compose down --volumes` sul database di lavoro.

## Cosa si aggiorna automaticamente

| Dati | Fonte | Accesso realizzato | Applicazione nel simulatore |
| --- | --- | --- | --- |
| PUN mensile F0 | Acquirente Unico / Portale Offerte | CSV pubblico, senza credenziali | Solo mesi presenti e conclusi; non genera artificialmente le fasce |
| PUN F0/F1/F2/F3/F23 | GME | Client API con autenticazione personale | Mese concluso completo, prezzi orari convertiti €/MWh → €/kWh, fasce italiane e ora legale/solare |
| Perdite BT | Parametri ufficiali del Portale Offerte | CSV pubblico | Coefficiente `lambda`, separato dai consumi netti |
| Trasporto domestico | Portale Offerte, parametri regolati | CSV pubblico | Quote fisse, potenza e consumi; include UC3 e UC6 |
| ASOS e ARIM domestici | Portale Offerte, parametri regolati | CSV pubblico | Residenti / non residenti; quota fissa dei non residenti separata |
| Dispacciamento standard CdispD | Portale Offerte | CSV pubblico | Richiede conferma della compatibilità contrattuale; non è una tariffa universale di tutte le offerte libere |
| IVA e aliquota base accisa domestica | Parametri ufficiali del Portale Offerte | CSV pubblico | IVA nel confronto; accisa uniforme solo nei casi compatibili / con verifica manuale |
| Altre componenti pubblicate, incluse BTA non domestiche | Portale Offerte | CSV pubblico conservato integralmente | Scheda “Tutti i valori pubblicati”, sola lettura; non convertite automaticamente in un profilo non domestico |

La sincronizzazione parte circa 30 secondi dopo l’avvio e poi ogni 24 ore. `FONTI_AUTOMATICO=false` la disattiva; “Aggiorna adesso” rimane disponibile. Gli errori sono registrati e lasciano disponibili i dati precedenti. L’operazione non richiede che le fonti siano raggiungibili durante ogni confronto.

Il CSV dei parametri viene scoperto dai collegamenti della pagina ufficiale: non è codificato un URL legato a una data fissa. Per prudenza il profilo normalizzato vale esclusivamente per il mese del file pubblicato, senza attribuirlo retroattivamente ad altri mesi. Le successive importazioni conservano i mesi acquisiti in precedenza.

Al momento della verifica lo storico CSV pubblico conteneva F0 fino a giugno 2026: la disponibilità della fonte non coincide necessariamente con l’ultimo mese concluso. Per completare gli altri mesi serve GME o un inserimento manuale verificato.

## Utilizzo e correzioni

1. In **Fonti ufficiali**, premi **Aggiorna adesso** e controlla gli esiti.
2. Seleziona il mese e il profilo della fornitura. I valori ufficiali e quelli effettivamente usati sono mostrati separatamente.
3. Premi **Modifica**, inserisci il valore e una motivazione / fonte verificata. Una correzione prevale anche dopo nuove importazioni. Per un mese mancante usa **Aggiungi un parametro manuale**.
4. **Ripristina valore ufficiale** annulla la correzione, richiede una motivazione e conserva lo storico. È disponibile soltanto quando esiste un valore ufficiale.
5. Nel **Confronto**, seleziona **Usa i parametri mensili delle fonti ufficiali e le mie correzioni**, scegli il profilo e conferma la verifica contrattuale/fiscale. Ogni mese della bolletta deve avere i nove parametri richiesti; per offerte PUN devono essere presenti le fasce necessarie.

Le modifiche concorrenti sono protette dalla versione del dato (409: ricaricare). I confronti già salvati non cambiano: registrano parametri mensili, valori effettivi/ufficiali/manuali, fonte, URL e date. Il PDF mostra i parametri e la provenienza salvati. La bolletta originale conserva i suoi dati: PUN/IVA effettivi vengono applicati alla copia usata per il confronto.

Senza la selezione delle fonti ufficiali continua a funzionare il profilo manuale esistente e il PUN inserito nella bolletta.

### Conversioni applicate

- Trasporto fisso mensile: `sigma1 / 12`.
- Trasporto potenza annua: `sigma2 + uc6s_d`.
- Trasporto variabile su consumi netti: `sigma3 + uc3 + uc6p_d`.
- Oneri residenti: `asos_dr + arim_dr`, quota fissa zero.
- Oneri non residenti: `(asos_dnr_f + arim_dnr_f) / 12` e `asos_dnr_v + arim_dnr_v`.
- Il CdispD pubblicato si applica ai consumi netti. Poiché il motore ha un campo dispacciamento su consumi con perdite, il valore normalizzato è `cdispd / (1 + lambda)` (otto decimali). Una correzione di quel campo deve seguire l’unità mostrata.
- Perdite e IVA sono frazioni: `0.10` significa 10%. Prezzi e aliquote accisa sono €/kWh.
- La PCV regolata presente nel CSV viene conservata nel dato originale, non sovrascrive la PCV commerciale dell’offerta.

## Ciò che serve fare insieme

### 1. Attivare le credenziali GME

La procedura richiede la registrazione personale e l’accettazione delle condizioni del GME; non posso completarla al posto del titolare.

1. Consulta la [pagina API del GME](https://gme.mercatoelettrico.org/it-it/Home/InterfacciaAPI).
2. Compila la [richiesta di registrazione](https://api.mercatoelettrico.org/users/RegistrationForm/RegistrationRequest) e completa l’attivazione richiesta dal gestore.
3. Inserisci le credenziali nel tuo `.env` locale, senza inviarle in chat e senza committarle:

```dotenv
FONTI_AUTOMATICO=true
GME_LOGIN=il-tuo-login-api
GME_PASSWORD=la-tua-password-api
```

4. Ricrea il backend conservando PostgreSQL e il volume:

```bash
FRONTEND_PORT=8089 docker compose -p progettoluce-api up -d --build backend frontend
```

5. In **Fonti ufficiali**, verifica “GME: credenziali configurate”, seleziona un mese concluso e premi **Aggiorna adesso**. Controlla l’esito GME e la presenza delle cinque fasce nella scheda **Indici PUN**.

La sincronizzazione programmata importa l’ultimo mese concluso. Per recuperare mesi precedenti ripeti l’aggiornamento scegliendo ciascun mese. “Credenziali configurate” non certifica che siano valide: fa fede l’esito dell’importazione. Il client è verificato con risposte di prova del protocollo; la prima prova reale autenticata richiede le tue credenziali.

### 2. Accisa di clienti residenti fino a 3 kW

L’aliquota base non basta per i casi con esenzioni/scaglioni. Il motore attuale ha un’aliquota uniforme e blocca l’utilizzo automatico di quella ufficiale per questi clienti. Dobbiamo verificare insieme i consumi, i giorni e il trattamento fiscale della fornitura, poi inserire un’aliquota effettiva motivata oppure sviluppare il calcolo fiscale per scaglioni.

Una correzione è condivisa per **mese e profilo**, non è specifica del cliente: verificane l’applicabilità a ogni bolletta. Non usare l’aliquota effettiva calcolata per un cliente diverso senza una nuova verifica. Periodi parziali ed IVA mista richiedono separazione/verifica manuale.

### 3. Mesi storici di rete/oneri non disponibili

L’importazione corrente non ricostruisce le tariffe storiche di rete/oneri che non sono presenti nel database. Per una vecchia bolletta dobbiamo reperire i parametri del periodo nelle pubblicazioni ufficiali e inserirli nella sezione manuale. Non basta riutilizzare le tariffe attuali. Un importatore di archivi storici potrà essere aggiunto dopo aver verificato le fonti e le decorrenze.

### 4. Condizioni specifiche dell’offerta e forniture non domestiche

Prezzo fisso, spread, PCV e condizioni speciali sono del venditore e restano nella scheda **Offerte**. Il dispacciamento CdispD standard va confrontato con il contratto: se differente o già incluso nel prezzo, correggi il parametro prima di usarlo e verifica la fiscalità del cliente. Per BTA non domestiche i valori pubblicati sono acquisiti, ma serve estendere il motore per oneri in quota potenza, categorie e scaglioni fiscali; oggi usa un profilo manuale verificato.

## Fonti e protocollo

- [Open data Portale Offerte](https://www.ilportaleofferte.it/portaleOfferte/it/open-data.page): pagina di scoperta di CSV ufficiali dei parametri elettrici e storico PUN.
- [Regole di calcolo Portale Offerte, versione 4.2](https://www.ilportaleofferte.it/portaleOfferte/resources/cms/documents/6bc502553cb0ea45958840b2de20078d.pdf): riferimento per CdispD e componenti domestiche.
- [Documentazione API GME](https://gme.mercatoelettrico.org/it-it/Home/InterfacciaAPI) e [manuale tecnico](https://gme.mercatoelettrico.org/Portals/0/Documents/it-IT/20251015Manuale_tecnico_API.pdf).

GME: POST `/request/api/v1/Auth` con Login/Password; POST `/request/api/v1/RequestData` con Bearer JWT, Platform `PublicMarketResults`, Segment `MGP`, DataName `ME_ZonalPrices`, intervallo mensile e granularità `PT60` dal periodo ottobre 2025. Si legge l’archivio JSON ZIP restituito, selezionando zona PUN/mercato MGP. Non vengono usati endpoint API non documentati di ARERA/ADM/Terna: le componenti standard disponibili sono importate dai CSV ufficiali di AU.

Solo HTTPS e host ufficiali sono ammessi nel client. Timeout, limiti di dimensione, validazione dei CSV/archivi e controllo di completezza evitano sostituzioni silenziose con dati malformati. Le credenziali GME rimangono nel backend, non sono restituite dal controller.

## API dell’applicazione

- GET `/api/fonti`: stato, periodi disponibili, ultimi esiti; nessuna credenziale.
- GET `/api/fonti/dati?periodo=AAAA-MM&categoria=...`: valori del mese/profilo.
- POST `/api/fonti/sincronizza?periodoGme=AAAA-MM`: importazione esplicita, mese GME facoltativo.
- PUT `/api/fonti/dati`: correzione con codice, periodo, categoria, valore, versione corrente e motivo.
- POST `/api/fonti/dati/{id}/ripristina`: versione e motivo.
- GET `/api/fonti/dati/{id}/revisioni`: storico delle importazioni e correzioni.
- POST `/api/confronti`: opzionali `usaFontiUfficiali`, `categoria`, `confermaStandard`; il payload precedente resta compatibile.

## Verifiche

I test coprono CSV ufficiali di esempio, conversioni di unità, mancato riempimento artificiale delle fasce, protocollo GME ZIP, mesi con ora legale/solare, festività, duplicati, mesi incompleti, override/versioni/ripristino, errori delle fonti, tariffe diverse per mese, immutabilità dello snapshot/PDF e della bolletta originale. Le fixture sono dati ufficiali scaricati il 6 ottobre 2026; la CI non dipende dalla disponibilità in rete dei fornitori.

Verifica locale: **57 test backend**, **22 test frontend** e build di produzione passati. Una prova con l’app avviata e la fonte pubblica reale ha importato **196 valori** senza credenziali: 100 valori originali, 18 normalizzati domestici e 78 indici mensili F0 (gennaio 2020 – giugno 2026). Verificati il profilo ottobre 2026 e il PUN gennaio 2026 `0.132665 €/kWh`. La prova GME autenticata resta da eseguire dopo la registrazione.

[Verifica del main consolidato su GitHub Actions](https://github.com/antonio-de-santis-dev/ProgettoLuce/actions/runs/37467740758).
