const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken, richiedeRedazione } = require('../middleware/auth');
const { apertura, salva, impostaBanco, rivela, perGiornata, mie } = require('../controllers/schedineController');

const router = express.Router();

router.get('/apertura', verificaToken, asyncHandler(apertura));
router.get('/mie', verificaToken, asyncHandler(mie));
router.get('/giornata/:numero', verificaToken, asyncHandler(perGiornata));
router.post('/', verificaToken, asyncHandler(salva));
router.put('/banco/:numero', verificaToken, richiedeRedazione, asyncHandler(impostaBanco));
router.post('/rivela/:numero', verificaToken, asyncHandler(rivela));

module.exports = router;
