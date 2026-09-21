const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const { apertura, salva, perGiornata } = require('../controllers/schedineController');

const router = express.Router();

router.get('/apertura', verificaToken, asyncHandler(apertura));
router.get('/giornata/:numero', verificaToken, asyncHandler(perGiornata));
router.post('/', verificaToken, asyncHandler(salva));

module.exports = router;
