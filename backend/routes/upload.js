const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { richiediAuth } = require('../middleware/auth');

const router = express.Router();

// Il file resta in memoria (buffer) giusto il tempo di inoltrarlo a Cloudinary,
// non viene mai scritto su disco. Limite 5MB per evitare upload esagerati.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Puoi caricare solo immagini'));
    }
    cb(null, true);
  }
});

// POST /api/upload  (form-data, campo "immagine")
router.post('/', richiediAuth, (req, res) => {
  upload.single('immagine')(req, res, async (err) => {
    if (err) return res.status(400).json({ errore: err.message || 'Errore nel file caricato' });
    if (!req.file) return res.status(400).json({ errore: 'Nessuna immagine ricevuta' });

    try {
      const risultato = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'fantasfotto', resource_type: 'image' },
          (errore, result) => (errore ? reject(errore) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      res.json({ url: risultato.secure_url });
    } catch (e) {
      res.status(500).json({ errore: 'Errore durante il caricamento su Cloudinary' });
    }
  });
});

module.exports = router;
