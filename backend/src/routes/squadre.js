const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const {
  lista, classifica, aggiornaMiaSquadra
} = require('../controllers/squadreController');

const router = express.Router();

// La lista squadre serve anche in fase di registrazione (per scegliere la squadra),
// quindi non richiede autenticazione.
router.get('/', asyncHandler(lista));
router.get('/classifica', verificaToken, asyncHandler(classifica));
router.patch('/mia', verificaToken, asyncHandler(aggiornaMiaSquadra));

// Nessun POST: le squadre non si creano dall'app (vedi squadreController).

module.exports = router;
