// Backend del proyecto CECyT9 · semana 13: login que emite JWT + CRUD de usuarios protegido.
const express = require('express');
const pool = require('./db-local');
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el .env (copia .env.example como .env).');
  process.exit(1);
}

const app = express();
app.use(express.json());

app.use('/api', authRoutes); // POST /api/login, POST /api/refresh, GET /api/yo
app.use('/api/usuarios', usuariosRoutes); // CRUD protegido con JWT

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Error del servidor' });
});

const PORT = Number(process.env.PORT || 3001);

if (require.main === module) {
  pool
    .query('SELECT COUNT(*) AS total FROM usuarios')
    .then(([filas]) => {
      app.listen(PORT, () => {
        console.log(`Backend CECyT9 (JWT) en http://localhost:${PORT}`);
        console.log(`Usuarios en la BD: ${filas[0].total} · admin semilla: admin@cecyt9.ipn.mx / CambiaEstaClave123`);
      });
    })
    .catch((error) => {
      console.error('No me pude conectar a MySQL:', error.message);
      console.error('Revisa tu .env y que corriste schema-completo-mysql.sql');
      process.exit(1);
    });
}

module.exports = { app, pool };
