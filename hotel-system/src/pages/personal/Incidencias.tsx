import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import PersonalLayout from '../../components/PersonalLayout'
import { supabase } from '../../services/supabase'
import { getHabitaciones } from '../../services/api'
import { executeRpc as rpc } from '../../repositories/rpcRepository'

// ── Types ──────────────────────────────────────────────────────────────────
type Incidencia = {
  id: string; codigo: string; titulo: string; descripcion: string | null
  categoria: string; subcategoria: string | null; prioridad: string; estado: string
  origen: string; area_afectada: string | null
  habitacion_id: string | null; habitacion_num: string | null
  reportado_por_id: string; reportado_por: string
  asignado_a_id: string | null; asignado_a: string | null
  fecha_atencion: string | null; fecha_resolucion: string | null
  solucion: string | null; observaciones_finales: string | null
  fotos_count: number; comentarios_count: number
  created_at: string; updated_at: string
}
type Comentario = { id: string; usuario_nombre: string; comentario: string; created_at: string }
type FotoInc  = { id: string; url: string; nombre: string | null }
type PersonalItem = { id: string; nombre: string; cargo: string }
type ResumenInc = {
  total: number; nuevas: number; asignadas: number; en_proceso: number
  pendientes: number; resueltas: number; cerradas: number; criticas: number; hoy: number
}
type ReportesInc = {
  por_categoria: { categoria: string; total: number }[]
  por_estado: { estado: string; total: number }[]
  tiempo_promedio_horas: number | null
  criticas_recientes: { titulo: string; codigo: string; prioridad: string; created_at: string }[]
}

// ── Config ─────────────────────────────────────────────────────────────────
const EC: Record<string, { bg: string; color: string; label: string }> = {
  nueva:      { bg: 'rgba(212,175,106,0.12)', color: '#d4af6a', label: 'Nueva'      },
  asignada:   { bg: 'rgba(106,184,212,0.12)', color: '#6ab8d4', label: 'Asignada'   },
  en_proceso: { bg: 'rgba(160,106,212,0.12)', color: '#a06ad4', label: 'En proceso' },
  pendiente:  { bg: 'rgba(224,162,82,0.12)',  color: '#e0a252', label: 'Pendiente'  },
  resuelta:   { bg: 'rgba(82,201,122,0.12)',  color: '#52c97a', label: 'Resuelta'   },
  cerrada:    { bg: 'rgba(150,150,160,0.12)', color: '#9696a0', label: 'Cerrada'    },
}
const PC: Record<string, { color: string; label: string }> = {
  baja:    { color: '#9696a0', label: 'Baja'    },
  media:   { color: '#6ab8d4', label: 'Media'   },
  alta:    { color: '#d4af6a', label: 'Alta'    },
  critica: { color: '#e05252', label: 'Crítica' },
}
const CATS: Record<string, { label: string; icon: string; subs: string[] }> = {
  habitaciones:  { label: 'Habitaciones',  icon: '🛏', subs: ['Aire acondicionado','Televisión dañada','Fuga de agua','Problemas eléctricos','Cerradura defectuosa','Mobiliario dañado'] },
  housekeeping:  { label: 'Housekeeping',  icon: '🧹', subs: ['Hab. no limpiada','Limpieza incompleta','Falta de insumos','Toallas faltantes'] },
  huespedes:     { label: 'Huéspedes',     icon: '👤', subs: ['Quejas','Objetos perdidos','Solicitudes especiales','Conflictos entre huéspedes'] },
  mantenimiento: { label: 'Mantenimiento', icon: '🔧', subs: ['Ascensores','Iluminación','Sistemas eléctricos','Sistemas de agua','Equipos dañados'] },
  seguridad:     { label: 'Seguridad',     icon: '🔒', subs: ['Acceso no autorizado','Objetos sospechosos','Accidentes','Emergencias'] },
}
const ORIGENES = ['cliente','recepcion','housekeeping','mantenimiento','sistema']
const ESTADOS_ACTIVOS = ['nueva','asignada','en_proceso','pendiente']

const inp: React.CSSProperties = {
  width:'100%', background:'rgba(255,255,255,0.04)',
  border:'1px solid rgba(212,175,106,0.2)', borderRadius:8,
  padding:'10px 13px', fontFamily:'Montserrat,sans-serif',
  fontSize:'0.82rem', fontWeight:300, color:'#f0ece4', outline:'none',
}
const lbl: React.CSSProperties = {
  fontSize:'0.6rem', fontWeight:600, letterSpacing:'0.14em',
  textTransform:'uppercase', color:'rgba(240,236,228,0.3)', display:'block', marginBottom:5,
}

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const fmtDt = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })

// ── Component ──────────────────────────────────────────────────────────────
export default function Incidencias() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'Administrador' || perfil?.rol === 'Supervisor'

  const RES0: ResumenInc = { total:0,nuevas:0,asignadas:0,en_proceso:0,pendientes:0,resueltas:0,cerradas:0,criticas:0,hoy:0 }

  const [tab,        setTab]        = useState<'activas'|'historial'|'reportes'>('activas')
  const [resumen,    setResumen]    = useState<ResumenInc>(RES0)
  const [incidencias,setIncidencias]= useState<Incidencia[]>([])
  const [reportes,   setReportes]   = useState<ReportesInc | null>(null)
  const [personal,   setPersonal]   = useState<PersonalItem[]>([])
  const [habitaciones,setHabitaciones]=useState<{id:string;numero:string}[]>([])
  const [cargando,   setCargando]   = useState(true)
  const [cargTab,    setCargTab]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Filtros
  const [filtroEstado,    setFiltroEstado]    = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos')
  const [busqueda,        setBusqueda]        = useState('')

  // Panel
  const [panelId,   setPanelId]   = useState<string | null>(null)
  const [comentarios,setComentarios]=useState<Comentario[]>([])
  const [fotos,     setFotos]     = useState<FotoInc[]>([])
  const [cargPanel, setCargPanel] = useState(false)
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [envComment,      setEnvComment]      = useState(false)
  const [solucion,        setSolucion]        = useState('')
  const [obsFin,          setObsFin]          = useState('')
  const [asignarId,       setAsignarId]       = useState('')
  const [procesando,      setProcesando]      = useState(false)
  const [exitoPanel,      setExitoPanel]      = useState<string | null>(null)
  const [errorPanel,      setErrorPanel]      = useState<string | null>(null)
  const [subiendoFoto,    setSubiendoFoto]    = useState(false)
  const [confirmarElim,   setConfirmarElim]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Modal crear/reportar
  const [modal,      setModal]      = useState(false)
  const [fTitulo,    setFTitulo]    = useState('')
  const [fDesc,      setFDesc]      = useState('')
  const [fCat,       setFCat]       = useState('habitaciones')
  const [fSubcat,    setFSubcat]    = useState('')
  const [fPrioridad, setFPrioridad] = useState('media')
  const [fOrigen,    setFOrigen]    = useState('recepcion')
  const [fArea,      setFArea]      = useState('')
  const [fHabId,     setFHabId]     = useState('')
  const [fAsignadoA, setFAsignadoA] = useState('')
  const [creando,    setCreando]    = useState(false)
  const [exitoCrear, setExitoCrear] = useState(false)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)

  // ── Data ──────────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true)
      const fn = esAdmin ? 'rpc_get_incidencias' : 'rpc_get_mis_incidencias'
      const [incData, resData] = await Promise.all([
        rpc(fn),
        esAdmin ? rpc('rpc_get_resumen_incidencias') : Promise.resolve([RES0]),
      ])
      setIncidencias((incData as Incidencia[]) ?? [])
      setResumen(prev => ((resData as ResumenInc[])?.[0]) ?? prev)
    } catch { setError('No se pudieron cargar las incidencias.') }
    finally { setCargando(false) }
  }, [esAdmin])

  useEffect(() => {
    cargarDatos()
    if (esAdmin) {
      Promise.all([
        rpc('rpc_get_todo_personal').catch(() => []),
        getHabitaciones().catch(() => []),
      ]).then(([pers, habs]) => {
        setPersonal((pers as PersonalItem[]) ?? [])
        setHabitaciones((habs as { id: string; numero: string }[]) ?? [])
      })
    }
  }, [cargarDatos, esAdmin])

  useEffect(() => {
    if (!esAdmin || tab !== 'reportes') { setCargTab(false); return }
    setCargTab(true)
    rpc('rpc_get_reportes_incidencias')
      .then(d => setReportes(d as ReportesInc))
      .catch(() => {})
      .finally(() => setCargTab(false))
  }, [tab, esAdmin])

  useEffect(() => {
    if (!panelId) {
      setComentarios([]); setFotos([]); setSolucion(''); setObsFin('')
      setAsignarId(''); setExitoPanel(null); setErrorPanel(null); setConfirmarElim(false)
      return
    }
    setCargPanel(true)
    const inc = incidencias.find(i => i.id === panelId)
    setAsignarId(inc?.asignado_a_id ?? '')
    setSolucion(inc?.solucion ?? '')
    Promise.all([
      rpc('rpc_get_comentarios_incidencia', { p_incidencia_id: panelId }),
      rpc('rpc_get_fotos_incidencia', { p_incidencia_id: panelId }),
    ]).then(([c, f]) => {
      setComentarios((c as Comentario[]) ?? [])
      setFotos((f as FotoInc[]) ?? [])
    }).catch(() => {}).finally(() => setCargPanel(false))
  }, [panelId, incidencias])

  const cargarRecursosModal = async () => {
    const [pers, habs] = await Promise.all([
      rpc('rpc_get_todo_personal').catch(() => []),
      getHabitaciones().catch(() => []),
    ])
    setPersonal((pers as PersonalItem[]) ?? [])
    setHabitaciones((habs as {id:string;numero:string}[]) ?? [])
  }

  // ── Derivados ─────────────────────────────────────────────────────────
  const sel = panelId ? incidencias.find(i => i.id === panelId) ?? null : null

  const filtradas = incidencias.filter(i => {
    const enTab = tab === 'activas' ? ESTADOS_ACTIVOS.includes(i.estado) : ['resuelta','cerrada'].includes(i.estado)
    const mE = filtroEstado    === 'todos' || i.estado    === filtroEstado
    const mC = filtroCategoria === 'todos' || i.categoria === filtroCategoria
    const mP = filtroPrioridad === 'todos' || i.prioridad === filtroPrioridad
    const mB = !busqueda ||
      i.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (i.reportado_por ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (i.habitacion_num ?? '').includes(busqueda)
    return enTab && mE && mC && mP && mB
  })

  // ── Acciones ──────────────────────────────────────────────────────────
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

  const handleEstado = (estado: string) =>
    sel && accion('rpc_cambiar_estado_incidencia', {
      p_id: sel.id, p_estado: estado,
      p_solucion: solucion || null, p_obs_finales: obsFin || null,
    }, `Estado actualizado a: ${EC[estado]?.label}`)

  const handleAsignar = () => {
    if (!asignarId || asignarId === sel?.asignado_a_id) return
    if (sel) accion('rpc_asignar_incidencia', { p_id: sel.id, p_personal_id: asignarId }, 'Incidencia asignada.')
  }

  const handleEliminar = () => {
    if (!confirmarElim) { setConfirmarElim(true); return }
    if (sel) accion('rpc_eliminar_incidencia', { p_id: sel.id }, 'Incidencia eliminada.').then(() => setPanelId(null))
    setConfirmarElim(false)
  }

  const handleComentario = async () => {
    if (!nuevoComentario.trim() || !panelId) return
    setEnvComment(true)
    try {
      await rpc('rpc_agregar_comentario_incidencia', { p_incidencia_id: panelId, p_comentario: nuevoComentario.trim() })
      setNuevoComentario('')
      const c = await rpc('rpc_get_comentarios_incidencia', { p_incidencia_id: panelId })
      setComentarios((c as Comentario[]) ?? [])
    } catch (e) { setErrorPanel((e as Error).message) }
    finally { setEnvComment(false) }
  }

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !panelId) return
    setSubiendoFoto(true)
    try {
      for (const file of Array.from(files)) {
        const ext  = file.name.split('.').pop()
        const path = `${panelId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('incidencias').upload(path, file)
        if (upErr) continue
        const { data: urlData } = supabase.storage.from('incidencias').getPublicUrl(path)
        await rpc('rpc_agregar_foto_incidencia', { p_incidencia_id: panelId, p_storage_path: path, p_url: urlData.publicUrl, p_nombre: file.name })
      }
      const f = await rpc('rpc_get_fotos_incidencia', { p_incidencia_id: panelId })
      setFotos((f as FotoInc[]) ?? [])
      await cargarDatos()
    } catch (e) { setErrorPanel((e as Error).message) }
    finally { setSubiendoFoto(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const handleCrear = async () => {
    if (!fTitulo.trim()) { setErrorCrear('El título es obligatorio.'); return }
    setCreando(true); setErrorCrear(null)
    try {
      await rpc('rpc_crear_incidencia', {
        p_titulo: fTitulo.trim(), p_descripcion: fDesc || null,
        p_categoria: fCat, p_subcategoria: fSubcat || null,
        p_prioridad: fPrioridad, p_origen: fOrigen,
        p_area_afectada: fArea || null,
        p_habitacion_id: fHabId || null,
        p_asignado_a: (esAdmin && fAsignadoA) ? fAsignadoA : null,
      })
      setExitoCrear(true); await cargarDatos()
      setTimeout(() => { setExitoCrear(false); setModal(false); resetModal() }, 2000)
    } catch (e) { setErrorCrear((e as Error).message) }
    finally { setCreando(false) }
  }

  const resetModal = () => { setFTitulo(''); setFDesc(''); setFCat('habitaciones'); setFSubcat(''); setFPrioridad('media'); setFOrigen('recepcion'); setFArea(''); setFHabId(''); setFAsignadoA('') }

  // ── Render ────────────────────────────────────────────────────────────
  const TABS = esAdmin
    ? [{ key:'activas',label:'Activas' },{ key:'historial',label:'Historial' },{ key:'reportes',label:'Reportes' }]
    : [{ key:'activas',label:'Mis incidencias' },{ key:'historial',label:'Historial' }]

  return (
    <>
      <style>{`
        .inc-pill{display:inline-block;font-size:0.58rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 9px;border-radius:20px}
        .inc-err{background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.76rem;color:#e05252}
        .inc-ok{background:rgba(82,201,122,0.08);border:1px solid rgba(82,201,122,0.2);border-radius:8px;padding:10px 14px;font-size:0.76rem;color:#52c97a;text-align:center;margin-bottom:10px}
        .inc-skel{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:incshim 1.5s infinite;border-radius:10px}
        @keyframes incshim{0%{background-position:200% 0}100%{background-position:-200% 0}}
        /* Dashboard */
        .inc-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:18px}
        .inc-stat{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:10px;padding:14px 16px}
        .inc-stat-lbl{font-size:0.58rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:6px}
        .inc-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.9rem;font-weight:300;line-height:1}
        /* Tabs */
        .inc-tabs{display:flex;gap:2px;border-bottom:1px solid rgba(212,175,106,0.1);margin-bottom:18px}
        .inc-tab{padding:9px 18px;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;background:transparent;border:none;cursor:pointer;color:rgba(240,236,228,0.35);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s}
        .inc-tab.active{color:#d4af6a;border-bottom-color:#d4af6a}
        .inc-tab:hover:not(.active){color:rgba(240,236,228,0.6)}
        /* Toolbar */
        .inc-toolbar{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-bottom:18px}
        .inc-search{flex:1;min-width:200px;position:relative}
        .inc-search input{width:100%;background:#13131a;border:1px solid rgba(212,175,106,0.15);border-radius:8px;padding:9px 14px 9px 36px;font-family:Montserrat,sans-serif;font-size:0.78rem;color:#f0ece4;outline:none}
        .inc-search input::placeholder{color:rgba(240,236,228,0.22)}
        .inc-search input:focus{border-color:rgba(212,175,106,0.35)}
        .inc-search-ic{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:rgba(240,236,228,0.28);font-size:0.85rem;pointer-events:none}
        .inc-sel{background:#13131a;border:1px solid rgba(212,175,106,0.15);border-radius:8px;padding:9px 12px;font-family:Montserrat,sans-serif;font-size:0.76rem;color:rgba(240,236,228,0.55);outline:none;cursor:pointer}
        .inc-sel option{background:#1a1a22}
        .inc-btn-new{padding:9px 16px;border-radius:8px;background:linear-gradient(135deg,#c9a84c,#d4af6a);border:none;cursor:pointer;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#0a0a0a;white-space:nowrap;transition:opacity 0.2s,transform 0.15s}
        .inc-btn-new:hover{opacity:0.88;transform:translateY(-1px)}
        /* Grid */
        .inc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .inc-card{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;padding:16px;cursor:pointer;transition:all 0.22s;position:relative;overflow:hidden}
        .inc-card:hover{border-color:rgba(212,175,106,0.28);transform:translateY(-2px)}
        .inc-card.sel{border-color:rgba(212,175,106,0.45);background:rgba(212,175,106,0.04)}
        .inc-card-critica{border-left:3px solid #e05252 !important}
        .inc-card-code{font-size:0.6rem;color:rgba(240,236,228,0.22);margin-bottom:4px}
        .inc-card-title{font-size:0.88rem;font-weight:500;color:#f0ece4;margin-bottom:6px;line-height:1.3}
        .inc-card-cat{font-size:0.68rem;color:rgba(240,236,228,0.4);margin-bottom:10px}
        .inc-card-pills{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}
        .inc-card-meta{font-size:0.65rem;color:rgba(240,236,228,0.28);display:flex;justify-content:space-between;align-items:center}
        .inc-pulse{animation:incpulse 1.4s infinite}
        @keyframes incpulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .inc-empty{padding:48px;text-align:center;color:rgba(240,236,228,0.2);font-size:0.82rem;grid-column:1/-1}
        /* Historial table */
        .inc-table{width:100%;border-collapse:collapse}
        .inc-table th{font-size:0.58rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(240,236,228,0.28);padding:8px 12px;text-align:left;border-bottom:1px solid rgba(212,175,106,0.1)}
        .inc-table td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.74rem;color:rgba(240,236,228,0.65)}
        .inc-table tr:last-child td{border-bottom:none}
        .inc-table tr:hover td{background:rgba(212,175,106,0.03);cursor:pointer}
        /* Reportes */
        .inc-rep-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
        .inc-rep-box{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;padding:18px}
        .inc-rep-lbl{font-size:0.6rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:12px}
        .inc-rep-val{font-family:'Cormorant Garamond',serif;font-size:2rem;color:#d4af6a;font-weight:300}
        .inc-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .inc-bar-lbl{width:90px;font-size:0.62rem;color:rgba(240,236,228,0.4);text-align:right}
        .inc-bar-track{flex:1;height:16px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden}
        .inc-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#c9a84c,#d4af6a);transition:width 0.5s ease}
        .inc-bar-cnt{width:24px;font-size:0.68rem;color:#d4af6a;font-weight:600}
        /* Panel */
        .inc-ov{position:fixed;inset:0;z-index:180;background:rgba(0,0,0,0.52);backdrop-filter:blur(3px);animation:incfade 0.2s}
        @keyframes incfade{from{opacity:0}to{opacity:1}}
        .inc-panel{position:fixed;top:0;right:0;bottom:0;width:500px;max-width:96vw;z-index:190;background:#0f0f12;border-left:1px solid rgba(212,175,106,0.15);display:flex;flex-direction:column;animation:incslide 0.3s cubic-bezier(0.16,1,0.3,1)}
        @keyframes incslide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .inc-panel-scroll{flex:1;overflow-y:auto}
        .inc-panel-scroll::-webkit-scrollbar{width:3px}
        .inc-panel-scroll::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.18)}
        .inc-panel-hdr{padding:20px 22px 14px;border-bottom:1px solid rgba(212,175,106,0.08);display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .inc-panel-close{width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.4);font-size:0.78rem;flex-shrink:0;transition:background 0.2s}
        .inc-panel-close:hover{background:rgba(255,255,255,0.1)}
        .inc-panel-body{padding:16px 22px 28px}
        .inc-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
        .inc-info-item label{font-size:0.58rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(240,236,228,0.28);display:block;margin-bottom:2px}
        .inc-info-item .val{font-size:0.78rem;color:#f0ece4}
        .inc-sep{height:1px;background:rgba(212,175,106,0.07);margin:14px 0}
        .inc-sec-lbl{font-size:0.6rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:10px}
        /* Comments */
        .inc-comment{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 12px;margin-bottom:8px}
        .inc-comment-who{font-size:0.62rem;color:#d4af6a;font-weight:600;margin-bottom:3px}
        .inc-comment-txt{font-size:0.76rem;color:rgba(240,236,228,0.7);line-height:1.5}
        .inc-comment-dt{font-size:0.6rem;color:rgba(240,236,228,0.25);margin-top:4px}
        /* Fotos */
        .inc-fotos-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
        .inc-foto{border-radius:6px;overflow:hidden;aspect-ratio:1;background:rgba(255,255,255,0.05);cursor:pointer}
        .inc-foto img{width:100%;height:100%;object-fit:cover;transition:transform 0.2s}
        .inc-foto:hover img{transform:scale(1.05)}
        /* Action buttons */
        .inc-btn{width:100%;padding:10px;border-radius:8px;border:none;font-family:Montserrat,sans-serif;font-size:0.68rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;margin-bottom:7px;transition:all 0.2s}
        .inc-btn:disabled{opacity:0.4;cursor:not-allowed}
        .inc-btn-gold{background:linear-gradient(135deg,#c9a84c,#d4af6a);color:#0a0a0a}
        .inc-btn-green{background:rgba(82,201,122,0.15);border:1px solid rgba(82,201,122,0.4);color:#52c97a}
        .inc-btn-gray{background:rgba(150,150,160,0.12);border:1px solid rgba(150,150,160,0.3);color:#9696a0}
        .inc-btn-red{background:rgba(224,82,82,0.12);border:1px solid rgba(224,82,82,0.35);color:#e05252}
        .inc-btn-blue{background:rgba(106,184,212,0.12);border:1px solid rgba(106,184,212,0.35);color:#6ab8d4}
        .inc-btn-sm{width:auto;padding:7px 14px;margin:0;font-size:0.62rem}
        /* Modal */
        .inc-modal-ov{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.72);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px;animation:incfade 0.18s}
        .inc-modal{background:#13131a;border:1px solid rgba(212,175,106,0.2);border-radius:16px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;animation:incup 0.28s cubic-bezier(0.16,1,0.3,1)}
        @keyframes incup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .inc-modal::-webkit-scrollbar{width:3px}
        .inc-modal::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.2)}
        .inc-modal-hdr{padding:20px 22px 14px;border-bottom:1px solid rgba(212,175,106,0.08);display:flex;align-items:center;justify-content:space-between}
        .inc-modal-body{padding:18px 22px 22px}
        .inc-modal-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
        .inc-modal-f{margin-bottom:12px}
        .inc-modal-close{width:28px;height:28px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.4);font-size:0.75rem;transition:background 0.2s}
        .inc-modal-close:hover{background:rgba(255,255,255,0.1)}
        .inc-exito{text-align:center;padding:28px 20px}
        .inc-exito-ic{width:50px;height:50px;border-radius:50%;background:rgba(82,201,122,0.1);border:2px solid rgba(82,201,122,0.35);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.3rem}
        @media(max-width:640px){
          .inc-grid,.inc-rep-grid{grid-template-columns:1fr}
          .inc-panel{width:100vw;max-width:100vw}
          .inc-stats{grid-template-columns:repeat(3,1fr)}
          .inc-info-grid{grid-template-columns:1fr}
        }
      `}</style>

      <PersonalLayout titulo="Incidencias" subtitulo="Registro y seguimiento de incidencias del hotel">
        {error && <div className="inc-err">{error}</div>}

        {/* Dashboard */}
        {esAdmin && (
          <div className="inc-stats">
            <div className="inc-stat"><div className="inc-stat-lbl">Total</div><div className="inc-stat-val" style={{ color:'#f0ece4' }}>{resumen.total}</div></div>
            <div className="inc-stat"><div className="inc-stat-lbl">Nuevas</div><div className="inc-stat-val" style={{ color:'#d4af6a' }}>{resumen.nuevas}</div></div>
            <div className="inc-stat"><div className="inc-stat-lbl">Asignadas</div><div className="inc-stat-val" style={{ color:'#6ab8d4' }}>{resumen.asignadas}</div></div>
            <div className="inc-stat"><div className="inc-stat-lbl">En proceso</div><div className="inc-stat-val" style={{ color:'#a06ad4' }}>{resumen.en_proceso}</div></div>
            <div className="inc-stat"><div className="inc-stat-lbl">Resueltas</div><div className="inc-stat-val" style={{ color:'#52c97a' }}>{resumen.resueltas}</div></div>
            <div className="inc-stat"><div className="inc-stat-lbl">Cerradas</div><div className="inc-stat-val" style={{ color:'#9696a0' }}>{resumen.cerradas}</div></div>
            <div className="inc-stat"><div className="inc-stat-lbl">Críticas</div><div className="inc-stat-val" style={{ color:'#e05252' }}>{resumen.criticas}</div></div>
            <div className="inc-stat"><div className="inc-stat-lbl">Hoy</div><div className="inc-stat-val" style={{ color:'#f0ece4' }}>{resumen.hoy}</div></div>
          </div>
        )}

        {/* Alerta críticas */}
        {resumen.criticas > 0 && (
          <div style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 14px',borderRadius:8,background:'rgba(224,82,82,0.08)',border:'1px solid rgba(224,82,82,0.25)',color:'#e05252',fontSize:'0.74rem',marginBottom:16 }}>
            <span className="inc-pulse">🚨</span>
            <span><strong>{resumen.criticas}</strong> incidencia{resumen.criticas>1?'s':''} crítica{resumen.criticas>1?'s':''} sin resolver — requieren atención inmediata</span>
          </div>
        )}

        {/* Tabs */}
        <div className="inc-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`inc-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key as typeof tab)}>
              {t.label}
              {t.key === 'activas' && filtradas.filter(i => ESTADOS_ACTIVOS.includes(i.estado)).length > 0 && tab !== 'activas' && (
                <span style={{ marginLeft:6,background:'rgba(212,175,106,0.15)',color:'#d4af6a',fontSize:'0.58rem',padding:'1px 6px',borderRadius:10 }}>
                  {incidencias.filter(i => ESTADOS_ACTIVOS.includes(i.estado)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TABS: Activas + Historial ── */}
        {(tab === 'activas' || tab === 'historial') && (
          <>
            <div className="inc-toolbar">
              <div className="inc-search">
                <span className="inc-search-ic">🔍</span>
                <input type="text" placeholder="Buscar por código, título, habitación..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <select className="inc-sel" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="todos">Todos los estados</option>
                {Object.entries(EC).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="inc-sel" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
                <option value="todos">Todas las categorías</option>
                {Object.entries(CATS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="inc-sel" value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}>
                <option value="todos">Todas las prioridades</option>
                {Object.entries(PC).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className="inc-btn-new" onClick={() => { setModal(true); setExitoCrear(false); setErrorCrear(null); resetModal(); cargarRecursosModal() }}>
                {esAdmin ? '+ Nueva' : '+ Reportar'}
              </button>
            </div>

            <div className="inc-grid">
              {cargando
                ? Array.from({length:6}).map((_,i) => <div key={i} className="inc-skel" style={{height:160}} />)
                : filtradas.length === 0
                  ? <div className="inc-empty">No hay incidencias{tab==='historial'?' resueltas/cerradas':' activas'}</div>
                  : filtradas.map(inc => {
                    const ec = EC[inc.estado] ?? EC.nueva
                    const pc = PC[inc.prioridad] ?? PC.media
                    const cat = CATS[inc.categoria]
                    return (
                      <div key={inc.id}
                        className={`inc-card ${panelId===inc.id?'sel':''} ${inc.prioridad==='critica'?'inc-card-critica':''}`}
                        onClick={() => setPanelId(inc.id)}>
                        <div className="inc-card-code">{inc.codigo}</div>
                        <div className="inc-card-title">{inc.titulo}</div>
                        <div className="inc-card-cat">{cat?.icon} {cat?.label}{inc.subcategoria ? ` — ${inc.subcategoria}` : ''}</div>
                        <div className="inc-card-pills">
                          <span className={`inc-pill ${inc.prioridad==='critica'?'inc-pulse':''}`} style={{ background:`${pc.color}20`,color:pc.color }}>{pc.label}</span>
                          <span className="inc-pill" style={{ background:ec.bg,color:ec.color }}>{ec.label}</span>
                        </div>
                        <div className="inc-card-meta">
                          <span>{inc.habitacion_num ? `Hab. ${inc.habitacion_num}` : inc.area_afectada ?? '—'}</span>
                          <span style={{ display:'flex',gap:8 }}>
                            {inc.comentarios_count > 0 && <span>💬 {inc.comentarios_count}</span>}
                            {inc.fotos_count > 0 && <span>📷 {inc.fotos_count}</span>}
                            <span>{fmtFecha(inc.created_at)}</span>
                          </span>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          </>
        )}

        {/* ── TAB: Reportes ── */}
        {tab === 'reportes' && esAdmin && (
          <>
            {cargTab ? (
              <div style={{ color:'rgba(240,236,228,0.25)',fontSize:'0.78rem',padding:'24px 0' }}>Cargando reportes...</div>
            ) : !reportes ? (
              <div style={{ textAlign:'center',color:'rgba(240,236,228,0.2)',padding:48 }}>Sin datos</div>
            ) : (
              <>
                <div className="inc-rep-grid">
                  <div className="inc-rep-box" style={{ textAlign:'center' }}>
                    <div className="inc-rep-val">{reportes.tiempo_promedio_horas ?? 0}h</div>
                    <div className="inc-rep-lbl" style={{ marginTop:6 }}>Tiempo promedio resolución</div>
                  </div>
                  <div className="inc-rep-box" style={{ textAlign:'center' }}>
                    <div className="inc-rep-val">{resumen.total}</div>
                    <div className="inc-rep-lbl" style={{ marginTop:6 }}>Total incidencias registradas</div>
                  </div>
                </div>

                <div className="inc-rep-grid">
                  <div className="inc-rep-box">
                    <div className="inc-rep-lbl">Por categoría</div>
                    {(() => {
                      const mx = Math.max(...(reportes.por_categoria??[]).map(c=>c.total),1)
                      return (reportes.por_categoria??[]).map(c => (
                        <div key={c.categoria} className="inc-bar-row">
                          <div className="inc-bar-lbl">{CATS[c.categoria]?.label ?? c.categoria}</div>
                          <div className="inc-bar-track"><div className="inc-bar-fill" style={{width:`${c.total/mx*100}%`}} /></div>
                          <div className="inc-bar-cnt">{c.total}</div>
                        </div>
                      ))
                    })()}
                  </div>
                  <div className="inc-rep-box">
                    <div className="inc-rep-lbl">Por estado</div>
                    {(() => {
                      const mx = Math.max(...(reportes.por_estado??[]).map(e=>e.total),1)
                      return (reportes.por_estado??[]).map(e => (
                        <div key={e.estado} className="inc-bar-row">
                          <div className="inc-bar-lbl">{EC[e.estado]?.label ?? e.estado}</div>
                          <div className="inc-bar-track"><div className="inc-bar-fill" style={{width:`${e.total/mx*100}%`,background:(EC[e.estado]?.color??'#d4af6a')+'88'}} /></div>
                          <div className="inc-bar-cnt" style={{color:EC[e.estado]?.color??'#d4af6a'}}>{e.total}</div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                {reportes.criticas_recientes.length > 0 && (
                  <div className="inc-rep-box">
                    <div className="inc-rep-lbl">Incidencias críticas recientes</div>
                    <table className="inc-table">
                      <thead><tr><th>Código</th><th>Título</th><th>Fecha</th></tr></thead>
                      <tbody>
                        {reportes.criticas_recientes.map((c,i) => (
                          <tr key={i}>
                            <td style={{color:'rgba(240,236,228,0.35)',fontSize:'0.65rem'}}>{c.codigo}</td>
                            <td>{c.titulo}</td>
                            <td>{fmtFecha(c.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PersonalLayout>

      {/* ── Panel lateral ── */}
      {panelId && sel && (
        <>
          <div className="inc-ov" onClick={() => setPanelId(null)} />
          <div className="inc-panel">
            <div className="inc-panel-hdr">
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'0.6rem',color:'rgba(240,236,228,0.25)',marginBottom:3 }}>{sel.codigo}</div>
                <div style={{ fontSize:'1rem',fontWeight:500,color:'#f0ece4',lineHeight:1.3,marginBottom:8 }}>{sel.titulo}</div>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  <span className={`inc-pill ${sel.prioridad==='critica'?'inc-pulse':''}`} style={{ background:`${(PC[sel.prioridad]??PC.media).color}20`,color:(PC[sel.prioridad]??PC.media).color }}>
                    {(PC[sel.prioridad]??PC.media).label}
                  </span>
                  <span className="inc-pill" style={{ background:(EC[sel.estado]??EC.nueva).bg,color:(EC[sel.estado]??EC.nueva).color }}>
                    {(EC[sel.estado]??EC.nueva).label}
                  </span>
                  <span className="inc-pill" style={{ background:'rgba(255,255,255,0.05)',color:'rgba(240,236,228,0.4)' }}>
                    {CATS[sel.categoria]?.icon} {CATS[sel.categoria]?.label}
                  </span>
                </div>
              </div>
              <button className="inc-panel-close" onClick={() => setPanelId(null)}>✕</button>
            </div>

            <div className="inc-panel-scroll">
              <div className="inc-panel-body">
                {exitoPanel && <div className="inc-ok">{exitoPanel}</div>}
                {errorPanel && <div className="inc-err">{errorPanel}</div>}

                {/* Info grid */}
                <div className="inc-info-grid">
                  <div className="inc-info-item"><label>Categoría</label><div className="val">{sel.subcategoria ?? CATS[sel.categoria]?.label}</div></div>
                  <div className="inc-info-item"><label>Origen</label><div className="val" style={{textTransform:'capitalize'}}>{sel.origen}</div></div>
                  {sel.area_afectada && <div className="inc-info-item"><label>Área</label><div className="val">{sel.area_afectada}</div></div>}
                  {sel.habitacion_num && <div className="inc-info-item"><label>Habitación</label><div className="val">Hab. {sel.habitacion_num}</div></div>}
                  <div className="inc-info-item"><label>Reportado por</label><div className="val">{sel.reportado_por}</div></div>
                  <div className="inc-info-item"><label>Asignado a</label><div className="val">{sel.asignado_a ?? <span style={{color:'rgba(240,236,228,0.3)'}}>Sin asignar</span>}</div></div>
                  {sel.fecha_atencion && <div className="inc-info-item"><label>Atendida</label><div className="val" style={{fontSize:'0.72rem'}}>{fmtDt(sel.fecha_atencion)}</div></div>}
                  {sel.fecha_resolucion && <div className="inc-info-item"><label>Resuelta</label><div className="val" style={{fontSize:'0.72rem',color:'#52c97a'}}>{fmtDt(sel.fecha_resolucion)}</div></div>}
                  <div className="inc-info-item"><label>Registrada</label><div className="val" style={{fontSize:'0.72rem'}}>{fmtDt(sel.created_at)}</div></div>
                </div>

                {sel.descripcion && (
                  <><div className="inc-sep" />
                  <div className="inc-sec-lbl">Descripción</div>
                  <p style={{fontSize:'0.76rem',color:'rgba(240,236,228,0.55)',lineHeight:1.65,marginBottom:14}}>{sel.descripcion}</p></>
                )}

                {sel.solucion && (
                  <><div className="inc-sec-lbl">Solución aplicada</div>
                  <p style={{fontSize:'0.76rem',color:'rgba(82,201,122,0.8)',lineHeight:1.65,marginBottom:14}}>{sel.solucion}</p></>
                )}

                {/* Acciones ADMIN */}
                {esAdmin && sel.estado !== 'cerrada' && (
                  <>
                    <div className="inc-sep" />
                    <div className="inc-sec-lbl">Gestión</div>

                    {/* Asignar — solo personal de housekeeping */}
                    <div style={{display:'flex',gap:8,marginBottom:10}}>
                      <select style={{...inp,flex:1,padding:'8px 12px'}} value={asignarId} onChange={e => setAsignarId(e.target.value)}>
                        <option value="">Sin asignar</option>
                        {personal
                          .filter(p => p.cargo.toLowerCase().includes('housekeeping') || p.cargo.toLowerCase().includes('limpieza'))
                          .map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.cargo}</option>)}
                      </select>
                      <button className="inc-btn inc-btn-blue inc-btn-sm" disabled={procesando || asignarId===sel.asignado_a_id} onClick={handleAsignar}>
                        Asignar
                      </button>
                    </div>

                    {/* Cambio de estado */}
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                      {sel.estado === 'nueva' && <button className="inc-btn inc-btn-blue inc-btn-sm" disabled={procesando} onClick={() => handleEstado('asignada')}>→ Asignada</button>}
                      {['nueva','asignada'].includes(sel.estado) && <button className="inc-btn inc-btn-gold inc-btn-sm" disabled={procesando} onClick={() => handleEstado('en_proceso')}>→ En proceso</button>}
                      {['nueva','asignada','en_proceso'].includes(sel.estado) && <button className="inc-btn inc-btn-sm" style={{background:'rgba(224,162,82,0.12)',border:'1px solid rgba(224,162,82,0.35)',color:'#e0a252'}} disabled={procesando} onClick={() => handleEstado('pendiente')}>→ Pendiente</button>}
                    </div>

                    {/* Resolver */}
                    {!['resuelta','cerrada'].includes(sel.estado) && (
                      <>
                        <div style={{marginBottom:8}}>
                          <label style={lbl}>Solución aplicada</label>
                          <textarea style={{...inp,resize:'vertical',minHeight:55}} placeholder="Describe la solución..." value={solucion} onChange={e => setSolucion(e.target.value)} />
                        </div>
                        <button className="inc-btn inc-btn-green" disabled={procesando} onClick={() => handleEstado('resuelta')}>
                          {procesando?'Procesando...':'✓ Marcar como resuelta'}
                        </button>
                      </>
                    )}
                    {sel.estado === 'resuelta' && (
                      <>
                        <div style={{marginBottom:8}}>
                          <label style={lbl}>Observaciones finales (opcional)</label>
                          <textarea style={{...inp,resize:'vertical',minHeight:50}} placeholder="Observaciones al cerrar..." value={obsFin} onChange={e => setObsFin(e.target.value)} />
                        </div>
                        <button className="inc-btn inc-btn-gray" disabled={procesando} onClick={() => handleEstado('cerrada')}>
                          {procesando?'Procesando...':'🔒 Cerrar incidencia definitivamente'}
                        </button>
                      </>
                    )}

                    {/* Eliminar */}
                    <div className="inc-sep" />
                    {confirmarElim ? (
                      <div style={{display:'flex',gap:8}}>
                        <button className="inc-btn inc-btn-red inc-btn-sm" style={{flex:1}} disabled={procesando} onClick={handleEliminar}>Confirmar eliminación</button>
                        <button className="inc-btn inc-btn-gray inc-btn-sm" onClick={() => setConfirmarElim(false)}>Cancelar</button>
                      </div>
                    ) : (
                      <button className="inc-btn inc-btn-red" onClick={handleEliminar}>Eliminar incidencia</button>
                    )}
                  </>
                )}

                {/* Acciones STAFF */}
                {!esAdmin && sel.estado !== 'cerrada' && (
                  <>
                    <div className="inc-sep" />
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {sel.estado === 'asignada' && (
                        <button className="inc-btn inc-btn-gold" disabled={procesando} onClick={() => handleEstado('en_proceso')}>▶ Iniciar atención</button>
                      )}
                      {sel.estado === 'en_proceso' && (
                        <>
                          <div style={{marginBottom:8,width:'100%'}}>
                            <label style={lbl}>Solución aplicada *</label>
                            <textarea style={{...inp,resize:'vertical',minHeight:55}} placeholder="Describe qué hiciste..." value={solucion} onChange={e => setSolucion(e.target.value)} />
                          </div>
                          <button className="inc-btn inc-btn-green" disabled={procesando||!solucion.trim()} onClick={() => handleEstado('resuelta')}>
                            {procesando?'Procesando...':'✓ Marcar como resuelta'}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Evidencias */}
                <div className="inc-sep" />
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div className="inc-sec-lbl" style={{margin:0}}>Evidencias ({fotos.length})</div>
                  {sel.estado !== 'cerrada' && (
                    <button onClick={() => fileRef.current?.click()}
                      disabled={subiendoFoto}
                      style={{fontSize:'0.62rem',padding:'5px 10px',background:'rgba(212,175,106,0.1)',border:'1px solid rgba(212,175,106,0.25)',borderRadius:6,color:'#d4af6a',cursor:'pointer',fontFamily:'Montserrat,sans-serif'}}>
                      {subiendoFoto?'Subiendo...':'+ Subir foto'}
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" multiple accept="image/*,video/*" style={{display:'none'}} onChange={handleSubirFoto} />
                {fotos.length > 0 ? (
                  <div className="inc-fotos-grid">
                    {fotos.map(f => (
                      <div key={f.id} className="inc-foto" onClick={() => window.open(f.url,'_blank')}>
                        <img src={f.url} alt={f.nombre ?? 'evidencia'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{fontSize:'0.72rem',color:'rgba(240,236,228,0.2)',marginBottom:12}}>Sin evidencias adjuntas</div>
                )}

                {/* Comentarios */}
                <div className="inc-sep" />
                <div className="inc-sec-lbl">Comentarios ({comentarios.length})</div>
                {cargPanel
                  ? <div style={{fontSize:'0.72rem',color:'rgba(240,236,228,0.25)',marginBottom:12}}>Cargando...</div>
                  : comentarios.map(c => (
                    <div key={c.id} className="inc-comment">
                      <div className="inc-comment-who">{c.usuario_nombre}</div>
                      <div className="inc-comment-txt">{c.comentario}</div>
                      <div className="inc-comment-dt">{fmtDt(c.created_at)}</div>
                    </div>
                  ))
                }

                {sel.estado !== 'cerrada' && (
                  <div style={{marginTop:10}}>
                    <textarea style={{...inp,resize:'vertical',minHeight:60}} placeholder="Agregar comentario..." value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} />
                    <button className="inc-btn inc-btn-gold" style={{marginTop:6}} disabled={!nuevoComentario.trim()||envComment} onClick={handleComentario}>
                      {envComment?'Enviando...':'Enviar comentario'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal crear/reportar ── */}
      {modal && (
        <div className="inc-modal-ov" onClick={() => !creando && !exitoCrear && setModal(false)}>
          <div className="inc-modal" onClick={e => e.stopPropagation()}>
            <div className="inc-modal-hdr">
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',color:'#d4af6a',fontWeight:300}}>
                  {esAdmin ? 'Nueva incidencia' : 'Reportar incidencia'}
                </div>
                <div style={{fontSize:'0.7rem',color:'rgba(240,236,228,0.35)',marginTop:3}}>
                  {esAdmin ? 'Registro completo con asignación' : 'Tu reporte será revisado por el administrador'}
                </div>
              </div>
              {!creando && !exitoCrear && <button className="inc-modal-close" onClick={() => setModal(false)}>✕</button>}
            </div>
            <div className="inc-modal-body">
              {exitoCrear ? (
                <div className="inc-exito">
                  <div className="inc-exito-ic">✓</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.5rem',color:'#52c97a',marginBottom:6}}>
                    {esAdmin ? 'Incidencia creada' : 'Reporte enviado'}
                  </div>
                  <div style={{fontSize:'0.72rem',color:'rgba(240,236,228,0.35)'}}>
                    {esAdmin ? 'Se notificó al personal asignado' : 'El administrador recibirá tu reporte'}
                  </div>
                </div>
              ) : (
                <>
                  {errorCrear && <div className="inc-err">{errorCrear}</div>}
                  <div className="inc-modal-f">
                    <label style={lbl}>Título *</label>
                    <input type="text" style={inp} placeholder="Describe brevemente el problema..." value={fTitulo} onChange={e => setFTitulo(e.target.value)} />
                  </div>
                  <div className="inc-modal-f">
                    <label style={lbl}>Descripción</label>
                    <textarea style={{...inp,resize:'vertical',minHeight:70}} placeholder="Detalla el problema..." value={fDesc} onChange={e => setFDesc(e.target.value)} />
                  </div>
                  <div className="inc-modal-g2">
                    <div>
                      <label style={lbl}>Categoría</label>
                      <select style={inp} value={fCat} onChange={e => { setFCat(e.target.value); setFSubcat('') }}>
                        {Object.entries(CATS).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Subcategoría</label>
                      <select style={inp} value={fSubcat} onChange={e => setFSubcat(e.target.value)}>
                        <option value="">General</option>
                        {CATS[fCat]?.subs.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="inc-modal-g2">
                    <div>
                      <label style={lbl}>Prioridad</label>
                      <select style={inp} value={fPrioridad} onChange={e => setFPrioridad(e.target.value)}>
                        {Object.entries(PC).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Origen</label>
                      <select style={inp} value={fOrigen} onChange={e => setFOrigen(e.target.value)}>
                        {ORIGENES.map(o => <option key={o} value={o} style={{textTransform:'capitalize'}}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="inc-modal-g2">
                    <div>
                      <label style={lbl}>Área afectada</label>
                      <input type="text" style={inp} placeholder="Ej: Recepción, Piscina..." value={fArea} onChange={e => setFArea(e.target.value)} />
                    </div>
                    <div>
                      <label style={lbl}>Habitación (si aplica)</label>
                      <select style={inp} value={fHabId} onChange={e => setFHabId(e.target.value)}>
                        <option value="">Sin habitación</option>
                        {habitaciones.map(h => <option key={h.id} value={h.id}>Hab. {h.numero}</option>)}
                      </select>
                    </div>
                  </div>
                  {esAdmin && (
                    <div className="inc-modal-f">
                      <label style={lbl}>Asignar a</label>
                      <select style={inp} value={fAsignadoA} onChange={e => setFAsignadoA(e.target.value)}>
                        <option value="">Sin asignar (estado: Nueva)</option>
                        {personal.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.cargo}</option>)}
                      </select>
                    </div>
                  )}
                  <button disabled={!fTitulo.trim()||creando} style={{
                    width:'100%',padding:12,borderRadius:8,border:'none',marginTop:4,
                    background:!fTitulo.trim()||creando?'rgba(212,175,106,0.2)':'linear-gradient(135deg,#c9a84c,#d4af6a)',
                    opacity:!fTitulo.trim()||creando?0.5:1,
                    cursor:!fTitulo.trim()||creando?'not-allowed':'pointer',
                    fontFamily:'Montserrat,sans-serif',fontSize:'0.7rem',fontWeight:600,
                    letterSpacing:'0.14em',textTransform:'uppercase' as const,color:'#0a0a0a',transition:'all 0.2s',
                  }} onClick={handleCrear}>
                    {creando?'Guardando...':(esAdmin?'Crear incidencia':'Enviar reporte')}
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
