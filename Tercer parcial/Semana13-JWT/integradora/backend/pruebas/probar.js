// Pruebas de acceso con y sin token válido:  npm run probar
// Arrancan el backend en un puerto libre contra tu BD local (cecyt9_local), crean un alumno de prueba
// y al final lo borran. Necesitas haber corrido schema-completo-mysql.sql (trae el admin semilla).
const jwt = require('jsonwebtoken');
const { app, pool } = require('../server');

const ADMIN = { correo: 'admin@cecyt9.ipn.mx', contrasena: 'CambiaEstaClave123' };
const ALUMNO = { nombre: 'Alumno Prueba JWT', correo: 'prueba.jwt@cecyt9.ipn.mx', contrasena: 'alumno12345', boleta: '2026000013' };

let total = 0;
let pasaron = 0;
async function prueba(nombre, fn) {
  total += 1;
  try {
    const ok = await fn();
    if (ok) pasaron += 1;
    console.log(`${ok ? '✔' : '✘'} ${nombre}`);
  } catch (error) {
    console.log(`✘ ${nombre} (${error.message})`);
  }
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const carga = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

async function main() {
  await pool.query('DELETE FROM usuarios WHERE correo = ? OR boleta = ?', [ALUMNO.correo, ALUMNO.boleta]);
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const url = `http://127.0.0.1:${servidor.address().port}`;

  async function pedir(metodo, ruta, { token, cuerpo, authorization } = {}) {
    const headers = {};
    if (cuerpo) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (authorization) headers.Authorization = authorization;
    const r = await fetch(url + ruta, { method: metodo, headers, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    let datos = null;
    try { datos = await r.json(); } catch { datos = null; }
    return { status: r.status, datos, setCookie: r.headers.get('set-cookie') };
  }

  let tokenAdmin;
  let tokenAlumno;
  let idAlumno;

  await prueba('Login correcto (admin semilla): 200, token de 3 partes, sin Set-Cookie y sin hash', async () => {
    const r = await pedir('POST', '/api/login', { cuerpo: ADMIN });
    tokenAdmin = r.datos && r.datos.token;
    const p = carga(tokenAdmin);
    return r.status === 200 && tokenAdmin.split('.').length === 3 && !r.setCookie && p.rol === 'admin' &&
      typeof p.exp === 'number' && typeof p.jti === 'string' && !/contrasena|hash/i.test(JSON.stringify(r.datos));
  });

  await prueba('Login con contraseña incorrecta: 401 y sin token', async () => {
    const r = await pedir('POST', '/api/login', { cuerpo: { correo: ADMIN.correo, contrasena: 'mala-mala' } });
    return r.status === 401 && !r.datos.token;
  });

  await prueba('Login con correo que no existe: el MISMO 401', async () => {
    const r = await pedir('POST', '/api/login', { cuerpo: { correo: 'nadie@cecyt9.ipn.mx', contrasena: 'loquesea123' } });
    return r.status === 401 && r.datos.error === 'Correo o contraseña incorrectos';
  });

  await prueba('GET /api/usuarios SIN token: 401', async () => (await pedir('GET', '/api/usuarios')).status === 401);

  await prueba('GET /api/usuarios con token sin la palabra Bearer: 401', async () =>
    (await pedir('GET', '/api/usuarios', { authorization: tokenAdmin })).status === 401);

  await prueba('GET /api/usuarios CON token válido: 200 y lista sin contrasena_hash', async () => {
    const r = await pedir('GET', '/api/usuarios', { token: tokenAdmin });
    return r.status === 200 && Array.isArray(r.datos) && r.datos.every((u) => u.contrasena_hash === undefined);
  });

  await prueba('POST /api/usuarios SIN token: 401 (no se crea nada)', async () =>
    (await pedir('POST', '/api/usuarios', { cuerpo: ALUMNO })).status === 401);

  await prueba('POST /api/usuarios con datos inválidos (boleta corta): 400', async () =>
    (await pedir('POST', '/api/usuarios', { token: tokenAdmin, cuerpo: { ...ALUMNO, boleta: '123' } })).status === 400);

  await prueba('POST /api/usuarios con token de admin: 201', async () => {
    const r = await pedir('POST', '/api/usuarios', { token: tokenAdmin, cuerpo: ALUMNO });
    idAlumno = r.datos && r.datos.id;
    return r.status === 201 && r.datos.correo === ALUMNO.correo && r.datos.rol === 'alumno';
  });

  await prueba('Correo duplicado: 409', async () =>
    (await pedir('POST', '/api/usuarios', { token: tokenAdmin, cuerpo: { ...ALUMNO, boleta: '2026000099' } })).status === 409);

  await prueba('El alumno nuevo puede iniciar sesión y LEER la lista (200)', async () => {
    const r = await pedir('POST', '/api/login', { cuerpo: { correo: ALUMNO.correo, contrasena: ALUMNO.contrasena } });
    tokenAlumno = r.datos.token;
    return r.status === 200 && (await pedir('GET', '/api/usuarios', { token: tokenAlumno })).status === 200;
  });

  await prueba('Token de alumno intenta borrar: 403 (sé quién eres, pero no puedes)', async () =>
    (await pedir('DELETE', `/api/usuarios/${idAlumno}`, { token: tokenAlumno })).status === 403);

  await prueba('Token alterado (rol → admin con la firma original): 401', async () => {
    const [h, , f] = tokenAlumno.split('.');
    const alterado = `${h}.${b64({ ...carga(tokenAlumno), rol: 'admin' })}.${f}`;
    return (await pedir('DELETE', `/api/usuarios/${idAlumno}`, { token: alterado })).status === 401;
  });

  await prueba('Token "alg: none" (sin firma): 401', async () => {
    const sinFirma = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(carga(tokenAdmin))}.`;
    return (await pedir('GET', '/api/usuarios', { token: sinFirma })).status === 401;
  });

  await prueba('Token firmado con OTRO secreto: 401', async () => {
    const falso = jwt.sign({ rol: 'admin' }, 'otro-secreto', { subject: '1', expiresIn: 60 });
    return (await pedir('GET', '/api/usuarios', { token: falso })).status === 401;
  });

  await prueba('Token expirado: 401 "Token expirado"', async () => {
    const vencido = jwt.sign({ rol: 'admin' }, process.env.JWT_SECRET, { subject: '1', expiresIn: -10 });
    const r = await pedir('GET', '/api/usuarios', { token: vencido });
    return r.status === 401 && /expirado/i.test(r.datos.error);
  });

  await prueba('PUT /api/usuarios/:id con token de admin: 200', async () => {
    const r = await pedir('PUT', `/api/usuarios/${idAlumno}`, {
      token: tokenAdmin,
      cuerpo: { nombre: 'Alumno Editado', correo: ALUMNO.correo, rol: 'alumno' },
    });
    return r.status === 200 && r.datos.nombre === 'Alumno Editado';
  });

  await prueba('Renovación: POST /api/refresh con token válido entrega uno nuevo (otro jti) que sirve', async () => {
    const r = await pedir('POST', '/api/refresh', { token: tokenAlumno });
    return r.status === 200 && carga(r.datos.token).jti !== carga(tokenAlumno).jti &&
      (await pedir('GET', '/api/yo', { token: r.datos.token })).status === 200;
  });

  await prueba('Renovación sin token: 401', async () => (await pedir('POST', '/api/refresh')).status === 401);

  await prueba('DELETE /api/usuarios/:id con token de admin: 204', async () =>
    (await pedir('DELETE', `/api/usuarios/${idAlumno}`, { token: tokenAdmin })).status === 204);

  await prueba('Refresh de un usuario ya borrado: 401', async () =>
    (await pedir('POST', '/api/refresh', { token: tokenAlumno })).status === 401);

  servidor.close();
  await pool.end();
  console.log(`\n${pasaron} de ${total} pruebas pasaron.`);
  process.exit(pasaron === total ? 0 : 1);
}

main().catch(async (error) => {
  console.error('No se pudieron correr las pruebas:', error.message);
  process.exit(1);
});
