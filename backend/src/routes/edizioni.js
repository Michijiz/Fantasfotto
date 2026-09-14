const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken, richiedeAdmin } = require('../middleware/auth');
const {
  lista, ultima, dettaglio, crea, aggiorna, elimina
} = require('../controllers/edizioniController');

const router = express.Router();

router.get('/', verificaToken, asyncHandler(lista));
router.get('/ultima', verificaToken, asyncHandler(ultima));
router.get('/:id', verificaToken, asyncHandler(dettaglio));
router.post('/', verificaToken, richiedeAdmin, asyncHandler(crea));
router.put('/:id', verificaToken, richiedeAdmin, asyncHandler(aggiorna));
router.delete('/:id', verificaToken, richiedeAdmin, asyncHandler(elimina));

module.exports = router;
