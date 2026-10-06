# Editor PDF dei confronti

## Funzioni

Accesso con **Personalizza PDF** nel risultato e nei confronti dello storico. Controlli a sinistra e PDF effettivo a destra; su mobile le sezioni sono in verticale.

| Stile | Presentazione |
| --- | --- |
| Classico | Intestazione piena e tre riquadri con gli importi |
| Essenziale | Intestazione sottile, spazio bianco e riepilogo in elenco |
| Editoriale | Titolo editoriale e accenti laterali nei titoli e negli importi |
| Sintesi cliente | Risparmio prima dei dati tecnici, con una spiegazione del confronto |

Tutti gli stili conservano costi, dettaglio, parametri e limiti della simulazione. Le voci principali sono spiegate con parole semplici. Il calcolo usa lo snapshot originale.

Sette colori consigliati: #1E3A8A Blu Istituzionale, #0284C7 Azzurro Elettrico, #15803D Verde Sostenibile, #D97706 Ambra Elettrico, #EA580C Arancione Dinamico, #374151 Grigio Antracite, #6B21A8 Viola Premium. Disponibili tavolozza, codice HEX e ripristino del verde originale #194D3D. La tinta secondaria è il principale schiarito al 91% verso il bianco; testi e intestazioni adattano il contrasto.

Logo PNG/JPEG (massimo 1 MB, 4096 px per lato e 4 megapixel), proporzioni conservate, rimozione e validazione anche server. Nessun caricamento permanente sul server.

Riquadro consulente con nome/studio, ruolo, email, telefono e indirizzo. Dati iniziali inventati, segnalati come dimostrativi: Andrea Bianchi · Studio Energia, consulente@example.com e recapiti di esempio. Il riquadro è modificabile e omette i campi vuoti. Il profilo utente definitivo resta da definire.

## Flusso e architettura

- `POST /api/confronti/{id}/pdf` e `POST /api/confronti/{id}/pdf/anteprima`: opzioni di presentazione validate, stesso snapshot del GET. Il download restituisce il PDF; l’anteprima restituisce JSON con PDF e pagine PNG. Entrambe le risposte disabilitano la cache.
- Anteprima dopo 400 ms di inattività; annullamento richieste e protezione dalle risposte obsolete.
- Download nell’editor dal blob già visualizzato, disponibile solo quando corrisponde alle impostazioni correnti.
- Preferenze e logo memorizzati esclusivamente nel browser; riutilizzati dal download normale del risultato e dello storico. Ripristino alle impostazioni iniziali disponibile.
- Anteprima con tutte le pagine PNG renderizzate dal PDF sul server: funziona senza plugin del browser. La risposta contiene anche i byte dello stesso PDF, usati dal download e dal collegamento in nuova scheda.
- Nginx: limite corpo API 2 MB per il logo codificato. Nessuna migration o nuova dipendenza.

## Verifiche

- 42 test backend superati: importi dello snapshot, quattro stili, logo incorporato, contatti, validazione colore/stile/testi, immagini corrotte e limiti delle dimensioni.
- 17 test frontend superati: personalizzazione, download dal blob dell’anteprima, risposte obsolete, errori e nuovo tentativo, preferenze nel download standard e rifiuto dei loghi non validi.
- Package Java e build TypeScript/Vite completati.
- Quattro PDF con logo e dati consulente renderizzati; controllo del testo nei limiti delle pagine. Il report personalizzato di esempio si sviluppa su tre pagine.
- Playwright eseguito sulla build di produzione, con la stessa CSP di Nginx e controllo degli errori CSP. Flusso esteso con selezione stile/colore, dati consulente, caricamento logo, anteprima, download personalizzato, screenshot desktop/mobile e download storico.
- Verifica Compose estesa al POST personalizzato tramite Nginx e all’anteprima raster. Esito CI da aggiornare alla conclusione dei job.

## Limiti

Le preferenze sono comuni ai report del browser corrente: non sono sincronizzate tra dispositivi e non sono salvate per singolo confronto. Il PDF viene sempre ricreato dai dati economici salvati e dalle preferenze correnti. Dati del consulente e logo non sono un profilo autenticato né una firma digitale. L’anteprima usa immagini PNG a 108 DPI; il file PDF mantiene testo vettoriale e font incorporati. Il rendering viene eseguito sul server, senza archiviare le immagini.
