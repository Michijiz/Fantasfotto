const jwt = require('jsonwebtoken');

function verificaToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ errore: 'Token mancante' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.utente = payload; // { id, username, ruolo, squadra }
    next();
  } catch (err) {
    return res.status(401).json({ errore: 'Token non valido o scaduto' });
  }
}

function richiedeAdmin(req, res, next) {
  if (req.utente?.ruolo !== 'admin') {
    return res.status(403).json({ errore: 'Azione riservata al direttore di turno' });
  }
  next();
}

module.exports = { verificaToken, richiedeAdmin };
