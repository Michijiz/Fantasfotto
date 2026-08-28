# La Gazzetta dello Sfottò — PWA lega fantacalcio

PWA in stile giornale scandalistico per la vostra lega, con autenticazione utente e mini-giochi di voto ("più culo", "bidone", "blessed", ecc.).

## Struttura

```
fantagazzetta/
  backend/        Node.js + Express + MongoDB (API)
  frontend/       PWA vanilla JS (nessun build tool, come IKARO)
```

## Backend — setup locale

```bash
cd backend
npm install
cp .env.example .env
# modifica .env con la tua MONGODB_URI (MongoDB Atlas, free tier va benissimo)
npm run dev
```

Il primo utente che si registra diventa automaticamente **direttore (admin)** — è lui/lei che pubblica le edizioni.

`LEGA_INVITE_CODE` nel `.env` è il codice che gli amici devono inserire per iscriversi: cambialo prima di condividerlo.

## Backend — deploy su Vercel

```bash
cd backend
vercel
```

Imposta le stesse variabili d'ambiente (`MONGODB_URI`, `JWT_SECRET`, `LEGA_INVITE_CODE`) nel pannello Vercel del progetto. Il `vercel.json` incluso instrada `/api/*` verso `server.js` come funzione serverless.

## Frontend

Modifica in `app.js` la costante `API_BASE` se il tuo backend non è sullo stesso dominio del frontend:

```js
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : '/api'; // oppure 'https://tuo-backend.vercel.app/api'
```

Deploy come sito statico (Vercel, Netlify, GitHub Pages — qualunque static host va bene, come per IKARO). Serve HTTPS perché il service worker lo richiede.

Genera due icone (192x192 e 512x512) e mettile in `frontend/icons/` prima del deploy, altrimenti il manifest fallisce il controllo PWA su alcuni browser.

## Come funziona il voto

Ogni categoria (culo, bidone, peggiore, blessed, coraggiosa, ingiusto, mvp) accetta **un voto per utente per edizione**: se voti di nuovo in una categoria, sposti il voto sul nuovo giocatore invece di sommarlo. Il vincolo è a livello di database (indice unico su edizione+categoria+votante), non solo lato UI.

Le votazioni restano aperte finché non viene pubblicata l'edizione successiva (o finché un admin non imposta `votazioniChiuse: true` sull'edizione, funzione che puoi esporre in UI in seguito se ti serve).

## Prossimi passi possibili

- Chiudere automaticamente le votazioni quando esce la nuova edizione
- Notifiche push quando esce una nuova edizione (richiede VAPID keys + backend push)
- Statistiche stagionali più ricche nell'Albo (streak di bidoni consecutivi, ecc.)
- Upload avatar reali invece di iniziali/emoji
