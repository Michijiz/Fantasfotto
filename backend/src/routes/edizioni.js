const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken, richiedeAdmin, richiedeRedazione } = require('../middleware/auth');
const {
  lista, ultima, crea, aggiorna, elimina
} = require('../controllers/edizioniController');

const router = express.Router();

router.get('/', verificaToken, asyncHandler(lista));
router.get('/ultima', verificaToken, asyncHandler(ultima));
router.post('/', verificaToken, richiedeRedazione, asyncHandler(crea));
router.put('/:id', verificaToken, richiedeRedazione, asyncHandler(aggiorna));
router.delete('/:id', verificaToken, richiedeAdmin, asyncHandler(elimina));

module.exports = router;
