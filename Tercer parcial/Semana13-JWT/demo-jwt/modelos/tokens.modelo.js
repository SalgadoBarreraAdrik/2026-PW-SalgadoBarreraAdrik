// Lista negra de tokens (tabla tokens_revocados). Solo se usa cuando config.jwtRevocar es true.
// Guardamos el jti (el id único de cada token), NO el token completo.
function crearModeloTokens(pool) {
  // exp viene en SEGUNDOS desde 1970 (como lo pone jwt.sign); MySQL quiere una fecha.
  // INSERT IGNORE: si el mismo token cierra sesión dos veces, no truena por la llave primaria.
  async function revocar(jti, usuario, exp) {
    await pool.query('INSERT IGNORE INTO tokens_revocados (jti, usuario, expira) VALUES (?, ?, ?)', [
      jti,
      usuario,
      new Date(exp * 1000),
    ]);
  }

  // Consulta parametrizada por jti: se llama en CADA petición con token, por eso jti es la llave primaria.
  async function estaRevocado(jti) {
    const [filas] = await pool.query('SELECT 1 FROM tokens_revocados WHERE jti = ? LIMIT 1', [jti]);
    return filas.length > 0;
  }

  // Para la tabla de la página (diagnóstico).
  async function listar() {
    const [filas] = await pool.query(
      'SELECT jti, usuario, expira, revocado_en FROM tokens_revocados ORDER BY revocado_en DESC, jti'
    );
    return filas;
  }

  return { revocar, estaRevocado, listar };
}

module.exports = { crearModeloTokens };
