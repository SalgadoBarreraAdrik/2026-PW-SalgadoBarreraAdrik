// Modelo de usuarios (MySQL). Siempre consultas parametrizadas con ? (nunca se pega texto en el SQL).
// Ninguna función devuelve contrasena_hash, salvo buscarPorCorreoConHash, que solo usa el login.
const pool = require('../db-local');

const COLUMNAS = 'id, nombre, correo, boleta, rol';

module.exports = {
  async listar() {
    const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM usuarios ORDER BY id`);
    return filas;
  },

  async buscarPorId(id) {
    const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM usuarios WHERE id = ?`, [id]);
    return filas[0] || null;
  },

  async crear({ nombre, correo, contrasenaHash, boleta, rol }) {
    const [resultado] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena_hash, boleta, rol) VALUES (?, ?, ?, ?, ?)',
      [nombre, correo, contrasenaHash, boleta, rol]
    );
    return this.buscarPorId(resultado.insertId);
  },

  async actualizar(id, { nombre, correo, rol }) {
    const [resultado] = await pool.query('UPDATE usuarios SET nombre = ?, correo = ?, rol = ? WHERE id = ?', [
      nombre,
      correo,
      rol,
      id,
    ]);
    if (resultado.affectedRows === 0) return null;
    return this.buscarPorId(id);
  },

  async eliminar(id) {
    const [resultado] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  },

  // Única excepción: regresa el hash para que el login lo compare con bcrypt.compare.
  async buscarPorCorreoConHash(correo) {
    const [filas] = await pool.query(`SELECT ${COLUMNAS}, contrasena_hash FROM usuarios WHERE correo = ?`, [correo]);
    return filas[0] || null;
  },
};
