import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { validarBoleta, validarContrasena, validarCorreo } from '../../lib/validaciones';
import { fetchConToken } from '../../lib/fetchConToken';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BACKEND_CAIDO = 'El backend no responde: revisa que esté corriendo (BACKEND_URL).';

// Mensaje de error de una respuesta fallida. Si el backend está caído, el proxy de Next responde
// 500 sin JSON y res.json() fallaría: en ese caso se muestra el código HTTP.
async function leerError(res) {
  try {
    const data = await res.json();
    return data.error || `HTTP ${res.status}`;
  } catch {
    return `el backend respondió ${res.status}`;
  }
}

// Lee el payload del token (se puede leer sin la clave: solo va en base64url). Solo sirve para
// mostrar datos y saber cuándo vence; quien DECIDE si el token es válido es el servidor.
function leerPayload() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function AdminUsuarios() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [boleta, setBoleta] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [sesion, setSesion] = useState(null);

  useEffect(() => {
    // Sin token ni siquiera preguntamos: directo al login.
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    setSesion(leerPayload());
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el servidor responde 401 (sin token, alterado, vencido...), el token ya no sirve:
  // lo borramos y mandamos al login. Regresa true si hubo que salir.
  function salirSi401(res) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      router.push('/login');
      return true;
    }
    return false;
  }

  // Renovación básica: si al token le queda menos de 1 minuto, pedimos uno nuevo con /api/refresh
  // (solo funciona mientras el actual sigue siendo válido).
  async function renovarSiHaceFalta() {
    const payload = leerPayload();
    if (!payload) return;
    const quedan = payload.exp - Math.floor(Date.now() / 1000);
    if (quedan > 60) return;
    const res = await fetchConToken(`${API_URL}/api/refresh`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('token', data.token);
      setSesion(leerPayload());
    }
  }

  async function cargarUsuarios() {
    try {
      await renovarSiHaceFalta();
      const res = await fetchConToken(`${API_URL}/api/usuarios`);
      if (salirSi401(res)) return;
      if (!res.ok) {
        setMensaje(`Error al cargar usuarios: ${await leerError(res)}`);
        return;
      }
      setUsuarios(await res.json());
    } catch {
      setMensaje(BACKEND_CAIDO);
    }
  }

  async function crearUsuario(e) {
    e.preventDefault();
    setMensaje('');
    const error = validarFormulario({ correo, contrasena, boleta });
    if (error) {
      setMensaje(`Error: ${error}`);
      return;
    }
    try {
      await renovarSiHaceFalta();
      const res = await fetchConToken(`${API_URL}/api/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, correo, contrasena, boleta }),
      });
      if (salirSi401(res)) return;
      if (res.ok) {
        setNombre('');
        setCorreo('');
        setContrasena('');
        setBoleta('');
        cargarUsuarios();
      } else {
        setMensaje(`Error: ${await leerError(res)}`);
      }
    } catch {
      setMensaje(BACKEND_CAIDO);
    }
  }

  async function eliminarUsuario(id) {
    if (!confirm('¿Eliminar este usuario?')) return;
    setMensaje('');
    try {
      await renovarSiHaceFalta();
      const res = await fetchConToken(`${API_URL}/api/usuarios/${id}`, { method: 'DELETE' });
      if (salirSi401(res)) return;
      if (res.ok) {
        cargarUsuarios();
      } else {
        setMensaje(`Error: ${await leerError(res)}`);
      }
    } catch {
      setMensaje(BACKEND_CAIDO);
    }
  }

  async function guardarEdicion(usuario) {
    setMensaje('');
    try {
      await renovarSiHaceFalta();
      const res = await fetchConToken(`${API_URL}/api/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }),
      });
      if (salirSi401(res)) return;
      if (res.ok) {
        setEditandoId(null);
        cargarUsuarios();
      } else {
        setMensaje(`Error: ${await leerError(res)}`);
      }
    } catch {
      setMensaje(BACKEND_CAIDO);
    }
  }

  return (
    <main className="contenedor">
      <h1>Administración de usuarios</h1>
      {sesion && (
        <p>
          Sesión: <strong>{sesion.nombre}</strong> ({sesion.rol}) · el token vence a las{' '}
          {new Date(sesion.exp * 1000).toLocaleTimeString()}
        </p>
      )}

      <form onSubmit={crearUsuario} className="formulario">
        <h2>Crear usuario</h2>
        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <input placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        <input
          type="password"
          placeholder="Contraseña (mínimo 8 caracteres)"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
        />
        <input placeholder="Boleta (10 dígitos)" value={boleta} onChange={(e) => setBoleta(e.target.value)} required />
        <button type="submit">Crear</button>
      </form>

      {mensaje && <p className="error">{mensaje}</p>}

      <h2>Usuarios registrados</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Boleta</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              {editandoId === u.id ? (
                <FilaEdicion usuario={u} onGuardar={guardarEdicion} onCancelar={() => setEditandoId(null)} />
              ) : (
                <>
                  <td>{u.nombre}</td>
                  <td>{u.correo}</td>
                  <td>{u.boleta}</td>
                  <td>{u.rol}</td>
                  <td>
                    <button onClick={() => setEditandoId(u.id)}>Editar</button>
                    <button onClick={() => eliminarUsuario(u.id)}>Eliminar</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

// Mismas reglas que valida el backend (ver lib/validaciones.js).
function validarFormulario({ correo, contrasena, boleta }) {
  if (!validarCorreo(correo)) return 'el correo no tiene un formato válido';
  if (!validarBoleta(boleta)) return 'la boleta debe tener 10 dígitos';
  if (!validarContrasena(contrasena)) return 'la contraseña debe tener al menos 8 caracteres';
  return '';
}

function FilaEdicion({ usuario, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [correo, setCorreo] = useState(usuario.correo);
  const [rol, setRol] = useState(usuario.rol);

  return (
    <>
      <td><input value={nombre} onChange={(e) => setNombre(e.target.value)} /></td>
      <td><input value={correo} onChange={(e) => setCorreo(e.target.value)} /></td>
      <td>{usuario.boleta}</td>
      <td>
        <select value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="alumno">alumno</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td>
        <button disabled={!validarCorreo(correo)} onClick={() => onGuardar({ id: usuario.id, nombre, correo, rol })}>
          Guardar
        </button>
        <button onClick={onCancelar}>Cancelar</button>
      </td>
    </>
  );
}
