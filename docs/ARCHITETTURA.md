# Architettura della prima versione

## Decisione iniziale

La richiesta finale è creare ProgettoLuce da zero. La traccia precedente descriveva un refactoring di SimulatoreBolette; i requisiti di preservare il suo motore legacy e `/api/simulazioni` non si applicano a una repository nuova senza API esistenti. Non abbiamo copiato né migrato classi, database o dati del riferimento.

Stack: Java 17, Spring Boot 3.5, Spring Data JPA, PostgreSQL, Flyway, React 18, TypeScript, Vite, Axios, Recharts e CSS con token. Mapping esplicito tra DTO ed entità; per queste trasformazioni contenute non occorre un generatore MapStruct. Stato locale e hook di lettura, senza Redux.

## Flusso offerte

React → `OffertaRequest` validata → `OffertaService` → `OffertaVociFactory` → `Offerta.aggiorna` → repository → PostgreSQL.

- L'utente configura nome, fornitore, formula, tariffa, prezzi/spread, PCV annuo, note e attivazione.
- La factory produce una voce per fascia applicabile e una PCV. Non riceve dettagli interni dal frontend.
- Monoraria: F0; bioraria: F1/F23; trioraria: F1/F2/F3.
- Le voci mantengono il riferimento all'offerta. Cascade ALL e orphanRemoval gestiscono il ciclo di vita.
- Gli update svuotano la collection gestita e inseriscono le nuove voci senza sostituire la collection Hibernate.
- `@Version` e versione del DTO impediscono di sovrascrivere una versione già cambiata; in caso di conflitto si restituisce 409.
- Dati e voci si leggono dentro la transazione: Open Session in View disattivato.

## Due sorgenti

**BollettaConcorrente / MeseBolletta** contengono cliente, consumi, totale osservato, IVA e altre partite. Ogni mese conserva gli indici PUN da utilizzare per la simulazione; non rappresentano la componente commerciale dell'offerta.

**Offerta / VoceCorrispettivo / ParametriGestore** contengono la configurazione per il costo proposto.

Il PUN è un input esplicito per ciascun mese e fascia, non un feed automatico di mercato. Le due sorgenti non sono fuse e i prezzi dell'offerta non sovrascrivono i dati osservati del cliente.

## Motore

`MotoreCalcolo` è una classe pura: non consulta repository o servizi remoti. Riceve dati persistiti già caricati e un profilo parametri validato.

- Tutti i valori economici e i consumi sono BigDecimal.
- Prezzi e spread hanno fino a 8 cifre decimali; consumi fino a 6. La validazione rifiuta precisioni non persistibili.
- PCV e quota potenza restano annuali nel database. Conversione mensile nel motore a scale 12.
- Importi delle righe: scale 8, HALF_UP. Somma precisa delle categorie; imponibile arrotondato a 2 cifre, poi IVA a 2 cifre, poi esenti e totale a 2 cifre.
- Non si usa il nome della tariffa scelta dal cliente per reinterpretare le voci: si usano quelle dell'offerta salvata.
- Offerta disattivata, voci mancanti o PUN necessario mancante producono errore.
- Percentuale di risparmio null quando il totale osservato è zero, evitando la divisione per zero.

Il dettaglio restituisce quantità, corrispettivo, importo, mese e categoria per ogni riga, inclusi gli importi zero. Ciò permette di capire cosa viene applicato o azzerato.

## Storico

Il confronto salva uno snapshot JSON contenente versione motore, input bolletta, offerta con voci, parametri, risultato e righe. Nessuna chiave esterna verso dati modificabili: il risultato non cambia dopo update o cancellazioni.

Il JSON dei parametri è un value object validato nel service e versionato; il JSON del confronto è un documento immutabile. Gli elementi su cui servono relazioni, vincoli e persistenza a righe (offerte, voci, bollette, mesi) sono tabelle relazionali.

## API

| Metodo | Percorso | Risposta |
|---|---|---|
| GET | `/api/offerte` | Lista offerte, incluse voci |
| GET | `/api/offerte/{id}` | Offerta e versione |
| POST | `/api/offerte` | 201 e Location |
| PUT | `/api/offerte/{id}` | Offerta aggiornata, versione richiesta |
| DELETE | `/api/offerte/{id}` | 204 |
| GET | `/api/bollette` | Lista `{id,dati}` |
| GET | `/api/bollette/{id}` | Bolletta e mesi |
| POST | `/api/bollette` | 201 e Location |
| PUT | `/api/bollette/{id}` | Dati aggiornati, versione richiesta |
| DELETE | `/api/bollette/{id}` | 204 |
| GET | `/api/parametri` | Profilo attivo; 404 finché non configurato |
| PUT | `/api/parametri` | Crea o aggiorna il profilo; versione richiesta agli update |
| POST | `/api/confronti` | 201, salva snapshot e risultato |
| GET | `/api/confronti` | Storico, più recenti prima |
| GET | `/api/confronti/{id}` | Snapshot completo |
| GET | `/actuator/health` | Health del backend |

Esempio offerta:

```json
{
  "nomeFornitore": "Gestore di esempio",
  "nomeOfferta": "Fissa esempio",
  "tipoOfferta": "PREZZO_FISSO",
  "tipoTariffa": "BIORARIA",
  "prezzi": { "f1": "0.15", "f23": "0.12" },
  "spread": null,
  "pcvAnnuo": "120",
  "attiva": true,
  "note": "Dati sintetici"
}
```

Un update include la `versione` restituita dal GET. Esempio confronto:

```json
{ "bollettaId": 1, "offertaId": 1 }
```

Formato errori controllati:

```json
{ "message": "Controlla i dati inseriti", "fields": { "nomeOfferta": "must not be blank" } }
```

Status: 400 per input/formato, 404 per risorsa assente, 409 per versione obsoleta o vincolo. I decimali delle risposte sono stringhe. Lo schema non accetta campi sconosciuti, evitando payload frontend silenziosamente ignorati.

## Persistenza e rilascio

Schema iniziale V1, vincoli e indici inclusi. Futuri cambiamenti richiederanno V2 e successive senza modificare V1 già applicata.

Compose: PostgreSQL → backend → frontend, con healthcheck e volume dati. Nginx effettua proxy API e fallback SPA. I container applicativi hanno utente non root. Le credenziali stanno fuori dalle immagini e il file `.env` non è versionato.

Questa fase è destinata alla validazione locale. I limiti del motore sono riportati nella UI e nel README. Non include autenticazione, certificazione tariffaria, paginazione degli archivi, automazione del PUN, fatture PDF, OCR o deploy cloud.
