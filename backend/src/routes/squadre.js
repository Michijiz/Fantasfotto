const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const {
  lista, classifica, aggiornaMiaSquadra, aggiungiFoto, didascaliaFoto, togliFoto
} = require('../controllers/squadreController');

const router = express.Router();

// La lista squadre serve anche in fase di registrazione (per scegliere la squadra),
// quindi non richiede autenticazione: senza token risponde solo nome e stemma.
router.get('/', asyncHandler(lista));
router.get('/classifica', verificaToken, asyncHandler(classifica));
router.patch('/mia', verificaToken, asyncHandler(aggiornaMiaSquadra));

// Album della squadra
router.post('/mia/album', verificaToken, asyncHandler(aggiungiFoto));
router.patch('/mia/album/:fotoId', verificaToken, asyncHandler(didascaliaFoto));
router.delete('/:id/album/:fotoId', verificaToken, asyncHandler(togliFoto));

// Nessun POST: le squadre non si creano dall'app (vedi squadreController).

module.exports = router;
