// Conexión a la BD local (MySQL). Los datos vienen del .env, nunca escritos en el código.
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cecyt9_local',
  charset: 'utf8mb4',
  connectionLimit: 5,
});

module.exports = pool;
