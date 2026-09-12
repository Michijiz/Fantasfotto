const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken, richiedeAdmin } = require('../middleware/auth');
const { lista, prossima, crea, salva, aggiorna } = require('../controllers/giornateController');

const router = express.Router();

router.get('/', verificaToken, asyncHandler(lista));
router.get('/prossima', verificaToken, asyncHandler(prossima));
router.post('/', verificaToken, richiedeAdmin, asyncHandler(crea));
router.put('/numero/:numero', verificaToken, richiedeAdmin, asyncHandler(salva));
router.patch('/:id', verificaToken, richiedeAdmin, asyncHandler(aggiorna));

module.exports = router;
