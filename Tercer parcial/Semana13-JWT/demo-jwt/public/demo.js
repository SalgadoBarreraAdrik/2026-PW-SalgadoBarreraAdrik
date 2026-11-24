// demo.js — JavaScript de la página de la demo de sesiones (semana 12).
// Este archivo NO toca la cookie: la guarda y la manda el navegador solo, porque la página
// y la API viven en el mismo servidor (mismo origen). Aquí solo llamamos a la API y pintamos.
// El <script> está al final del <body>, así que cuando esto corre todos los id ya existen
// y no hace falta esperar a DOMContentLoaded.

// Atajo para no escribir document.getElementById en cada línea.
const $ = (id) => document.getElementById(id);

// Una sola función para hablar con la API: así todas las peticiones se comportan igual.
// - Solo mandamos Content-Type: application/json cuando hay cuerpo, porque es lo que hace
//   que express.json() lea el body; sin cuerpo no tiene sentido.
// - fetch NO lanza error con 401/403: el código está en respuesta.status, por eso lo regresamos.
// - Si la respuesta no es JSON (un error raro del servidor), datos queda en null y la página no truena.
// - No usamos credentials: 'include' porque es el mismo origen; haría falta si la API estuviera
//   en otro puerto (como Next en 3000 y Express en 4000).
async function llamar(metodo, url, cuerpo) {
  const opciones = { method: metodo, headers: {} };
  if (cuerpo) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  const respuesta = await fetch(url, opciones);
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }
  return { status: respuesta.status, datos };
}

// Elige el color del código: así se distingue de un vistazo un 401 (no sé quién eres)
// de un 403 (sé quién eres, pero no puedes).
function claseDeCodigo(status) {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 401) return 'e401';
  if (status === 403) return 'e403';
  return 'error';
}

// Anota cada respuesta en la bitácora, la más nueva ARRIBA (prepend) para no tener que bajar.
// Todo lo que viene del servidor va con textContent: si un nombre trajera <script>, con innerHTML
// se ejecutaría (XSS) y, si la cookie no fuera httpOnly, ese script podría robar la sesión.
function anotar(metodo, url, status, datos) {
  const li = document.createElement('li');

  const codigo = document.createElement('span');
  codigo.className = `codigo ${claseDeCodigo(status)}`;
  codigo.textContent = status;

  const peticion = document.createElement('code');
  peticion.textContent = `${metodo} ${url}`;

  const cuerpo = document.createElement('pre');
  cuerpo.textContent = JSON.stringify(datos, null, 2);

  li.append(codigo, ' ', peticion, cuerpo);
  $('bitacora').prepend(li);
}

// Le pregunta al SERVIDOR quién soy: el navegador no lo sabe, solo tiene una llave (la cookie).
// Después mostramos document.cookie para comprobar que con httpOnly el JavaScript no la ve,
// aunque la sesión sí exista.
async function refrescarEstado() {
  const { status, datos } = await llamar('GET', '/api/sesion');
  const estado = $('estado');
  if (status === 200 && datos) {
    const { nombre, rol } = datos.usuario;
    estado.textContent = `${nombre} · rol ${rol} · sesión ${datos.sesion} · vence en ${datos.expiraEnSegundos} s`;
    estado.className = 'estado con-sesion';
  } else {
    estado.textContent = 'Sin sesión (el servidor responde 401)';
    estado.className = 'estado sin-sesion';
  }
  $('cookie-js').textContent = document.cookie || '(vacío)';
}

// Pinta lo que el servidor recuerda de cada sesión (solo para la clase).
// Vaciamos el <tbody> antes de llenarlo; si no, cada clic duplicaría las filas.
async function refrescarSesiones() {
  const { datos } = await llamar('GET', '/api/diagnostico/sesiones');
  const sesiones = datos ? datos.sesiones : [];

  if (datos) {
    $('donde').textContent =
      datos.almacen === 'memoria'
        ? 'En la MEMORIA del servidor: se pierde al reiniciarlo.'
        : 'En MySQL, tabla sessions. En Workbench: SELECT * FROM demo_sesiones.sessions;';
  }

  const tbody = $('tabla-sesiones');
  tbody.replaceChildren();

  if (!sesiones || sesiones.length === 0) {
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    celda.colSpan = 4;
    celda.textContent = '(sin sesiones)';
    fila.appendChild(celda);
    tbody.appendChild(fila);
    return;
  }

  for (const s of sesiones) {
    const fila = document.createElement('tr');
    if (s.esLaTuya) fila.className = 'tuya';
    // expira viene como texto ISO (UTC); new Date lo convierte y toLocaleTimeString lo pasa a mi hora.
    const vence = s.expira ? new Date(s.expira).toLocaleTimeString() : '—';
    const valores = [s.sesion + (s.esLaTuya ? ' (la tuya)' : ''), s.usuario, s.visitas, vence];
    for (const valor of valores) {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    }
    tbody.appendChild(fila);
  }
}

// Después de cada acción cambian las dos cosas (quién soy y lo que guarda el servidor),
// así que las refrescamos juntas.
async function refrescarTodo() {
  await refrescarEstado();
  await refrescarSesiones();
}

// Al elegir otro usuario ponemos su contraseña de ejemplo para no escribirla en cada prueba.
$('usuario').addEventListener('change', () => {
  $('contrasena').value = `${$('usuario').value}12345`;
});

// preventDefault evita que el formulario recargue la página: el login lo hacemos con fetch
// y así no se pierde la bitácora.
$('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const cuerpo = { usuario: $('usuario').value, contrasena: $('contrasena').value };
  const { status, datos } = await llamar('POST', '/api/login', cuerpo);
  anotar('POST', '/api/login', status, datos);
  await refrescarTodo();
});

// Un solo recorrido para todos los botones con data-url: si se agrega un botón en el HTML,
// funciona sin tocar este archivo. dataset lee data-metodo y data-url.
for (const boton of document.querySelectorAll('button[data-url]')) {
  boton.addEventListener('click', async () => {
    const { metodo, url } = boton.dataset;
    const { status, datos } = await llamar(metodo, url);
    anotar(metodo, url, status, datos);
    await refrescarTodo();
  });
}

$('btn-refrescar').addEventListener('click', refrescarTodo);
$('btn-sesiones').addEventListener('click', refrescarSesiones);

// Al cargar: mostramos la configuración con la que arrancó el servidor (para saber qué estamos
// probando) y el estado actual.
llamar('GET', '/api/config').then(({ datos }) => {
  $('config').textContent = JSON.stringify(datos, null, 2);
});
refrescarTodo();
