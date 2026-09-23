const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const { registrati, login, me, aggiornaTema, aggiornaProfilo } = require('../controllers/authController');

const router = express.Router();

router.post('/registrati', asyncHandler(registrati));
router.post('/login', asyncHandler(login));
router.get('/me', verificaToken, asyncHandler(me));
router.patch('/tema', verificaToken, asyncHandler(aggiornaTema));
router.patch('/profilo', verificaToken, asyncHandler(aggiornaProfilo));

module.exports = router;
