const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const { caricaBuffer } = require('../services/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const router = express.Router();

router.post('/', verificaToken, upload.single('immagine'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ errore: 'Nessuna immagine ricevuta' });

  const risultato = await caricaBuffer(req.file.buffer);
  res.json({ url: risultato.secure_url });
}));

module.exports = router;
