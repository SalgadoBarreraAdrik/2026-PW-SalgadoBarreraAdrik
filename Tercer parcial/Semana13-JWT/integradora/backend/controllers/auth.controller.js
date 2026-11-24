// Login con JWT: valida correo/contraseña contra la tabla usuarios y, si son correctos, firma un token.
// El servidor no guarda nada de la sesión: todo lo necesario va dentro del token, firmado con JWT_SECRET.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const usuariosModel = require('../models/usuarios.model');
const { validarCorreo } = require('../validaciones');

const EXPIRA_SEG = Number(process.env.JWT_EXPIRA_SEG || 15 * 60);

// El payload se puede leer (base64url), así que solo lleva id, nombre, correo y rol: nunca la contraseña.
function firmarToken(usuario) {
  return jwt.sign(
    { nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: EXPIRA_SEG, subject: String(usuario.id), jwtid: crypto.randomUUID() }
  );
}

module.exports = {
  async login(req, res, next) {
    try {
      const { correo, contrasena } = req.body || {};
      if (!validarCorreo(correo) || typeof contrasena !== 'string' || contrasena === '') {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
      }
      const usuario = await usuariosModel.buscarPorCorreoConHash(correo.trim());
      // Mismo mensaje si el correo no existe o si la contraseña está mal: no revelamos qué correos existen.
      const correcta = usuario && (await bcrypt.compare(contrasena, usuario.contrasena_hash));
      if (!correcta) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

      const { contrasena_hash, ...sinHash } = usuario;
      res.json({ token: firmarToken(sinHash), expiraEnSegundos: EXPIRA_SEG, usuario: sinHash });
    } catch (error) {
      next(error);
    }
  },

  // Renovación básica: con un token TODAVÍA válido (ya lo revisó requiereJWT) entrega uno nuevo.
  // Releemos el usuario de la BD por si cambió su rol o lo borraron mientras tanto.
  async refresh(req, res, next) {
    try {
      const usuario = await usuariosModel.buscarPorId(req.usuario.sub);
      if (!usuario) return res.status(401).json({ error: 'El usuario ya no existe' });
      res.json({ token: firmarToken(usuario), expiraEnSegundos: EXPIRA_SEG });
    } catch (error) {
      next(error);
    }
  },

  // Quién soy según el token (útil para el front).
  yo(req, res) {
    res.json({
      usuario: { id: Number(req.usuario.sub), nombre: req.usuario.nombre, correo: req.usuario.correo, rol: req.usuario.rol },
      expiraEnSegundos: Math.max(0, req.usuario.exp - Math.floor(Date.now() / 1000)),
    });
  },
};
