# La Gazzetta dello Sfottò

App satirica per fantacalcio, in stile quotidiano sportivo/tabloid.

Riscritta da zero (settembre 2026): stessa identità visiva di sempre, ma frontend e
backend completamente nuovi.

## Stack

- **frontend/** — Vite + React (SPA), routing con react-router, stato condiviso via
  Context (autenticazione, dati di lega, toast). Stile portato 1:1 dalla vecchia
  versione in `frontend/src/styles/global.css`.
- **backend/** — Express + MongoDB (Mongoose), struttura a livelli
  (routes → controllers → models), JWT + PIN con bcrypt, upload immagini su
  Cloudinary.

## Avvio in locale

```bash
# Backend
cd backend
cp .env.example .env   # compila MONGODB_URI, JWT_SECRET, CODICE_INVITO
npm install
npm run seed            # crea le 8 squadre di base, solo la prima volta
npm run dev              # http://localhost:3001

# Frontend (in un altro terminale)
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## Cosa manca ancora (prossimi passi)

- Upload immagini nel form "Nuova edizione" e nel profilo squadra (l'endpoint
  `/api/upload` c'è già, va solo collegato ai form).
- Import calendario giornate da CSV/Excel (per ora le giornate/accoppiamenti si
  creano solo via API, non c'è ancora un form admin dedicato).
- Generazione articolo assistita da LLM (per ora il testo dell'edizione è scritto
  a mano dal direttore di turno nel form "Nuova edizione").
- Icone PWA (`frontend/public/icons/icon-192.png` e `icon-512.png`, richiamate dal
  manifest ma non ancora presenti).

## Pulizia della vecchia versione

Le cartelle `backend/` e `frontend/` contenevano la vecchia app vanilla-JS. Il nuovo
codice è tutto sotto `backend/src/` e `frontend/src/` (+ `frontend/public/`): i file
vecchi elencati di seguito possono essere cancellati.
