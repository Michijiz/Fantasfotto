# La Gazzetta dello Sfottò — spec di restyling mobile

Documento di lavoro: raccoglie le decisioni prese in chat prima di toccare codice. Riferimento per le prossime sessioni, non per gli utenti finali.

## Obiettivo

Riorganizzare la Gazzetta sull'impianto di navigazione di Leghe Fantacalcio (l'app ufficiale su cui gioca già tutta la lega), così i nuovi utenti non si disorientano, ma con lo stile editoriale/satirico che è l'identità del progetto — palette carta-rosa/rosso-stampa/inchiostro, font Anton/Oswald/Libre Baskerville, timbri, sheet, non il blu corporate dell'app ufficiale. Si copiano i pattern di componente (dove sta un dato, come si presenta uno scontro, come si segnala "sei tu"), non la grafica.

Priorità dichiarata dall'utente: la PWA deve sembrare il più possibile un'app nativa, non solo un sito responsive.

## Stato implementazione (aggiornato 2026-09-09)

Il restyling di navigazione/header/Dashboard è **portato in codice reale**, non solo nel mockup. Committato su `frontend/src/`:

- `App.jsx` — routing a 5 route sotto `AppShell` (`/`, `/gazzetta`, `/lega`, `/gioca`, `/squadre`) + `/profilo` + `/login` fuori shell.
- `AppHeader.jsx` — hamburger che apre `Drawer.jsx` (stato sollevato in `AppShell.jsx` così scrim/drawer coprono tutto lo schermo, non solo l'header).
- `Drawer.jsx` (nuovo) — profilo/logout + pallino tema con popover di 5 colori, cambio live via `--stamp-red` (solo client-side, nessuna persistenza — è un piccolo prototipo dell'idea, non il sistema di temi vero e proprio: vedi sezione Temi colore per il chiarimento sullo scope).
- `BottomNav.jsx` — 5 tab con pillola scivolante (`translateX`), sfondo nero pastello, attivo in oro.
- `Dashboard.jsx` (nuovo, sostituisce `Home.jsx`) — card squadra propria (stemma/nome/owner), stat-strip, match-preview col prossimo scontro + countdown, teaser ultima edizione, ticker ultimi verdetti, sheet con tutti gli scontri della giornata.
- `Lega.jsx` (nuovo, placeholder onesto) — mostra solo la classifica a punti fantacalcistici già calcolata dal backend (`tabellone`), riga propria evidenziata con bordo `--stamp-red`. Punti-lega V/N/P e calendario stagione completo **non ancora mostrati**: mancano nel modello dati (vedi Task 4 sotto), meglio non inventare dati.
- `global.css` — trattamento rosa+contorno nero su titoli/testata/nomi squadra/verdetti, nav bar `#2b2b30`, pillola bottom nav, blocco drawer/scrim/tema-dot/tema-popover, `touch-action`/`user-select` estesi a tutti gli elementi tappabili del nuovo drawer.

`Gazzetta` (`/gazzetta`) e `Gioca` (`/gioca`) al momento **riusano `Ultima.jsx` e `Verdetti.jsx` invariati** (solo rimontati sulle nuove route) — la fusione concettuale descritta sotto (Gazzetta = solo lettura, Gioca = schedina + voto) non è ancora stata realizzata nel codice, resta descrizione del target.

**Housekeeping da fare manualmente**: `frontend/src/pages/Home.jsx` non è più importato da nessuna route, è codice morto — da cancellare a mano (nessun comando di cancellazione disponibile da qui).

## Bottom nav (5 tab) + hamburger — fatto

`Dashboard · Gazzetta · Lega · Gioca · Squadre`

Il Profilo esce dalla bottom nav e va nel menu hamburger in alto a sinistra dell'header (dati utente, gestione squadra, logout) — libera spazio e rispecchia il pattern dell'app ufficiale (loro non hanno Profilo in bottom nav).

Nel drawer, vicino al nome utente e a confine con il bordo destro del menu: un piccolo pulsante rotondo, prototipo del futuro selettore temi (vedi sezione dedicata sotto per lo scope). Implementato in `Drawer.jsx`.

### Dashboard — fatto
Scroll con, in ordine: card squadra propria (stat-strip + match-preview + countdown), teaser dell'ultima edizione (titolo, occhiello, incipit), ticker degli ultimi verdetti (tappabile verso Gioca). Card della schedina di giornata **non ancora aggiunta** (Task 4, schedina non esiste ancora).

### Gazzetta (fusione Ultima + Verdetti) — non ancora fuso, solo rimontato
Target: solo lettura in cima, gioco sociale sotto: articolo completo dell'ultima edizione, poi archivio delle edizioni passate. **I Verdetti (voto sociale) si spostano nella tab Gioca**, qui non si vota più nulla — Gazzetta = si legge. Oggi `Ultima.jsx` è semplicemente montato su `/gazzetta` senza modifiche.

### Lega (fusione Classifica + Calendario) — parziale
Scroll unico: classifica in cima (ordinata per punti lega V/N/P, punteggio fantacalcistico totale come colonna secondaria; riga dell'utente evidenziata con bordo sinistro `--stamp-red` — **fatto**), calendario dell'intera stagione sotto (visibile dall'inizio, risultati vuoti per giornate non giocate, doppia numerazione "N di Lega — M di Serie A" come fa l'app ufficiale) — **non ancora, serve prima il modello dati V/N/P (Task 4)**.

Widget in più da valutare: "form guide" a pallini (ultimi 5 incontri per squadra, cerchietti pieni rosso/grigio) accanto a ogni riga in classifica — pattern loro, economico da costruire.

### Gioca (schedina + verdetti/voto squadre) — non ancora, `Verdetti.jsx` invariato
Target: scroll unico, schedina della giornata corrente in cima (se attiva — è facoltativa, mai un blocco per l'utente), Verdetti da votare sotto (Fenomeno, Bidone, categorie varie — solo sulla giornata/edizione corrente, non sull'archivio). Oggi `/gioca` mostra solo `Verdetti.jsx` invariato, nessuna schedina.

**Meccanica schedina** (decisa in chat, niente valuta — da costruire, Task 4):
- multipla su tutti gli scontri della giornata corrente (non su singole partite separate)
- quote 1/X/2 calcolate dal distacco in classifica tra le due squadre (formula di partenza da affinare in fase di codice: favorita `1.80 − 0.08×distacco` min 1.20, sfavorita `1.80 + 0.25×distacco` max 6.00, pareggio `~3.00` che cresce leggermente col distacco)
- nessuna valuta/puntata, nessun punteggio pronostico da tracciare
- esito archiviato solo come **vinta** (tutta la multipla azzeccata) o **persa**
- chi vince quella giornata diventa il **Re dei Gufi**, calcolato in automatico (non scelto a mano come Fenomeno/Bidone) e citato nell'articolo — si aggancia al form "Nuova Edizione" già esistente, come terzo "premio automatico" accanto a vincitore/ultimo

### Squadre
Invariata nella sostanza: stemma, nome, allenatori (uno o più — il modello dati lo supporta già, `User.squadra` → molti utenti possono puntare alla stessa Squadra, l'endpoint `/squadre/:id` già restituisce `allenatori` al plurale), rosa, Albo dei Trofei della stagione.

## Temi colore — chiarimento scope (importante, letto male una volta)

**Il sistema di temi vero e proprio resta rimandato a dopo, per intero.** L'utente ha ribadito che un "tema" nella sua idea non è solo un colore d'accento: cambia sfondo, accent, font, menu, dashboard — è una feature ampia e trasversale a tutta la UI, non un dettaglio cosmetico.

Quello che esiste oggi in `Drawer.jsx` (pallino + popover di 5 colori che cambiano live `--stamp-red`) è **solo un piccolo prototipo dell'idea**, lasciato così com'è perché già realizzato, ma **non va esteso né completato ora** — non aggiungere altre variabili CSS al cambio-tema, non toccare font/sfondo/menu da lì finché non si riprende in modo esplicito. Quando si riprende il lavoro sul tema vero, va probabilmente ripensato più a fondo (quali variabili tocca, dove si applica, come si struttura), non semplicemente "aggiungere altre righe" al meccanismo attuale.

Aggancio prodotto pensato per dopo, **non implementato**: in fase di registrazione, chiedere "quale squadra tifi/supporti" e usare quella risposta per pre-impostare il tema (colori sociali della squadra reale, non quella di lega). Indipendentemente da questa scelta iniziale, l'utente resta libero di cambiare tema in qualsiasi momento dal drawer. Serve anche il salvataggio della preferenza lato utente/backend (campo su `User`) perché sopravviva al reload — oggi non c'è, il pallino nel drawer è solo in memoria.

## Modifiche al modello dati necessarie (Task 4, non iniziato)

- **Giornata**: il numero di Serie A **esiste già** (`serieANumero` su `Giornata.js`, verificato leggendo il modello — non va aggiunto). Manca invece l'**esito V/N/P per squadra per ogni scontro** (oggi si traccia solo il punteggio, serve anche vittoria/pareggio/sconfitta per la classifica a punti-lega).
- **Nuovo modello Schedina**: utente, giornata di riferimento, lista pronostici (per ogni scontro della giornata: 1/X/2), esito (vinta/persa/in attesa), timestamp. Le quote si calcolano al volo dalla classifica al momento dell'apertura della schedina, non serve salvarle rigide se non per mostrare "cosa avevi previsto".
- **Edizione**: il campo automatico "Re dei Gufi" (derivato dalle Schedine vinte di quella giornata) da esporre nel form Nuova Edizione e nel render dell'articolo, accanto a vincitore/ultimo/fenomeno/bidone.
- **User**: campo tema/colore preferito, quando si implementerà davvero il sistema di temi (non ora — vedi sezione "Temi colore" sopra).

## Checklist "sembra un'app nativa"

Base PWA già solida (manifest standalone, service worker con cache-first shell + network-first API e fallback offline, banner di installazione custom). Da aggiungere:

1. **Meta tag iOS in `index.html`**: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (`black-translucent`, sfruttando il `viewport-fit=cover` già presente), `apple-touch-icon`, `apple-mobile-web-app-title`. — **fatto**, vedi `frontend/index.html`.
2. **`overscroll-behavior`** su html/body per evitare rimbalzo/pull-to-refresh nativo indesiderato che romperebbe l'illusione di app. — **fatto**, vedi `frontend/src/styles/global.css`.
3. **`touch-action: manipulation`** e `-webkit-touch-callout: none` / `user-select: none` su bottoni, tab, nav — evita zoom da doppio tap e menu "copia" accidentali. — **fatto**, esteso anche agli elementi del drawer/tema.
4. **Splash statico all'apertura, animato**: sostituito il `return null` di `AppShell.jsx` con `Splash.jsx` — il nome della testata si "stampa" a timbro. — **fatto**.
5. **Icona maskable** per Android (variante con margine di sicurezza + `"purpose": "maskable"` nel manifest), oltre alle 192/512 esistenti. — non ancora, le icone base 192/512 mancano tuttora (lo diceva già il README della repo).
6. **Indicatore attivo nella bottom nav che scivola** (pillola in `transform: translateX` sotto l'icona attiva) invece del puntino che appare/scompare secco. — **fatto**, `BottomNav.jsx`.
7. **Transizioni tra tab** via View Transitions API (poche righe JS, degrada senza rischi dove non supportata) per un crossfade fluido al posto del cambio istantaneo attuale. — non ancora.
8. **Feedback tattile coerente**: estendere il pattern `:active { transform: translate(2px,2px) }` già usato sui bottoni a tutte le righe tappabili (squadra-riga, archivio-item), oggi incoerente tra sezioni. — non ancora.
9. Skeleton di caricamento (pattern già esistente) da replicare identico per le nuove tab Lega e Gioca. — non ancora.

Evitare: librerie di animazione pesanti (GSAP, Framer Motion), pull-to-refresh custom, punteggi/classifiche/valute per la schedina — restare vanilla JS/CSS per tenere il progetto sostenibile nel tempo libero disponibile.

## Mockup approvati — portati in React

Dashboard + header/hamburger + bottom nav, prototipati in un artifact pubblicato in chat, poi **riportati identici nei componenti React** (vedi "Stato implementazione" sopra):

- Bottom nav: sfondo **nero pastello** (`#2b2b30`, non il marrone-inchiostro `--ink` né nero puro), pillola attiva in bianco trasparente (`rgba(255,255,255,.09)`), icona/etichetta attiva in **oro** (`--gold`), etichette inattive in rosa translucido.
- Tutte le scritte color rosa (ereditate o esplicite: titolo testata, nome squadra, titolo articolo, titoletti sezione, chip verdetti, pillola countdown, nome utente nel drawer) hanno un **filo nero sottile** (`text-stroke: 0.4px var(--ink)`, più un doppio drop-shadow per le icone SVG) per staccare meglio dallo sfondo.
- **Da accentuare ancora di più** (rimandato dall'utente a una prossima sessione, non urgente): lo stroke nero sul titolo dell'articolo (`.article h3`) e sul nome della squadra (`.squadra-nome`) — l'utente vuole un contrasto più marcato lì rispetto al resto. Non ancora fatto, deliberatamente rimandato.

## Aperto per quando si scrive codice

- Task 4 completo: campo V/N/P su Giornata, modello Schedina, campo Re dei Gufi su Edizione — poi Lega e Gioca si possono finire davvero.
- Formula definitiva delle quote schedina (quella sopra è solo un punto di partenza).
- Se e come mostrare il "form guide" a pallini in Lega.
- Dettaglio dell'animazione di apertura (durata, se si vede a ogni avvio o solo al primo).
- Sistema di temi vero (sfondo/accent/font/menu/dashboard, non solo `--stamp-red`): persistenza lato backend e aggancio alla registrazione — vedi sezione "Temi colore" sopra, resta esplicitamente rimandato, non va esteso senza che l'utente lo richieda di nuovo.
- Stroke più marcato su titolo articolo e nome squadra (vedi sopra).
- Cancellare manualmente `frontend/src/pages/Home.jsx` (codice morto, sostituito da `Dashboard.jsx`).