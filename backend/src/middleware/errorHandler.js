// Gestore errori centralizzato: ogni controller passa gli errori con next(err) o li
// lascia propagare da asyncHandler. Nessun altro posto nel codice deve fare
// res.status(500) a mano, così i messaggi restano coerenti.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  if (err.code === 11000) {
    const campo = Object.keys(err.keyPattern || {})[0] || 'valore';
    return res.status(409).json({ errore: `${campo} già in uso` });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ errore: err.message });
  }

  res.status(err.status || 500).json({ errore: err.message || 'Errore interno del server' });
}

module.exports = errorHandler;
