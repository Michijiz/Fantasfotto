// Gestore errori centralizzato: ogni controller passa gli errori con next(err) o li
// lascia propagare da asyncHandler. Nessun altro posto nel codice deve fare
// res.status(500) a mano, così i messaggi restano coerenti.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.code === 11000) {
    const campo = Object.keys(err.keyPattern || {})[0] || 'valore';
    return res.status(409).json({ errore: `${campo} già in uso` });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ errore: err.message });
  }

  // Id Mongo malformato in URL o body (es. /api/edizioni/abc).
  if (err.name === 'CastError') {
    return res.status(400).json({ errore: 'Identificativo non valido' });
  }

  // Errori di multer (upload): il limite di dimensione è in routes/upload.js.
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ errore: 'Immagine troppo grande: massimo 4 MB' });
    }
    return res.status(400).json({ errore: 'Upload non valido' });
  }

  // Body JSON malformato o oltre il limite di express.json().
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ errore: 'Richiesta non valida' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ errore: 'Richiesta troppo grande' });
  }

  const status = err.status || err.statusCode || 500;

  // I dettagli degli errori interni (Mongo, Cloudinary...) restano nei log di
  // Vercel: al client arriva solo un messaggio generico.
  if (status >= 500) {
    console.error(err);
    return res.status(status).json({ errore: 'Errore interno del server' });
  }

  res.status(status).json({ errore: err.message });
}

module.exports = errorHandler;
