# Editor PDF dei confronti

## Funzioni

Sezione **Impostazioni PDF** nel menu, raggiungibile anche dal risultato e dallo storico. Salvataggio esplicito nel database con **Salva impostazioni PDF**. Controlli a sinistra e PDF effettivo a destra; su mobile le sezioni sono in verticale.

| Stile | Presentazione |
| --- | --- |
| Classico | Intestazione piena e tre riquadri con gli importi |
| Essenziale | Intestazione sottile, spazio bianco e riepilogo in elenco |
| Editoriale | Titolo editoriale e accenti laterali nei titoli e negli importi |
| Sintesi cliente | Risparmio prima dei dati tecnici, con una spiegazione del confronto |

Tutti gli stili conservano costi, dettaglio, parametri e limiti della simulazione. Le voci principali sono spiegate con parole semplici. Il calcolo usa lo snapshot originale.

Sette colori consigliati: #1E3A8A Blu Istituzionale, #0284C7 Azzurro Elettrico, #15803D Verde Sostenibile, #D97706 Ambra Elettrico, #EA580C Arancione Dinamico, #374151 Grigio Antracite, #6B21A8 Viola Premium. Disponibili tavolozza, codice HEX e ripristino del verde originale #194D3D. La tinta secondaria è il principale schiarito al 91% verso il bianco; testi e intestazioni adattano il contrasto.

Logo PNG/JPEG (massimo 1 MB, 4096 px per lato e 4 megapixel), proporzioni conservate, rimozione e validazione anche server. Il logo viene salvato con la configurazione nel database; nessun file immagine separato viene scritto sul server.

Riquadro consulente con nome/studio, ruolo, email, telefono e indirizzo. Dati iniziali inventati, segnalati come dimostrativi: Andrea Bianchi · Studio Energia, consulente@example.com e recapiti di esempio. Il riquadro è modificabile e omette i campi vuoti. Il profilo utente definitivo resta da definire.

## Flusso e architettura

- `POST /api/confronti/{id}/pdf` e `POST /api/confronti/{id}/pdf/anteprima`: opzioni di presentazione validate, stesso snapshot del GET. Il download restituisce il PDF; l’anteprima restituisce JSON con PDF e pagine PNG. Entrambe le risposte disabilitano la cache.
- Anteprima dopo 400 ms di inattività; annullamento richieste e protezione dalle risposte obsolete.
- Download nell’editor dal blob già visualizzato, disponibile solo quando corrisponde alle impostazioni correnti.
- Preferenze e logo salvati nel database tramite GET/PUT `/api/impostazioni-pdf`, con controllo della versione. Tutti i download GET applicano automaticamente l’ultima configurazione salvata. Una bozza non viene applicata finché non si preme Salva. Ripristino disponibile come bozza da salvare.
- Anteprima dimostrativa tramite `/api/impostazioni-pdf/anteprima`, senza creare confronti: un solo foglio A4 intero alla volta con frecce e numero pagina. Le pagine PNG sono renderizzate dal PDF sul server: funziona senza plugin del browser. La risposta contiene anche i byte dello stesso PDF, usati dal download e dal collegamento in nuova scheda.
- Nginx: limite corpo API 2 MB per il logo codificato. Migration V2 per la tabella `impostazioni_pdf`; nessuna nuova dipendenza.

## Verifiche

- 44 test backend superati: importi dello snapshot, quattro stili, logo incorporato, contatti, validazione colore/stile/testi, immagini corrotte e limiti delle dimensioni.
- 18 test frontend superati: personalizzazione, download dal blob dell’anteprima, risposte obsolete, errori e nuovo tentativo, preferenze nel download standard e rifiuto dei loghi non validi.
- Package Java e build TypeScript/Vite completati.
- Quattro PDF con logo e dati consulente renderizzati; controllo del testo nei limiti delle pagine. Il report personalizzato di esempio si sviluppa su tre pagine.
- Playwright eseguito sulla build di produzione, con la stessa CSP di Nginx e controllo degli errori CSP. Flusso esteso con selezione stile/colore, dati consulente, caricamento logo, anteprima, download personalizzato, screenshot desktop/mobile e download storico.
- Verifica Compose estesa alla configurazione salvata, all’anteprima raster e alla persistenza di impostazioni/logo dopo la ricreazione dei container. Verifica superata anche dopo la ricreazione dei container.

CI completa superata il 6 ottobre 2026: [run 37451475480](https://github.com/antonio-de-santis-dev/ProgettoLuce/actions/runs/37451475480), job backend, frontend e Compose. Playwright verifica salvataggio esplicito, ricaricamento dopo cancellazione del localStorage, logo persistente, un solo foglio visibile con navigazione e limiti della pagina, download storico con configurazione salvata e assenza di scorrimento orizzontale a 390 px. Il PDF scaricato dallo storico contiene Studio Browser PDF, logo su tre pagine e importi 77/123 euro; tutti i blocchi di testo sono entro la pagina. Corretto anche il contenimento delle intestazioni accessibili della tabella storico su mobile.

La correzione aggiunge una sezione autonoma, salvataggio nel database e visualizzazione di un foglio intero alla volta. Il precedente flusso nel dialogo e la memorizzazione locale sono sostituiti da questo comportamento.

## Limiti

La configurazione PDF è condivisa nel workspace e disponibile da qualsiasi browser collegato allo stesso backend. Non è ancora associata a un account individuale e non è salvata per singolo confronto. Il PDF viene sempre ricreato dai dati economici salvati e dalla configurazione salvata corrente. Dati del consulente e logo non sono un profilo autenticato né una firma digitale. L’anteprima usa immagini PNG a 108 DPI; il file PDF mantiene testo vettoriale e font incorporati. Il rendering viene eseguito sul server, senza archiviare le immagini.

## Interfaccia ampliata

La sezione PDF usa tutta la larghezza disponibile del workspace. Su desktop il titolo è compatto e l’editor occupa lo spazio dello schermo sotto la barra superiore: controlli più larghi (420–600 px), scelte e descrizioni più leggibili, colori disposti su due colonne, PDF più grande e pulsanti di salvataggio sempre visibili. Il collegamento al PDF è nella barra dell’anteprima per lasciare più spazio al foglio. Sotto 1100 px le sezioni si dispongono in verticale. Il controllo browser include anche 1920×1080: dimensioni effettive di scelte e foglio e posizione dei pulsanti entro lo schermo.
