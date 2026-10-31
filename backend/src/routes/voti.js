const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken, richiedeRedazione } = require('../middleware/auth');
const { categorie, vota, risultati, trofei, chiusura } = require('../controllers/votiController');

const router = express.Router();

router.get('/categorie', categorie);
router.get('/trofei', verificaToken, asyncHandler(trofei));
router.post('/', verificaToken, asyncHandler(vota));
router.post('/:edizioneId/chiusura', verificaToken, richiedeRedazione, asyncHandler(chiusura));
router.get('/:edizioneId', verificaToken, asyncHandler(risultati));

module.exports = router;
