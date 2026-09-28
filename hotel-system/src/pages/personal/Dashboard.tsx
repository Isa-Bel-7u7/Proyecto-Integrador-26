import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getResumenAdmin, getReservas, getHabitaciones } from '../../services/api'
import PersonalLayout from '../../components/PersonalLayout'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { executeRpc as rpc } from '../../repositories/rpcRepository'

type DatosResumen = {
  reservasHoy: number; llegadasHoy: number; salidasHoy: number
  habitacionesDisponibles: number; habitacionesOcupadas: number
  habitacionesSucias: number; habitacionesMantenimiento: number
  pagosPendientes: number; incidenciasAbiertas: number
}
type LlegadaRow    = { codigo: string; cliente: string; habitacion: string; entrada: string; estado: string }
type HabitacionRow = { numero: string; tipo: string; piso: number; estado: string }
type AlertaCobertura = { turno: string; area: string; fecha: string; hora_inicio: string; hora_fin: string; asignados: number; requeridos: number }
type AuditEntry = { id: string; usuario_nombre: string | null; accion: string; modulo: string; descripcion: string; criticidad: string; created_at: string }
type TurnoHoy = { turno: string; hora_inicio: string; hora_fin: string; area: string | null }

const fmtHora = (t: string) => t.substring(0, 5)
const fmtDate = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'Ahora'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  return fmtDate(iso.split('T')[0])
}

const AC: Record<string, { color: string; icon: string }> = {
  crear:         { color: '#52c97a', icon: '＋' },
  modificar:     { color: '#d4af6a', icon: '✎'  },
  eliminar:      { color: '#e05252', icon: '✕'  },
  cambio_estado: { color: '#6ab8d4', icon: '↺'  },
  cambio_rol:    { color: '#a06ad4', icon: '⚙'  },
  asignar:       { color: '#e0a252', icon: '→'  },
  acceso:        { color: '#52c97a', icon: '🔑' },
  cierre_sesion: { color: '#9696a0', icon: '🔒' },
}

const coloresEstado: Record<string, { bg: string; text: string; dot: string }> = {
  disponible:    { bg: 'rgba(82,201,122,0.1)',  text: '#52c97a', dot: '#52c97a' },
  ocupada:       { bg: 'rgba(212,175,106,0.1)', text: '#d4af6a', dot: '#d4af6a' },
  reservada:     { bg: 'rgba(106,184,212,0.1)', text: '#6ab8d4', dot: '#6ab8d4' },
  limpieza:      { bg: 'rgba(160,106,212,0.1)', text: '#a06ad4', dot: '#a06ad4' },
  mantenimiento: { bg: 'rgba(212,122,106,0.1)', text: '#d47a6a', dot: '#d47a6a' },
  bloqueada:     { bg: 'rgba(150,150,150,0.1)', text: '#999',    dot: '#999'    },
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'Administrador' || perfil?.rol === 'Supervisor'

  const [datos, setDatos]         = useState<DatosResumen>({ reservasHoy: 0, llegadasHoy: 0, salidasHoy: 0, habitacionesDisponibles: 0, habitacionesOcupadas: 0, habitacionesSucias: 0, habitacionesMantenimiento: 0, pagosPendientes: 0, incidenciasAbiertas: 0 })
  const [llegadas, setLlegadas]   = useState<LlegadaRow[]>([])
  const [habitaciones, setHabs]   = useState<HabitacionRow[]>([])
  const [alertas, setAlertas]     = useState<AlertaCobertura[]>([])
  const [auditLog, setAuditLog]   = useState<AuditEntry[]>([])
  const [turnoHoy, setTurnoHoy]   = useState<TurnoHoy | null>(null)
  const [cargando, setCargando]   = useState(true)

  useEffect(() => {
    if (perfil?.rol) cargarDatos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.rol])

  const cargarDatos = async () => {
    try {
      const promises: Promise<unknown>[] = [
        esAdmin ? getResumenAdmin() : Promise.resolve(null),
        getReservas(),
        getHabitaciones(),
      ]
      if (esAdmin) {
        promises.push(rpc('rpc_get_alertas_cobertura').catch(() => []))
        promises.push(rpc('rpc_get_resumen_auditoria').catch(() => null))
      } else {
        promises.push(Promise.resolve([]))
        promises.push(Promise.resolve(null))
      }

      const [resumen, reservasData, habitacionesData, alrt, audit] = await Promise.all(promises)

      if (resumen) {
        const r = resumen as Record<string, unknown>
        setDatos({
          reservasHoy:             Number(r.total_reservas) || 0,
          llegadasHoy:             Number(r.reservas_confirmadas) || 0,
          salidasHoy:              Number(r.reservas_en_estadia) || 0,
          habitacionesDisponibles: Number(r.habitaciones_disponibles) || 0,
          habitacionesOcupadas:    Number(r.habitaciones_ocupadas) || 0,
          habitacionesSucias:      Number(r.habitaciones_limpieza) || 0,
          habitacionesMantenimiento: 0,
          pagosPendientes:         0,
          incidenciasAbiertas:     Number(r.incidencias_abiertas) || 0,
        })
      }

      type RV = { codigo_reserva: string; cliente_nombre: string; fecha_entrada: string; estado: string }
      type HV = { numero: string; piso: number; estado: string; tipos_habitacion: { nombre: string } | null }
      const hoy = new Date().toISOString().split('T')[0]
      setLlegadas((reservasData as RV[]).filter(r => r.fecha_entrada === hoy).slice(0, 5).map(r => ({ codigo: r.codigo_reserva, cliente: r.cliente_nombre, habitacion: '—', entrada: r.fecha_entrada, estado: r.estado })))
      setHabs((habitacionesData as HV[]).slice(0, 6).map(h => ({ numero: h.numero, tipo: h.tipos_habitacion?.nombre ?? '—', piso: h.piso, estado: h.estado })))
      setAlertas((alrt as AlertaCobertura[]) ?? [])
      if (audit) setAuditLog(((audit as { recientes: AuditEntry[] }).recientes ?? []).slice(0, 8))

      // Turno del empleado actual (no admin)
      if (!esAdmin) {
        const asist = await rpc('rpc_get_asistencia_hoy').catch(() => []) as { personal_id: string; turno_nombre: string | null; hora_entrada: string | null }[]
        if (perfil?.usuario_id) {
          const { data: persData } = await supabase.from('personal').select('id').eq('usuario_id', perfil.usuario_id).single()
          if (persData) {
            const miAsist = asist.find(a => a.personal_id === persData.id)
            if (miAsist?.turno_nombre) {
              const td = await rpc('rpc_get_turnos_definicion').catch(() => []) as { nombre: string; hora_inicio: string; hora_fin: string; area: string | null }[]
              const t = td.find(x => x.nombre === miAsist.turno_nombre)
              if (t) setTurnoHoy({ turno: t.nombre, hora_inicio: t.hora_inicio, hora_fin: t.hora_fin, area: t.area })
            }
          }
        }
      }
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setCargando(false)
    }
  }

  const alertasUrgentes = alertas.filter(a => { const d = new Date(a.fecha + 'T12:00'); const diff = d.getTime() - Date.now(); return diff >= 0 && diff < 86400000 * 2 })

  return (
    <PersonalLayout titulo="Panel Operativo" subtitulo="Resumen general del día">
      <style>{`
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; margin-bottom: 24px; }
        .metric-card { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 12px; padding: 18px 16px; transition: border-color 0.3s, transform 0.2s; cursor: default; }
        .metric-card:hover { border-color: rgba(212,175,106,0.28); transform: translateY(-2px); }
        .metric-label { font-size: 0.62rem; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,236,228,0.35); margin-bottom: 8px; }
        .metric-value { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 300; color: #f0ece4; line-height: 1; margin-bottom: 4px; }
        .metric-sub { font-size: 0.66rem; color: rgba(240,236,228,0.28); }
        .metric-card.gold .metric-value { color: #d4af6a; }
        .metric-card.green .metric-value { color: #52c97a; }
        .metric-card.red .metric-value { color: #e05252; }
        .metric-card.blue .metric-value { color: #6ab8d4; }
        .metric-card.purple .metric-value { color: #a06ad4; }
        .dash-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
        @media (max-width: 1200px) { .dash-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 768px) { .dash-grid { grid-template-columns: 1fr; } }
        .panel { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 12px; overflow: hidden; }
        .panel.wide { grid-column: span 2; }
        @media (max-width: 1200px) { .panel.wide { grid-column: span 1; } }
        .panel-header { padding: 15px 18px 12px; border-bottom: 1px solid rgba(212,175,106,0.07); display: flex; align-items: center; justify-content: space-between; }
        .panel-title { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,236,228,0.45); }
        .panel-badge { font-size: 0.62rem; background: rgba(212,175,106,0.1); color: #d4af6a; padding: 3px 10px; border-radius: 20px; }
        .panel-body { padding: 14px 18px; }
        .llegadas-table { width: 100%; border-collapse: collapse; }
        .llegadas-table th { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,236,228,0.22); text-align: left; padding: 0 0 9px; border-bottom: 1px solid rgba(212,175,106,0.07); }
        .llegadas-table td { font-size: 0.74rem; color: rgba(240,236,228,0.65); padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .llegadas-table tr:last-child td { border-bottom: none; }
        .codigo-cell { font-family: 'Cormorant Garamond', serif; font-size: 0.9rem; color: #d4af6a; }
        .estado-badge { display: inline-block; font-size: 0.58rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 8px; border-radius: 20px; }
        .estado-confirmada { background: rgba(82,201,122,0.1); color: #52c97a; }
        .estado-pendiente { background: rgba(212,175,106,0.1); color: #d4af6a; }
        .hab-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .hab-card { padding: 10px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); text-align: center; }
        .hab-numero { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; font-weight: 300; margin-bottom: 3px; }
        .hab-tipo { font-size: 0.58rem; color: rgba(240,236,228,0.28); letter-spacing: 0.08em; margin-bottom: 5px; }
        .hab-estado { font-size: 0.56rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 7px; border-radius: 20px; display: inline-block; }
        .audit-entry { display: flex; gap: 9px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); align-items: flex-start; }
        .audit-entry:last-child { border-bottom: none; }
        .audit-icon { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; flex-shrink: 0; }
        .audit-desc { font-size: 0.72rem; color: rgba(240,236,228,0.62); line-height: 1.4; flex: 1; }
        .audit-time { font-size: 0.58rem; color: rgba(240,236,228,0.2); white-space: nowrap; }
        .skeleton { background: linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .quick-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 10px 14px; color: rgba(240,236,228,0.55); font-size: 0.72rem; font-weight: 500; font-family: Montserrat,sans-serif; letter-spacing: 0.06em; cursor: pointer; text-align: left; transition: all 0.2s; width: 100%; }
        .quick-btn:hover { background: rgba(212,175,106,0.07); border-color: rgba(212,175,106,0.2); color: #d4af6a; transform: translateX(3px); }
      `}</style>

      {/* Alerta de cobertura urgente (próx. 48h) */}
      {!cargando && esAdmin && alertasUrgentes.length > 0 && (
        <div style={{ background: 'rgba(224,82,82,0.07)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: 10, padding: '11px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '1.1rem' }}>🚨</span>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#e05252', fontWeight: 600 }}>
                {alertasUrgentes.length} turno{alertasUrgentes.length > 1 ? 's' : ''} sin cobertura en las próximas 48h
              </div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(224,82,82,0.6)', marginTop: 2 }}>
                {alertasUrgentes.map(a => `${a.area} (${a.turno})`).slice(0, 3).join(' · ')}
                {alertasUrgentes.length > 3 ? ` +${alertasUrgentes.length - 3} más` : ''}
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/personal/turnos')} style={{ padding: '6px 13px', background: 'rgba(224,82,82,0.12)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 7, color: '#e05252', fontSize: '0.64rem', fontWeight: 600, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Ir a Turnos →
          </button>
        </div>
      )}

      {/* Turno del empleado (non-admin) */}
      {!cargando && !esAdmin && turnoHoy && (
        <div style={{ background: 'rgba(212,175,106,0.06)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ fontSize: '1.3rem' }}>🕐</span>
          <div>
            <div style={{ fontSize: '0.64rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(212,175,106,0.5)', marginBottom: 2 }}>Tu turno hoy</div>
            <div style={{ fontSize: '0.9rem', color: '#d4af6a', fontWeight: 500 }}>{turnoHoy.turno}</div>
            <div style={{ fontSize: '0.66rem', color: 'rgba(240,236,228,0.35)', marginTop: 1 }}>
              {fmtHora(turnoHoy.hora_inicio)} – {fmtHora(turnoHoy.hora_fin)}{turnoHoy.area ? ` · ${turnoHoy.area}` : ''}
            </div>
          </div>
          <button onClick={() => navigate('/personal/turnos')} style={{ marginLeft: 'auto', padding: '6px 12px', background: 'rgba(212,175,106,0.1)', border: '1px solid rgba(212,175,106,0.25)', borderRadius: 7, color: '#d4af6a', fontSize: '0.62rem', fontWeight: 600, fontFamily: 'Montserrat,sans-serif', cursor: 'pointer' }}>
            Ver horario
          </button>
        </div>
      )}

      {/* Métricas — solo admin */}
      {esAdmin && (
        <div className="metrics-grid">
          {cargando ? Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="metric-card">
              <div className="skeleton" style={{ height: 11, width: '60%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 38, width: '40%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 9, width: '50%' }} />
            </div>
          )) : (
            <>
              <div className="metric-card gold">
                <div className="metric-label">Total reservas</div>
                <div className="metric-value">{datos.reservasHoy}</div>
                <div className="metric-sub">En el sistema</div>
              </div>
              <div className="metric-card green">
                <div className="metric-label">Confirmadas</div>
                <div className="metric-value">{datos.llegadasHoy}</div>
                <div className="metric-sub">Listas para check-in</div>
              </div>
              <div className="metric-card blue">
                <div className="metric-label">En estadía</div>
                <div className="metric-value">{datos.salidasHoy}</div>
                <div className="metric-sub">Huéspedes activos</div>
              </div>
              <div className="metric-card green">
                <div className="metric-label">Disponibles</div>
                <div className="metric-value">{datos.habitacionesDisponibles}</div>
                <div className="metric-sub">Habitaciones libres</div>
              </div>
              <div className="metric-card gold">
                <div className="metric-label">Ocupadas</div>
                <div className="metric-value">{datos.habitacionesOcupadas}</div>
                <div className="metric-sub">Con huésped</div>
              </div>
              <div className="metric-card purple">
                <div className="metric-label">Limpieza</div>
                <div className="metric-value">{datos.habitacionesSucias}</div>
                <div className="metric-sub">Pendientes</div>
              </div>
              <div className="metric-card red">
                <div className="metric-label">Incidencias</div>
                <div className="metric-value">{datos.incidenciasAbiertas}</div>
                <div className="metric-sub">Abiertas</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Grid inferior */}
      <div className="dash-grid">

        {/* Reservas recientes / llegadas hoy */}
        {esAdmin && (
          <div className="panel wide">
            <div className="panel-header">
              <span className="panel-title">Llegadas de hoy</span>
              <span className="panel-badge">{llegadas.length} reservas</span>
            </div>
            <div className="panel-body">
              {cargando ? <div className="skeleton" style={{ height: 110, borderRadius: 8 }} />
                : llegadas.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.18)', fontSize: '0.8rem', padding: '28px 0' }}>No hay llegadas programadas para hoy</div>
                : (
                  <table className="llegadas-table">
                    <thead><tr><th>Código</th><th>Cliente</th><th>Entrada</th><th>Estado</th></tr></thead>
                    <tbody>
                      {llegadas.map((r, i) => (
                        <tr key={i}>
                          <td className="codigo-cell">{r.codigo}</td>
                          <td>{r.cliente}</td>
                          <td>{r.entrada}</td>
                          <td><span className={`estado-badge estado-${r.estado}`}>{r.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          </div>
        )}

        {/* Acciones rápidas */}
        <div className="panel">
          <div className="panel-header"><span className="panel-title">Acciones rápidas</span></div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Nueva reserva',       color: '#d4af6a', ruta: '/personal/reservas',     roles: ['Administrador','Recepcionista','Supervisor'] },
                { label: 'Check-in',             color: '#52c97a', ruta: '/personal/checkin',      roles: ['Administrador','Recepcionista','Supervisor'] },
                { label: 'Check-out',            color: '#6ab8d4', ruta: '/personal/checkout',     roles: ['Administrador','Recepcionista','Caja','Supervisor'] },
                { label: 'Housekeeping',         color: '#a06ad4', ruta: '/personal/housekeeping', roles: ['Administrador','Housekeeping','Supervisor'] },
                { label: 'Incidencias',          color: '#e0a252', ruta: '/personal/incidencias',  roles: ['Administrador','Recepcionista','Supervisor','Housekeeping','Seguridad','Mantenimiento','Empleado'] },
                { label: 'Mi horario',           color: '#d4af6a', ruta: '/personal/turnos',       roles: ['*'] },
                { label: 'Registrar asistencia', color: '#52c97a', ruta: '/personal/turnos',       roles: ['*'] },
              ]
                .filter(b => b.roles.includes('*') || (perfil?.rol && b.roles.includes(perfil.rol)))
                .map(btn => (
                  <button key={btn.label} className="quick-btn" style={{ borderLeftColor: `${btn.color}40`, borderLeftWidth: 3 }} onClick={() => navigate(btn.ruta)}>
                    → {btn.label}
                  </button>
                ))
              }
            </div>
          </div>
        </div>

        {/* Estado habitaciones */}
        {esAdmin && (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Habitaciones</span>
              <span className="panel-badge">{habitaciones.length} mostrando</span>
            </div>
            <div className="panel-body">
              {cargando ? <div className="skeleton" style={{ height: 110, borderRadius: 8 }} />
                : (
                  <div className="hab-grid">
                    {habitaciones.map(h => {
                      const c = coloresEstado[h.estado] ?? coloresEstado.disponible
                      return (
                        <div key={h.numero} className="hab-card" style={{ background: c.bg, borderColor: `${c.dot}22` }}>
                          <div className="hab-numero" style={{ color: c.text }}>{h.numero}</div>
                          <div className="hab-tipo">{h.tipo} · P{h.piso}</div>
                          <span className="hab-estado" style={{ background: `${c.dot}18`, color: c.text }}>{h.estado}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>
          </div>
        )}

        {/* Actividad reciente (auditoría) — solo admin */}
        {esAdmin && (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Actividad reciente</span>
              <button onClick={() => navigate('/personal/auditoria')} style={{ fontSize: '0.6rem', background: 'none', border: 'none', color: 'rgba(212,175,106,0.5)', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif' }}>Ver todo →</button>
            </div>
            <div className="panel-body">
              {cargando ? <div className="skeleton" style={{ height: 160, borderRadius: 8 }} />
                : auditLog.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.18)', fontSize: '0.78rem', padding: '20px 0' }}>Sin actividad registrada</div>
                : auditLog.map(e => {
                  const ac = AC[e.accion] ?? { color: '#9696a0', icon: '·' }
                  return (
                    <div key={e.id} className="audit-entry">
                      <div className="audit-icon" style={{ background: `${ac.color}18` }}>
                        <span style={{ color: ac.color }}>{ac.icon}</span>
                      </div>
                      <div className="audit-desc">
                        {e.descripcion}
                        <div style={{ fontSize: '0.6rem', color: 'rgba(240,236,228,0.25)', marginTop: 2 }}>{e.usuario_nombre ?? 'Sistema'} · {e.modulo}</div>
                      </div>
                      <div className="audit-time">{relTime(e.created_at)}</div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        )}

        {/* Alertas de cobertura completo — solo admin */}
        {esAdmin && alertas.length > 0 && (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title" style={{ color: 'rgba(224,82,82,0.7)' }}>Sin cobertura</span>
              <span className="panel-badge" style={{ background: 'rgba(224,82,82,0.1)', color: '#e05252' }}>{alertas.length} turnos</span>
            </div>
            <div className="panel-body">
              {alertas.slice(0, 6).map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(240,236,228,0.6)' }}>{a.turno}</div>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(240,236,228,0.28)', marginTop: 1 }}>{a.area} · {fmtDate(a.fecha)} · {fmtHora(a.hora_inicio)}–{fmtHora(a.hora_fin)}</div>
                  </div>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#e05252', background: 'rgba(224,82,82,0.1)', padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>{a.asignados}/{a.requeridos}</span>
                </div>
              ))}
              {alertas.length > 6 && <div style={{ fontSize: '0.62rem', color: 'rgba(224,82,82,0.4)', paddingTop: 8 }}>+{alertas.length - 6} más sin cubrir</div>}
              <button onClick={() => navigate('/personal/turnos')} style={{ marginTop: 10, width: '100%', padding: '8px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: 7, color: '#e05252', fontSize: '0.64rem', fontWeight: 600, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.08em', cursor: 'pointer' }}>
                Programar turnos →
              </button>
            </div>
          </div>
        )}
      </div>
    </PersonalLayout>
  )
}

export default Dashboard
