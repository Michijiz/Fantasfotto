const jwt = require('jsonwebtoken');

function richiediAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ errore: 'Token mancante' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.utente = payload; // { id, username, ruolo }
    next();
  } catch (e) {
    return res.status(401).json({ errore: 'Sessione scaduta, rifai il login' });
  }
}

function richiediAdmin(req, res, next) {
  if (req.utente?.ruolo !== 'admin') {
    return res.status(403).json({ errore: 'Solo il direttore può fare questa operazione' });
  }
  next();
}

module.exports = { richiediAuth, richiediAdmin };
