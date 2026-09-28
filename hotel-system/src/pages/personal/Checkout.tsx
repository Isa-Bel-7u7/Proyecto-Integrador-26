import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PersonalLayout from '../../components/PersonalLayout'
import {
  getReservasEnEstadia, registrarCheckout,
  registrarPagoReserva, getMetodosPago,
} from '../../services/api'

type ReservaEstadia = {
  id: string
  codigo_reserva: string
  estado: string
  fecha_entrada: string
  fecha_salida: string
  total_estimado: number
  total_pagado: number
  cantidad_adultos: number
  cantidad_ninos: number
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
  checkin_id: string | null
}

type Paso = 'buscar' | 'revisar' | 'confirmar' | 'completado'

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,106,0.2)',
  borderRadius: 8, padding: '11px 14px', fontFamily: 'Montserrat,sans-serif',
  fontSize: '0.82rem', fontWeight: 300, color: '#f0ece4', outline: 'none',
}
const lbl: React.CSSProperties = {
  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
  color: 'rgba(240,236,228,0.3)', display: 'block', marginBottom: 5,
}

export default function Checkout() {
  const navigate = useNavigate()

  const [estadias, setEstadias]    = useState<ReservaEstadia[]>([])
  const [cargando, setCargando]    = useState(true)
  const [busqueda, setBusqueda]    = useState('')
  const [sel, setSel]              = useState<ReservaEstadia | null>(null)
  const [paso, setPaso]            = useState<Paso>('buscar')
  const [error, setError]          = useState<string | null>(null)
  const [metodosPago, setMetodos]  = useState<{id:string;nombre:string}[]>([])

  // Paso revisar: cargos + verificaciones
  const [cargosExtra, setCargos]   = useState(0)
  const [descuento, setDescuento]  = useState(0)
  const [llavesOk, setLlaves]      = useState(false)
  const [sinDanos, setSinDanos]    = useState(false)
  const [habitInsp, setHabitInsp]  = useState(false)
  const [notaDanos, setNotaDanos]  = useState('')

  // Pago adicional en esta sesión
  const [pagarSaldo, setPagarSaldo]  = useState(false)
  const [montoPago, setMontoPago]    = useState(0)
  const [metodoPId, setMetodoPId]    = useState('')
  const [pagando, setPagando]        = useState(false)
  const [pagadoExtra, setPagadoExtra] = useState(0)

  // Paso confirmar
  const [obs, setObs]              = useState('')
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    try {
      const [est, mp] = await Promise.all([getReservasEnEstadia(), getMetodosPago()])
      setEstadias(est as ReservaEstadia[])
      setMetodos(mp)
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const seleccionar = (r: ReservaEstadia) => {
    setSel(r); setPaso('revisar'); setCargos(0); setDescuento(0)
    setLlaves(false); setSinDanos(false); setHabitInsp(false); setNotaDanos('')
    setPagarSaldo(false); setMontoPago(0); setMetodoPId(''); setPagadoExtra(0)
    setObs(''); setError(null)
  }

  const resetear = () => {
    setSel(null); setPaso('buscar'); setBusqueda('')
    setCargos(0); setDescuento(0); setLlaves(false); setSinDanos(false)
    setHabitInsp(false); setNotaDanos(''); setPagarSaldo(false)
    setMontoPago(0); setPagadoExtra(0); setObs(''); setError(null)
  }

  const totalFinal  = sel ? Number(sel.total_estimado) + cargosExtra - descuento : 0
  const totalPagado = sel ? Number(sel.total_pagado) + pagadoExtra : 0
  const saldo       = Math.max(0, totalFinal - totalPagado)
  const noches      = sel ? Math.max(
    Math.ceil((new Date(sel.fecha_salida).getTime() - new Date(sel.fecha_entrada).getTime()) / 86400000), 1
  ) : 0

  const handleRegistrarPagoExtra = async () => {
    if (!sel || !metodoPId || montoPago <= 0) return
    setPagando(true); setError(null)
    try {
      await registrarPagoReserva(sel.id, montoPago, metodoPId, montoPago >= saldo ? 'pago_total' : 'anticipo')
      setPagadoExtra(prev => prev + montoPago)
      setMontoPago(0); setMetodoPId(''); setPagarSaldo(false)
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setPagando(false) }
  }

  const handleCheckout = async () => {
    if (!sel) return
    if (saldo > 0) {
      setError(`Hay un saldo pendiente de Bs. ${saldo.toLocaleString()}. Registra el pago antes de confirmar.`)
      return
    }
    setProcesando(true); setError(null)
    try {
      const obsCompleta = [obs, !sinDanos && notaDanos ? `Daños: ${notaDanos}` : ''].filter(Boolean).join(' | ')
      await registrarCheckout({
        reservaId: sel.id, checkinId: sel.checkin_id,
        cargosExtra, descuento,
        observaciones: obsCompleta || undefined,
      })
      setPaso('completado')
      await cargar()
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setProcesando(false) }
  }

  const filtradas = estadias.filter(r =>
    !busqueda || r.codigo_reserva?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const PASOS = [
    { key:'buscar',     num:'1', label:'Buscar estadía'  },
    { key:'revisar',    num:'2', label:'Revisar cargos'  },
    { key:'confirmar',  num:'3', label:'Confirmar'       },
    { key:'completado', num:'✓', label:'Completado'      },
  ]
  const ordenPasos = ['buscar','revisar','confirmar','completado']
  const idxActual  = ordenPasos.indexOf(paso)

  return (
    <>
      <style>{`
        .co-pasos { display:flex; align-items:center; margin-bottom:28px; }
        .co-paso-item { display:flex; align-items:center; gap:10px; }
        .co-circulo { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.72rem; font-weight:700; border:1.5px solid; transition:all 0.3s; flex-shrink:0; }
        .co-paso-lbl { font-size:0.68rem; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; transition:color 0.3s; white-space:nowrap; }
        .co-linea { flex:1; height:1px; background:rgba(106,184,212,0.15); margin:0 12px; min-width:20px; }
        .co-act .co-circulo { background:rgba(106,184,212,0.12); border-color:#6ab8d4; color:#6ab8d4; }
        .co-act .co-paso-lbl { color:#6ab8d4; }
        .co-done .co-circulo { background:rgba(82,201,122,0.12); border-color:#52c97a; color:#52c97a; }
        .co-done .co-paso-lbl { color:#52c97a; }
        .co-pend .co-circulo { border-color:rgba(240,236,228,0.1); color:rgba(240,236,228,0.2); }
        .co-pend .co-paso-lbl { color:rgba(240,236,228,0.2); }
        .co-grid2 { display:grid; grid-template-columns:1fr 1.4fr; gap:20px; }
        @media(max-width:1000px){.co-grid2{grid-template-columns:1fr;}}
        .co-panel { background:#13131a; border:1px solid rgba(106,184,212,0.1); border-radius:12px; overflow:hidden; }
        .co-ph { padding:14px 18px; border-bottom:1px solid rgba(106,184,212,0.07); display:flex; align-items:center; justify-content:space-between; }
        .co-pt { font-size:0.68rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:rgba(240,236,228,0.45); }
        .co-pb { font-size:0.62rem; background:rgba(106,184,212,0.1); color:#6ab8d4; padding:3px 10px; border-radius:20px; }
        .co-body { padding:16px 18px; }
        .co-item { padding:13px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.04); margin-bottom:8px; cursor:pointer; transition:all 0.2s; }
        .co-item:hover { border-color:rgba(106,184,212,0.25); background:rgba(106,184,212,0.04); }
        .co-item:last-child { margin-bottom:0; }
        .co-cod { font-family:'Cormorant Garamond',serif; font-size:0.95rem; color:#d4af6a; margin-bottom:3px; }
        .co-nom { font-size:0.8rem; font-weight:500; color:#f0ece4; margin-bottom:2px; }
        .co-sub { font-size:0.7rem; color:rgba(240,236,228,0.4); }
        .co-empty { padding:32px; text-align:center; color:rgba(240,236,228,0.22); font-size:0.8rem; }
        .co-skel { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:cosk 1.5s infinite; border-radius:4px; }
        @keyframes cosk{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .co-err { background:rgba(224,82,82,0.08); border:1px solid rgba(224,82,82,0.2); border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:0.78rem; color:#e05252; }
        .co-sec { font-size:0.6rem; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:rgba(106,184,212,0.55); margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid rgba(106,184,212,0.08); }
        .co-fld { margin-bottom:10px; }
        .co-fl { font-size:0.58rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:rgba(240,236,228,0.28); margin-bottom:3px; }
        .co-fv { font-size:0.8rem; color:#f0ece4; }
        .co-fin-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .co-fin-row:last-child { border-bottom:none; }
        .co-fin-l { font-size:0.72rem; color:rgba(240,236,228,0.45); }
        .co-fin-v { font-size:0.85rem; color:#f0ece4; font-weight:500; }
        .co-check { display:flex; align-items:center; gap:12px; padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; cursor:pointer; transition:all 0.2s; margin-bottom:8px; }
        .co-check:hover { border-color:rgba(82,201,122,0.2); }
        .co-check.ok { border-color:rgba(82,201,122,0.3); background:rgba(82,201,122,0.04); }
        .co-chk-box { width:20px; height:20px; border-radius:6px; border:1.5px solid rgba(240,236,228,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.2s; font-size:0.75rem; }
        .co-check.ok .co-chk-box { background:rgba(82,201,122,0.2); border-color:#52c97a; color:#52c97a; }
        .co-chk-txt { font-size:0.78rem; color:rgba(240,236,228,0.65); }
        .co-check.ok .co-chk-txt { color:#f0ece4; }
        .co-btn-p { width:100%; padding:13px; border-radius:8px; background:linear-gradient(135deg,#4a9abf,#6ab8d4); border:none; cursor:pointer; font-family:'Montserrat',sans-serif; font-size:0.72rem; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:#0a0a0a; margin-top:16px; transition:opacity 0.2s; }
        .co-btn-p:disabled { opacity:0.35; cursor:not-allowed; }
        .co-btn-s { width:100%; padding:11px; border-radius:8px; background:transparent; border:1px solid rgba(240,236,228,0.1); cursor:pointer; font-family:'Montserrat',sans-serif; font-size:0.7rem; font-weight:500; color:rgba(240,236,228,0.4); margin-top:8px; transition:all 0.2s; }
        .co-btn-s:hover { border-color:rgba(240,236,228,0.25); color:rgba(240,236,228,0.65); }
        .co-btn-gold { padding:10px 16px; border-radius:8px; background:linear-gradient(135deg,#c9a84c,#d4af6a); border:none; cursor:pointer; font-family:'Montserrat',sans-serif; font-size:0.68rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#0a0a0a; transition:opacity 0.2s; }
        .co-btn-gold:disabled { opacity:0.35; cursor:not-allowed; }
        .co-success { background:#13131a; border:1px solid rgba(106,184,212,0.3); border-radius:16px; padding:48px 32px; text-align:center; max-width:500px; margin:0 auto; }
        .co-suc-ico { width:72px; height:72px; border-radius:50%; background:rgba(106,184,212,0.12); border:2px solid rgba(106,184,212,0.4); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:1.8rem; }
        .co-suc-tit { font-family:'Cormorant Garamond',serif; font-size:2rem; color:#6ab8d4; margin-bottom:6px; }
        .co-suc-sub { font-size:0.78rem; color:rgba(240,236,228,0.4); letter-spacing:0.06em; margin-bottom:28px; }
        .co-suc-box { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:18px; margin-bottom:16px; text-align:left; }
        .co-suc-row { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .co-suc-row:last-child { border-bottom:none; }
        .co-suc-row label { font-size:0.62rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(240,236,228,0.28); }
        .co-suc-row span { font-size:0.8rem; color:#f0ece4; }
        .co-search { position:relative; margin-bottom:14px; }
        .co-search input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(106,184,212,0.2); border-radius:8px; padding:11px 14px 11px 38px; font-family:'Montserrat',sans-serif; font-size:0.82rem; color:#f0ece4; outline:none; }
        .co-search input:focus { border-color:rgba(106,184,212,0.4); }
        .co-search input::placeholder { color:rgba(240,236,228,0.22); }
        .co-search-ico { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:rgba(240,236,228,0.3); }
        .co-pago-box { background:rgba(212,175,106,0.06); border:1px solid rgba(212,175,106,0.2); border-radius:10px; padding:14px 16px; margin-top:14px; }
        .co-limpieza-nota { background:rgba(212,175,106,0.06); border:1px solid rgba(212,175,106,0.15); border-radius:10px; padding:14px 16px; margin-bottom:18px; font-size:0.78rem; color:rgba(212,175,106,0.8); display:flex; gap:10px; align-items:flex-start; }
        .co-verif-row { display:flex; gap:14px; margin-bottom:14px; flex-wrap:wrap; }
        .co-verif-chip { display:flex; align-items:center; gap:5px; font-size:0.7rem; padding:5px 10px; border-radius:20px; border:1px solid; }
      `}</style>

      <PersonalLayout titulo="Check-out" subtitulo="Registro de salida de huéspedes">

        {/* Pasos */}
        <div className="co-pasos">
          {PASOS.map((p, i, arr) => {
            const idx = ordenPasos.indexOf(p.key)
            const cls = idx < idxActual ? 'co-done' : idx === idxActual ? 'co-act' : 'co-pend'
            return (
              <div key={p.key} style={{display:'flex',alignItems:'center',flex:i<arr.length-1?1:'none'}}>
                <div className={`co-paso-item ${cls}`}>
                  <div className="co-circulo">{idx < idxActual ? '✓' : p.num}</div>
                  <div className="co-paso-lbl">{p.label}</div>
                </div>
                {i < arr.length-1 && <div className="co-linea" />}
              </div>
            )
          })}
        </div>

        {error && <div className="co-err">{error}</div>}

        {/* ── PASO 1: BUSCAR ── */}
        {paso === 'buscar' && (
          <div className="co-grid2">
            <div className="co-panel">
              <div className="co-ph"><span className="co-pt">Buscar estadía activa</span></div>
              <div className="co-body">
                <div className="co-search">
                  <span className="co-search-ico">🔍</span>
                  <input placeholder="Código o nombre del cliente..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
                </div>
                {cargando
                  ? Array.from({length:3}).map((_,i) => (
                      <div key={i} className="co-skel" style={{height:72,borderRadius:8,marginBottom:8}} />
                    ))
                  : filtradas.length === 0
                    ? <div className="co-empty">{busqueda ? 'Sin resultados' : 'No hay estadías activas'}</div>
                    : filtradas.map(r => {
                        const s = Math.max(0, Number(r.total_estimado) - Number(r.total_pagado))
                        return (
                          <div key={r.id} className="co-item" onClick={() => seleccionar(r)}>
                            <div className="co-cod">{r.codigo_reserva}</div>
                            <div className="co-nom">{r.cliente_nombre}</div>
                            <div className="co-sub">
                              {r.habitacion_numero ? `Hab. ${r.habitacion_numero}` : '—'}{' · '}Salida: {r.fecha_salida}
                            </div>
                            <div style={{marginTop:5}}>
                              <span style={{fontSize:'0.62rem',fontWeight:700,padding:'3px 8px',borderRadius:20,background:s>0?'rgba(224,82,82,0.1)':'rgba(82,201,122,0.1)',color:s>0?'#e05252':'#52c97a'}}>
                                {s>0?`Saldo: Bs.${s.toLocaleString()}`:'Pagado ✓'}
                              </span>
                            </div>
                          </div>
                        )
                      })
                }
              </div>
            </div>

            <div className="co-panel">
              <div className="co-ph">
                <span className="co-pt">Estadías activas</span>
                <span className="co-pb">{estadias.length} en estadía</span>
              </div>
              <div className="co-body">
                {cargando
                  ? Array.from({length:3}).map((_,i) => (
                      <div key={i} className="co-skel" style={{height:72,borderRadius:8,marginBottom:8}} />
                    ))
                  : estadias.length === 0
                    ? <div className="co-empty">No hay estadías activas</div>
                    : estadias.map(r => {
                        const s = Math.max(0, Number(r.total_estimado) - Number(r.total_pagado))
                        const atrasado = new Date(r.fecha_salida) < new Date()
                        return (
                          <div key={r.id} className="co-item" onClick={() => seleccionar(r)}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                              <div>
                                <div className="co-cod">{r.codigo_reserva}</div>
                                <div className="co-nom">{r.cliente_nombre}</div>
                                <div className="co-sub">
                                  {r.habitacion_numero?`Hab. ${r.habitacion_numero}`:'—'}
                                  {' · '}{r.fecha_entrada} → {r.fecha_salida}
                                </div>
                              </div>
                              <div style={{textAlign:'right',flexShrink:0}}>
                                <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1rem',color:s>0?'#e05252':'#52c97a'}}>
                                  {s>0?`Bs.${s.toLocaleString()}`:'✓ Saldado'}
                                </div>
                                {atrasado && <div style={{fontSize:'0.6rem',color:'#e05252',marginTop:2}}>⚠ Fecha vencida</div>}
                              </div>
                            </div>
                          </div>
                        )
                      })
                }
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 2: REVISAR ── */}
        {paso === 'revisar' && sel && (
          <div className="co-grid2">
            {/* Col izquierda */}
            <div>
              <div className="co-panel" style={{marginBottom:16}}>
                <div className="co-ph">
                  <span className="co-pt">Datos del huésped</span>
                  <span className="co-pb">{sel.codigo_reserva}</span>
                </div>
                <div className="co-body">
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,paddingBottom:14,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(106,184,212,0.1)',border:'1px solid rgba(106,184,212,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Cormorant Garamond,serif',fontSize:'1.3rem',color:'#6ab8d4',flexShrink:0}}>
                      {sel.cliente_nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontSize:'0.9rem',fontWeight:600,color:'#f0ece4'}}>{sel.cliente_nombre}</div>
                      <div style={{fontSize:'0.7rem',color:'rgba(240,236,228,0.4)',marginTop:2}}>{sel.cliente_correo}</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 14px'}}>
                    <div className="co-fld">
                      <div className="co-fl">Documento</div>
                      <div className="co-fv">{sel.tipo_documento} {sel.numero_documento}</div>
                    </div>
                    <div className="co-fld">
                      <div className="co-fl">Teléfono</div>
                      <div className="co-fv">{sel.cliente_telefono ?? '—'}</div>
                    </div>
                    <div className="co-fld">
                      <div className="co-fl">Check-in</div>
                      <div className="co-fv">{sel.fecha_entrada}</div>
                    </div>
                    <div className="co-fld">
                      <div className="co-fl">Check-out programado</div>
                      <div className="co-fv">{sel.fecha_salida}</div>
                    </div>
                    <div className="co-fld">
                      <div className="co-fl">Noches</div>
                      <div className="co-fv" style={{color:'#6ab8d4',fontFamily:'Cormorant Garamond,serif',fontSize:'1rem'}}>{noches}</div>
                    </div>
                    <div className="co-fld">
                      <div className="co-fl">Huéspedes</div>
                      <div className="co-fv">{sel.cantidad_adultos} adult{sel.cantidad_adultos!==1?'os':'o'}
                        {sel.cantidad_ninos>0?` · ${sel.cantidad_ninos} niño${sel.cantidad_ninos!==1?'s':''}`:''}</div>
                    </div>
                    {sel.habitacion_numero && (
                      <div className="co-fld" style={{gridColumn:'1/-1'}}>
                        <div className="co-fl">Habitación</div>
                        <div className="co-fv" style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1rem',color:'#d4af6a'}}>
                          Hab. {sel.habitacion_numero}
                          <span style={{fontFamily:'Montserrat,sans-serif',fontSize:'0.72rem',color:'rgba(240,236,228,0.4)',marginLeft:8}}>
                            {sel.habitacion_tipo ?? ''}
                            {sel.habitacion_piso ? ` · Piso ${sel.habitacion_piso}` : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de verificación */}
              <div className="co-panel">
                <div className="co-ph"><span className="co-pt">Verificación de salida</span></div>
                <div className="co-body">
                  {[
                    { ok:llavesOk,   set:setLlaves,   label:'Llaves / tarjetas devueltas' },
                    { ok:sinDanos,   set:setSinDanos,  label:'Sin daños en la habitación' },
                    { ok:habitInsp,  set:setHabitInsp, label:'Habitación inspeccionada y registrada' },
                  ].map((item, i) => (
                    <div key={i} className={`co-check ${item.ok?'ok':''}`} onClick={() => item.set(!item.ok)}>
                      <div className="co-chk-box">{item.ok && '✓'}</div>
                      <div className="co-chk-txt">{item.label}</div>
                    </div>
                  ))}
                  {!sinDanos && (
                    <div style={{marginTop:4}}>
                      <label style={lbl}>Descripción de daños (si aplica)</label>
                      <input style={inp} placeholder="Describe los daños encontrados..."
                        value={notaDanos} onChange={e => setNotaDanos(e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Col derecha: financiero */}
            <div>
              <div className="co-panel" style={{marginBottom:16}}>
                <div className="co-ph"><span className="co-pt">Resumen financiero</span></div>
                <div className="co-body">
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                    <div>
                      <label style={lbl}>Cargos extra (Bs.)</label>
                      <input type="number" min={0} value={cargosExtra}
                        onChange={e => setCargos(Math.max(0,Number(e.target.value)))} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Descuento (Bs.)</label>
                      <input type="number" min={0} value={descuento}
                        onChange={e => setDescuento(Math.max(0,Number(e.target.value)))} style={inp} />
                    </div>
                  </div>

                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:10,padding:'14px 16px',marginBottom:14}}>
                    {[
                      {k:'Total reserva',   v:`Bs. ${Number(sel.total_estimado).toLocaleString()}`, c:''},
                      ...(cargosExtra>0?[{k:'+ Cargos extra', v:`Bs. ${cargosExtra.toLocaleString()}`, c:'#d4af6a'}]:[]),
                      ...(descuento>0  ?[{k:'− Descuento',    v:`Bs. ${descuento.toLocaleString()}`,  c:'#52c97a'}]:[]),
                    ].map(({k,v,c}) => (
                      <div key={k} className="co-fin-row">
                        <span className="co-fin-l">{k}</span>
                        <span className="co-fin-v" style={{color:c||'#f0ece4'}}>{v}</span>
                      </div>
                    ))}
                    <div style={{padding:'10px 0 7px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:'0.72rem',fontWeight:700,color:'rgba(240,236,228,0.6)'}}>TOTAL A PAGAR</span>
                      <span style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.5rem',color:'#d4af6a'}}>
                        Bs. {totalFinal.toLocaleString()}
                      </span>
                    </div>
                    <div className="co-fin-row">
                      <span className="co-fin-l">Pagado</span>
                      <span style={{fontSize:'0.85rem',color:'#52c97a',fontWeight:600}}>Bs. {totalPagado.toLocaleString()}</span>
                    </div>
                    <div className="co-fin-row">
                      <span style={{fontSize:'0.78rem',fontWeight:700,color:saldo>0?'#e05252':'rgba(82,201,122,0.7)'}}>
                        {saldo>0?'⚠ SALDO PENDIENTE':'✓ SALDADO'}
                      </span>
                      <span style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.2rem',color:saldo>0?'#e05252':'#52c97a'}}>
                        {saldo>0?`Bs. ${saldo.toLocaleString()}`:'Bs. 0'}
                      </span>
                    </div>
                  </div>

                  {/* Pago si hay saldo */}
                  {saldo > 0 && (
                    <div className="co-pago-box">
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                        <span style={{fontSize:'0.68rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(212,175,106,0.7)'}}>
                          Registrar pago final
                        </span>
                        <button onClick={() => setPagarSaldo(!pagarSaldo)}
                          style={{background:'none',border:'1px solid rgba(212,175,106,0.25)',borderRadius:6,padding:'4px 10px',color:'#d4af6a',fontSize:'0.65rem',fontFamily:'Montserrat,sans-serif',cursor:'pointer'}}>
                          {pagarSaldo?'− Ocultar':'+ Agregar pago'}
                        </button>
                      </div>
                      {pagarSaldo && (
                        <>
                          <div style={{marginBottom:10}}>
                            <label style={lbl}>Método de pago</label>
                            <select style={inp} value={metodoPId} onChange={e => setMetodoPId(e.target.value)}>
                              <option value="">Seleccionar...</option>
                              {metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                            </select>
                          </div>
                          <div style={{marginBottom:10}}>
                            <label style={lbl}>Monto (Bs.)</label>
                            <input type="number" min={1} max={saldo} value={montoPago}
                              onChange={e => setMontoPago(Math.min(saldo,Math.max(0,Number(e.target.value))))}
                              style={inp} />
                          </div>
                          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                            <button onClick={() => setMontoPago(saldo)}
                              style={{padding:'6px 12px',borderRadius:6,border:'1px solid rgba(212,175,106,0.25)',background:'rgba(212,175,106,0.06)',color:'#d4af6a',fontSize:'0.65rem',fontFamily:'Montserrat,sans-serif',cursor:'pointer'}}>
                              Monto total (Bs.{saldo.toLocaleString()})
                            </button>
                            <button className="co-btn-gold" disabled={!metodoPId||montoPago<=0||pagando}
                              onClick={handleRegistrarPagoExtra}>
                              {pagando?'...':'Registrar pago'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{display:'flex',gap:10}}>
                <button className="co-btn-s" onClick={resetear} style={{width:'auto',padding:'11px 20px',marginTop:0,flex:'none'}}>
                  ← Volver
                </button>
                <button className="co-btn-p" disabled={saldo>0} onClick={() => setPaso('confirmar')}
                  style={{marginTop:0, opacity:saldo>0?0.35:1}}>
                  {saldo>0?`Saldo: Bs.${saldo.toLocaleString()}`:'Continuar →'}
                </button>
              </div>
              {saldo>0 && (
                <div style={{fontSize:'0.7rem',color:'rgba(224,82,82,0.65)',textAlign:'center',marginTop:8}}>
                  Registra el pago completo antes de confirmar el check-out
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PASO 3: CONFIRMAR ── */}
        {paso === 'confirmar' && sel && (
          <div style={{maxWidth:560}}>
            <div className="co-limpieza-nota">
              <span style={{flexShrink:0}}>🧹</span>
              <div>
                <strong>Flujo correcto:</strong> La habitación {sel.habitacion_numero ? `Hab. ${sel.habitacion_numero}` : ''} pasará a estado <strong>Limpieza</strong> (Ocupada → Limpieza → Disponible). Housekeeping la marcará como disponible una vez que esté lista.
              </div>
            </div>

            <div className="co-panel">
              <div className="co-ph">
                <span className="co-pt">Confirmar check-out</span>
                <span className="co-pb">{sel.codigo_reserva}</span>
              </div>
              <div className="co-body">
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:10,padding:'14px 16px',marginBottom:18}}>
                  {[
                    ['Huésped',       sel.cliente_nombre],
                    ['Habitación',    sel.habitacion_numero?`Hab. ${sel.habitacion_numero}`:'—'],
                    ['Período',       `${sel.fecha_entrada} → ${sel.fecha_salida} (${noches} noche${noches!==1?'s':''})`],
                    ['Total cobrado', `Bs. ${totalFinal.toLocaleString()}`],
                    ...(cargosExtra>0?[['Cargos extra',`Bs. ${cargosExtra.toLocaleString()}`]]:[]),
                    ...(descuento>0  ?[['Descuento',   `Bs. ${descuento.toLocaleString()}`]]:[]),
                  ].map(([k,v]) => (
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <span style={{fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(240,236,228,0.28)'}}>{k}</span>
                      <span style={{fontSize:'0.8rem',color:'#f0ece4'}}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Estado verificaciones */}
                <div className="co-verif-row">
                  {[
                    {ok:llavesOk,  label:'Llaves'},
                    {ok:sinDanos,  label:'Sin daños'},
                    {ok:habitInsp, label:'Inspeccionada'},
                  ].map(({ok,label}) => (
                    <div key={label} className="co-verif-chip"
                      style={{background:ok?'rgba(82,201,122,0.08)':'rgba(255,255,255,0.03)',borderColor:ok?'rgba(82,201,122,0.3)':'rgba(255,255,255,0.08)',color:ok?'#52c97a':'rgba(240,236,228,0.3)'}}>
                      <span style={{fontSize:'0.75rem'}}>{ok?'✓':'○'}</span>
                      <span style={{fontSize:'0.68rem',fontWeight:600}}>{label}</span>
                    </div>
                  ))}
                </div>

                <div style={{marginBottom:18}}>
                  <label style={lbl}>Observaciones del check-out</label>
                  <textarea style={{...inp,resize:'vertical',minHeight:80}}
                    placeholder="Notas sobre la salida, estado general de la habitación..."
                    value={obs} onChange={e => setObs(e.target.value)} />
                </div>

                <div style={{display:'flex',gap:10}}>
                  <button className="co-btn-s" onClick={() => setPaso('revisar')}
                    style={{width:'auto',padding:'11px 20px',marginTop:0,flex:'none'}}>
                    ← Volver
                  </button>
                  <button className="co-btn-p" disabled={procesando} onClick={handleCheckout} style={{marginTop:0}}>
                    {procesando?'Procesando...':'✓ Confirmar Check-out'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 4: COMPLETADO ── */}
        {paso === 'completado' && sel && (
          <div className="co-success">
            <div className="co-suc-ico">↗</div>
            <div className="co-suc-tit">Check-out completado</div>
            <div className="co-suc-sub">La estadía ha sido cerrada correctamente</div>

            <div className="co-suc-box">
              {[
                ['Reserva',          sel.codigo_reserva],
                ['Huésped',          sel.cliente_nombre],
                ['Habitación',       sel.habitacion_numero?`Hab. ${sel.habitacion_numero}`:'—'],
                ['Fecha de salida',  new Date().toLocaleDateString('es-BO')],
                ['Estado reserva',   'Finalizada'],
                ['Estado habitación','En limpieza'],
              ].map(([k,v]) => (
                <div key={k} className="co-suc-row">
                  <label>{k}</label>
                  <span style={{color:v==='Finalizada'?'#6ab8d4':v==='En limpieza'?'#d4af6a':'#f0ece4'}}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{background:'rgba(212,175,106,0.06)',border:'1px solid rgba(212,175,106,0.15)',borderRadius:10,padding:'12px 14px',marginBottom:20,fontSize:'0.75rem',color:'rgba(212,175,106,0.8)',display:'flex',gap:8,alignItems:'flex-start',textAlign:'left'}}>
              <span>🧹</span>
              <span>La habitación está en cola de limpieza. Housekeeping debe limpiarla y marcarla como lista antes de que quede disponible para nuevas reservas.</span>
            </div>

            <div style={{display:'flex',gap:10,flexDirection:'column'}}>
              <button className="co-btn-p" onClick={resetear} style={{marginTop:0}}>Nueva salida</button>
              <button className="co-btn-s" onClick={() => navigate('/personal/housekeeping')} style={{marginTop:0}}>
                Ver cola de limpieza →
              </button>
            </div>
          </div>
        )}

      </PersonalLayout>
    </>
  )
}
