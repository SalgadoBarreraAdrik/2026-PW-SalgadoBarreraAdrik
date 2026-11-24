const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarios.controller');
const { requiereJWT, requiereRol } = require('../middleware/jwt.middleware');

// TODO el CRUD pide un token válido (401 sin él). Leer: cualquier usuario con token.
// Crear, editar y borrar: solo admin (403 para otros roles).
router.use(requiereJWT);

router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/', requiereRol('admin'), controller.crear);
router.put('/:id', requiereRol('admin'), controller.actualizar);
router.delete('/:id', requiereRol('admin'), controller.eliminar);

module.exports = router;
