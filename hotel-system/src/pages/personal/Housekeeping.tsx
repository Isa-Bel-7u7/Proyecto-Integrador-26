import { useState, useEffect, useCallback } from 'react'
import PersonalLayout from '../../components/PersonalLayout'
import { getHabitaciones } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { executeRpc as rpc } from '../../repositories/rpcRepository'

type TareaHK = {
  id: string; codigo: string
  habitacion_id: string; habitacion_numero: string; piso: number; tipo_habitacion: string; hab_estado: string
  personal_id: string | null; personal_nombre: string | null; personal_cargo: string | null
  prioridad: string; estado: string; fecha_programada: string
  hora_inicio: string | null; hora_fin: string | null
  observaciones: string | null; obs_inspector: string | null
  checklist_total: number; checklist_ok: number; created_at: string
}
type CheckItem  = { id: string; item: string; label: string; completado: boolean; notas: string | null }
type PersonalHK = { id: string; nombre: string; cargo: string; tareas_activas: number }
type PersonalDetalle = {
  id: string; nombre: string; cargo: string
  tareas_pendientes: number; tareas_en_progreso: number; tareas_completadas_hoy: number
  habitaciones_asignadas: string[]
}
type Habitacion = { id: string; numero: string; estado: string }
type ResumenHK = {
  total_habitaciones: number; disponibles: number; ocupadas: number
  limpieza: number; mantenimiento: number
  pendientes: number; en_progreso: number; completadas: number
  aprobadas_hoy: number; rechazadas: number; retrasadas: number
}
type HistorialHK = {
  id: string; codigo: string; habitacion_numero: string; tipo_habitacion: string; piso: number
  personal_nombre: string | null; estado: string; prioridad: string; fecha_programada: string
  hora_inicio: string | null; hora_fin: string | null; duracion_mins: number | null
  veces_atendida: number; observaciones: string | null; created_at: string
}
type ReportesHK = {
  por_empleado: { nombre: string; total: number; aprobadas: number; tiempo_promedio_mins: number | null }[]
  por_dia: { fecha: string; total: number }[]
  tiempo_promedio: number | null; tasa_aprobacion: number | null
}

const EC: Record<string, { bg: string; color: string; label: string }> = {
  pendiente:   { bg: 'rgba(212,175,106,0.12)', color: '#d4af6a', label: 'Pendiente'   },
  en_progreso: { bg: 'rgba(106,184,212,0.12)', color: '#6ab8d4', label: 'En progreso' },
  completada:  { bg: 'rgba(160,106,212,0.12)', color: '#a06ad4', label: 'Completada'  },
  aprobada:    { bg: 'rgba(82,201,122,0.12)',  color: '#52c97a', label: 'Aprobada'    },
  rechazada:   { bg: 'rgba(224,82,82,0.12)',   color: '#e05252', label: 'Rechazada'   },
}
const PC: Record<string, { color: string; label: string }> = {
  baja:    { color: '#9696a0', label: 'Baja'    },
  media:   { color: '#6ab8d4', label: 'Media'   },
  alta:    { color: '#d4af6a', label: 'Alta'    },
  urgente: { color: '#e05252', label: 'Urgente' },
}

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(212,175,106,0.2)', borderRadius: 8,
  padding: '10px 13px', fontFamily: 'Montserrat,sans-serif',
  fontSize: '0.82rem', fontWeight: 300, color: '#f0ece4', outline: 'none',
}
const lbl: React.CSSProperties = {
  fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', display: 'block', marginBottom: 5,
}

const fmtMins = (m: number | null) => {
  if (!m) return '—'
  return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`
}
const fmtHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '—'

export default function Housekeeping() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'Administrador' || perfil?.rol === 'Supervisor'

  const RES0: ResumenHK = { total_habitaciones:0,disponibles:0,ocupadas:0,limpieza:0,mantenimiento:0,pendientes:0,en_progreso:0,completadas:0,aprobadas_hoy:0,rechazadas:0,retrasadas:0 }

  const [tab,       setTab]       = useState<'tareas'|'historial'|'personal'|'reportes'>('tareas')
  const [resumen,   setResumen]   = useState<ResumenHK>(RES0)
  const [tareas,    setTareas]    = useState<TareaHK[]>([])
  const [historial,      setHistorial]      = useState<HistorialHK[]>([])
  const [fechaHistorial, setFechaHistorial] = useState(new Date().toISOString().split('T')[0])
  const [personalD, setPersonalD] = useState<PersonalDetalle[]>([])
  const [reportes,  setReportes]  = useState<ReportesHK | null>(null)
  const [personal,  setPersonal]  = useState<PersonalHK[]>([])
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [cargando,  setCargando]  = useState(true)
  const [cargTab,   setCargTab]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [filtroEstado,    setFiltroEstado]    = useState('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos')
  const [busqueda,        setBusqueda]        = useState('')
  const [panelId,    setPanelId]    = useState<string | null>(null)
  const [checklist,  setChecklist]  = useState<CheckItem[]>([])
  const [cargPanel,  setCargPanel]  = useState(false)
  const [obsInspector, setObsInspector] = useState('')
  const [productos,    setProductos]    = useState('')
  const [reasignarId,  setReasignarId]  = useState('')
  const [procesando,   setProcesando]   = useState(false)
  const [exitoPanel,   setExitoPanel]   = useState<string | null>(null)
  const [errorPanel,   setErrorPanel]   = useState<string | null>(null)
  const [modalCrear,  setModalCrear]  = useState(false)
  const [fHabId,      setFHabId]      = useState('')
  const [fPersonalId, setFPersonalId] = useState('')
  const [fPrioridad,  setFPrioridad]  = useState('media')
  const [fFecha,      setFFecha]      = useState(new Date().toISOString().split('T')[0])
  const [fHora,       setFHora]       = useState('')
  const [fObs,        setFObs]        = useState('')
  const [creando,     setCreando]     = useState(false)
  const [exitoCrear,  setExitoCrear]  = useState(false)
  const [errorCrear,  setErrorCrear]  = useState<string | null>(null)

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true)
      const fn = esAdmin ? 'rpc_get_tareas_housekeeping' : 'rpc_get_mis_tareas_housekeeping'
      const [tareasData, resumenData] = await Promise.all([
        rpc(fn),
        esAdmin ? rpc('rpc_get_resumen_housekeeping') : Promise.resolve([RES0]),
      ])
      setTareas((tareasData as TareaHK[]) ?? [])
      setResumen(prev => ((resumenData as ResumenHK[])?.[0]) ?? prev)
    } catch { setError('No se pudieron cargar las tareas.') }
    finally { setCargando(false) }
  }, [esAdmin])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  useEffect(() => {
    if (!esAdmin) return
    setCargTab(true)
    const loaders: Record<string, () => Promise<void>> = {
      historial: async () => setHistorial((await rpc('rpc_get_historial_housekeeping', { p_fecha: fechaHistorial })) as HistorialHK[] ?? []),
      personal:  async () => setPersonalD((await rpc('rpc_get_personal_hk_detalle')) as PersonalDetalle[] ?? []),
      reportes:  async () => setReportes((await rpc('rpc_get_reportes_housekeeping')) as ReportesHK),
    }
    if (loaders[tab]) {
      loaders[tab]().catch(() => {}).finally(() => setCargTab(false))
    } else { setCargTab(false) }
  }, [tab, esAdmin, fechaHistorial])

  useEffect(() => {
    if (!panelId) { setChecklist([]); setObsInspector(''); setProductos(''); setReasignarId(''); setExitoPanel(null); setErrorPanel(null); return }
    setCargPanel(true)
    rpc('rpc_get_checklist_tarea', { p_tarea_id: panelId })
      .then(d => setChecklist((d as CheckItem[]) ?? []))
      .catch(() => setChecklist([]))
      .finally(() => setCargPanel(false))
    const t = tareas.find(t => t.id === panelId)
    setObsInspector(t?.obs_inspector ?? '')
    setReasignarId(t?.personal_id ?? '')
    setExitoPanel(null); setErrorPanel(null)
    // El selector del panel también necesita cargar el personal. Antes sólo
    // se cargaba al abrir "Nueva tarea", por eso mostraba siempre "Sin asignar".
    if (esAdmin) {
      rpc('rpc_get_personal_disponible')
        .then(d => setPersonal((d as PersonalHK[]) ?? []))
        .catch(() => setPersonal([]))
    }
  }, [panelId, tareas, esAdmin])

  const cargarRecursosModal = async () => {
    const [habs, pers] = await Promise.all([
      getHabitaciones().catch(() => []),
      rpc('rpc_get_personal_disponible').catch(() => []),
    ])
    setHabitaciones((habs as Habitacion[]) ?? [])
    setPersonal((pers as PersonalHK[]) ?? [])
    const habsDisp = (habs as Habitacion[]).filter(h => ['limpieza','disponible'].includes(h.estado))
    if (habsDisp.length > 0) setFHabId(habsDisp[0].id)
    if ((pers as PersonalHK[]).length > 0) setFPersonalId((pers as PersonalHK[])[0].id)
  }

  const sel = panelId ? tareas.find(t => t.id === panelId) ?? null : null

  const filtradas = tareas.filter(t => {
    const mE = filtroEstado    === 'todos' || t.estado    === filtroEstado
    const mP = filtroPrioridad === 'todos' || t.prioridad === filtroPrioridad
    const mB = !busqueda ||
      t.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.habitacion_numero.includes(busqueda) ||
      (t.personal_nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
    return mE && mP && mB
  })

  const accion = async (fn: string, params: Record<string, unknown>, msg: string) => {
    setProcesando(true); setErrorPanel(null)
    try {
      await rpc(fn, params)
      setExitoPanel(msg)
      await cargarDatos()
      setTimeout(() => setExitoPanel(null), 3500)
    } catch (e) { setErrorPanel((e as Error).message) }
    finally { setProcesando(false) }
  }

  const handleIniciar    = () => sel && accion('rpc_iniciar_limpieza',   { p_tarea_id: sel.id },                                   'Limpieza iniciada')
  const handleCompletar  = () => sel && accion('rpc_completar_limpieza', { p_tarea_id: sel.id, p_productos: productos || null },   '¡Completada! Supervisor notificado.')
  const handleAprobar    = () => sel && accion('rpc_aprobar_limpieza',   { p_tarea_id: sel.id, p_obs: obsInspector || null },      '✓ Aprobada — habitación disponible.')
  const handleReasignar  = () => {
    if (!reasignarId || reasignarId === sel?.personal_id) return
    if (sel) accion('rpc_reasignar_tarea', { p_tarea_id: sel.id, p_personal_id: reasignarId }, 'Tarea reasignada.')
  }
  const handleRechazar = () => {
    if (!obsInspector.trim()) { setErrorPanel('Indica el motivo del rechazo.'); return }
    if (sel) accion('rpc_rechazar_limpieza', { p_tarea_id: sel.id, p_motivo: obsInspector }, 'Rechazada — personal notificado.')
  }

  const handleToggleChecklist = async (item: CheckItem) => {
    const nuevo = !item.completado
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, completado: nuevo } : c))
    await rpc('rpc_actualizar_checklist_item', { p_item_id: item.id, p_completado: nuevo, p_notas: item.notas })
      .catch(() => setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, completado: !nuevo } : c)))
  }

  const handleCrear = async () => {
    if (!fHabId) { setErrorCrear('Selecciona una habitación.'); return }
    setCreando(true); setErrorCrear(null)
    try {
      await rpc('rpc_crear_tarea_limpieza', {
        p_habitacion_id: fHabId, p_personal_id: fPersonalId || null,
        p_prioridad: fPrioridad, p_fecha: fFecha,
        p_hora: fHora || null, p_observaciones: fObs || null,
      })
      setExitoCrear(true); await cargarDatos()
      setTimeout(() => { setExitoCrear(false); setModalCrear(false); setFObs(''); setFHora('') }, 2000)
    } catch (e) { setErrorCrear((e as Error).message) }
    finally { setCreando(false) }
  }

  const alertas = [
    resumen.retrasadas  > 0 && { tipo: 'urgente', msg: `${resumen.retrasadas} tarea${resumen.retrasadas>1?'s':''} retrasada${resumen.retrasadas>1?'s':''}` },
    resumen.completadas > 0 && { tipo: 'info',    msg: `${resumen.completadas} habitación${resumen.completadas>1?'es':''} lista${resumen.completadas>1?'s':''} para inspección` },
    resumen.pendientes  > 2 && { tipo: 'warn',    msg: `${resumen.pendientes} tareas pendientes sin iniciar` },
  ].filter(Boolean) as { tipo: string; msg: string }[]

  const TABS: { key: string; label: string }[] = esAdmin
    ? [{ key:'tareas',label:'Tareas' },{ key:'historial',label:'Historial' },{ key:'personal',label:'Personal' },{ key:'reportes',label:'Reportes' }]
    : [{ key:'tareas',label:'Mis tareas' }]

  return (
    <>
      <style>{`
        /* Shared */
        .hk-pill{display:inline-block;font-size:0.58rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 9px;border-radius:20px}
        .hk-err{background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.76rem;color:#e05252}
        .hk-ok{background:rgba(82,201,122,0.08);border:1px solid rgba(82,201,122,0.2);border-radius:8px;padding:10px 14px;font-size:0.76rem;color:#52c97a;text-align:center}
        .hk-skel{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:hkshim 1.5s infinite;border-radius:8px}
        @keyframes hkshim{0%{background-position:200% 0}100%{background-position:-200% 0}}
        /* Dashboard */
        .hk-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:18px}
        .hk-stat{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:10px;padding:14px 16px}
        .hk-stat-lbl{font-size:0.58rem;font-weight:600;letter-spacing:0.13em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:6px}
        .hk-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.9rem;font-weight:300;line-height:1}
        /* Alertas */
        .hk-alerta{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;font-size:0.74rem;margin-bottom:8px}
        /* Tabs */
        .hk-tabs{display:flex;gap:2px;border-bottom:1px solid rgba(212,175,106,0.1);margin-bottom:18px}
        .hk-tab{padding:9px 18px;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;background:transparent;border:none;cursor:pointer;color:rgba(240,236,228,0.35);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s}
        .hk-tab.active{color:#d4af6a;border-bottom-color:#d4af6a}
        .hk-tab:hover:not(.active){color:rgba(240,236,228,0.6)}
        /* Toolbar */
        .hk-toolbar{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-bottom:18px}
        .hk-search{flex:1;min-width:200px;position:relative}
        .hk-search input{width:100%;background:#13131a;border:1px solid rgba(212,175,106,0.15);border-radius:8px;padding:9px 14px 9px 36px;font-family:Montserrat,sans-serif;font-size:0.78rem;color:#f0ece4;outline:none;transition:border-color 0.3s}
        .hk-search input::placeholder{color:rgba(240,236,228,0.22)}
        .hk-search input:focus{border-color:rgba(212,175,106,0.35)}
        .hk-search-ic{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:rgba(240,236,228,0.28);font-size:0.85rem;pointer-events:none}
        .hk-sel{background:#13131a;border:1px solid rgba(212,175,106,0.15);border-radius:8px;padding:9px 12px;font-family:Montserrat,sans-serif;font-size:0.76rem;color:#c8c3bb;outline:none;cursor:pointer;color-scheme:dark}
        .hk-sel option,.hk-panel select option,.hk-modal select option{background-color:#1a1a22;color:#f0ece4}
        .hk-panel select,.hk-modal select{color-scheme:dark}
        .hk-btn-new{padding:9px 16px;border-radius:8px;background:linear-gradient(135deg,#c9a84c,#d4af6a);border:none;cursor:pointer;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#0a0a0a;white-space:nowrap;transition:opacity 0.2s,transform 0.15s}
        .hk-btn-new:hover{opacity:0.88;transform:translateY(-1px)}
        /* Task Grid */
        .hk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
        .hk-card{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;padding:16px;cursor:pointer;transition:all 0.22s;position:relative;overflow:hidden}
        .hk-card:hover{border-color:rgba(212,175,106,0.28);transform:translateY(-2px)}
        .hk-card.sel{border-color:rgba(212,175,106,0.45);background:rgba(212,175,106,0.04)}
        .hk-card-num{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:300;color:#d4af6a;line-height:1}
        .hk-prog-wrap{height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;margin-top:8px}
        .hk-prog-bar{height:100%;border-radius:2px;transition:width 0.4s ease}
        .hk-urgente{animation:hkpulse 1.4s infinite}
        @keyframes hkpulse{0%,100%{opacity:1}50%{opacity:0.55}}
        .hk-empty{padding:48px;text-align:center;color:rgba(240,236,228,0.2);font-size:0.82rem;grid-column:1/-1}
        /* Historial table */
        .hk-table{width:100%;border-collapse:collapse}
        .hk-table th{font-size:0.58rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(240,236,228,0.28);padding:8px 12px;text-align:left;border-bottom:1px solid rgba(212,175,106,0.1)}
        .hk-table td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.74rem;color:rgba(240,236,228,0.65)}
        .hk-table tr:last-child td{border-bottom:none}
        .hk-table tr:hover td{background:rgba(212,175,106,0.03)}
        /* Personal cards */
        .hk-pers-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
        .hk-pers-card{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;padding:18px}
        .hk-pers-name{font-family:'Cormorant Garamond',serif;font-size:1.3rem;color:#d4af6a;margin-bottom:2px}
        .hk-pers-cargo{font-size:0.65rem;color:rgba(240,236,228,0.35);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px}
        .hk-pers-stat{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.74rem;color:rgba(240,236,228,0.55)}
        .hk-pers-stat:last-child{border-bottom:none}
        .hk-habs{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
        .hk-hab-badge{background:rgba(212,175,106,0.08);border:1px solid rgba(212,175,106,0.2);border-radius:6px;padding:2px 8px;font-size:0.65rem;color:#d4af6a}
        /* Reportes */
        .hk-rep-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
        .hk-rep-stat{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:10px;padding:16px;text-align:center}
        .hk-rep-val{font-family:'Cormorant Garamond',serif;font-size:2.2rem;color:#d4af6a;font-weight:300}
        .hk-rep-lbl{font-size:0.6rem;color:rgba(240,236,228,0.3);text-transform:uppercase;letter-spacing:0.12em;margin-top:4px}
        .hk-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .hk-bar-lbl{width:72px;font-size:0.62rem;color:rgba(240,236,228,0.4);text-align:right}
        .hk-bar-track{flex:1;height:18px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden}
        .hk-bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#c9a84c,#d4af6a);transition:width 0.5s ease}
        .hk-bar-cnt{width:24px;font-size:0.68rem;color:#d4af6a;font-weight:600}
        /* Panel */
        .hk-ov{position:fixed;inset:0;z-index:180;background:rgba(0,0,0,0.52);backdrop-filter:blur(3px);animation:hkfade 0.2s}
        @keyframes hkfade{from{opacity:0}to{opacity:1}}
        .hk-panel{position:fixed;top:0;right:0;bottom:0;width:470px;max-width:96vw;z-index:190;background:#0f0f12;border-left:1px solid rgba(212,175,106,0.15);display:flex;flex-direction:column;animation:hkslide 0.3s cubic-bezier(0.16,1,0.3,1)}
        @keyframes hkslide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .hk-panel-scroll{flex:1;overflow-y:auto}
        .hk-panel-scroll::-webkit-scrollbar{width:3px}
        .hk-panel-scroll::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.18)}
        .hk-panel-hdr{padding:22px 24px 14px;border-bottom:1px solid rgba(212,175,106,0.08);display:flex;align-items:flex-start;justify-content:space-between}
        .hk-panel-close{width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.4);font-size:0.78rem;flex-shrink:0;transition:background 0.2s}
        .hk-panel-close:hover{background:rgba(255,255,255,0.1)}
        .hk-panel-body{padding:18px 24px 28px}
        .hk-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
        .hk-info-item label{font-size:0.58rem;font-weight:600;letter-spacing:0.13em;text-transform:uppercase;color:rgba(240,236,228,0.28);display:block;margin-bottom:3px}
        .hk-info-item .val{font-size:0.8rem;color:#f0ece4}
        .hk-sep{height:1px;background:rgba(212,175,106,0.07);margin:16px 0}
        .hk-sec-lbl{font-size:0.6rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:10px}
        .hk-chk-item{display:flex;align-items:center;gap:12px;padding:9px 4px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;border-radius:4px;transition:background 0.15s}
        .hk-chk-item:last-child{border-bottom:none}
        .hk-chk-item:hover{background:rgba(212,175,106,0.04)}
        .hk-chk-box{width:20px;height:20px;border-radius:5px;border:2px solid rgba(212,175,106,0.3);background:transparent;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#d4af6a;transition:all 0.15s}
        .hk-chk-box.on{background:rgba(82,201,122,0.15);border-color:rgba(82,201,122,0.5);color:#52c97a}
        .hk-chk-lbl{font-size:0.76rem;color:rgba(240,236,228,0.6);flex:1}
        .hk-chk-lbl.on{color:rgba(240,236,228,0.3);text-decoration:line-through}
        .hk-btn{width:100%;padding:11px;border-radius:8px;border:none;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;margin-bottom:8px;transition:all 0.2s}
        .hk-btn:disabled{opacity:0.4;cursor:not-allowed}
        .hk-btn-gold{background:linear-gradient(135deg,#c9a84c,#d4af6a);color:#0a0a0a}
        .hk-btn-green{background:rgba(82,201,122,0.15);border:1px solid rgba(82,201,122,0.4);color:#52c97a}
        .hk-btn-red{background:rgba(224,82,82,0.12);border:1px solid rgba(224,82,82,0.35);color:#e05252}
        .hk-btn-blue{background:rgba(106,184,212,0.12);border:1px solid rgba(106,184,212,0.35);color:#6ab8d4}
        /* Modal */
        .hk-modal-ov{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.72);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px;animation:hkfade 0.18s}
        .hk-modal{background:#13131a;border:1px solid rgba(212,175,106,0.2);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;animation:hkup 0.28s cubic-bezier(0.16,1,0.3,1)}
        @keyframes hkup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .hk-modal::-webkit-scrollbar{width:3px}
        .hk-modal::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.2)}
        .hk-modal-hdr{padding:20px 22px 14px;border-bottom:1px solid rgba(212,175,106,0.08);display:flex;align-items:center;justify-content:space-between}
        .hk-modal-body{padding:18px 22px 22px}
        .hk-modal-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
        .hk-modal-f{margin-bottom:12px}
        .hk-modal-close{width:28px;height:28px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.4);font-size:0.75rem;transition:background 0.2s}
        .hk-modal-close:hover{background:rgba(255,255,255,0.1)}
        .hk-exito{text-align:center;padding:28px 20px}
        .hk-exito-ic{width:50px;height:50px;border-radius:50%;background:rgba(82,201,122,0.1);border:2px solid rgba(82,201,122,0.35);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.3rem}
        @media(max-width:640px){
          .hk-grid,.hk-pers-grid{grid-template-columns:1fr}
          .hk-panel{width:100vw;max-width:100vw}
          .hk-rep-grid{grid-template-columns:1fr}
          .hk-stats{grid-template-columns:repeat(2,1fr)}
        }
      `}</style>

      <PersonalLayout titulo="Housekeeping" subtitulo="Gestión de limpieza de habitaciones">
        {error && <div className="hk-err">{error}</div>}

        {/* Dashboard stats */}
        {esAdmin && (
          <div className="hk-stats">
            <div className="hk-stat"><div className="hk-stat-lbl">Total habitaciones</div><div className="hk-stat-val" style={{ color: '#f0ece4' }}>{resumen.total_habitaciones}</div></div>
            <div className="hk-stat"><div className="hk-stat-lbl">Disponibles</div><div className="hk-stat-val" style={{ color: '#52c97a' }}>{resumen.disponibles}</div></div>
            <div className="hk-stat"><div className="hk-stat-lbl">Ocupadas</div><div className="hk-stat-val" style={{ color: '#6ab8d4' }}>{resumen.ocupadas}</div></div>
            <div className="hk-stat"><div className="hk-stat-lbl">En limpieza</div><div className="hk-stat-val" style={{ color: '#d4af6a' }}>{resumen.limpieza}</div></div>
            <div className="hk-stat"><div className="hk-stat-lbl">Mantenimiento</div><div className="hk-stat-val" style={{ color: '#9696a0' }}>{resumen.mantenimiento}</div></div>
            <div className="hk-stat"><div className="hk-stat-lbl">Para inspección</div><div className="hk-stat-val" style={{ color: '#a06ad4' }}>{resumen.completadas}</div></div>
            <div className="hk-stat"><div className="hk-stat-lbl">Aprobadas hoy</div><div className="hk-stat-val" style={{ color: '#52c97a' }}>{resumen.aprobadas_hoy}</div></div>
            <div className="hk-stat"><div className="hk-stat-lbl">Retrasadas</div><div className="hk-stat-val" style={{ color: '#e05252' }}>{resumen.retrasadas}</div></div>
          </div>
        )}

        {/* Alertas */}
        {esAdmin && alertas.map((a, i) => (
          <div key={i} className="hk-alerta" style={{
            background: a.tipo === 'urgente' ? 'rgba(224,82,82,0.08)' : a.tipo === 'info' ? 'rgba(160,106,212,0.08)' : 'rgba(212,175,106,0.08)',
            border: `1px solid ${a.tipo === 'urgente' ? 'rgba(224,82,82,0.25)' : a.tipo === 'info' ? 'rgba(160,106,212,0.25)' : 'rgba(212,175,106,0.25)'}`,
            color: a.tipo === 'urgente' ? '#e05252' : a.tipo === 'info' ? '#a06ad4' : '#d4af6a',
          }}>
            <span>{a.tipo === 'urgente' ? '⚠' : a.tipo === 'info' ? '◉' : '●'}</span>
            <span>{a.msg}</span>
          </div>
        ))}

        {/* Tabs */}
        <div className="hk-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`hk-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key as typeof tab)}>
              {t.label}
              {t.key === 'tareas' && tareas.filter(x => x.estado === 'completada').length > 0 && (
                <span style={{ marginLeft: 6, background: 'rgba(160,106,212,0.2)', color: '#a06ad4', fontSize: '0.58rem', padding: '1px 6px', borderRadius: 10 }}>
                  {tareas.filter(x => x.estado === 'completada').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: TAREAS ── */}
        {tab === 'tareas' && (
          <>
            <div className="hk-toolbar">
              <div className="hk-search">
                <span className="hk-search-ic">🔍</span>
                <input type="text" placeholder="Buscar por código, habitación o personal..."
                  value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <select className="hk-sel" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="todos">Todos los estados</option>
                {Object.entries(EC).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="hk-sel" value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}>
                <option value="todos">Todas las prioridades</option>
                {Object.entries(PC).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {esAdmin && (
                <button className="hk-btn-new" onClick={() => { setModalCrear(true); setExitoCrear(false); setErrorCrear(null); cargarRecursosModal() }}>
                  + Nueva tarea
                </button>
              )}
            </div>
            <div className="hk-grid">
              {cargando
                ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="hk-skel" style={{ height: 180 }} />)
                : filtradas.length === 0
                  ? <div className="hk-empty">No hay tareas activas</div>
                  : filtradas.map(t => {
                    const ec = EC[t.estado] ?? EC.pendiente
                    const pc = PC[t.prioridad] ?? PC.media
                    const pct = t.checklist_total > 0 ? Math.round((t.checklist_ok / t.checklist_total) * 100) : 0
                    return (
                      <div key={t.id} className={`hk-card ${panelId === t.id ? 'sel' : ''}`} onClick={() => setPanelId(t.id)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div className="hk-card-num">Hab. {t.habitacion_numero}</div>
                            <div style={{ fontSize: '0.62rem', color: 'rgba(240,236,228,0.3)' }}>Piso {t.piso}</div>
                          </div>
                          <span className={`hk-pill ${t.prioridad === 'urgente' ? 'hk-urgente' : ''}`}
                            style={{ background: `${pc.color}20`, color: pc.color }}>{pc.label}</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.4)', marginBottom: 8 }}>{t.tipo_habitacion}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.55)', marginBottom: 10 }}>
                          {t.personal_nombre ?? <span style={{ color: 'rgba(240,236,228,0.2)' }}>Sin asignar</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span className="hk-pill" style={{ background: ec.bg, color: ec.color }}>{ec.label}</span>
                        </div>
                        {t.checklist_total > 0 && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(240,236,228,0.28)', marginBottom: 3 }}>
                              <span>Checklist</span><span>{t.checklist_ok}/{t.checklist_total}</span>
                            </div>
                            <div className="hk-prog-wrap">
                              <div className="hk-prog-bar" style={{ width: `${pct}%`, background: pct === 100 ? '#52c97a' : pct > 50 ? '#d4af6a' : '#6ab8d4' }} />
                            </div>
                          </>
                        )}
                        <div style={{ fontSize: '0.6rem', color: 'rgba(240,236,228,0.18)', marginTop: 8 }}>{t.codigo} · {t.fecha_programada}</div>
                      </div>
                    )
                  })
              }
            </div>
          </>
        )}

        {/* ── TAB: HISTORIAL ── */}
        {tab === 'historial' && (
          <>
            {/* Selector de fecha */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)' }}>
                Fecha
              </div>
              <input type="date" style={{ ...inp, width: 'auto', padding: '8px 12px' }}
                value={fechaHistorial}
                onChange={e => setFechaHistorial(e.target.value)} />
              <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.35)' }}>
                {historial.length} tarea{historial.length !== 1 ? 's' : ''} ·{' '}
                {new Set(historial.map(h => h.habitacion_numero)).size} habitación{new Set(historial.map(h => h.habitacion_numero)).size !== 1 ? 'es' : ''} atendida{new Set(historial.map(h => h.habitacion_numero)).size !== 1 ? 's' : ''}
              </div>
            </div>

            {cargTab ? (
              <div style={{ color: 'rgba(240,236,228,0.25)', fontSize: '0.78rem', padding: '24px 0' }}>Cargando historial...</div>
            ) : historial.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.2)', padding: 48, fontSize: '0.82rem' }}>
                Sin tareas para el {new Date(fechaHistorial + 'T12:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="hk-table">
                  <thead>
                    <tr>
                      <th>Habitación</th><th>Personal</th>
                      <th style={{ textAlign: 'center' }}>Veces atendida</th>
                      <th>Inicio</th><th>Fin</th><th>Duración</th><th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(h => (
                      <tr key={h.id}>
                        <td>
                          <div style={{ fontWeight: 500, color: '#d4af6a' }}>Hab. {h.habitacion_numero}</div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.3)' }}>{h.tipo_habitacion} · Piso {h.piso}</div>
                        </td>
                        <td>{h.personal_nombre ?? <span style={{ color: 'rgba(240,236,228,0.25)' }}>—</span>}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', minWidth: 28, padding: '2px 8px',
                            background: h.veces_atendida > 1 ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${h.veces_atendida > 1 ? 'rgba(212,175,106,0.35)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                            color: h.veces_atendida > 1 ? '#d4af6a' : 'rgba(240,236,228,0.4)',
                          }}>
                            {h.veces_atendida}x
                          </span>
                        </td>
                        <td>{fmtHora(h.hora_inicio)}</td>
                        <td>{fmtHora(h.hora_fin)}</td>
                        <td style={{ color: '#6ab8d4' }}>{fmtMins(h.duracion_mins)}</td>
                        <td>
                          <span className="hk-pill" style={{ background: (EC[h.estado] ?? EC.aprobada).bg, color: (EC[h.estado] ?? EC.aprobada).color }}>
                            {(EC[h.estado] ?? EC.aprobada).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TAB: PERSONAL ── */}
        {tab === 'personal' && (
          <>
            {cargTab ? (
              <div style={{ color: 'rgba(240,236,228,0.25)', fontSize: '0.78rem', padding: '24px 0' }}>Cargando personal...</div>
            ) : personalD.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.2)', padding: 48, fontSize: '0.82rem' }}>Sin registros de personal</div>
            ) : (
              <div className="hk-pers-grid">
                {personalD.map(p => (
                  <div key={p.id} className="hk-pers-card">
                    <div className="hk-pers-name">{p.nombre}</div>
                    <div className="hk-pers-cargo">{p.cargo}</div>
                    <div className="hk-pers-stat">
                      <span>Tareas pendientes</span>
                      <span style={{ color: '#d4af6a', fontWeight: 600 }}>{p.tareas_pendientes}</span>
                    </div>
                    <div className="hk-pers-stat">
                      <span>En progreso</span>
                      <span style={{ color: '#6ab8d4', fontWeight: 600 }}>{p.tareas_en_progreso}</span>
                    </div>
                    <div className="hk-pers-stat">
                      <span>Completadas hoy</span>
                      <span style={{ color: '#52c97a', fontWeight: 600 }}>{p.tareas_completadas_hoy}</span>
                    </div>
                    {p.habitaciones_asignadas.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(240,236,228,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Habitaciones asignadas</div>
                        <div className="hk-habs">
                          {p.habitaciones_asignadas.map(n => <span key={n} className="hk-hab-badge">{n}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: REPORTES ── */}
        {tab === 'reportes' && (
          <>
            {cargTab ? (
              <div style={{ color: 'rgba(240,236,228,0.25)', fontSize: '0.78rem', padding: '24px 0' }}>Cargando reportes...</div>
            ) : !reportes ? (
              <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.2)', padding: 48 }}>Sin datos suficientes</div>
            ) : (
              <>
                <div className="hk-rep-grid">
                  <div className="hk-rep-stat">
                    <div className="hk-rep-val">{fmtMins(reportes.tiempo_promedio)}</div>
                    <div className="hk-rep-lbl">Tiempo promedio de limpieza</div>
                  </div>
                  <div className="hk-rep-stat">
                    <div className="hk-rep-val">{reportes.tasa_aprobacion ?? 0}%</div>
                    <div className="hk-rep-lbl">Tasa de aprobación (30 días)</div>
                  </div>
                </div>

                <div style={{ background: '#13131a', border: '1px solid rgba(212,175,106,0.1)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.28)', marginBottom: 14 }}>
                    Limpiezas aprobadas — últimos 7 días
                  </div>
                  {(() => {
                    const maxVal = Math.max(...(reportes.por_dia ?? []).map(d => d.total), 1)
                    return (reportes.por_dia ?? []).map(d => (
                      <div key={d.fecha} className="hk-bar-row">
                        <div className="hk-bar-lbl">
                          {new Date(d.fecha + 'T12:00').toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })}
                        </div>
                        <div className="hk-bar-track">
                          <div className="hk-bar-fill" style={{ width: `${(d.total / maxVal) * 100}%` }} />
                        </div>
                        <div className="hk-bar-cnt">{d.total}</div>
                      </div>
                    ))
                  })()}
                </div>

                <div style={{ background: '#13131a', border: '1px solid rgba(212,175,106,0.1)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.28)', marginBottom: 14 }}>
                    Productividad por empleado (30 días)
                  </div>
                  <table className="hk-table">
                    <thead>
                      <tr>
                        <th>Empleado</th><th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'right' }}>Aprobadas</th><th style={{ textAlign: 'right' }}>Tiempo prom.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportes.por_empleado ?? []).map((e, i) => (
                        <tr key={i}>
                          <td>{e.nombre}</td>
                          <td style={{ textAlign: 'right' }}>{e.total}</td>
                          <td style={{ textAlign: 'right', color: '#52c97a' }}>{e.aprobadas}</td>
                          <td style={{ textAlign: 'right', color: '#6ab8d4' }}>{fmtMins(e.tiempo_promedio_mins)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </PersonalLayout>

      {/* ── Panel lateral ── */}
      {panelId && sel && (
        <>
          <div className="hk-ov" onClick={() => setPanelId(null)} />
          <div className="hk-panel">
            <div className="hk-panel-hdr">
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.8rem', color: '#d4af6a', fontWeight: 300, lineHeight: 1 }}>
                  Hab. {sel.habitacion_numero}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.4)', marginTop: 3 }}>{sel.tipo_habitacion} · Piso {sel.piso}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className="hk-pill" style={{ background: (EC[sel.estado] ?? EC.pendiente).bg, color: (EC[sel.estado] ?? EC.pendiente).color }}>
                    {(EC[sel.estado] ?? EC.pendiente).label}
                  </span>
                  <span className="hk-pill" style={{ background: `${(PC[sel.prioridad] ?? PC.media).color}20`, color: (PC[sel.prioridad] ?? PC.media).color }}>
                    {(PC[sel.prioridad] ?? PC.media).label}
                  </span>
                </div>
              </div>
              <button className="hk-panel-close" onClick={() => setPanelId(null)}>✕</button>
            </div>
            <div className="hk-panel-scroll">
              <div className="hk-panel-body">
                <div className="hk-info-grid">
                  <div className="hk-info-item">
                    <label>Personal</label>
                    <div className="val">{sel.personal_nombre ?? <span style={{ color: 'rgba(240,236,228,0.3)' }}>Sin asignar</span>}</div>
                  </div>
                  <div className="hk-info-item">
                    <label>Fecha programada</label>
                    <div className="val">{sel.fecha_programada}</div>
                  </div>
                  <div className="hk-info-item">
                    <label>Hora inicio</label>
                    <div className="val">{fmtHora(sel.hora_inicio)}</div>
                  </div>
                  <div className="hk-info-item">
                    <label>Hora fin</label>
                    <div className="val">{fmtHora(sel.hora_fin)}</div>
                  </div>
                  {sel.hora_inicio && sel.hora_fin && (
                    <div className="hk-info-item">
                      <label>Duración</label>
                      <div className="val" style={{ color: '#6ab8d4' }}>
                        {fmtMins(Math.round((new Date(sel.hora_fin).getTime() - new Date(sel.hora_inicio).getTime()) / 60000))}
                      </div>
                    </div>
                  )}
                  <div className="hk-info-item">
                    <label>Código</label>
                    <div className="val" style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.35)' }}>{sel.codigo}</div>
                  </div>
                </div>

                {sel.observaciones && (
                  <><div className="hk-sec-lbl">Observaciones</div>
                  <p style={{ fontSize: '0.76rem', color: 'rgba(240,236,228,0.5)', marginBottom: 16, lineHeight: 1.6 }}>{sel.observaciones}</p></>
                )}

                {/* Reasignar (admin) */}
                {esAdmin && sel.estado !== 'aprobada' && (
                  <>
                    <div className="hk-sep" />
                    <div className="hk-sec-lbl">Reasignar tarea</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <select style={{ ...inp, flex: 1 }} value={reasignarId} onChange={e => setReasignarId(e.target.value)}>
                        <option value="" disabled={Boolean(sel.personal_id)}>Sin asignar</option>
                        {sel.personal_id && !personal.some(p => p.id === sel.personal_id) && (
                          <option value={sel.personal_id}>{sel.personal_nombre ?? 'Personal asignado'}</option>
                        )}
                        {personal.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      <button className="hk-btn hk-btn-blue" style={{ width: 'auto', padding: '0 14px', margin: 0 }}
                        disabled={procesando || reasignarId === (sel.personal_id ?? '')}
                        onClick={handleReasignar}>
                        {reasignarId === (sel.personal_id ?? '') ? 'Asignada' : 'Asignar'}
                      </button>
                    </div>
                  </>
                )}

                <div className="hk-sep" />
                <div className="hk-sec-lbl">
                  Checklist — {sel.checklist_ok}/{sel.checklist_total} completados
                </div>
                {sel.checklist_total > 0 && (
                  <div className="hk-prog-wrap" style={{ marginBottom: 12 }}>
                    <div className="hk-prog-bar" style={{
                      width: `${sel.checklist_total > 0 ? Math.round(sel.checklist_ok / sel.checklist_total * 100) : 0}%`,
                      background: sel.checklist_ok === sel.checklist_total ? '#52c97a' : '#d4af6a',
                    }} />
                  </div>
                )}
                {cargPanel
                  ? <div style={{ color: 'rgba(240,236,228,0.25)', fontSize: '0.72rem', marginBottom: 12 }}>Cargando...</div>
                  : checklist.map(item => {
                    const canEdit = !esAdmin && sel.estado === 'en_progreso'
                    return (
                      <div key={item.id} className="hk-chk-item"
                        onClick={() => canEdit && handleToggleChecklist(item)}
                        style={{ cursor: canEdit ? 'pointer' : 'default' }}>
                        <div className={`hk-chk-box ${item.completado ? 'on' : ''}`}>{item.completado ? '✓' : ''}</div>
                        <span className={`hk-chk-lbl ${item.completado ? 'on' : ''}`}>{item.label}</span>
                      </div>
                    )
                  })
                }

                {exitoPanel && <div className="hk-ok" style={{ marginBottom: 10, marginTop: 12 }}>{exitoPanel}</div>}
                {errorPanel && <div className="hk-err" style={{ marginTop: 10 }}>{errorPanel}</div>}

                <div className="hk-sep" />

                {/* Acciones PERSONAL */}
                {!esAdmin && (
                  <>
                    {sel.estado === 'pendiente' && (
                      <button className="hk-btn hk-btn-gold" disabled={procesando} onClick={handleIniciar}>
                        {procesando ? 'Iniciando...' : '▶ Iniciar limpieza'}
                      </button>
                    )}
                    {sel.estado === 'en_progreso' && (
                      <>
                        <div className="hk-sec-lbl">Productos utilizados</div>
                        <div style={{ marginBottom: 10 }}>
                          <textarea style={{ ...inp, resize: 'vertical', minHeight: 50 }}
                            placeholder="Ej: Desinfectante, jabón de piso, ambientador..."
                            value={productos} onChange={e => setProductos(e.target.value)} />
                        </div>
                        <button className="hk-btn hk-btn-green"
                          disabled={procesando || sel.checklist_ok < sel.checklist_total}
                          onClick={handleCompletar}>
                          {procesando ? 'Enviando...' : '✓ Marcar como completada'}
                        </button>
                        {sel.checklist_ok < sel.checklist_total && (
                          <div style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.28)', textAlign: 'center', marginTop: -4 }}>
                            Completa todos los ítems del checklist primero
                          </div>
                        )}
                      </>
                    )}
                    {sel.estado === 'rechazada' && sel.obs_inspector && (
                      <div style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: 8, padding: '10px 13px', fontSize: '0.74rem', color: '#e05252', marginBottom: 10 }}>
                        <div style={{ fontWeight: 600, marginBottom: 3 }}>Correcciones requeridas:</div>
                        {sel.obs_inspector}
                      </div>
                    )}
                  </>
                )}

                {/* Acciones ADMIN/SUPERVISOR */}
                {esAdmin && sel.estado === 'completada' && (
                  <>
                    <div className="hk-sec-lbl" style={{ color: '#a06ad4' }}>Inspección</div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={lbl}>Observaciones del inspector</label>
                      <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }}
                        placeholder="Observaciones (opcional para aprobar, obligatorio para rechazar)..."
                        value={obsInspector} onChange={e => setObsInspector(e.target.value)} />
                    </div>
                    <button className="hk-btn hk-btn-green" disabled={procesando} onClick={handleAprobar}>
                      {procesando ? 'Procesando...' : '✓ Aprobar — habilitar habitación'}
                    </button>
                    <button className="hk-btn hk-btn-red" disabled={procesando} onClick={handleRechazar}>
                      {procesando ? 'Procesando...' : '✕ Rechazar — solicitar correcciones'}
                    </button>
                  </>
                )}
                {esAdmin && sel.estado === 'aprobada' && (
                  <div className="hk-ok">✓ Limpieza aprobada — habitación disponible</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal crear tarea ── */}
      {modalCrear && (
        <div className="hk-modal-ov" onClick={() => !creando && !exitoCrear && setModalCrear(false)}>
          <div className="hk-modal" onClick={e => e.stopPropagation()}>
            <div className="hk-modal-hdr">
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', color: '#d4af6a', fontWeight: 300 }}>Nueva tarea de limpieza</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.35)', marginTop: 3 }}>Asignar habitación y personal</div>
              </div>
              {!creando && !exitoCrear && <button className="hk-modal-close" onClick={() => setModalCrear(false)}>✕</button>}
            </div>
            <div className="hk-modal-body">
              {exitoCrear ? (
                <div className="hk-exito">
                  <div className="hk-exito-ic">✓</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', color: '#52c97a', marginBottom: 6 }}>Tarea creada</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.35)' }}>Se notificará al personal asignado</div>
                </div>
              ) : (
                <>
                  {errorCrear && <div className="hk-err">{errorCrear}</div>}
                  <div className="hk-modal-f">
                    <label style={lbl}>Habitación *</label>
                    <select style={inp} value={fHabId} onChange={e => setFHabId(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {habitaciones.filter(h => ['limpieza','disponible','ocupada'].includes(h.estado))
                        .map(h => <option key={h.id} value={h.id}>Hab. {h.numero} ({h.estado})</option>)}
                    </select>
                  </div>
                  <div className="hk-modal-f">
                    <label style={lbl}>Asignar a</label>
                    <select style={inp} value={fPersonalId} onChange={e => setFPersonalId(e.target.value)}>
                      <option value="">Sin asignar</option>
                      {personal.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} — {p.tareas_activas} tarea{p.tareas_activas !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="hk-modal-g2">
                    <div>
                      <label style={lbl}>Prioridad</label>
                      <select style={inp} value={fPrioridad} onChange={e => setFPrioridad(e.target.value)}>
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Fecha</label>
                      <input type="date" style={inp} value={fFecha} onChange={e => setFFecha(e.target.value)} />
                    </div>
                  </div>
                  <div className="hk-modal-f">
                    <label style={lbl}>Hora programada</label>
                    <input type="time" style={inp} value={fHora} onChange={e => setFHora(e.target.value)} />
                  </div>
                  <div className="hk-modal-f">
                    <label style={lbl}>Observaciones</label>
                    <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }}
                      placeholder="Instrucciones especiales..."
                      value={fObs} onChange={e => setFObs(e.target.value)} />
                  </div>
                  <button
                    disabled={!fHabId || creando}
                    style={{
                      width: '100%', padding: 12, borderRadius: 8, border: 'none',
                      background: !fHabId || creando ? 'rgba(212,175,106,0.2)' : 'linear-gradient(135deg,#c9a84c,#d4af6a)',
                      opacity: !fHabId || creando ? 0.5 : 1,
                      cursor: !fHabId || creando ? 'not-allowed' : 'pointer',
                      fontFamily: 'Montserrat,sans-serif', fontSize: '0.7rem', fontWeight: 600,
                      letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#0a0a0a',
                      marginTop: 4, transition: 'all 0.2s',
                    }}
                    onClick={handleCrear}>
                    {creando ? 'Creando...' : 'Crear tarea'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
