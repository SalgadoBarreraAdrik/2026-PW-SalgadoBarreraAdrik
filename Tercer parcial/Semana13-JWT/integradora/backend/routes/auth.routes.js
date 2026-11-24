const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { requiereJWT } = require('../middleware/jwt.middleware');

router.post('/login', controller.login); // pública: aquí se obtiene el token
router.post('/refresh', requiereJWT, controller.refresh); // solo con un token todavía válido
router.get('/yo', requiereJWT, controller.yo);

module.exports = router;
