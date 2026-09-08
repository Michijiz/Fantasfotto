const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const { categorie, vota, risultati } = require('../controllers/votiController');

const router = express.Router();

router.get('/categorie', categorie);
router.post('/', verificaToken, asyncHandler(vota));
router.get('/:edizioneId', verificaToken, asyncHandler(risultati));

module.exports = router;
