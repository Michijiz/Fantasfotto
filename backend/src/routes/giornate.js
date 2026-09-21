const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken, richiedeAdmin, richiedeRedazione } = require('../middleware/auth');
const {
  lista, prossima, crea, salva, aggiorna, elimina
} = require('../controllers/giornateController');

const router = express.Router();

router.get('/', verificaToken, asyncHandler(lista));
router.get('/prossima', verificaToken, asyncHandler(prossima));
router.post('/', verificaToken, richiedeRedazione, asyncHandler(crea));
router.put('/numero/:numero', verificaToken, richiedeRedazione, asyncHandler(salva));
router.patch('/:id', verificaToken, richiedeRedazione, asyncHandler(aggiorna));
router.delete('/:id', verificaToken, richiedeAdmin, asyncHandler(elimina));

module.exports = router;
