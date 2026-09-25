const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verificaToken } = require('../middleware/auth');
const { profilo } = require('../controllers/utentiController');

const router = express.Router();

// Il profilo degli altri si vede solo da dentro la lega.
router.get('/:id', verificaToken, asyncHandler(profilo));

module.exports = router;
