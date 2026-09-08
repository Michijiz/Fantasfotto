const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken, richiedeAdmin } = require('../middleware/auth');
const {
  lista, dettaglio, crea, classifica, aggiornaMiaSquadra
} = require('../controllers/squadreController');

const router = express.Router();

// La lista squadre serve anche in fase di registrazione (per scegliere la squadra),
// quindi non richiede autenticazione.
router.get('/', asyncHandler(lista));
router.get('/classifica', verificaToken, asyncHandler(classifica));
router.get('/:id', verificaToken, asyncHandler(dettaglio));
router.post('/', verificaToken, richiedeAdmin, asyncHandler(crea));
router.patch('/mia', verificaToken, asyncHandler(aggiornaMiaSquadra));

module.exports = router;
