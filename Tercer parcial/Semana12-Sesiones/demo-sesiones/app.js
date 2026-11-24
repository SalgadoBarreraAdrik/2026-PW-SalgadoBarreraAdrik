// La aplicación de la demo. server.js la arranca; las pruebas la arrancan con otras configuraciones.
// Semana 12: sesiones con cookie. Pasos 1-7 programados en clase (express-session, login/logout,
// requiereSesion (401), requiereRol (403), vencida() y regenerate contra la fijación de sesión).
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { crearModeloUsuarios } = require('./modelos/usuarios.modelo');

const NOMBRE_COOKIE = 'connect.sid';

// Regresa todas las sesiones del almacén (MemoryStore usa callback; MySQLStore regresa una promesa).
function todasLasSesiones(almacen) {
  return new Promise((resolve, reject) => {
    const promesa = almacen.all((error, sesiones) => (error ? reject(error) : resolve(sesiones)));
    if (promesa && typeof promesa.then === 'function') promesa.then(resolve, reject);
  });
}

// pool: la conexión a MySQL (db.js). Los usuarios SIEMPRE se leen de MySQL.
function crearApp(config, pool) {
  const app = express();
  app.use(express.json());
  const usuarios = crearModeloUsuarios(pool);

  // Aquí vive lo que el servidor recuerda de cada sesión:
  //  - 'mysql':   en la tabla sessions. Sobrevive a un reinicio y la puedes ver en Workbench.
  //  - 'memoria': en la memoria del proceso. Si el servidor se reinicia, se pierde todo.
  const almacen =
    config.almacen === 'memoria'
      ? new session.MemoryStore()
      : new MySQLStore({ createDatabaseTable: false, clearExpired: false }, pool);
  app.locals.almacen = almacen;

  app.use(
    session({
      name: NOMBRE_COOKIE,
      secret: process.env.SESSION_SECRET || 'secreto-solo-para-la-demo', // firma la cookie
      store: almacen,
      resave: false,
      saveUninitialized: false, // no crea sesión (ni cookie) hasta que guardamos algo en ella
      rolling: config.rolling,
      cookie: {
        maxAge: config.maxAgeMs,
        httpOnly: config.httpOnly,
        sameSite: config.sameSite,
        secure: false, // en producción va en true (solo viaja por HTTPS); aquí usamos http://localhost
      },
    })
  );

  // Los primeros 8 caracteres del id de sesión, para poder compararlos en pantalla.
  const idCorto = (id) => (id ? `${id.slice(0, 8)}…` : null);

  // ---------- Middlewares de protección ----------

  // ¿Ya venció? Lo revisa el SERVIDOR. Ojo: express-session alarga el vencimiento guardado en el servidor
  // con cada petición aunque rolling sea false; si solo confiáramos en eso, alguien que copió la cookie
  // podría mantener viva la sesión para siempre usándola seguido. Por eso guardamos nuestras propias horas.
  function vencida(sesion) {
    const desde = config.rolling ? sesion.ultimoUso : sesion.creada;
    return Date.now() - desde > config.maxAgeMs;
  }

  // 401: "no sé quién eres" (no hay sesión o ya venció).
  function requiereSesion(req, res, next) {
    if (req.session.usuario && vencida(req.session)) {
      return req.session.destroy(() => {
        res.clearCookie(NOMBRE_COOKIE);
        res.status(401).json({ error: '401 · Tu sesión venció: vuelve a iniciar sesión' });
      });
    }
    if (!req.session.usuario) {
      return res.status(401).json({ error: '401 · No has iniciado sesión (o tu sesión ya venció)' });
    }
    req.session.ultimoUso = Date.now();
    next();
  }

  // 403: "sé quién eres, pero no tienes permiso".
  function requiereRol(rol) {
    return (req, res, next) => {
      if (req.session.usuario.rol !== rol) {
        return res.status(403).json({ error: `403 · Eres ${req.session.usuario.usuario}, pero esta ruta es solo para ${rol}` });
      }
      next();
    };
  }

  // ---------- Rutas ----------

  app.get('/api/config', (req, res) => res.json(config));

  // Guarda un contador en la sesión. Sirve para ver que la sesión existe antes de entrar
  // (y para la demostración de fijación de sesión).
  app.post('/api/visita', (req, res) => {
    req.session.visitas = (req.session.visitas || 0) + 1;
    res.json({ visitas: req.session.visitas, sesion: idCorto(req.sessionID) });
  });

  app.post('/api/login', async (req, res, next) => {
    try {
      const { usuario, contrasena } = req.body || {};
      const datos = await usuarios.verificar(usuario, contrasena);
      if (!datos) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

      const antes = req.session.visitas !== undefined ? idCorto(req.sessionID) : null;
      const visitas = req.session.visitas || 0;

      // Guarda en la sesión quién es. express-session la escribe en el almacén y manda el Set-Cookie.
      const guardar = () => {
        req.session.usuario = datos;
        req.session.visitas = visitas;
        req.session.creada = Date.now();
        req.session.ultimoUso = Date.now();
        req.session.save((error) => {
          if (error) return next(error);
          res.json({ usuario: datos, sesionAntes: antes, sesionDespues: idCorto(req.sessionID) });
        });
      };

      if (config.regenerarAlEntrar) {
        // Crea una sesión NUEVA (id nuevo) y descarta la anterior.
        req.session.regenerate((error) => (error ? next(error) : guardar()));
      } else {
        guardar(); // conserva el mismo id que ya traía el navegador
      }
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/logout', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(NOMBRE_COOKIE);
      res.json({ mensaje: 'Sesión cerrada: el servidor la borró' });
    });
  });

  app.get('/api/sesion', requiereSesion, (req, res) => {
    const desde = config.rolling ? req.session.ultimoUso : req.session.creada;
    res.json({
      usuario: req.session.usuario,
      sesion: idCorto(req.sessionID),
      expiraEnSegundos: Math.max(0, Math.round((desde + config.maxAgeMs - Date.now()) / 1000)),
    });
  });

  app.get('/api/perfil', requiereSesion, (req, res) => {
    req.session.visitas = (req.session.visitas || 0) + 1;
    res.json({ mensaje: `Hola, ${req.session.usuario.nombre}`, rol: req.session.usuario.rol, visitas: req.session.visitas });
  });

  app.get('/api/admin/reporte', requiereSesion, requiereRol('admin'), (req, res) => {
    res.json({ reporte: 'Talleres: 3 · Inscritos: 57 · Cupo libre: 18' });
  });

  // SOLO PARA LA CLASE: muestra lo que el servidor guarda de cada sesión.
  // Un servidor real NUNCA expone esto.
  app.get('/api/diagnostico/sesiones', async (req, res, next) => {
    try {
      const sesiones = await todasLasSesiones(almacen);
      const lista = Object.entries(sesiones || {}).map(([id, s]) => ({
        sesion: idCorto(id),
        esLaTuya: id === req.sessionID,
        usuario: s.usuario ? s.usuario.usuario : '(sin iniciar sesión)',
        visitas: s.visitas || 0,
        expira: s.cookie && s.cookie.expires,
      }));
      res.json({ almacen: config.almacen, sesiones: lista });
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  });

  return app;
}

module.exports = { crearApp, NOMBRE_COOKIE };
