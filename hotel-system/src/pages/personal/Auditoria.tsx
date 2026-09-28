import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import PersonalLayout from '../../components/PersonalLayout'
import { executeRpc as rpc } from '../../repositories/rpcRepository'

// ── Types ──────────────────────────────────────────────────────────────────
type AuditEntry = {
  id: string; usuario_id: string | null; usuario_nombre: string | null; usuario_rol: string | null
  accion: string; modulo: string; descripcion: string
  registro_id: string | null; registro_codigo: string | null
  valor_anterior: Record<string,unknown> | null; valor_nuevo: Record<string,unknown> | null
  criticidad: string; created_at: string
}
type ResumenAudit = {
  total: number; hoy: number; criticos: number; criticos_hoy: number
  usuarios_activos: number; modulo_top: string | null; recientes: AuditEntry[]
}
type ReportesAudit = {
  por_modulo:    { modulo: string; total: number }[]
  por_dia:       { fecha: string; total: number; criticos: number }[]
  usuarios_activos: { usuario: string; rol: string; total: number }[]
  criticos_recientes: { descripcion: string; modulo: string; usuario: string | null; created_at: string }[]
  por_accion:    { accion: string; total: number }[]
}

// ── Config ─────────────────────────────────────────────────────────────────
const CC: Record<string,{color:string;bg:string;label:string}> = {
  baja:    {color:'#9696a0',bg:'rgba(150,150,160,0.12)',  label:'Baja'   },
  media:   {color:'#6ab8d4',bg:'rgba(106,184,212,0.12)', label:'Media'  },
  alta:    {color:'#d4af6a',bg:'rgba(212,175,106,0.12)', label:'Alta'   },
  critica: {color:'#e05252',bg:'rgba(224,82,82,0.12)',   label:'Crítica'},
}
const AC: Record<string,{color:string;label:string;icon:string}> = {
  crear:         {color:'#52c97a',label:'Crear',         icon:'＋'},
  modificar:     {color:'#d4af6a',label:'Modificar',     icon:'✎'},
  eliminar:      {color:'#e05252',label:'Eliminar',      icon:'✕'},
  cambio_estado: {color:'#6ab8d4',label:'Estado',        icon:'↺'},
  cambio_rol:    {color:'#a06ad4',label:'Cambio rol',    icon:'⚙'},
  asignar:       {color:'#e0a252',label:'Asignar',       icon:'→'},
  acceso:        {color:'#52c97a',label:'Acceso',        icon:'🔑'},
  cierre_sesion: {color:'#9696a0',label:'Cierre',        icon:'🔒'},
  reembolso:     {color:'#e05252',label:'Reembolso',     icon:'↩'},
}
const MC: Record<string,string> = {
  reservas:'📅',pagos:'💳',habitaciones:'🛏',incidencias:'⚠️',
  housekeeping:'🧹',turnos:'🕐',usuarios:'👤',checkin:'✓',checkout:'↗',sistema:'⚙',
}
const MODULOS = ['reservas','pagos','habitaciones','incidencias','housekeeping','turnos','usuarios','checkin','checkout','sistema']
const ACCIONES = ['crear','modificar','eliminar','cambio_estado','cambio_rol','asignar','acceso','reembolso']

const fmtDt = (iso:string) => new Date(iso).toLocaleString('es-BO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'})
const fmtDate = (iso:string) => new Date(iso+'T12:00').toLocaleDateString('es-BO',{day:'2-digit',month:'short'})
const relTime = (iso:string) => {
  const diff = Date.now()-new Date(iso).getTime()
  if(diff<60000) return 'Hace un momento'
  if(diff<3600000) return `Hace ${Math.floor(diff/60000)}m`
  if(diff<86400000) return `Hace ${Math.floor(diff/3600000)}h`
  return fmtDate(iso.split('T')[0])
}

// ── Diff viewer ────────────────────────────────────────────────────────────
function DiffView({anterior,nuevo}:{anterior:Record<string,unknown>|null;nuevo:Record<string,unknown>|null}) {
  if(!anterior&&!nuevo) return null
  const keys = new Set([...Object.keys(anterior??{}), ...Object.keys(nuevo??{})])
  const ignorar = new Set(['created_at','updated_at'])
  const cambios = [...keys].filter(k => !ignorar.has(k) && JSON.stringify((anterior??{})[k])!==JSON.stringify((nuevo??{})[k]))
  if(cambios.length===0) return <div style={{fontSize:'0.72rem',color:'rgba(240,236,228,0.25)'}}>Sin cambios detectados</div>
  return (
    <div style={{display:'grid',gap:6}}>
      {cambios.map(k=>(
        <div key={k} style={{borderRadius:7,overflow:'hidden',fontSize:'0.72rem'}}>
          <div style={{padding:'4px 10px',background:'rgba(255,255,255,0.04)',fontWeight:600,color:'rgba(240,236,228,0.45)',fontSize:'0.6rem',letterSpacing:'0.1em',textTransform:'uppercase'}}>{k}</div>
          {anterior&&(anterior as Record<string,unknown>)[k]!==undefined&&(
            <div style={{padding:'5px 10px',background:'rgba(224,82,82,0.08)',borderLeft:'2px solid rgba(224,82,82,0.3)',color:'rgba(224,82,82,0.8)',wordBreak:'break-all'}}>
              − {JSON.stringify((anterior as Record<string,unknown>)[k])}
            </div>
          )}
          {nuevo&&(nuevo as Record<string,unknown>)[k]!==undefined&&(
            <div style={{padding:'5px 10px',background:'rgba(82,201,122,0.08)',borderLeft:'2px solid rgba(82,201,122,0.3)',color:'rgba(82,201,122,0.8)',wordBreak:'break-all'}}>
              + {JSON.stringify((nuevo as Record<string,unknown>)[k])}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Auditoria() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol==='Administrador'||perfil?.rol==='Supervisor'

  const RES0:ResumenAudit = {total:0,hoy:0,criticos:0,criticos_hoy:0,usuarios_activos:0,modulo_top:null,recientes:[]}

  const [tab,setTab]         = useState<'dashboard'|'registros'|'reportes'>('dashboard')
  const [resumen,setResumen] = useState<ResumenAudit>(RES0)
  const [logs,setLogs]       = useState<AuditEntry[]>([])
  const [reportes,setReportes]=useState<ReportesAudit|null>(null)
  const [sel,setSel]         = useState<AuditEntry|null>(null)
  const [cargTab,setCargTab] = useState(false)
  const [error,setError]     = useState<string|null>(null)
  const [liveOn,setLiveOn]   = useState(true)
  const liveRef = useRef<ReturnType<typeof setInterval>|null>(null)

  // Filtros
  const [fModulo,    setFModulo]    = useState('')
  const [fAccion,    setFAccion]    = useState('')
  const [fCriticidad,setFCrit]      = useState('')
  const [fBusqueda,  setFBusq]      = useState('')
  const [fFechaI,    setFFechaI]    = useState('')
  const [fFechaF,    setFFechaF]    = useState('')

  // ── Carga ──────────────────────────────────────────────────────────────
  const cargarResumen = useCallback(async()=>{
    try{ const d=await rpc('rpc_get_resumen_auditoria'); setResumen(d as ResumenAudit) }
    catch(e){ setError((e as Error).message) }
  },[])

  useEffect(()=>{ cargarResumen() },[cargarResumen])

  useEffect(()=>{
    if(!liveOn){ if(liveRef.current) clearInterval(liveRef.current); return }
    liveRef.current = setInterval(()=>{ if(tab==='dashboard') cargarResumen() },30000)
    return ()=>{ if(liveRef.current) clearInterval(liveRef.current) }
  },[liveOn,tab,cargarResumen])

  useEffect(()=>{
    if(tab==='registros'){
      setCargTab(true)
      rpc('rpc_get_auditoria',{
        p_modulo:fModulo||null, p_accion:fAccion||null, p_criticidad:fCriticidad||null,
        p_busqueda:fBusqueda||null,
        p_fecha_inicio:fFechaI||null, p_fecha_fin:fFechaF||null,
        p_limite:200
      }).then(d=>setLogs((d as AuditEntry[])??[])).catch(e=>setError((e as Error).message)).finally(()=>setCargTab(false))
    }
    if(tab==='reportes'){
      setCargTab(true)
      rpc('rpc_get_reportes_auditoria').then(d=>setReportes(d as ReportesAudit)).catch(()=>{}).finally(()=>setCargTab(false))
    }
  },[tab,fModulo,fAccion,fCriticidad,fBusqueda,fFechaI,fFechaF])

  const aplicarFiltros=()=>{
    if(tab!=='registros') setTab('registros')
    else {
      setCargTab(true)
      rpc('rpc_get_auditoria',{p_modulo:fModulo||null,p_accion:fAccion||null,p_criticidad:fCriticidad||null,p_busqueda:fBusqueda||null,p_fecha_inicio:fFechaI||null,p_fecha_fin:fFechaF||null,p_limite:200})
        .then(d=>setLogs((d as AuditEntry[])??[])).catch(()=>{}).finally(()=>setCargTab(false))
    }
  }

  const inp: React.CSSProperties = {background:'#0f0f12',border:'1px solid rgba(212,175,106,0.15)',borderRadius:7,padding:'7px 11px',fontFamily:'Montserrat,sans-serif',fontSize:'0.75rem',color:'rgba(240,236,228,0.6)',outline:'none'}

  return (
    <>
      <style>{`
        .au-tabs{display:flex;gap:2px;border-bottom:1px solid rgba(212,175,106,0.1);margin-bottom:18px}
        .au-tab{padding:9px 18px;font-family:Montserrat,sans-serif;font-size:0.68rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;background:transparent;border:none;cursor:pointer;color:rgba(240,236,228,0.35);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s}
        .au-tab.active{color:#d4af6a;border-bottom-color:#d4af6a}
        .au-tab:hover:not(.active){color:rgba(240,236,228,0.6)}
        .au-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:16px}
        .au-stat{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:10px;padding:13px 15px}
        .au-stat-lbl{font-size:0.57rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(240,236,228,0.27);margin-bottom:5px}
        .au-stat-val{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:300;line-height:1}
        /* Live feed */
        .au-live-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .au-live-dot{width:7px;height:7px;border-radius:50%;background:#52c97a;animation:aupulse 1.5s infinite}
        @keyframes aupulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}
        .au-entry{display:grid;grid-template-columns:auto 1fr auto;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s;align-items:start}
        .au-entry:hover{background:rgba(212,175,106,0.03)}
        .au-entry.sel{background:rgba(212,175,106,0.06);border-left:2px solid rgba(212,175,106,0.4);padding-left:12px}
        .au-entry-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.82rem;flex-shrink:0}
        .au-entry-desc{font-size:0.76rem;color:rgba(240,236,228,0.7);line-height:1.4;margin-bottom:3px}
        .au-entry-meta{font-size:0.6rem;color:rgba(240,236,228,0.25);display:flex;gap:8px;flex-wrap:wrap}
        .au-entry-time{font-size:0.62rem;color:rgba(240,236,228,0.22);white-space:nowrap;flex-shrink:0}
        .au-pill{display:inline-block;font-size:0.56rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;padding:2px 7px;border-radius:20px}
        /* Filtros */
        .au-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;padding:12px 14px;background:#13131a;border:1px solid rgba(212,175,106,0.08);border-radius:10px}
        .au-f-sel{background:#0f0f12;border:1px solid rgba(212,175,106,0.15);border-radius:7px;padding:7px 10px;font-family:Montserrat,sans-serif;font-size:0.73rem;color:rgba(240,236,228,0.55);outline:none;cursor:pointer}
        .au-f-sel option{background:#1a1a22}
        .au-search{flex:1;min-width:160px;position:relative}
        .au-search input{width:100%;background:#0f0f12;border:1px solid rgba(212,175,106,0.15);border-radius:7px;padding:7px 11px 7px 30px;font-family:Montserrat,sans-serif;font-size:0.73rem;color:rgba(240,236,228,0.6);outline:none}
        .au-search-ic{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:rgba(240,236,228,0.25);font-size:0.8rem;pointer-events:none}
        /* Panel */
        .au-ov{position:fixed;top:64px;left:0;right:0;bottom:0;z-index:180;background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);animation:aufade 0.2s}
        @keyframes aufade{from{opacity:0}to{opacity:1}}
        .au-panel{position:fixed;top:64px;right:0;bottom:0;width:480px;max-width:96vw;z-index:190;background:#0f0f12;border-left:1px solid rgba(212,175,106,0.15);border-top:1px solid rgba(212,175,106,0.1);display:flex;flex-direction:column;animation:auslide 0.28s cubic-bezier(0.16,1,0.3,1)}
        @keyframes auslide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .au-panel-scroll{flex:1;overflow-y:auto;padding:18px 20px 28px}
        .au-panel-scroll::-webkit-scrollbar{width:3px}
        .au-panel-scroll::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.18)}
        .au-section{margin-bottom:18px}
        .au-sec-lbl{font-size:0.58rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.27);margin-bottom:8px}
        .au-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .au-row-key{font-size:0.62rem;color:rgba(240,236,228,0.28);text-transform:uppercase;letter-spacing:0.08em}
        .au-row-val{font-size:0.76rem;color:rgba(240,236,228,0.7);text-align:right;max-width:60%}
        /* Reportes */
        .au-rep-g{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .au-rep-box{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;padding:16px}
        .au-rep-lbl{font-size:0.59rem;font-weight:600;letter-spacing:0.13em;text-transform:uppercase;color:rgba(240,236,228,0.27);margin-bottom:11px}
        .au-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
        .au-bar-lbl{width:80px;font-size:0.62rem;color:rgba(240,236,228,0.38);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:capitalize}
        .au-bar-track{flex:1;height:13px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden}
        .au-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#c9a84c,#d4af6a)}
        .au-bar-cnt{width:24px;font-size:0.65rem;color:#d4af6a;font-weight:600;text-align:right}
        .au-empty{text-align:center;padding:36px;color:rgba(240,236,228,0.18);font-size:0.8rem}
        .au-err{background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);border-radius:8px;padding:9px 13px;font-size:0.74rem;color:#e05252;margin-bottom:12px;cursor:pointer}
        .au-btn{padding:7px 14px;border-radius:7px;border:none;font-family:Montserrat,sans-serif;font-size:0.64rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.2s}
        .au-btn-gold{background:linear-gradient(135deg,#c9a84c,#d4af6a);color:#0a0a0a}
        .au-btn-gray{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(240,236,228,0.4)}
        @media(max-width:640px){.au-rep-g{grid-template-columns:1fr}.au-stats{grid-template-columns:repeat(3,1fr)}}
      `}</style>

      <PersonalLayout titulo="Auditoría" subtitulo="Trazabilidad completa de todas las acciones del sistema">
        {error && <div className="au-err" onClick={()=>setError(null)}>{error} ✕</div>}

        <div className="au-tabs">
          {[{k:'dashboard',l:'Dashboard'},{k:'registros',l:`Registros (${logs.length||''})`},{k:'reportes',l:'Reportes'}].map(t=>(
            <button key={t.k} className={`au-tab ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k as typeof tab)}>{t.l}</button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab==='dashboard' && (
          <>
            <div className="au-stats">
              <div className="au-stat"><div className="au-stat-lbl">Total eventos</div><div className="au-stat-val" style={{color:'#f0ece4'}}>{resumen.total.toLocaleString()}</div></div>
              <div className="au-stat"><div className="au-stat-lbl">Hoy</div><div className="au-stat-val" style={{color:'#d4af6a'}}>{resumen.hoy}</div></div>
              <div className="au-stat"><div className="au-stat-lbl">Críticos</div><div className="au-stat-val" style={{color:'#e05252'}}>{resumen.criticos}</div></div>
              <div className="au-stat"><div className="au-stat-lbl">Críticos hoy</div><div className="au-stat-val" style={{color:'#e05252'}}>{resumen.criticos_hoy}</div></div>
              <div className="au-stat"><div className="au-stat-lbl">Usuarios activos</div><div className="au-stat-val" style={{color:'#52c97a'}}>{resumen.usuarios_activos}</div></div>
              <div className="au-stat"><div className="au-stat-lbl">Módulo top</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.2rem',color:'#6ab8d4',fontWeight:300,marginTop:5}}>{resumen.modulo_top?MC[resumen.modulo_top]+' '+resumen.modulo_top:'—'}</div></div>
            </div>

            <div style={{background:'#13131a',border:'1px solid rgba(212,175,106,0.1)',borderRadius:12,overflow:'hidden'}}>
              <div className="au-live-hdr" style={{padding:'12px 16px 0'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {liveOn && <span className="au-live-dot"/>}
                  <span style={{fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:liveOn?'#52c97a':'rgba(240,236,228,0.25)'}}>
                    {liveOn?'EN VIVO':'PAUSADO'}
                  </span>
                  <span style={{fontSize:'0.6rem',color:'rgba(240,236,228,0.2)'}}>·</span>
                  <span style={{fontSize:'0.62rem',color:'rgba(240,236,228,0.28)'}}>Últimos 20 eventos</span>
                </div>
                <div style={{display:'flex',gap:7,paddingRight:4}}>
                  <button className="au-btn au-btn-gray" style={{padding:'4px 10px',fontSize:'0.6rem'}} onClick={()=>setLiveOn(v=>!v)}>
                    {liveOn?'⏸ Pausar':'▶ Reanudar'}
                  </button>
                  <button className="au-btn au-btn-gray" style={{padding:'4px 10px',fontSize:'0.6rem'}} onClick={cargarResumen}>↻</button>
                </div>
              </div>
              <div style={{maxHeight:400,overflowY:'auto'}}>
                {resumen.recientes.length===0
                  ? <div className="au-empty">Sin eventos registrados</div>
                  : resumen.recientes.map(e=>{
                    const ac=AC[e.accion]??{color:'#9696a0',label:e.accion,icon:'·'}
                    const cc=CC[e.criticidad]??CC.baja
                    return (
                      <div key={e.id} className={`au-entry ${sel?.id===e.id?'sel':''}`} onClick={()=>setSel(e)}>
                        <div className="au-entry-icon" style={{background:`${ac.color}18`}}>
                          <span style={{color:ac.color}}>{ac.icon}</span>
                        </div>
                        <div style={{minWidth:0}}>
                          <div className="au-entry-desc">{e.descripcion}</div>
                          <div className="au-entry-meta">
                            <span style={{color:'rgba(240,236,228,0.4)'}}>{e.usuario_nombre??'Sistema'}</span>
                            <span>{MC[e.modulo]??'·'} {e.modulo}</span>
                            {e.criticidad!=='baja' && <span className="au-pill" style={{background:cc.bg,color:cc.color}}>{cc.label}</span>}
                          </div>
                        </div>
                        <div className="au-entry-time">{relTime(e.created_at)}</div>
                      </div>
                    )
                  })
                }
              </div>
            </div>

            {resumen.criticos_hoy>0 && (
              <div style={{marginTop:14,padding:'10px 14px',background:'rgba(224,82,82,0.07)',border:'1px solid rgba(224,82,82,0.2)',borderRadius:9,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'0.74rem',color:'#e05252'}}>🚨 <strong>{resumen.criticos_hoy}</strong> evento{resumen.criticos_hoy>1?'s':''} crítico{resumen.criticos_hoy>1?'s':''} hoy</span>
                <button className="au-btn au-btn-gray" style={{padding:'4px 10px',fontSize:'0.6rem'}} onClick={()=>{setFCrit('critica');setTab('registros')}}>Ver todos</button>
              </div>
            )}
          </>
        )}

        {/* ── REGISTROS ── */}
        {tab==='registros' && (
          <>
            <div className="au-filters">
              <div className="au-search">
                <span className="au-search-ic">🔍</span>
                <input placeholder="Buscar usuario, descripción, código..." value={fBusqueda} onChange={e=>setFBusq(e.target.value)} onKeyDown={e=>e.key==='Enter'&&aplicarFiltros()} />
              </div>
              <select className="au-f-sel" value={fModulo} onChange={e=>setFModulo(e.target.value)}>
                <option value="">Todos los módulos</option>
                {MODULOS.map(m=><option key={m} value={m}>{MC[m]} {m}</option>)}
              </select>
              <select className="au-f-sel" value={fAccion} onChange={e=>setFAccion(e.target.value)}>
                <option value="">Todas las acciones</option>
                {ACCIONES.map(a=><option key={a} value={a}>{AC[a]?.label??a}</option>)}
              </select>
              <select className="au-f-sel" value={fCriticidad} onChange={e=>setFCrit(e.target.value)}>
                <option value="">Toda criticidad</option>
                {Object.entries(CC).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <input type="date" style={inp} value={fFechaI} onChange={e=>setFFechaI(e.target.value)} title="Desde" />
              <input type="date" style={inp} value={fFechaF} onChange={e=>setFFechaF(e.target.value)} title="Hasta" />
              <button className="au-btn au-btn-gold" onClick={aplicarFiltros}>Filtrar</button>
              {(fModulo||fAccion||fCriticidad||fBusqueda||fFechaI||fFechaF) && (
                <button className="au-btn au-btn-gray" onClick={()=>{setFModulo('');setFAccion('');setFCrit('');setFBusq('');setFFechaI('');setFFechaF('')}}>✕ Limpiar</button>
              )}
            </div>

            <div style={{fontSize:'0.64rem',color:'rgba(240,236,228,0.25)',marginBottom:10}}>
              {cargTab?'Cargando...':`${logs.length} registro${logs.length!==1?'s':''} encontrado${logs.length!==1?'s':''}`}
            </div>

            <div style={{background:'#13131a',border:'1px solid rgba(212,175,106,0.1)',borderRadius:12,overflow:'hidden'}}>
              {cargTab ? <div className="au-empty">Cargando...</div>
                : logs.length===0 ? <div className="au-empty">Sin registros con los filtros aplicados</div>
                : logs.map(e=>{
                  const ac=AC[e.accion]??{color:'#9696a0',label:e.accion,icon:'·'}
                  const cc=CC[e.criticidad]??CC.baja
                  return (
                    <div key={e.id} className={`au-entry ${sel?.id===e.id?'sel':''}`} onClick={()=>setSel(e===sel?null:e)}>
                      <div className="au-entry-icon" style={{background:`${ac.color}18`}}>
                        <span style={{color:ac.color}}>{ac.icon}</span>
                      </div>
                      <div style={{minWidth:0}}>
                        <div className="au-entry-desc">{e.descripcion}</div>
                        <div className="au-entry-meta">
                          <span style={{color:'rgba(240,236,228,0.4)'}}>{e.usuario_nombre??'Sistema'}</span>
                          {e.usuario_rol&&<span style={{color:'rgba(240,236,228,0.25)'}}>({e.usuario_rol})</span>}
                          <span>{MC[e.modulo]??'·'} {e.modulo}</span>
                          {e.registro_codigo&&<span style={{color:'rgba(212,175,106,0.5)'}}>{e.registro_codigo}</span>}
                          <span className="au-pill" style={{background:`${ac.color}18`,color:ac.color}}>{ac.label}</span>
                          {e.criticidad!=='baja'&&<span className="au-pill" style={{background:cc.bg,color:cc.color}}>{cc.label}</span>}
                        </div>
                      </div>
                      <div className="au-entry-time">{fmtDt(e.created_at)}</div>
                    </div>
                  )
                })
              }
            </div>
          </>
        )}

        {/* ── REPORTES ── */}
        {tab==='reportes' && esAdmin && (
          <>
            {cargTab ? <div className="au-empty">Cargando...</div> : !reportes ? null : (
            <>
              <div className="au-rep-g">
                <div className="au-rep-box">
                  <div className="au-rep-lbl">Eventos por módulo</div>
                  {(()=>{const mx=Math.max(...(reportes.por_modulo??[]).map(m=>m.total),1); return(reportes.por_modulo??[]).map(m=>(
                    <div key={m.modulo} className="au-bar-row">
                      <div className="au-bar-lbl">{MC[m.modulo]??''} {m.modulo}</div>
                      <div className="au-bar-track"><div className="au-bar-fill" style={{width:`${m.total/mx*100}%`}}/></div>
                      <div className="au-bar-cnt">{m.total}</div>
                    </div>
                  ))})()}
                </div>
                <div className="au-rep-box">
                  <div className="au-rep-lbl">Eventos por acción</div>
                  {(()=>{const mx=Math.max(...(reportes.por_accion??[]).map(a=>a.total),1); return(reportes.por_accion??[]).map(a=>{
                    const c=AC[a.accion]?.color??'#d4af6a'
                    return(
                    <div key={a.accion} className="au-bar-row">
                      <div className="au-bar-lbl">{AC[a.accion]?.label??a.accion}</div>
                      <div className="au-bar-track"><div className="au-bar-fill" style={{width:`${a.total/mx*100}%`,background:`${c}88`}}/></div>
                      <div className="au-bar-cnt" style={{color:c}}>{a.total}</div>
                    </div>
                  )})})()}
                </div>
              </div>

              <div className="au-rep-g">
                <div className="au-rep-box">
                  <div className="au-rep-lbl">Actividad últimos 14 días</div>
                  {(reportes.por_dia??[]).map(d=>(
                    <div key={d.fecha} className="au-bar-row">
                      <div className="au-bar-lbl">{fmtDate(d.fecha)}</div>
                      <div style={{flex:1,display:'flex',gap:2,height:13}}>
                        {d.total>0&&<div style={{flex:d.total-d.criticos,background:'rgba(212,175,106,0.35)',borderRadius:3}} title={`Total: ${d.total}`}/>}
                        {d.criticos>0&&<div style={{flex:d.criticos,background:'rgba(224,82,82,0.55)',borderRadius:3}} title={`Críticos: ${d.criticos}`}/>}
                      </div>
                      <div className="au-bar-cnt" style={{color:'rgba(240,236,228,0.35)'}}>{d.total}</div>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:10,marginTop:8}}>
                    {[['rgba(212,175,106,0.5)','Normal'],['rgba(224,82,82,0.6)','Crítico']].map(([c,l])=>(
                      <span key={l as string} style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.6rem',color:'rgba(240,236,228,0.28)'}}>
                        <span style={{width:7,height:7,borderRadius:2,background:c as string}}/>{l}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="au-rep-box">
                  <div className="au-rep-lbl">Usuarios más activos</div>
                  {(reportes.usuarios_activos??[]).length===0
                    ? <div style={{color:'rgba(240,236,228,0.2)',fontSize:'0.74rem'}}>Sin datos</div>
                    : (reportes.usuarios_activos??[]).map((u,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                        <div>
                          <div style={{fontSize:'0.76rem',color:'#f0ece4'}}>{u.usuario}</div>
                          <div style={{fontSize:'0.6rem',color:'rgba(240,236,228,0.3)'}}>{u.rol}</div>
                        </div>
                        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.5rem',color:'#d4af6a',fontWeight:300}}>{u.total}</div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {(reportes.criticos_recientes??[]).length>0 && (
                <div className="au-rep-box">
                  <div className="au-rep-lbl">Eventos críticos recientes</div>
                  {(reportes.criticos_recientes??[]).map((c,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'0.76rem',color:'rgba(240,236,228,0.7)'}}>{c.descripcion}</div>
                        <div style={{fontSize:'0.6rem',color:'rgba(240,236,228,0.28)',marginTop:2}}>{MC[c.modulo]??''} {c.modulo}{c.usuario?` · ${c.usuario}`:''}</div>
                      </div>
                      <div style={{fontSize:'0.62rem',color:'rgba(240,236,228,0.22)',flexShrink:0,marginLeft:12}}>{fmtDate(c.created_at.split('T')[0])}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
            )}
          </>
        )}
      </PersonalLayout>

      {/* ── Panel detalle ── */}
      {sel && (
        <>
          <div className="au-ov" onClick={()=>setSel(null)}/>
          <div className="au-panel">
            <div style={{padding:'18px 20px 12px',borderBottom:'1px solid rgba(212,175,106,0.08)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div style={{flex:1,minWidth:0}}>
                {(()=>{const ac=AC[sel.accion]??{color:'#9696a0',label:sel.accion,icon:'·'};const cc=CC[sel.criticidad]??CC.baja;return(
                  <>
                    <div style={{display:'flex',gap:7,marginBottom:8,flexWrap:'wrap'}}>
                      <span className="au-pill" style={{background:`${ac.color}18`,color:ac.color}}>{ac.icon} {ac.label}</span>
                      <span className="au-pill" style={{background:cc.bg,color:cc.color}}>{cc.label}</span>
                      <span className="au-pill" style={{background:'rgba(255,255,255,0.05)',color:'rgba(240,236,228,0.4)'}}>{MC[sel.modulo]??''} {sel.modulo}</span>
                    </div>
                    <div style={{fontSize:'0.88rem',color:'#f0ece4',fontWeight:500,lineHeight:1.4}}>{sel.descripcion}</div>
                  </>
                )})()}
              </div>
              <button onClick={()=>setSel(null)} style={{width:28,height:28,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(240,236,228,0.4)',fontSize:'0.72rem',flexShrink:0,marginLeft:10}}>✕</button>
            </div>

            <div className="au-panel-scroll">
              <div className="au-section">
                <div className="au-sec-lbl">Información del evento</div>
                {[
                  ['Fecha y hora', fmtDt(sel.created_at)],
                  ['Usuario',      sel.usuario_nombre??'Sistema'],
                  ['Rol',          sel.usuario_rol??'—'],
                  ['Módulo',       `${MC[sel.modulo]??''} ${sel.modulo}`],
                  ['Acción',       AC[sel.accion]?.label??sel.accion],
                  ['Registro',     sel.registro_codigo??sel.registro_id?.slice(0,8)??'—'],
                  ['ID',           sel.id.slice(0,12)+'...'],
                ].map(([k,v])=>(
                  <div key={k} className="au-row">
                    <span className="au-row-key">{k}</span>
                    <span className="au-row-val">{v}</span>
                  </div>
                ))}
              </div>

              {(sel.valor_anterior||sel.valor_nuevo) && (
                <div className="au-section">
                  <div className="au-sec-lbl">Cambios realizados</div>
                  <DiffView anterior={sel.valor_anterior} nuevo={sel.valor_nuevo}/>
                </div>
              )}

              {sel.valor_anterior && !sel.valor_nuevo && (
                <div className="au-section">
                  <div className="au-sec-lbl">Registro eliminado</div>
                  <div style={{background:'rgba(224,82,82,0.06)',border:'1px solid rgba(224,82,82,0.15)',borderRadius:8,padding:12,fontSize:'0.68rem',color:'rgba(224,82,82,0.7)',fontFamily:'monospace',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
                    {JSON.stringify(sel.valor_anterior,null,2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
