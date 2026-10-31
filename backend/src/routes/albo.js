const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken, richiedeAdmin, richiedeRedazione } = require('../middleware/auth');
const { lista, crea, aggiorna, elimina, chiudiStagione } = require('../controllers/alboController');

const router = express.Router();

router.get('/', verificaToken, asyncHandler(lista));
router.post('/', verificaToken, richiedeRedazione, asyncHandler(crea));
router.post('/chiudi-stagione', verificaToken, richiedeRedazione, asyncHandler(chiudiStagione));
router.put('/:id', verificaToken, richiedeRedazione, asyncHandler(aggiorna));
router.delete('/:id', verificaToken, richiedeAdmin, asyncHandler(elimina));

module.exports = router;
