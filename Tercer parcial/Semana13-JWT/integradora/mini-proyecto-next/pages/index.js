import Link from 'next/link';

export default function Home() {
  return (
    <main className="contenedor">
      <h1>Proyecto CECyT 9 · Semana 13</h1>
      <p>
        El login ahora entrega un <strong>JWT</strong>. La página guarda el token en <code>localStorage</code> y lo manda
        en el encabezado <code>Authorization: Bearer &lt;token&gt;</code> con <code>fetchConToken</code>.
      </p>
      <p>
        <Link href="/login">Iniciar sesión</Link> · <Link href="/admin/usuarios">Administración de usuarios</Link>
      </p>
    </main>
  );
}
