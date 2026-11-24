// CRUD de usuarios. Rechaza datos inválidos con 400 aunque la petición no venga del front.
const bcrypt = require('bcryptjs');
const usuariosModel = require('../models/usuarios.model');
const { validarCorreo, validarBoleta, validarContrasena, ROLES } = require('../validaciones');

// MySQL avisa con ER_DUP_ENTRY cuando el correo o la boleta ya existen (son UNIQUE).
function esDuplicado(error) {
  return error && error.code === 'ER_DUP_ENTRY';
}

function idValido(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'id inválido' });
    return null;
  }
  return id;
}

module.exports = {
  async listar(req, res, next) {
    try {
      res.json(await usuariosModel.listar());
    } catch (error) {
      next(error);
    }
  },

  async obtener(req, res, next) {
    try {
      const id = idValido(req, res);
      if (id === null) return;
      const usuario = await usuariosModel.buscarPorId(id);
      if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(usuario);
    } catch (error) {
      next(error);
    }
  },

  async crear(req, res, next) {
    try {
      const { nombre, correo, contrasena, boleta, rol = 'alumno' } = req.body || {};
      if (!nombre || typeof nombre !== 'string') return res.status(400).json({ error: 'El nombre es obligatorio' });
      if (!validarCorreo(correo)) return res.status(400).json({ error: 'El correo no tiene un formato válido' });
      if (!validarBoleta(boleta)) return res.status(400).json({ error: 'La boleta debe tener 10 dígitos' });
      if (!validarContrasena(contrasena)) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      }
      if (!ROLES.includes(rol)) return res.status(400).json({ error: `El rol debe ser: ${ROLES.join(' o ')}` });

      const contrasenaHash = await bcrypt.hash(contrasena, 10);
      const nuevo = await usuariosModel.crear({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasenaHash,
        boleta: boleta.trim(),
        rol,
      });
      res.status(201).json(nuevo);
    } catch (error) {
      if (esDuplicado(error)) return res.status(409).json({ error: 'El correo o la boleta ya están registrados' });
      next(error);
    }
  },

  async actualizar(req, res, next) {
    try {
      const id = idValido(req, res);
      if (id === null) return;
      const { nombre, correo, rol } = req.body || {};
      if (!nombre || typeof nombre !== 'string') return res.status(400).json({ error: 'El nombre es obligatorio' });
      if (!validarCorreo(correo)) return res.status(400).json({ error: 'El correo no tiene un formato válido' });
      if (!ROLES.includes(rol)) return res.status(400).json({ error: `El rol debe ser: ${ROLES.join(' o ')}` });

      const actualizado = await usuariosModel.actualizar(id, { nombre: nombre.trim(), correo: correo.trim(), rol });
      if (!actualizado) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(actualizado);
    } catch (error) {
      if (esDuplicado(error)) return res.status(409).json({ error: 'El correo ya está registrado' });
      next(error);
    }
  },

  async eliminar(req, res, next) {
    try {
      const id = idValido(req, res);
      if (id === null) return;
      // Evita que el admin se borre a sí mismo y se quede sin forma de entrar.
      if (String(id) === String(req.usuario.sub)) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      }
      const borrado = await usuariosModel.eliminar(id);
      if (!borrado) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
};
