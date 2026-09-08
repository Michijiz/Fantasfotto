// Evita try/catch ripetuti in ogni controller: inoltra l'errore a next() così finisce
// nel middleware di gestione errori centralizzato.
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
