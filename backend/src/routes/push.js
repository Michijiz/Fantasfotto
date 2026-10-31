const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const { chiave, iscrivi, disiscrivi } = require('../controllers/pushController');

const router = express.Router();

router.get('/chiave', verificaToken, chiave);
router.post('/iscrivi', verificaToken, asyncHandler(iscrivi));
router.post('/disiscrivi', verificaToken, asyncHandler(disiscrivi));

module.exports = router;
