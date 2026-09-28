// ============================================================
// PRINCIPIO OCP (Open/Closed Principle)
// PersonalLayout está ABIERTO para extensión pero CERRADO para
// modificación. Para agregar un nuevo módulo al sistema basta
// con agregar un objeto al array TODOS_LOS_ITEMS con su ruta,
// ícono y roles. NO se modifica ninguna lógica de renderizado
// ni ningún bloque if/else — el componente lee la configuración
// genéricamente.
//
// PRINCIPIO DRY (Don't Repeat Yourself)
// Los 15 módulos del área personal comparten un único layout
// (sidebar, topbar, scrollbar, colores). No hay código de
// navegación duplicado en cada página.
//
// PRINCIPIO SRP (Single Responsibility Principle)
// PersonalLayout tiene una sola responsabilidad: proveer la
// estructura visual compartida (sidebar + topbar) al área
// de personal. No contiene lógica de negocio de ningún módulo.
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type RolNombre = 'Administrador' | 'Recepcionista' | 'Housekeeping' | 'Caja' | 'Supervisor'

// OCP: para agregar un nuevo módulo, solo se agrega un objeto aquí.
// El renderizado del menú (línea 50) es genérico y no cambia.
const TODOS_LOS_ITEMS = [
  // Dashboard: todos los roles
  { icono: '⊞', label: 'Dashboard',    ruta: '/personal/dashboard',    seccion: 'Principal',      roles: ['Administrador','Recepcionista','Housekeeping','Caja','Supervisor'] as RolNombre[] },
  // Operaciones
  { icono: '📅', label: 'Reservas',     ruta: '/personal/reservas',     seccion: 'Operaciones',    roles: ['Administrador','Recepcionista','Supervisor'] as RolNombre[] },
  { icono: '🛏',  label: 'Habitaciones', ruta: '/personal/habitaciones', seccion: 'Operaciones',    roles: ['Administrador','Recepcionista','Supervisor'] as RolNombre[] },
  { icono: '✓',  label: 'Check-in',     ruta: '/personal/checkin',      seccion: 'Operaciones',    roles: ['Administrador','Recepcionista','Supervisor'] as RolNombre[] },
  { icono: '↗',  label: 'Check-out',    ruta: '/personal/checkout',     seccion: 'Operaciones',    roles: ['Administrador','Recepcionista','Caja','Supervisor'] as RolNombre[] },
  { icono: '🧹', label: 'Housekeeping', ruta: '/personal/housekeeping', seccion: 'Operaciones',    roles: ['Administrador','Housekeeping','Supervisor'] as RolNombre[] },
  // Caja: solo Pagos + Check-out (no reservas, no check-in)
  { icono: '💳', label: 'Pagos',        ruta: '/personal/pagos',        seccion: 'Operaciones',    roles: ['Administrador','Caja','Supervisor'] as RolNombre[] },
  { icono: '⚠',  label: 'Incidencias',  ruta: '/personal/incidencias',  seccion: 'Operaciones',    roles: ['Administrador','Recepcionista','Supervisor','Housekeeping'] as RolNombre[] },
  // Administración
  { icono: '📢', label: 'Anuncios',     ruta: '/personal/anuncios',     seccion: 'Administración', roles: ['Administrador','Supervisor','Recepcionista'] as RolNombre[] },
  { icono: '💬', label: 'Buzón',        ruta: '/personal/buzon',        seccion: 'Administración', roles: ['Administrador','Supervisor','Recepcionista'] as RolNombre[] },
  { icono: '🕐', label: 'Turnos',       ruta: '/personal/turnos',       seccion: 'Administración', roles: ['Administrador','Supervisor'] as RolNombre[] },
  { icono: '📊', label: 'Reportes',     ruta: '/personal/reportes',     seccion: 'Administración', roles: ['Administrador','Supervisor'] as RolNombre[] },
  { icono: '⭐', label: 'Reseñas',      ruta: '/personal/resenas',      seccion: 'Administración', roles: ['Administrador','Supervisor'] as RolNombre[] },
  { icono: '👥', label: 'Clientes',     ruta: '/personal/clientes',     seccion: 'Administración', roles: ['Administrador','Supervisor'] as RolNombre[] },
  // Auditoría: SOLO Administrador
  { icono: '📋', label: 'Auditoría',    ruta: '/personal/auditoria',    seccion: 'Administración', roles: ['Administrador'] as RolNombre[] },
]

interface Props {
  titulo: string
  subtitulo: string
  children: React.ReactNode
  accionesTopbar?: React.ReactNode
}

const PersonalLayout = ({ titulo, subtitulo, children, accionesTopbar }: Props) => {
  const { perfil, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarAbierto, setSidebarAbierto] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const rol = perfil?.rol as RolNombre | undefined
  const menuItems = TODOS_LOS_ITEMS.filter(item => rol && item.roles.includes(rol))

  const secciones = ['Principal', 'Operaciones', 'Administración']
  const itemsPorSeccion = secciones
    .map(sec => ({ sec, items: menuItems.filter(i => i.seccion === sec) }))
    .filter(g => g.items.length > 0)

  const handleCerrarSesion = async () => {
    await cerrarSesion()
    navigate('/login')
  }

  const abierto = sidebarAbierto

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0c0c0e; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,106,0.22); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(212,175,106,0.4); }
        * { scrollbar-width: thin; scrollbar-color: rgba(212,175,106,0.22) transparent; }
        .pl-root { display: flex; min-height: 100vh; background: #0c0c0e; font-family: 'Montserrat', sans-serif; color: #f0ece4; }
        .pl-sidebar { width: ${abierto ? '240px' : '68px'}; background: #0f0f12; border-right: 1px solid rgba(212,175,106,0.1); display: flex; flex-direction: column; transition: width 0.35s cubic-bezier(0.16,1,0.3,1); overflow: hidden; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
        .pl-sidebar-header { padding: 28px 18px 24px; border-bottom: 1px solid rgba(212,175,106,0.08); display: flex; align-items: center; gap: 12px; min-height: 80px; cursor: pointer; }
        .pl-sidebar-header:hover { background: rgba(212,175,106,0.03); }
        .pl-logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #c9a84c, #d4af6a); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; color: #0a0a0a; font-weight: 600; flex-shrink: 0; }
        .pl-logo-text { font-family: 'Cormorant Garamond', serif; font-size: 1.15rem; font-weight: 400; color: #d4af6a; letter-spacing: 0.1em; white-space: nowrap; opacity: ${abierto ? '1' : '0'}; transition: opacity 0.2s; }
        .pl-nav { flex: 1; padding: 16px 10px; overflow-y: auto; overflow-x: hidden; }
        .pl-nav::-webkit-scrollbar { width: 3px; }
        .pl-nav::-webkit-scrollbar-thumb { background: rgba(212,175,106,0.2); border-radius: 2px; }
        .pl-sec-label { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,236,228,0.25); padding: 8px 8px 6px; white-space: nowrap; opacity: ${abierto ? '1' : '0'}; transition: opacity 0.2s; margin-top: 8px; }
        .pl-sec-label:first-child { margin-top: 0; }
        .pl-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border-radius: 8px; cursor: pointer; transition: background 0.2s; margin-bottom: 2px; white-space: nowrap; overflow: hidden; position: relative; }
        .pl-nav-item:hover { background: rgba(212,175,106,0.08); }
        .pl-nav-item.activo { background: rgba(212,175,106,0.12); }
        .pl-nav-item.activo::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: #d4af6a; border-radius: 0 2px 2px 0; }
        .pl-nav-icon { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; }
        .pl-nav-label { font-size: 0.78rem; font-weight: 400; color: rgba(240,236,228,0.6); opacity: ${abierto ? '1' : '0'}; transition: opacity 0.2s, color 0.2s; }
        .pl-nav-item.activo .pl-nav-label { color: #d4af6a; }
        .pl-nav-item:hover .pl-nav-label { color: #f0ece4; }
        .pl-footer { padding: 16px 10px; border-top: 1px solid rgba(212,175,106,0.08); }
        .pl-user-card { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; cursor: pointer; transition: background 0.2s; overflow: hidden; }
        .pl-user-card:hover { background: rgba(212,175,106,0.06); }
        .pl-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #1a1a2e, #2a2a4e); border: 1px solid rgba(212,175,106,0.3); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #d4af6a; flex-shrink: 0; overflow: hidden; }
        .pl-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .pl-user-info { overflow: hidden; opacity: ${abierto ? '1' : '0'}; transition: opacity 0.2s; }
        .pl-user-name { font-size: 0.75rem; font-weight: 500; color: #f0ece4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pl-user-role { font-size: 0.65rem; color: #d4af6a; letter-spacing: 0.06em; }
        .pl-logout-btn { display: flex; align-items: center; gap: 10px; padding: 8px; width: 100%; background: none; border: none; cursor: pointer; border-radius: 8px; margin-top: 6px; transition: background 0.2s; overflow: hidden; }
        .pl-logout-btn:hover { background: rgba(220,60,60,0.08); }
        .pl-logout-icon { font-size: 0.9rem; width: 20px; text-align: center; flex-shrink: 0; color: rgba(240,100,100,0.7); }
        .pl-logout-text { font-size: 0.75rem; color: rgba(240,100,100,0.7); white-space: nowrap; opacity: ${abierto ? '1' : '0'}; transition: opacity 0.2s; }
        .pl-main { flex: 1; margin-left: ${abierto ? '240px' : '68px'}; transition: margin-left 0.35s cubic-bezier(0.16,1,0.3,1); display: flex; flex-direction: column; min-height: 100vh; }
        .pl-topbar { height: 64px; background: rgba(15,15,18,0.8); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(212,175,106,0.08); display: flex; align-items: center; padding: 0 28px; gap: 16px; position: sticky; top: 0; z-index: 50; }
        .pl-toggle-btn { width: 36px; height: 36px; background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
        .pl-toggle-btn:hover { background: rgba(212,175,106,0.1); }
        .pl-toggle-icon { display: flex; flex-direction: column; gap: 4px; }
        .pl-toggle-icon span { display: block; height: 1.5px; background: rgba(240,236,228,0.6); border-radius: 2px; }
        .pl-toggle-icon span:nth-child(1) { width: 16px; }
        .pl-toggle-icon span:nth-child(2) { width: 12px; }
        .pl-toggle-icon span:nth-child(3) { width: 16px; }
        .pl-topbar-title { flex: 1; }
        .pl-topbar-title h2 { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 400; color: #f0ece4; line-height: 1; }
        .pl-topbar-title p { font-size: 0.68rem; color: rgba(240,236,228,0.35); letter-spacing: 0.06em; margin-top: 2px; }
        .pl-topbar-right { display: flex; align-items: center; gap: 12px; }
        .pl-topbar-date { font-size: 0.72rem; color: rgba(240,236,228,0.4); letter-spacing: 0.06em; }
        .pl-content { padding: 28px; flex: 1; opacity: ${visible ? '1' : '0'}; transform: translateY(${visible ? '0' : '16px'}); transition: all 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s; }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <div className="pl-root">
        <aside className="pl-sidebar">
          <div className="pl-sidebar-header" onClick={() => setSidebarAbierto(!abierto)}>
            <div className="pl-logo-icon">G</div>
            <span className="pl-logo-text">Grand Hôtel</span>
          </div>

          <nav className="pl-nav">
            {itemsPorSeccion.map(({ sec, items }) => (
              <div key={sec}>
                <div className="pl-sec-label">{sec}</div>
                {items.map((item) => (
                  <div key={item.ruta}
                    className={`pl-nav-item ${location.pathname === item.ruta ? 'activo' : ''}`}
                    onClick={() => navigate(item.ruta)}>
                    <span className="pl-nav-icon">{item.icono}</span>
                    <span className="pl-nav-label">{item.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </nav>

          <div className="pl-footer">
            <div className="pl-user-card">
              <div className="pl-avatar">
                {perfil?.foto_url
                  ? <img src={perfil.foto_url} alt="avatar" />
                  : (perfil?.nombre_completo?.charAt(0).toUpperCase() ?? 'U')}
              </div>
              <div className="pl-user-info">
                <div className="pl-user-name">{perfil?.nombre_completo ?? 'Usuario'}</div>
                <div className="pl-user-role">{perfil?.rol ?? 'Personal'}</div>
              </div>
            </div>
            <button className="pl-logout-btn" onClick={handleCerrarSesion}>
              <span className="pl-logout-icon">⏻</span>
              <span className="pl-logout-text">Cerrar sesión</span>
            </button>
          </div>
        </aside>

        <main className="pl-main">
          <div className="pl-topbar">
            <div className="pl-toggle-btn" onClick={() => setSidebarAbierto(!abierto)}>
              <div className="pl-toggle-icon"><span /><span /><span /></div>
            </div>
            <div className="pl-topbar-title">
              <h2>{titulo}</h2>
              <p>{subtitulo}</p>
            </div>
            <div className="pl-topbar-right">
              <span className="pl-topbar-date">
                {new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              {accionesTopbar}
            </div>
          </div>

          <div className="pl-content">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}

export default PersonalLayout
