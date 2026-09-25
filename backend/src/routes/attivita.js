const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const { lista } = require('../controllers/attivitaController');

const router = express.Router();

router.get('/', verificaToken, asyncHandler(lista));

module.exports = router;
