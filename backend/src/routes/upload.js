const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const { caricaBuffer } = require('../services/cloudinary');

// Le funzioni Vercel rifiutano body oltre 4,5 MB prima ancora di arrivare qui:
// il limite resta sotto quella soglia così l'errore è sempre leggibile.
// Il frontend (ImageUpload) ridimensiona comunque le foto prima di inviarle.
const MAX_BYTES = 4 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    const err = new Error('Puoi caricare solo immagini');
    err.status = 400;
    cb(err);
  }
});

const router = express.Router();

router.post('/', verificaToken, upload.single('immagine'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ errore: 'Nessuna immagine ricevuta' });

  const risultato = await caricaBuffer(req.file.buffer);
  res.json({ url: risultato.secure_url });
}));

module.exports = router;
