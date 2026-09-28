import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PersonalLayout from '../../components/PersonalLayout'
import {
  getReservasParaCheckin, registrarCheckin,
  getHabitacionesDisponibles, cambiarHabitacionReserva,
} from '../../services/api'

type ReservaCheckin = {
  id: string
  codigo_reserva: string
  estado: string
  fecha_entrada: string
  fecha_salida: string
  total_estimado: number
  cantidad_adultos: number
  cantidad_ninos: number
  origen: string | null
  observaciones: string | null
  cliente_id: string
  cliente_nombre: string
  cliente_correo: string
  cliente_telefono: string | null
  tipo_documento: string | null
  numero_documento: string | null
  habitacion_id: string | null
  habitacion_numero: string | null
  habitacion_piso: number | null
  habitacion_tipo: string | null
  habitacion_estado: string | null
}

type HabDisp = {
  habitacion_id?: string; id?: string; numero: string
  nombre_tipo?: string; tipo?: string; precio_base?: number; precio?: number
}

type Paso = 'buscar' | 'verificar' | 'confirmar' | 'completado'

const limpieza: Record<string, { bg: string; color: string; label: string }> = {
  disponible:   { bg: 'rgba(82,201,122,0.12)',  color: '#52c97a', label: 'Disponible'   },
  ocupada:      { bg: 'rgba(106,184,212,0.12)', color: '#6ab8d4', label: 'Ocupada'      },
  limpieza:     { bg: 'rgba(212,175,106,0.12)', color: '#d4af6a', label: 'En limpieza'  },
  mantenimiento:{ bg: 'rgba(212,100,100,0.12)', color: '#d46464', label: 'Mantenimiento'},
}

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,106,0.2)',
  borderRadius: 8, padding: '11px 14px', fontFamily: 'Montserrat,sans-serif',
  fontSize: '0.82rem', fontWeight: 300, color: '#f0ece4', outline: 'none',
}
const lbl: React.CSSProperties = {
  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
  color: 'rgba(240,236,228,0.3)', display: 'block', marginBottom: 5,
}

export default function Checkin() {
  const navigate = useNavigate()

  const [reservas, setReservas]   = useState<ReservaCheckin[]>([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [sel, setSel]             = useState<ReservaCheckin | null>(null)
  const [paso, setPaso]           = useState<Paso>('buscar')
  const [error, setError]         = useState<string | null>(null)

  // Paso 2
  const [docVerificado, setDocVerif] = useState(false)
  // Cambio de habitación
  const [habsDisp, setHabsDisp]      = useState<HabDisp[]>([])
  const [buscandoHabs, setBuscHabs]  = useState(false)
  const [habSelId, setHabSelId]      = useState<string | null>(null)
  const [cambiandoHab, setCambiHab]  = useState(false)

  // Paso 3
  const [obs, setObs]               = useState('')
  const [acompanantes, setAcomp]    = useState(0)
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    try { setReservas((await getReservasParaCheckin()) as ReservaCheckin[]) }
    catch (e: unknown) { setError((e as Error).message) }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const seleccionar = (r: ReservaCheckin) => {
    setSel(r); setPaso('verificar'); setDocVerif(false)
    setHabsDisp([]); setHabSelId(null); setObs(''); setAcomp(0); setError(null)
  }

  const resetear = () => {
    setSel(null); setPaso('buscar'); setBusqueda('')
    setDocVerif(false); setHabsDisp([]); setHabSelId(null)
    setObs(''); setAcomp(0); setError(null)
  }

  const buscarHabs = async () => {
    if (!sel) return
    setBuscHabs(true)
    try { setHabsDisp(await getHabitacionesDisponibles(sel.fecha_entrada, sel.fecha_salida)) }
    catch { /* silencioso */ }
    finally { setBuscHabs(false) }
  }

  const aplicarCambioHab = async () => {
    if (!sel || !habSelId) return
    setCambiHab(true); setError(null)
    try {
      await cambiarHabitacionReserva(sel.id, habSelId)
      const hab = habsDisp.find(h => (h.habitacion_id ?? h.id) === habSelId)
      setSel(prev => prev ? {
        ...prev,
        habitacion_id: habSelId,
        habitacion_numero: hab?.numero ?? prev.habitacion_numero,
        habitacion_tipo: hab?.nombre_tipo ?? hab?.tipo ?? prev.habitacion_tipo,
      } : null)
      setHabsDisp([]); setHabSelId(null)
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setCambiHab(false) }
  }

  const handleCheckin = async () => {
    if (!sel) return
    setProcesando(true); setError(null)
    try {
      await registrarCheckin({ reservaId: sel.id, observaciones: obs || undefined })
      setPaso('completado')
      await cargar()
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setProcesando(false) }
  }

  const noches = sel ? Math.max(
    Math.ceil((new Date(sel.fecha_salida).getTime() - new Date(sel.fecha_entrada).getTime()) / 86400000), 1
  ) : 0

  const filtradas = reservas.filter(r =>
    !busqueda || r.codigo_reserva?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const PASOS = [
    { key: 'buscar',     num: '1', label: 'Buscar reserva'  },
    { key: 'verificar',  num: '2', label: 'Verificar datos' },
    { key: 'confirmar',  num: '3', label: 'Confirmar'       },
    { key: 'completado', num: '✓', label: 'Completado'      },
  ]
  const ordenPasos = ['buscar','verificar','confirmar','completado']
  const idxActual  = ordenPasos.indexOf(paso)

  return (
    <>
      <style>{`
        .ci-pasos { display:flex; align-items:center; margin-bottom:28px; }
        .ci-paso-item { display:flex; align-items:center; gap:10px; }
        .ci-circulo { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.72rem; font-weight:700; border:1.5px solid; transition:all 0.3s; flex-shrink:0; }
        .ci-paso-lbl { font-size:0.68rem; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; transition:color 0.3s; white-space:nowrap; }
        .ci-linea { flex:1; height:1px; background:rgba(212,175,106,0.15); margin:0 12px; min-width:20px; }
        .ci-act .ci-circulo { background:rgba(212,175,106,0.15); border-color:#d4af6a; color:#d4af6a; }
        .ci-act .ci-paso-lbl { color:#d4af6a; }
        .ci-done .ci-circulo { background:rgba(82,201,122,0.12); border-color:#52c97a; color:#52c97a; }
        .ci-done .ci-paso-lbl { color:#52c97a; }
        .ci-pend .ci-circulo { border-color:rgba(240,236,228,0.1); color:rgba(240,236,228,0.2); }
        .ci-pend .ci-paso-lbl { color:rgba(240,236,228,0.2); }
        .ci-grid2 { display:grid; grid-template-columns:1fr 1.4fr; gap:20px; }
        @media(max-width:1000px){.ci-grid2{grid-template-columns:1fr;}}
        .ci-panel { background:#13131a; border:1px solid rgba(212,175,106,0.1); border-radius:12px; overflow:hidden; }
        .ci-ph { padding:14px 18px; border-bottom:1px solid rgba(212,175,106,0.07); display:flex; align-items:center; justify-content:space-between; }
        .ci-pt { font-size:0.68rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:rgba(240,236,228,0.45); }
        .ci-pb { font-size:0.62rem; background:rgba(212,175,106,0.1); color:#d4af6a; padding:3px 10px; border-radius:20px; }
        .ci-body { padding:16px 18px; }
        .ci-item { padding:13px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.04); margin-bottom:8px; cursor:pointer; transition:all 0.2s; }
        .ci-item:hover { border-color:rgba(212,175,106,0.25); background:rgba(212,175,106,0.04); }
        .ci-item:last-child { margin-bottom:0; }
        .ci-cod { font-family:'Cormorant Garamond',serif; font-size:0.95rem; color:#d4af6a; margin-bottom:3px; }
        .ci-nom { font-size:0.8rem; font-weight:500; color:#f0ece4; margin-bottom:2px; }
        .ci-sub { font-size:0.7rem; color:rgba(240,236,228,0.4); }
        .ci-empty { padding:32px; text-align:center; color:rgba(240,236,228,0.22); font-size:0.8rem; }
        .ci-skel { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:cisk 1.5s infinite; border-radius:4px; }
        @keyframes cisk{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .ci-err { background:rgba(224,82,82,0.08); border:1px solid rgba(224,82,82,0.2); border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:0.78rem; color:#e05252; }
        .ci-sec { font-size:0.6rem; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:rgba(212,175,106,0.5); margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid rgba(212,175,106,0.07); }
        .ci-fld { margin-bottom:10px; }
        .ci-fl { font-size:0.58rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:rgba(240,236,228,0.28); margin-bottom:3px; }
        .ci-fv { font-size:0.8rem; color:#f0ece4; }
        .ci-check { display:flex; align-items:center; gap:12px; padding:13px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; cursor:pointer; transition:all 0.2s; margin-bottom:10px; }
        .ci-check:hover { border-color:rgba(212,175,106,0.2); }
        .ci-check.ok { border-color:rgba(82,201,122,0.3); background:rgba(82,201,122,0.04); }
        .ci-chk-box { width:20px; height:20px; border-radius:6px; border:1.5px solid rgba(240,236,228,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.2s; }
        .ci-check.ok .ci-chk-box { background:rgba(82,201,122,0.2); border-color:#52c97a; color:#52c97a; }
        .ci-chk-txt { font-size:0.78rem; color:rgba(240,236,228,0.65); }
        .ci-check.ok .ci-chk-txt { color:#f0ece4; }
        .ci-btn-p { width:100%; padding:13px; border-radius:8px; background:linear-gradient(135deg,#c9a84c,#d4af6a); border:none; cursor:pointer; font-family:'Montserrat',sans-serif; font-size:0.72rem; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:#0a0a0a; margin-top:16px; transition:opacity 0.2s; }
        .ci-btn-p:disabled { opacity:0.35; cursor:not-allowed; }
        .ci-btn-s { width:100%; padding:11px; border-radius:8px; background:transparent; border:1px solid rgba(240,236,228,0.1); cursor:pointer; font-family:'Montserrat',sans-serif; font-size:0.7rem; font-weight:500; color:rgba(240,236,228,0.4); margin-top:8px; transition:all 0.2s; }
        .ci-btn-s:hover { border-color:rgba(240,236,228,0.25); color:rgba(240,236,228,0.65); }
        .ci-btn-b { padding:9px 14px; border-radius:8px; border:1px solid rgba(106,184,212,0.25); background:rgba(106,184,212,0.08); color:#6ab8d4; font-family:'Montserrat',sans-serif; font-size:0.68rem; font-weight:600; letter-spacing:0.08em; cursor:pointer; transition:all 0.2s; }
        .ci-btn-b:hover { background:rgba(106,184,212,0.14); }
        .ci-btn-b:disabled { opacity:0.4; cursor:not-allowed; }
        .ci-btn-g { padding:9px 14px; border-radius:8px; border:1px solid rgba(82,201,122,0.25); background:rgba(82,201,122,0.08); color:#52c97a; font-family:'Montserrat',sans-serif; font-size:0.68rem; font-weight:600; letter-spacing:0.08em; cursor:pointer; transition:all 0.2s; }
        .ci-hab-sel { background:rgba(255,255,255,0.03); border:1px solid rgba(212,175,106,0.15); border-radius:8px; padding:'10px 14px'; font-family:'Montserrat',sans-serif; font-size:0.8rem; color:#f0ece4; outline:none; width:100%; margin-top:6px; }
        .ci-num-inp { background:rgba(255,255,255,0.04); border:1px solid rgba(212,175,106,0.15); border-radius:8px; padding:9px 12px; font-family:'Montserrat',sans-serif; font-size:0.8rem; color:#f0ece4; outline:none; width:80px; text-align:center; }
        .ci-success { background:#13131a; border:1px solid rgba(82,201,122,0.3); border-radius:16px; padding:48px 32px; text-align:center; max-width:480px; margin:0 auto; }
        .ci-suc-ico { width:72px; height:72px; border-radius:50%; background:rgba(82,201,122,0.12); border:2px solid rgba(82,201,122,0.4); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:1.8rem; }
        .ci-suc-tit { font-family:'Cormorant Garamond',serif; font-size:2rem; color:#52c97a; margin-bottom:6px; }
        .ci-suc-sub { font-size:0.78rem; color:rgba(240,236,228,0.4); letter-spacing:0.06em; margin-bottom:28px; }
        .ci-suc-box { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:18px; margin-bottom:22px; text-align:left; }
        .ci-suc-row { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .ci-suc-row:last-child { border-bottom:none; }
        .ci-suc-row label { font-size:0.62rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(240,236,228,0.28); }
        .ci-suc-row span { font-size:0.8rem; color:#f0ece4; }
        .ci-search { position:relative; margin-bottom:14px; }
        .ci-search input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(212,175,106,0.2); border-radius:8px; padding:11px 14px 11px 38px; font-family:'Montserrat',sans-serif; font-size:0.82rem; color:#f0ece4; outline:none; }
        .ci-search input:focus { border-color:rgba(212,175,106,0.4); }
        .ci-search input::placeholder { color:rgba(240,236,228,0.22); }
        .ci-search-ico { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:rgba(240,236,228,0.3); font-size:0.85rem; }
        .ci-hab-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px 16px; }
        .ci-limpieza-badge { display:inline-flex; align-items:center; gap:5px; font-size:0.6rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; padding:4px 10px; border-radius:20px; }
      `}</style>

      <PersonalLayout titulo="Check-in" subtitulo="Registro de llegada de huéspedes">

        {/* Pasos */}
        <div className="ci-pasos">
          {PASOS.map((p, i, arr) => {
            const idx = ordenPasos.indexOf(p.key)
            const cls = idx < idxActual ? 'ci-done' : idx === idxActual ? 'ci-act' : 'ci-pend'
            return (
              <div key={p.key} style={{ display:'flex', alignItems:'center', flex: i < arr.length-1 ? 1 : 'none' }}>
                <div className={`ci-paso-item ${cls}`}>
                  <div className="ci-circulo">{idx < idxActual ? '✓' : p.num}</div>
                  <div className="ci-paso-lbl">{p.label}</div>
                </div>
                {i < arr.length-1 && <div className="ci-linea" />}
              </div>
            )
          })}
        </div>

        {error && <div className="ci-err">{error}</div>}

        {/* ── PASO 1: BUSCAR ── */}
        {paso === 'buscar' && (
          <div className="ci-grid2">
            {/* Búsqueda */}
            <div className="ci-panel">
              <div className="ci-ph">
                <span className="ci-pt">Buscar reserva</span>
              </div>
              <div className="ci-body">
                <div className="ci-search">
                  <span className="ci-search-ico">🔍</span>
                  <input placeholder="Código o nombre del cliente..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
                </div>
                {cargando
                  ? Array.from({length:3}).map((_,i) => (
                      <div key={i} className="ci-skel" style={{height:72,borderRadius:8,marginBottom:8}} />
                    ))
                  : filtradas.length === 0
                    ? <div className="ci-empty">{busqueda ? 'Sin resultados' : 'No hay llegadas confirmadas para hoy'}</div>
                    : filtradas.map(r => (
                        <div key={r.id} className="ci-item" onClick={() => seleccionar(r)}>
                          <div className="ci-cod">{r.codigo_reserva}</div>
                          <div className="ci-nom">{r.cliente_nombre}</div>
                          <div className="ci-sub">
                            {r.habitacion_numero ? `Hab. ${r.habitacion_numero}` : 'Sin hab. asignada'}
                            {' · '}{r.fecha_entrada} → {r.fecha_salida}
                          </div>
                        </div>
                      ))
                }
              </div>
            </div>

            {/* Lista total */}
            <div className="ci-panel">
              <div className="ci-ph">
                <span className="ci-pt">Llegadas de hoy</span>
                <span className="ci-pb">{reservas.length} reservas</span>
              </div>
              <div className="ci-body">
                {cargando
                  ? Array.from({length:3}).map((_,i) => (
                      <div key={i} className="ci-skel" style={{height:72,borderRadius:8,marginBottom:8}} />
                    ))
                  : reservas.length === 0
                    ? <div className="ci-empty">No hay llegadas programadas para hoy</div>
                    : reservas.map(r => (
                        <div key={r.id} className="ci-item" onClick={() => seleccionar(r)}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                            <div>
                              <div className="ci-cod">{r.codigo_reserva}</div>
                              <div className="ci-nom">{r.cliente_nombre}</div>
                              <div className="ci-sub">
                                {r.tipo_documento} {r.numero_documento}
                                {r.habitacion_numero ? ` · Hab. ${r.habitacion_numero}` : ''}
                              </div>
                            </div>
                            <div style={{textAlign:'right',flexShrink:0}}>
                              <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.1rem',color:'#d4af6a'}}>
                                Bs. {Number(r.total_estimado).toLocaleString()}
                              </div>
                              <div style={{fontSize:'0.65rem',color:'rgba(240,236,228,0.3)',marginTop:2}}>
                                {r.cantidad_adultos} adult{r.cantidad_adultos!==1?'os':'o'}
                                {r.cantidad_ninos>0?` · ${r.cantidad_ninos} niño${r.cantidad_ninos!==1?'s':''}`:''}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 2: VERIFICAR ── */}
        {paso === 'verificar' && sel && (
          <div className="ci-grid2">
            {/* Info cliente */}
            <div>
              <div className="ci-panel" style={{marginBottom:16}}>
                <div className="ci-ph">
                  <span className="ci-pt">Datos del huésped</span>
                  <span className="ci-pb">{sel.codigo_reserva}</span>
                </div>
                <div className="ci-body">
                  {/* Avatar + nombre */}
                  <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16,paddingBottom:16,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(212,175,106,0.12)',border:'1px solid rgba(212,175,106,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Cormorant Garamond,serif',fontSize:'1.4rem',color:'#d4af6a',flexShrink:0}}>
                      {sel.cliente_nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontSize:'0.95rem',fontWeight:600,color:'#f0ece4'}}>{sel.cliente_nombre}</div>
                      <div style={{fontSize:'0.7rem',color:'rgba(240,236,228,0.4)',marginTop:2}}>{sel.cliente_correo}</div>
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 14px'}}>
                    <div className="ci-fld" style={{gridColumn:'1/-1'}}>
                      <div className="ci-fl">Documento de identidad</div>
                      <div className="ci-fv" style={{fontWeight:600}}>
                        {sel.tipo_documento ?? '—'} {sel.numero_documento ?? '—'}
                      </div>
                    </div>
                    <div className="ci-fld">
                      <div className="ci-fl">Teléfono</div>
                      <div className="ci-fv">{sel.cliente_telefono ?? 'No registrado'}</div>
                    </div>
                    <div className="ci-fld">
                      <div className="ci-fl">Huéspedes</div>
                      <div className="ci-fv">
                        {sel.cantidad_adultos} adult{sel.cantidad_adultos!==1?'os':'o'}
                        {sel.cantidad_ninos>0?` · ${sel.cantidad_ninos} niño${sel.cantidad_ninos!==1?'s':''}`:' '}
                      </div>
                    </div>
                    <div className="ci-fld">
                      <div className="ci-fl">Check-in</div>
                      <div className="ci-fv">{sel.fecha_entrada}</div>
                    </div>
                    <div className="ci-fld">
                      <div className="ci-fl">Check-out</div>
                      <div className="ci-fv">{sel.fecha_salida}</div>
                    </div>
                    <div className="ci-fld">
                      <div className="ci-fl">Noches</div>
                      <div className="ci-fv" style={{color:'#d4af6a',fontFamily:'Cormorant Garamond,serif',fontSize:'1rem'}}>{noches}</div>
                    </div>
                    <div className="ci-fld">
                      <div className="ci-fl">Total</div>
                      <div className="ci-fv" style={{color:'#d4af6a',fontFamily:'Cormorant Garamond,serif',fontSize:'1.1rem'}}>
                        Bs. {Number(sel.total_estimado).toLocaleString()}
                      </div>
                    </div>
                    {sel.observaciones && (
                      <div className="ci-fld" style={{gridColumn:'1/-1'}}>
                        <div className="ci-fl">Solicitudes especiales</div>
                        <div style={{fontSize:'0.78rem',color:'rgba(240,236,228,0.65)',background:'rgba(255,255,255,0.02)',borderRadius:6,padding:'8px 10px',marginTop:3}}>
                          {sel.observaciones}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Verificación de documento */}
                  <div style={{marginTop:14}}>
                    <div className="ci-sec">Verificación</div>
                    <div className={`ci-check ${docVerificado?'ok':''}`}
                      onClick={() => setDocVerif(!docVerificado)}>
                      <div className="ci-chk-box">{docVerificado && '✓'}</div>
                      <div className="ci-chk-txt">
                        Documento verificado: {sel.tipo_documento} {sel.numero_documento}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info habitación + acciones */}
            <div>
              <div className="ci-panel" style={{marginBottom:16}}>
                <div className="ci-ph">
                  <span className="ci-pt">Habitación asignada</span>
                </div>
                <div className="ci-body">
                  {sel.habitacion_numero ? (
                    <div className="ci-hab-card">
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                        <div>
                          <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.5rem',color:'#d4af6a',lineHeight:1}}>
                            Hab. {sel.habitacion_numero}
                          </div>
                          <div style={{fontSize:'0.7rem',color:'rgba(240,236,228,0.4)',marginTop:3}}>
                            {sel.habitacion_tipo ?? '—'}
                            {sel.habitacion_piso ? ` · Piso ${sel.habitacion_piso}` : ''}
                          </div>
                        </div>
                        {sel.habitacion_estado && (() => {
                          const lc = limpieza[sel.habitacion_estado] ?? { bg:'rgba(255,255,255,0.06)',color:'rgba(240,236,228,0.4)',label:sel.habitacion_estado }
                          return (
                            <div className="ci-limpieza-badge" style={{background:lc.bg,color:lc.color}}>
                              🧹 {lc.label}
                            </div>
                          )
                        })()}
                      </div>
                      {sel.habitacion_estado === 'limpieza' && (
                        <div style={{fontSize:'0.72rem',color:'#d46464',background:'rgba(212,100,100,0.06)',border:'1px solid rgba(212,100,100,0.15)',borderRadius:6,padding:'8px 10px',marginTop:6}}>
                          ⚠ Esta habitación tiene limpieza pendiente. Coordinar con housekeeping antes de hacer check-in.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{fontSize:'0.78rem',color:'rgba(240,236,228,0.35)',padding:'8px 0'}}>
                      Sin habitación asignada en la reserva.
                    </div>
                  )}

                  {/* Cambiar habitación */}
                  <div style={{marginTop:14}}>
                    <div className="ci-sec">Cambiar habitación</div>
                    <button className="ci-btn-b" disabled={buscandoHabs}
                      onClick={buscarHabs} style={{marginBottom:10}}>
                      {buscandoHabs ? 'Buscando...' : '🔍 Ver habitaciones disponibles'}
                    </button>
                    {habsDisp.length > 0 && (
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <select style={inp} value={habSelId ?? ''} onChange={e => setHabSelId(e.target.value || null)}>
                          <option value="">Seleccionar habitación...</option>
                          {habsDisp.map(h => (
                            <option key={h.habitacion_id??h.id} value={h.habitacion_id??h.id}>
                              Hab. {h.numero} — {h.nombre_tipo??h.tipo} · Bs.{h.precio_base??h.precio}/noche
                            </option>
                          ))}
                        </select>
                        <button className="ci-btn-g" disabled={!habSelId || cambiandoHab}
                          onClick={aplicarCambioHab} style={{whiteSpace:'nowrap'}}>
                          {cambiandoHab ? '...' : '✓ Aplicar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div style={{display:'flex',gap:10}}>
                <button className="ci-btn-s" onClick={resetear} style={{width:'auto',padding:'11px 20px',flex:'none'}}>
                  ← Volver
                </button>
                <button className="ci-btn-p"
                  disabled={!docVerificado}
                  onClick={() => setPaso('confirmar')}
                  style={{marginTop:0, opacity: docVerificado ? 1 : 0.35}}>
                  Continuar →
                </button>
              </div>
              {!docVerificado && (
                <div style={{fontSize:'0.7rem',color:'rgba(212,175,106,0.6)',textAlign:'center',marginTop:8}}>
                  Debes verificar el documento antes de continuar
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PASO 3: CONFIRMAR ── */}
        {paso === 'confirmar' && sel && (
          <div style={{maxWidth:580}}>
            <div className="ci-panel" style={{marginBottom:16}}>
              <div className="ci-ph">
                <span className="ci-pt">Confirmar check-in</span>
                <span className="ci-pb">{sel.codigo_reserva}</span>
              </div>
              <div className="ci-body">
                {/* Resumen */}
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:10,padding:'14px 16px',marginBottom:18}}>
                  {[
                    ['Huésped',    sel.cliente_nombre],
                    ['Documento',  `${sel.tipo_documento??''} ${sel.numero_documento??''}`],
                    ['Habitación', sel.habitacion_numero ? `Hab. ${sel.habitacion_numero} · ${sel.habitacion_tipo??''}` : '—'],
                    ['Período',    `${sel.fecha_entrada} → ${sel.fecha_salida} (${noches} noches)`],
                    ['Total',      `Bs. ${Number(sel.total_estimado).toLocaleString()}`],
                  ].map(([k,v]) => (
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <span style={{fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(240,236,228,0.28)'}}>{k}</span>
                      <span style={{fontSize:'0.8rem',color:'#f0ece4',textAlign:'right',maxWidth:'60%'}}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Acompañantes adicionales */}
                <div style={{marginBottom:16}}>
                  <label style={lbl}>Acompañantes adicionales (si hay más de lo previsto)</label>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <button onClick={() => setAcomp(Math.max(0,acompanantes-1))}
                      style={{...inp,width:38,padding:'8px',textAlign:'center',cursor:'pointer',flexShrink:0}}>−</button>
                    <input type="number" min={0} value={acompanantes}
                      onChange={e => setAcomp(Math.max(0,Number(e.target.value)))}
                      style={{...inp,width:70,textAlign:'center'}} />
                    <button onClick={() => setAcomp(acompanantes+1)}
                      style={{...inp,width:38,padding:'8px',textAlign:'center',cursor:'pointer',flexShrink:0}}>+</button>
                    <span style={{fontSize:'0.72rem',color:'rgba(240,236,228,0.4)'}}>
                      Total: {sel.cantidad_adultos + acompanantes} pers.
                    </span>
                  </div>
                </div>

                {/* Observaciones */}
                <div style={{marginBottom:18}}>
                  <label style={lbl}>Observaciones del check-in</label>
                  <textarea style={{...inp,resize:'vertical',minHeight:80}}
                    placeholder="Notas del ingreso, solicitudes del huésped..."
                    value={obs} onChange={e => setObs(e.target.value)} />
                </div>

                <div style={{display:'flex',gap:10}}>
                  <button className="ci-btn-s" onClick={() => setPaso('verificar')}
                    style={{width:'auto',padding:'11px 20px',marginTop:0,flex:'none'}}>
                    ← Volver
                  </button>
                  <button className="ci-btn-p" disabled={procesando} onClick={handleCheckin} style={{marginTop:0}}>
                    {procesando ? 'Registrando...' : '✓ Confirmar Check-in'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 4: COMPLETADO ── */}
        {paso === 'completado' && sel && (
          <div className="ci-success">
            <div className="ci-suc-ico">✓</div>
            <div className="ci-suc-tit">Check-in completado</div>
            <div className="ci-suc-sub">El huésped ha sido registrado oficialmente</div>

            <div className="ci-suc-box">
              {[
                ['Reserva',     sel.codigo_reserva],
                ['Huésped',     sel.cliente_nombre],
                ['Habitación',  sel.habitacion_numero ? `Hab. ${sel.habitacion_numero}` : '—'],
                ['Salida',      sel.fecha_salida],
                ['Estado',      'En estadía'],
              ].map(([k,v]) => (
                <div key={k} className="ci-suc-row">
                  <label>{k}</label>
                  <span style={{color: k==='Estado' ? '#52c97a' : '#f0ece4'}}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:10,flexDirection:'column'}}>
              <button className="ci-btn-p" onClick={resetear} style={{marginTop:0}}>
                Registrar otra llegada
              </button>
              <button className="ci-btn-s" onClick={() => navigate('/personal/checkout')} style={{marginTop:0}}>
                Ir a Check-out →
              </button>
            </div>
          </div>
        )}

      </PersonalLayout>
    </>
  )
}
