const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const { caricaBuffer, configurato, variabiliMancanti, diagnosi, ping } = require('../services/cloudinary');

// Le funzioni Vercel rifiutano body oltre 4,5 MB prima ancora di arrivare qui:
// il limite resta sotto quella soglia così l'errore è sempre leggibile.
// Il frontend (ImageUpload) ridimensiona comunque le foto prima di inviarle.
const MAX_BYTES = 4 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);

    // Alcuni selettori di file Android consegnano la foto con mimetype vuoto o
    // `application/octet-stream`: il controllo sul solo mimetype la rifiutava
    // come "non immagine". Se il nome ha un'estensione da immagine si passa: a
    // decidere davvero sarà Cloudinary, che il contenuto lo guarda sul serio.
    const estensione = /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?)$/i.test(file.originalname || '');
    const genericoPlausibile = !file.mimetype || file.mimetype === 'application/octet-stream';
    if (estensione && genericoPlausibile) return cb(null, true);

    const err = new Error('Puoi caricare solo immagini');
    err.status = 400;
    cb(err);
  }
});

// multer lavora sullo stream della richiesta: se il body è già stato consumato
// (o è arrivato troncato) fallisce con "Unexpected end of form", che senza
// traduzione diventava un 500 anonimo lato client.
const leggiFile = (req, res, next) => {
  upload.single('immagine')(req, res, (err) => {
    if (!err) return next();
    if (err.name === 'MulterError' || err.status) return next(err);

    const messaggio = String(err.message || '');
    if (/unexpected end of form|stream ended unexpectedly|boundary/i.test(messaggio)) {
      err.status = 400;
      err.message = 'Immagine ricevuta incompleta: riprova a caricarla';
    }
    next(err);
  });
};

// Cartelle su Cloudinary: il client dice a cosa serve l'immagine, il server
// sceglie dove metterla. Un valore sconosciuto finisce nella cartella generica.
const CARTELLE = {
  squadre: 'fantasfotto/squadre',
  albo: 'fantasfotto/albo',
  edizioni: 'fantasfotto/edizioni'
};

const router = express.Router();

// Diagnostica: dice se le credenziali Cloudinary sono presenti sull'ambiente,
// senza mai esporne il valore. Serve a capire in un colpo solo se un upload
// fallito è un problema di configurazione o di file.
router.get('/stato', verificaToken, asyncHandler(async (req, res) => {
  res.json({
    configurato: configurato(),
    variabiliMancanti: variabiliMancanti(),
    // lunghezze e spazi/virgolette di troppo, mai i valori
    variabili: diagnosi(),
    // interroga Cloudinary: distingue "credenziali sbagliate" da "file rifiutato"
    cloudinary: await ping()
  });
}));

router.post('/', verificaToken, leggiFile, asyncHandler(async (req, res) => {
  if (!configurato()) {
    return res.status(503).json({
      errore: `Upload immagini non configurato sul server (mancano: ${variabiliMancanti().join(', ')})`
    });
  }

  if (!req.file) return res.status(400).json({ errore: 'Nessuna immagine ricevuta' });
  if (!req.file.buffer || req.file.buffer.length === 0) {
    return res.status(400).json({ errore: 'Immagine vuota' });
  }

  try {
    const cartella = CARTELLE[String(req.body?.cartella || '')] || 'fantasfotto';
    const risultato = await caricaBuffer(req.file.buffer, cartella);
    res.json({ url: risultato.secure_url });
  } catch (err) {
    // Gli errori di Cloudinary (chiavi sbagliate, quota, formato rifiutato) non
    // sono colpa del nostro server: passano come 502 con il motivo leggibile,
    // invece che come "Errore interno del server".
    console.error('[upload] Cloudinary ha rifiutato il file:', err);
    const motivo = err?.error?.message || err?.message || 'motivo sconosciuto';
    const e = new Error(`Servizio immagini non disponibile: ${motivo}`);
    e.status = 502;
    e.esposto = true; // il motivo di Cloudinary è leggibile e non contiene segreti
    throw e;
  }
}));

module.exports = router;
