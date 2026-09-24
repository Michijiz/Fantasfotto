const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken, richiedeAdmin } = require('../middleware/auth');
const { leggi, aggiorna } = require('../controllers/legaController');

const router = express.Router();

// Il nome serve anche alla schermata di accesso: la lettura è pubblica.
router.get('/', asyncHandler(leggi));
router.patch('/', verificaToken, richiedeAdmin, asyncHandler(aggiorna));

module.exports = router;
