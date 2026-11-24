// Middleware que protege las rutas con JWT.
// 401 = "no sé quién eres": falta el token, está alterado, se firmó con otro secreto o ya venció.
// Si es válido, deja el payload en req.usuario para el siguiente paso.
const jwt = require('jsonwebtoken');

function requiereJWT(req, res, next) {
  const encabezado = req.headers.authorization || '';
  if (!encabezado.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta el token (encabezado Authorization: Bearer ...)' });
  }
  const token = encabezado.slice('Bearer '.length).trim();

  try {
    // algorithms: el servidor decide el algoritmo; así un token con "alg": "none" no pasa.
    req.usuario = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado: vuelve a iniciar sesión' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// 403 = "sé quién eres, pero tu rol no alcanza". Va siempre DESPUÉS de requiereJWT.
function requiereRol(rol) {
  return (req, res, next) => {
    if (req.usuario.rol !== rol) {
      return res.status(403).json({ error: `Solo ${rol} puede hacer esto` });
    }
    next();
  };
}

module.exports = { requiereJWT, requiereRol };
