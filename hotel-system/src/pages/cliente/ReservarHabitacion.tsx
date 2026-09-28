import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'

type LocationState = {
  habitacionId: string
  fechaEntrada: string
  fechaSalida: string
  adultos: number
  precio: number
  nombreHab: string
}

type MetodoPago = { id: string; nombre: string; descripcion: string | null }
type Paso = 'form' | 'dialogo' | 'procesando' | 'exito'

type ReservaConfirmada = {
  id: string
  codigo: string
  metodoNombre: string
  anticipo: number
  total: number
}

const ReservarHabitacion = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { perfil } = useAuth()
  const state = location.state as LocationState | null
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const HORAS_LLEGADA = [
    '06:00 - 07:00', '07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00',
    '10:00 - 11:00', '11:00 - 12:00', '12:00 - 13:00', '13:00 - 14:00',
    '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00',
    '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00',
    '22:00 - 23:00', '23:00 - 00:00',
  ]

  const PETICIONES_OPCIONES = [
    { id: 'cama_extra', label: 'Cama extra', icono: '🛏' },
    { id: 'cuna_bebe', label: 'Cuna para bebé', icono: '👶' },
    { id: 'llegada_tarde', label: 'Llegada tarde (después de las 22:00)', icono: '🌙' },
    { id: 'traslado_aeropuerto', label: 'Traslado desde el aeropuerto', icono: '✈️' },
    { id: 'desayuno', label: 'Desayuno incluido', icono: '☕' },
    { id: 'habitacion_alta', label: 'Habitación en piso alto', icono: '🏢' },
    { id: 'vista_panoramica', label: 'Habitación con mejor vista', icono: '🌅' },
    { id: 'sin_alfombra', label: 'Sin alfombra (alergias)', icono: '🌿' },
  ]

  const [adultos, setAdultos] = useState(state?.adultos ?? 1)
  const [ninos, setNinos] = useState(0)
  const [horaLlegada, setHoraLlegada] = useState('')
  const [peticionesSeleccionadas, setPeticionesSeleccionadas] = useState<string[]>([])
  const [otroTexto, setOtroTexto] = useState('')
  const [metodoPagoId, setMetodoPagoId] = useState('')
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [cargando, setCargando] = useState(false)
  const [cargandoMetodos, setCargandoMetodos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [paso, setPaso] = useState<Paso>('form')
  const [countdown, setCountdown] = useState(30)
  const [reservaConfirmada, setReservaConfirmada] = useState<ReservaConfirmada | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    cargarMetodos()
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  const cargarMetodos = async () => {
    try {
      const { data } = await supabase.from('metodos_pago').select('id, nombre, descripcion').eq('activo', true)
      setMetodosPago(data ?? [])
      if (data && data.length > 0) setMetodoPagoId(data[0].id)
    } catch { } finally {
      setCargandoMetodos(false)
    }
  }

  if (!state?.habitacionId) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, fontFamily: 'Montserrat, sans-serif' }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <p style={{ color: 'rgba(240,236,228,0.4)', fontSize: '0.85rem' }}>No se seleccionó ninguna habitación.</p>
        <button onClick={() => navigate('/habitaciones')}
          style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#c9a84c,#d4af6a)', border: 'none', borderRadius: 6, color: '#0a0a0a', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.1em', fontFamily: 'Montserrat,sans-serif' }}>
          Ver habitaciones
        </button>
      </div>
    )
  }

  const noches = Math.max(1, Math.ceil(
    (new Date(state.fechaSalida).getTime() - new Date(state.fechaEntrada).getTime()) / 86400000
  ))
  const subtotal = Number(state.precio) * noches
  const anticipo = Math.round(subtotal * 0.3)
  const saldo = subtotal - anticipo

  const handleTogglePeticion = (id: string) => {
    setPeticionesSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const buildObservaciones = () => {
    const etiquetas = peticionesSeleccionadas.map(id =>
      PETICIONES_OPCIONES.find(o => o.id === id)?.label ?? id
    )
    const partes = [...etiquetas]
    if (horaLlegada) partes.unshift(`Hora de llegada: ${horaLlegada}`)
    if (otroTexto.trim()) partes.push(`Otro: ${otroTexto.trim()}`)
    return partes.length > 0 ? partes.join(' | ') : null
  }

  const iniciarDialogo = () => {
    if (!metodoPagoId) { setError('Selecciona un método de pago.'); return }
    setError(null)
    setCountdown(30)
    setPaso('dialogo')
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          setPaso('form')
          return 30
        }
        return prev - 1
      })
    }, 1000)
  }

  const cancelarDialogo = () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(30)
    setPaso('form')
  }

  const confirmarReserva = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setPaso('procesando')
    setCargando(true)
    const obsFinal = buildObservaciones()
    try {
      const { data, error: rpcErr } = await supabase.rpc('rpc_crear_reserva_cliente', {
        p_habitacion_id: state.habitacionId,
        p_fecha_entrada: state.fechaEntrada,
        p_fecha_salida: state.fechaSalida,
        p_cantidad_adultos: adultos,
        p_cantidad_ninos: ninos,
        p_observaciones: obsFinal,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      const reservaId = data?.[0]?.reserva_id ?? data?.[0]?.id ?? null
      if (!reservaId) throw new Error('No se recibió ID de reserva')

      try {
        await supabase.rpc('rpc_registrar_pago', {
          p_reserva_id: reservaId,
          p_metodo_pago_id: metodoPagoId,
          p_monto: anticipo,
          p_tipo: 'anticipo',
          p_notas: 'Anticipo 30%',
        })
      } catch { /* pago no bloquea la reserva */ }

      const metodoSel = metodosPago.find(m => m.id === metodoPagoId)
      setReservaConfirmada({
        id: reservaId,
        codigo: data?.[0]?.codigo_reserva ?? '',
        metodoNombre: metodoSel?.nombre ?? '',
        anticipo,
        total: subtotal,
      })
      setPaso('exito')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear la reserva.'
      setError(msg)
      setPaso('form')
    } finally {
      setCargando(false)
    }
  }

  const fmtFecha = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtCorta = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })

  const esQR = reservaConfirmada?.metodoNombre.toLowerCase().includes('qr') ?? false
  const esEfectivo = ['efectivo', 'cash', 'contado'].some(k =>
    reservaConfirmada?.metodoNombre.toLowerCase().includes(k)
  )

  const circumference = 2 * Math.PI * 22
  const dashOffset = circumference * (1 - countdown / 30)

  // ─── PANTALLA DE ÉXITO ─────────────────────────────────────────────────
  if (paso === 'exito' && reservaConfirmada) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Montserrat:wght@300;400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0a0a0a; }
          @keyframes fadeUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
          @keyframes ripple   { 0%{transform:scale(0.8);opacity:1} 100%{transform:scale(2.6);opacity:0} }
          @keyframes draw     { from{stroke-dashoffset:40} to{stroke-dashoffset:0} }
          @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.5} }
          .ex-root { min-height:100vh; background:#0a0a0a; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding:48px 20px 60px; font-family:'Montserrat',sans-serif; }
          .ex-card { width:100%; max-width:500px; animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
          .ex-nav { display:flex; align-items:center; gap:12px; margin-bottom:36px; }
          .ex-logo { font-family:'Cormorant Garamond',serif; font-size:1.2rem; font-weight:300; color:#d4af6a; letter-spacing:0.2em; cursor:pointer; }

          .ex-check-wrap { position:relative; width:72px; height:72px; margin:0 auto 20px; }
          .ex-ripple { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(82,201,122,0.35); animation:ripple 1.6s ease-out 0.2s both; }
          .ex-check-circle { width:72px; height:72px; border-radius:50%; background:rgba(82,201,122,0.1); border:1.5px solid rgba(82,201,122,0.35); display:flex; align-items:center; justify-content:center; position:relative; z-index:1; }
          .ex-titulo { font-family:'Cormorant Garamond',serif; font-size:2.1rem; font-weight:300; color:#f0ece4; text-align:center; margin-bottom:4px; }
          .ex-sub { font-size:0.68rem; letter-spacing:0.16em; text-transform:uppercase; color:rgba(240,236,228,0.3); text-align:center; margin-bottom:28px; }

          .ex-codigo-wrap { display:flex; justify-content:center; margin-bottom:24px; }
          .ex-codigo { display:inline-flex; flex-direction:column; align-items:center; gap:4px; background:rgba(212,175,106,0.07); border:1px solid rgba(212,175,106,0.22); border-radius:10px; padding:12px 28px; }
          .ex-codigo-label { font-size:0.58rem; letter-spacing:0.16em; text-transform:uppercase; color:rgba(212,175,106,0.45); }
          .ex-codigo-val { font-family:'Cormorant Garamond',serif; font-size:1.5rem; color:#d4af6a; letter-spacing:0.1em; }

          .ex-seccion { background:#13131a; border:1px solid rgba(212,175,106,0.09); border-radius:12px; padding:18px 20px; margin-bottom:12px; }
          .ex-seccion-label { font-size:0.57rem; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:rgba(240,236,228,0.25); margin-bottom:14px; }
          .ex-row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:9px; }
          .ex-row:last-child { margin-bottom:0; }
          .ex-rk { font-size:0.7rem; color:rgba(240,236,228,0.38); }
          .ex-rv { font-size:0.78rem; color:#f0ece4; font-weight:500; text-align:right; max-width:60%; }
          .ex-div { height:1px; background:rgba(212,175,106,0.08); margin:11px 0; }
          .ex-total { font-family:'Cormorant Garamond',serif; font-size:1.55rem; color:#d4af6a; }
          .ex-anticipo { font-size:0.88rem; color:#52c97a; font-weight:600; }

          /* QR */
          .qr-outer { display:flex; flex-direction:column; align-items:center; gap:10px; padding:10px 0; }
          .qr-frame { width:148px; height:148px; background:rgba(255,255,255,0.03); border:1px solid rgba(212,175,106,0.18); border-radius:10px; display:flex; align-items:center; justify-content:center; position:relative; }
          .qr-corner { position:absolute; width:16px; height:16px; border-color:rgba(212,175,106,0.6); border-style:solid; }
          .qr-tl { top:8px; left:8px; border-width:2px 0 0 2px; border-radius:2px 0 0 0; }
          .qr-tr { top:8px; right:8px; border-width:2px 2px 0 0; border-radius:0 2px 0 0; }
          .qr-bl { bottom:8px; left:8px; border-width:0 0 2px 2px; border-radius:0 0 0 2px; }
          .qr-br { bottom:8px; right:8px; border-width:0 2px 2px 0; border-radius:0 0 2px 0; }
          .qr-label { font-size:0.62rem; color:rgba(240,236,228,0.28); text-align:center; line-height:1.6; }
          .qr-note { font-size:0.6rem; color:rgba(240,236,228,0.18); text-align:center; margin-top:4px; }

          /* Aviso efectivo */
          .aviso { display:flex; gap:12px; align-items:flex-start; background:rgba(212,175,106,0.05); border:1px solid rgba(212,175,106,0.18); border-radius:10px; padding:16px 16px; }
          .aviso-icon { font-size:1.35rem; flex-shrink:0; }
          .aviso-title { font-size:0.75rem; font-weight:600; color:#d4af6a; margin-bottom:6px; }
          .aviso-text { font-size:0.69rem; color:rgba(240,236,228,0.48); line-height:1.65; }

          /* Ubicación */
          .ex-ubic { display:flex; gap:10px; align-items:flex-start; background:rgba(106,184,212,0.05); border:1px solid rgba(106,184,212,0.12); border-radius:10px; padding:14px 16px; margin-bottom:16px; }
          .ex-ubic-icon { font-size:1rem; flex-shrink:0; margin-top:2px; }
          .ex-ubic-text { font-size:0.69rem; color:rgba(106,184,212,0.65); line-height:1.6; }

          .ex-btns { display:flex; gap:10px; }
          .ex-btn-p { flex:1; padding:14px; background:linear-gradient(135deg,#c9a84c,#d4af6a); border:none; border-radius:8px; font-family:'Montserrat',sans-serif; font-size:0.7rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:#0a0a0a; cursor:pointer; transition:all 0.2s; }
          .ex-btn-p:hover { opacity:0.88; transform:translateY(-1px); }
          .ex-btn-s { flex:1; padding:14px; background:transparent; border:1px solid rgba(212,175,106,0.22); border-radius:8px; font-family:'Montserrat',sans-serif; font-size:0.7rem; font-weight:400; color:rgba(240,236,228,0.45); cursor:pointer; transition:all 0.2s; }
          .ex-btn-s:hover { border-color:rgba(212,175,106,0.45); color:#f0ece4; }
        `}</style>

        <div className="ex-root">
          <div className="ex-card">
            <div className="ex-nav">
              <span className="ex-logo" onClick={() => navigate('/')}>Grand Hôtel</span>
            </div>

            {/* Icono de éxito */}
            <div className="ex-check-wrap">
              <div className="ex-ripple" />
              <div className="ex-check-circle">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                  <path d="M7 15.5 L13 21.5 L23 10"
                    stroke="#52c97a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="40" strokeDashoffset="0"
                    style={{ animation: 'draw 0.5s ease 0.3s both' }}
                  />
                </svg>
              </div>
            </div>

            <h1 className="ex-titulo">¡Reserva Confirmada!</h1>
            <p className="ex-sub">Tu habitación está asegurada</p>

            {/* Código */}
            <div className="ex-codigo-wrap">
              <div className="ex-codigo">
                <span className="ex-codigo-label">Código de reserva</span>
                <span className="ex-codigo-val">{reservaConfirmada.codigo}</span>
              </div>
            </div>

            {/* Detalles */}
            <div className="ex-seccion">
              <div className="ex-seccion-label">Detalles de la reserva</div>
              <div className="ex-row">
                <span className="ex-rk">Habitación</span>
                <span className="ex-rv">{state.nombreHab}</span>
              </div>
              <div className="ex-row">
                <span className="ex-rk">Check-in</span>
                <span className="ex-rv">{fmtCorta(state.fechaEntrada)}</span>
              </div>
              <div className="ex-row">
                <span className="ex-rk">Check-out</span>
                <span className="ex-rv">{fmtCorta(state.fechaSalida)}</span>
              </div>
              <div className="ex-row">
                <span className="ex-rk">Duración</span>
                <span className="ex-rv">{noches} noche{noches !== 1 ? 's' : ''}</span>
              </div>
              <div className="ex-row">
                <span className="ex-rk">Huéspedes</span>
                <span className="ex-rv">{adultos} adulto{adultos !== 1 ? 's' : ''}{ninos > 0 ? `, ${ninos} niño${ninos !== 1 ? 's' : ''}` : ''}</span>
              </div>
              <div className="ex-div" />
              <div className="ex-row">
                <span className="ex-rk">Total</span>
                <span className="ex-total">Bs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="ex-row">
                <span className="ex-rk">Anticipo pagado (30%)</span>
                <span className="ex-anticipo">Bs. {anticipo.toLocaleString()}</span>
              </div>
              <div className="ex-row" style={{ marginTop: 4 }}>
                <span style={{ fontSize: '0.64rem', color: 'rgba(240,236,228,0.22)' }}>Saldo al llegar</span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.38)' }}>Bs. {saldo.toLocaleString()}</span>
              </div>
            </div>

            {/* Instrucciones de pago */}
            <div className="ex-seccion">
              <div className="ex-seccion-label">
                {esQR ? 'Escanea para pagar' : esEfectivo ? 'Instrucciones de pago en efectivo' : 'Instrucciones de pago'}
              </div>

              {esQR ? (
                <div className="qr-outer">
                  <div className="qr-frame">
                    <div className="qr-corner qr-tl" />
                    <div className="qr-corner qr-tr" />
                    <div className="qr-corner qr-bl" />
                    <div className="qr-corner qr-br" />
                    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
                      {/* Esquinas QR */}
                      <rect x="6" y="6" width="22" height="22" rx="2" fill="none" stroke="rgba(212,175,106,0.65)" strokeWidth="2"/>
                      <rect x="10" y="10" width="14" height="14" rx="1" fill="rgba(212,175,106,0.45)"/>
                      <rect x="82" y="6" width="22" height="22" rx="2" fill="none" stroke="rgba(212,175,106,0.65)" strokeWidth="2"/>
                      <rect x="86" y="10" width="14" height="14" rx="1" fill="rgba(212,175,106,0.45)"/>
                      <rect x="6" y="82" width="22" height="22" rx="2" fill="none" stroke="rgba(212,175,106,0.65)" strokeWidth="2"/>
                      <rect x="10" y="86" width="14" height="14" rx="1" fill="rgba(212,175,106,0.45)"/>
                      {/* Datos */}
                      {[36,41,46,51,56,61,66,71,76].flatMap((x, i) =>
                        [36,41,46,51,56,61,66,71,76].map((y, j) =>
                          (i * 3 + j) % 4 !== 0
                            ? <rect key={`${x}-${y}`} x={x} y={y} width="3.5" height="3.5" rx="0.5" fill={`rgba(212,175,106,${0.2 + ((i + j) % 3) * 0.08})`}/>
                            : null
                        )
                      )}
                      {/* Centro */}
                      <rect x="47" y="47" width="16" height="16" rx="2" fill="#13131a" stroke="rgba(212,175,106,0.3)" strokeWidth="1"/>
                      <text x="55" y="58" fill="rgba(212,175,106,0.7)" fontSize="7" textAnchor="middle" fontFamily="Montserrat,sans-serif" fontWeight="600">GH</text>
                    </svg>
                  </div>
                  <div className="qr-label">
                    Escanea con tu app bancaria<br />
                    <strong style={{ color: '#d4af6a' }}>{reservaConfirmada.codigo}</strong>
                  </div>
                  <div className="qr-note">El hotel te enviará el QR de pago real por correo electrónico.</div>
                </div>
              ) : esEfectivo ? (
                <div className="aviso">
                  <div className="aviso-icon">⏱</div>
                  <div>
                    <div className="aviso-title">Tienes 24 horas para confirmar tu pago</div>
                    <div className="aviso-text">
                      Dirígete a recepción con tu código <strong style={{ color: '#d4af6a' }}>{reservaConfirmada.codigo}</strong> y realiza el anticipo en efectivo.
                      Tu reserva permanecerá pendiente hasta confirmar el pago presencialmente.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aviso">
                  <div className="aviso-icon">📧</div>
                  <div>
                    <div className="aviso-title">El hotel se pondrá en contacto contigo</div>
                    <div className="aviso-text">
                      Recibirás instrucciones de pago por correo electrónico. Usa el código <strong style={{ color: '#d4af6a' }}>{reservaConfirmada.codigo}</strong> como referencia al comunicarte con nosotros.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ubicación */}
            <div className="ex-ubic">
              <div className="ex-ubic-icon">📍</div>
              <div className="ex-ubic-text">
                <strong style={{ color: '#6ab8d4', display: 'block', marginBottom: 2 }}>Grand Hôtel · Plaza 25 de Mayo, Sucre, Bolivia</strong>
                Recepción disponible 24/7 &nbsp;·&nbsp; +591 4 646-4646<br />
                Muestra tu código al llegar: <strong style={{ color: '#d4af6a' }}>{reservaConfirmada.codigo}</strong>
              </div>
            </div>

            <div className="ex-btns">
              <button className="ex-btn-p" onClick={() => navigate('/cliente/inicio', { state: { seccion: 'reservas' } })}>
                Ver mis reservas
              </button>
              <button className="ex-btn-s" onClick={() => navigate('/cliente/inicio')}>
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ─── FORMULARIO PRINCIPAL ──────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; color: #f0ece4; font-family: 'Montserrat', sans-serif; }
        .rv-root { min-height: 100vh; background: #0a0a0a; }
        .rv-nav { height: 64px; background: rgba(10,10,10,0.95); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(212,175,106,0.12); display: flex; align-items: center; padding: 0 32px; gap: 16px; position: sticky; top: 0; z-index: 100; }
        .rv-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 300; color: #d4af6a; letter-spacing: 0.2em; cursor: pointer; }
        .rv-back { font-size: 0.68rem; color: rgba(240,236,228,0.4); cursor: pointer; background: none; border: none; font-family: 'Montserrat',sans-serif; transition: color 0.2s; }
        .rv-back:hover { color: #d4af6a; }
        .rv-main { max-width: 960px; margin: 0 auto; padding: 40px 24px; display: grid; grid-template-columns: 1fr 360px; gap: 32px; opacity: ${visible ? '1' : '0'}; transform: translateY(${visible ? '0' : '20px'}); transition: all 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s; }
        @media (max-width: 860px) { .rv-main { grid-template-columns: 1fr; } }
        .rv-form-panel { display: flex; flex-direction: column; gap: 24px; }
        .rv-section { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 12px; padding: 24px; }
        .rv-section-title { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,236,228,0.35); margin-bottom: 20px; }
        .rv-field { margin-bottom: 18px; }
        .rv-field:last-child { margin-bottom: 0; }
        .rv-label { display: block; font-size: 0.62rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,236,228,0.4); margin-bottom: 8px; }
        .rv-input, .rv-select, .rv-textarea { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,106,0.2); border-radius: 6px; padding: 11px 14px; font-family: 'Montserrat',sans-serif; font-size: 0.82rem; color: #f0ece4; outline: none; transition: border-color 0.2s; }
        .rv-select option { background: #13131a; }
        .rv-input:focus, .rv-select:focus, .rv-textarea:focus { border-color: rgba(212,175,106,0.5); background: rgba(212,175,106,0.04); }
        .rv-textarea { resize: vertical; min-height: 80px; }
        .rv-counter { display: flex; align-items: center; gap: 16px; }
        .rv-counter-btn { width: 32px; height: 32px; background: rgba(212,175,106,0.1); border: 1px solid rgba(212,175,106,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #d4af6a; font-size: 1rem; transition: background 0.2s; font-family: 'Montserrat',sans-serif; }
        .rv-counter-btn:hover { background: rgba(212,175,106,0.2); }
        .rv-counter-val { font-size: 1rem; font-weight: 500; color: #f0ece4; min-width: 24px; text-align: center; }
        .rv-metodo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .rv-metodo-card { padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,106,0.12); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .rv-metodo-card.selected { background: rgba(212,175,106,0.1); border-color: rgba(212,175,106,0.4); }
        .rv-metodo-card:hover { border-color: rgba(212,175,106,0.25); }
        .rv-metodo-nombre { font-size: 0.75rem; font-weight: 500; color: #f0ece4; }
        .rv-metodo-tipo { font-size: 0.6rem; color: rgba(240,236,228,0.35); text-transform: capitalize; margin-top: 2px; }
        .rv-resumen { background: #13131a; border: 1px solid rgba(212,175,106,0.15); border-radius: 12px; padding: 24px; position: sticky; top: 80px; height: fit-content; }
        .rv-resumen-title { font-family: 'Cormorant Garamond',serif; font-size: 1.3rem; font-weight: 300; color: #f0ece4; margin-bottom: 4px; }
        .rv-resumen-sub { font-size: 0.62rem; color: rgba(240,236,228,0.3); letter-spacing: 0.08em; margin-bottom: 20px; }
        .rv-resumen-divider { height: 1px; background: rgba(212,175,106,0.1); margin: 16px 0; }
        .rv-resumen-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .rv-resumen-key { font-size: 0.7rem; color: rgba(240,236,228,0.45); }
        .rv-resumen-val { font-size: 0.78rem; color: #f0ece4; font-weight: 500; }
        .rv-resumen-total-key { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(240,236,228,0.5); }
        .rv-resumen-total-val { font-family: 'Cormorant Garamond',serif; font-size: 1.8rem; font-weight: 300; color: #d4af6a; }
        .rv-anticipo-note { font-size: 0.62rem; color: rgba(240,236,228,0.25); line-height: 1.6; margin-top: 8px; }
        .rv-info-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: rgba(106,184,212,0.06); border: 1px solid rgba(106,184,212,0.15); border-radius: 6px; margin-bottom: 16px; }
        .rv-info-ico { font-size: 0.9rem; flex-shrink: 0; margin-top: 1px; }
        .rv-info-text { font-size: 0.68rem; color: rgba(106,184,212,0.8); line-height: 1.6; }
        .rv-btn { width: 100%; padding: 15px; background: linear-gradient(135deg,#c9a84c,#d4af6a); border: none; border-radius: 8px; font-family: 'Montserrat',sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: all 0.2s; margin-top: 20px; }
        .rv-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .rv-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rv-error { background: rgba(224,82,82,0.08); border: 1px solid rgba(224,82,82,0.2); border-radius: 6px; padding: 12px 14px; font-size: 0.75rem; color: #e05252; margin-top: 12px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .rv-procesando { text-align: center; padding: 60px 0; }
        .rv-procesando-icon { font-size: 2.2rem; margin-bottom: 16px; display: inline-block; animation: spin 1.2s linear infinite; }
        .rv-procesando-text { font-size: 0.82rem; color: rgba(240,236,228,0.4); }

        /* Modal */
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.82); backdrop-filter:blur(10px); z-index:300; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.2s ease; }
        .modal-box { background:#13131a; border:1px solid rgba(212,175,106,0.22); border-radius:16px; padding:32px 28px; max-width:400px; width:100%; animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
        .modal-title { font-family:'Cormorant Garamond',serif; font-size:1.55rem; font-weight:300; color:#f0ece4; text-align:center; margin-bottom:5px; }
        .modal-sub { font-size:0.68rem; color:rgba(240,236,228,0.3); text-align:center; margin-bottom:22px; }
        .modal-resumen { background:rgba(212,175,106,0.05); border:1px solid rgba(212,175,106,0.1); border-radius:8px; padding:14px 16px; margin-bottom:22px; }
        .modal-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .modal-row:last-child { margin-bottom:0; }
        .modal-rk { font-size:0.68rem; color:rgba(240,236,228,0.38); }
        .modal-rv { font-size:0.74rem; color:#f0ece4; }
        .modal-countdown-wrap { display:flex; flex-direction:column; align-items:center; gap:7px; margin-bottom:22px; }
        .modal-circle-rel { position:relative; width:56px; height:56px; display:flex; align-items:center; justify-content:center; }
        .modal-svg { position:absolute; top:0; left:0; transform:rotate(-90deg); }
        .modal-track { fill:none; stroke:rgba(212,175,106,0.1); stroke-width:3; }
        .modal-bar { fill:none; stroke:#d4af6a; stroke-width:3; stroke-linecap:round; transition:stroke-dashoffset 1s linear; }
        .modal-num { font-family:'Cormorant Garamond',serif; font-size:1.35rem; color:#d4af6a; line-height:1; position:relative; z-index:1; }
        .modal-hint { font-size:0.6rem; color:rgba(240,236,228,0.22); letter-spacing:0.08em; }
        .modal-btns { display:flex; gap:10px; }
        .modal-btn-c { flex:1; padding:13px; background:transparent; border:1px solid rgba(212,175,106,0.2); border-radius:8px; font-family:'Montserrat',sans-serif; font-size:0.68rem; color:rgba(240,236,228,0.42); cursor:pointer; transition:all 0.2s; }
        .modal-btn-c:hover { border-color:rgba(212,175,106,0.4); color:#f0ece4; }
        .modal-btn-ok { flex:2; padding:13px; background:linear-gradient(135deg,#c9a84c,#d4af6a); border:none; border-radius:8px; font-family:'Montserrat',sans-serif; font-size:0.7rem; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#0a0a0a; cursor:pointer; transition:opacity 0.2s; }
        .modal-btn-ok:hover { opacity:0.88; }
      `}</style>

      {/* Modal de confirmación con cuenta regresiva */}
      {paso === 'dialogo' && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title">¿Confirmar reserva?</div>
            <div className="modal-sub">Revisa los datos antes de continuar</div>

            <div className="modal-resumen">
              <div className="modal-row">
                <span className="modal-rk">Habitación</span>
                <span className="modal-rv">{state.nombreHab}</span>
              </div>
              <div className="modal-row">
                <span className="modal-rk">Check-in</span>
                <span className="modal-rv">{fmtCorta(state.fechaEntrada)}</span>
              </div>
              <div className="modal-row">
                <span className="modal-rk">Check-out</span>
                <span className="modal-rv">{fmtCorta(state.fechaSalida)}</span>
              </div>
              <div style={{ height: 1, background: 'rgba(212,175,106,0.1)', margin: '10px 0' }} />
              <div className="modal-row">
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(240,236,228,0.5)' }}>Anticipo (30%)</span>
                <span style={{ fontSize: '0.9rem', color: '#d4af6a', fontWeight: 600 }}>Bs. {anticipo.toLocaleString()}</span>
              </div>
            </div>

            <div className="modal-countdown-wrap">
              <div className="modal-circle-rel">
                <svg className="modal-svg" width="56" height="56" viewBox="0 0 56 56">
                  <circle className="modal-track" cx="28" cy="28" r="22" />
                  <circle className="modal-bar" cx="28" cy="28" r="22"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <span className="modal-num">{countdown}</span>
              </div>
              <span className="modal-hint">segundos para confirmar</span>
            </div>

            <div className="modal-btns">
              <button className="modal-btn-c" onClick={cancelarDialogo}>Cancelar</button>
              <button className="modal-btn-ok" onClick={confirmarReserva}>Sí, confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="rv-root">
        <nav className="rv-nav">
          <span className="rv-logo" onClick={() => navigate('/')}>Grand Hôtel</span>
          <button className="rv-back" onClick={() => navigate(-1)}>← Volver</button>
        </nav>

        <div className="rv-main">
          <div className="rv-form-panel">
            <div>
              <h1 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2rem', fontWeight: 300, color: '#f0ece4', marginBottom: 6 }}>
                Confirmar reserva
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'rgba(240,236,228,0.35)' }}>{state.nombreHab}</p>
            </div>

            {paso === 'procesando' ? (
              <div className="rv-section rv-procesando">
                <div className="rv-procesando-icon">⚙️</div>
                <div className="rv-procesando-text">Procesando tu reserva...</div>
              </div>
            ) : (
              <>
                {/* Huéspedes */}
                <div className="rv-section">
                  <div className="rv-section-title">Número de huéspedes</div>
                  <div className="rv-field">
                    <span className="rv-label">Adultos</span>
                    <div className="rv-counter">
                      <button className="rv-counter-btn" onClick={() => setAdultos(Math.max(1, adultos - 1))}>−</button>
                      <span className="rv-counter-val">{adultos}</span>
                      <button className="rv-counter-btn" onClick={() => setAdultos(Math.min(6, adultos + 1))}>+</button>
                    </div>
                  </div>
                  <div className="rv-field">
                    <span className="rv-label">Niños (0–12 años)</span>
                    <div className="rv-counter">
                      <button className="rv-counter-btn" onClick={() => setNinos(Math.max(0, ninos - 1))}>−</button>
                      <span className="rv-counter-val">{ninos}</span>
                      <button className="rv-counter-btn" onClick={() => setNinos(Math.min(4, ninos + 1))}>+</button>
                    </div>
                  </div>
                </div>

                {/* Hora de llegada */}
                <div className="rv-section">
                  <div className="rv-section-title">Hora estimada de llegada (opcional)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {HORAS_LLEGADA.map(h => (
                      <div key={h} onClick={() => setHoraLlegada(horaLlegada === h ? '' : h)}
                        style={{
                          padding: '10px 8px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                          fontSize: '0.68rem', fontWeight: 500, transition: 'all 0.18s',
                          background: horaLlegada === h ? 'rgba(212,175,106,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${horaLlegada === h ? 'rgba(212,175,106,0.45)' : 'rgba(212,175,106,0.1)'}`,
                          color: horaLlegada === h ? '#d4af6a' : 'rgba(240,236,228,0.55)',
                        }}>
                        🕐 {h}
                      </div>
                    ))}
                  </div>
                  {horaLlegada && (
                    <div style={{ marginTop: 10, fontSize: '0.68rem', color: '#52c97a' }}>
                      ✓ Llegarás entre las {horaLlegada}
                    </div>
                  )}
                </div>

                {/* Método de pago */}
                <div className="rv-section">
                  <div className="rv-section-title">Método de pago (anticipo 30%)</div>
                  <div className="rv-info-row">
                    <span className="rv-info-ico">ℹ️</span>
                    <span className="rv-info-text">Se cobra un anticipo del 30% al confirmar. El saldo restante se paga al llegar.</span>
                  </div>
                  {cargandoMetodos ? (
                    <div style={{ height: 60, background: 'rgba(255,255,255,0.04)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
                  ) : (
                    <div className="rv-metodo-grid">
                      {metodosPago.map(m => (
                        <div key={m.id}
                          className={`rv-metodo-card ${metodoPagoId === m.id ? 'selected' : ''}`}
                          onClick={() => setMetodoPagoId(m.id)}>
                          <div className="rv-metodo-nombre">{m.nombre}</div>
                          <div className="rv-metodo-tipo">{m.descripcion}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Peticiones especiales */}
                <div className="rv-section">
                  <div className="rv-section-title">Peticiones especiales (opcional)</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.35)', marginBottom: 14, lineHeight: 1.6 }}>
                    Selecciona lo que necesitas. El hotel hará todo lo posible para satisfacer tu solicitud.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {PETICIONES_OPCIONES.map(op => {
                      const sel = peticionesSeleccionadas.includes(op.id)
                      return (
                        <div key={op.id} onClick={() => handleTogglePeticion(op.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                            background: sel ? 'rgba(212,175,106,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${sel ? 'rgba(212,175,106,0.4)' : 'rgba(212,175,106,0.12)'}`,
                            borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                          }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                            border: `1.5px solid ${sel ? '#d4af6a' : 'rgba(212,175,106,0.3)'}`,
                            background: sel ? '#d4af6a' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', color: '#0a0a0a',
                          }}>{sel ? '✓' : ''}</div>
                          <span style={{ fontSize: '0.7rem' }}>{op.icono} {op.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <label className="rv-label">Otro (describir)</label>
                  <textarea className="rv-textarea"
                    value={otroTexto}
                    onChange={e => setOtroTexto(e.target.value)}
                    placeholder="Escribe cualquier otra solicitud especial..."
                    style={{ minHeight: 64 }}
                  />
                  {(peticionesSeleccionadas.length > 0 || otroTexto) && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(82,201,122,0.06)', border: '1px solid rgba(82,201,122,0.15)', borderRadius: 6 }}>
                      <span style={{ fontSize: '0.62rem', color: '#52c97a' }}>
                        ✓ {peticionesSeleccionadas.length} petición{peticionesSeleccionadas.length !== 1 ? 'es' : ''} seleccionada{peticionesSeleccionadas.length !== 1 ? 's' : ''}{otroTexto ? ' + nota adicional' : ''}. El hotel te contactará para confirmar.
                      </span>
                    </div>
                  )}
                </div>

                {error && <div className="rv-error">{error}</div>}
              </>
            )}
          </div>

          {/* Panel lateral de resumen */}
          <div className="rv-resumen">
            <div className="rv-resumen-title">{state.nombreHab}</div>
            <div className="rv-resumen-sub">Resumen de tu reserva</div>
            <div className="rv-resumen-divider" />
            <div className="rv-resumen-row">
              <span className="rv-resumen-key">Check-in</span>
              <span className="rv-resumen-val">{fmtFecha(state.fechaEntrada)}</span>
            </div>
            <div className="rv-resumen-row">
              <span className="rv-resumen-key">Check-out</span>
              <span className="rv-resumen-val">{fmtFecha(state.fechaSalida)}</span>
            </div>
            <div className="rv-resumen-row">
              <span className="rv-resumen-key">Duración</span>
              <span className="rv-resumen-val">{noches} noche{noches !== 1 ? 's' : ''}</span>
            </div>
            <div className="rv-resumen-row">
              <span className="rv-resumen-key">Huéspedes</span>
              <span className="rv-resumen-val">{adultos} adulto{adultos !== 1 ? 's' : ''}{ninos > 0 ? `, ${ninos} niño${ninos !== 1 ? 's' : ''}` : ''}</span>
            </div>
            <div className="rv-resumen-divider" />
            <div className="rv-resumen-row">
              <span className="rv-resumen-key">Precio/noche</span>
              <span className="rv-resumen-val">Bs. {Number(state.precio).toLocaleString()}</span>
            </div>
            <div className="rv-resumen-row">
              <span className="rv-resumen-key">Subtotal ({noches} noches)</span>
              <span className="rv-resumen-val">Bs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="rv-resumen-divider" />
            <div className="rv-resumen-row">
              <span className="rv-resumen-total-key">Total</span>
              <span className="rv-resumen-total-val">Bs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="rv-resumen-row" style={{ marginTop: 8 }}>
              <span className="rv-resumen-key">Anticipo (30%)</span>
              <span className="rv-resumen-val" style={{ color: '#d4af6a' }}>Bs. {anticipo.toLocaleString()}</span>
            </div>
            <p className="rv-anticipo-note">
              El anticipo asegura tu reserva. El saldo de Bs. {saldo.toLocaleString()} se paga al llegar.
            </p>

            <button className="rv-btn" onClick={iniciarDialogo}
              disabled={cargando || !metodoPagoId || paso === 'procesando'}>
              {paso === 'procesando' ? 'Procesando...' : 'Confirmar reserva'}
            </button>

            <p style={{ fontSize: '0.62rem', color: 'rgba(240,236,228,0.2)', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
              Al confirmar aceptas nuestras políticas de reserva y cancelación.
            </p>

            {perfil && (
              <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(82,201,122,0.06)', border: '1px solid rgba(82,201,122,0.15)', borderRadius: 6 }}>
                <div style={{ fontSize: '0.62rem', color: 'rgba(82,201,122,0.7)', marginBottom: 2 }}>Reservando como</div>
                <div style={{ fontSize: '0.75rem', color: '#f0ece4' }}>{perfil.nombre_completo}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.35)' }}>{perfil.correo}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default ReservarHabitacion
