// Mismas reglas que lib/validaciones.js del front. El backend las repite porque alguien puede
// mandar la petición directo con Postman y saltarse el formulario.
function validarCorreo(correo) {
  return typeof correo === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

function validarBoleta(boleta) {
  return typeof boleta === 'string' && /^\d{10}$/.test(boleta.trim());
}

function validarContrasena(contrasena) {
  return typeof contrasena === 'string' && contrasena.length >= 8;
}

const ROLES = ['alumno', 'admin'];

module.exports = { validarCorreo, validarBoleta, validarContrasena, ROLES };
