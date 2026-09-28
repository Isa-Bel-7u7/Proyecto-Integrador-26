import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PersonalLayout from '../../components/PersonalLayout'
import {
  getReservas, confirmarReserva, cancelarReserva, marcarNoShow,
  buscarClientes, getReservaDetalle, getHabitacionesDisponibles,
  getMetodosPago, registrarPagoReserva, getUltimaReservaCliente,
} from '../../services/api'
import type { ClienteBusqueda, ReservaDetalle } from '../../services/api'
import { supabase } from '../../services/supabase'

const EC: Record<string, { bg: string; text: string; label: string }> = {
  pendiente:  { bg: 'rgba(212,175,106,0.12)', text: '#d4af6a', label: 'Pendiente'  },
  confirmada: { bg: 'rgba(82,201,122,0.12)',  text: '#52c97a', label: 'Confirmada' },
  en_estadia: { bg: 'rgba(106,184,212,0.12)', text: '#6ab8d4', label: 'En estadía' },
  finalizada: { bg: 'rgba(160,160,180,0.12)', text: '#a0a0b4', label: 'Finalizada' },
  cancelada:  { bg: 'rgba(212,100,100,0.12)', text: '#d46464', label: 'Cancelada'  },
  no_show:    { bg: 'rgba(180,100,180,0.12)', text: '#b464b4', label: 'No show'    },
}

type ReservaRow = {
  reserva_id: string; codigo_reserva: string; cliente_nombre: string; cliente_correo: string
  fecha_entrada: string; fecha_salida: string; estado: string; origen: string
  total_estimado: number; cantidad_habitaciones: number
}
type HabDisp = {
  habitacion_id?: string; id?: string; numero: string
  nombre_tipo?: string; tipo?: string; precio_base?: number; precio?: number
}

const inputS: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,106,0.2)',
  borderRadius: 8, padding: '11px 14px', fontFamily: 'Montserrat,sans-serif',
  fontSize: '0.82rem', fontWeight: 300, color: '#f0ece4', outline: 'none',
}
const labelS: React.CSSProperties = {
  fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'rgba(240,236,228,0.35)', display: 'block', marginBottom: 7,
}

const Pill = ({ estado }: { estado: string }) => {
  const c = EC[estado] ?? EC.pendiente
  return (
    <span style={{ display:'inline-block', fontSize:'0.62rem', fontWeight:600, letterSpacing:'0.1em',
      textTransform:'uppercase', padding:'4px 10px', borderRadius:20, background:c.bg, color:c.text }}>
      {c.label}
    </span>
  )
}

export default function Reservas() {
  const navigate = useNavigate()

  // ── Lista ──────────────────────────────────────────────────────────────────
  const [reservas, setReservas]   = useState<ReservaRow[]>([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtro, setFiltro]       = useState('todos')
  const [errorLista, setErrorLista] = useState<string | null>(null)

  // ── Panel detalle ──────────────────────────────────────────────────────────
  const [panelId, setPanelId]               = useState<string | null>(null)   // qué fila está abierta
  const [detalle, setDetalle]               = useState<ReservaDetalle | null>(null)
  const [cargandoDet, setCargandoDet]       = useState(false)
  const [errorDet, setErrorDet]             = useState<string | null>(null)
  const [procesando, setProcesando]         = useState(false)
  const [mostrarCancel, setMostrarCancel]   = useState(false)
  const [motivoCancel, setMotivoCancel]     = useState('')

  // ── Modal nueva reserva ────────────────────────────────────────────────────
  const [modalNueva, setModalNueva]           = useState(false)
  const [pasoModal, setPasoModal]             = useState<'form'|'pago'|'exito'>('form')
  // búsqueda cliente
  const [clienteQuery, setClienteQuery]       = useState('')
  const [clienteResults, setClienteResults]   = useState<ClienteBusqueda[]>([])
  const [buscarCarg, setBuscarCarg]           = useState(false)
  const [clienteSel, setClienteSel]           = useState<ClienteBusqueda | null>(null)
  const [mostrarDrop, setMostrarDrop]         = useState(false)
  // campos reserva
  const [formClienteId, setFormClienteId]     = useState('')
  const [formHabId, setFormHabId]             = useState('')
  const [formFE, setFormFE]                   = useState('')
  const [formFS, setFormFS]                   = useState('')
  const [formAdultos, setFormAdultos]         = useState(1)
  const [formNinos, setFormNinos]             = useState(0)
  const [formObs, setFormObs]                 = useState('')
  const [habitacionesDisp, setHabsDisp]       = useState<HabDisp[]>([])
  const [buscandoHabs, setBuscandoHabs]       = useState(false)
  const [procesandoNueva, setProcNueva]       = useState(false)
  const [errorNueva, setErrorNueva]           = useState<string | null>(null)
  // paso pago
  const [metodosPago, setMetodosPago]         = useState<{id:string; nombre:string}[]>([])
  const [nuevaReservaId, setNuevaReservaId]   = useState('')
  const [nuevaReservaTotal, setNuevaTotal]    = useState(0)
  const [montoPago, setMontoPago]             = useState(0)
  const [metodoPagoId, setMetodoPagoId]       = useState('')
  const [procesandoPago, setProcPago]         = useState(false)
  const [errorPago, setErrorPago]             = useState<string | null>(null)

  // ── Cargar reservas ────────────────────────────────────────────────────────
  const cargarReservas = useCallback(async () => {
    setCargando(true); setErrorLista(null)
    try { setReservas((await getReservas()) as ReservaRow[]) }
    catch { setErrorLista('No se pudieron cargar las reservas.') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargarReservas() }, [cargarReservas])

  // ── Búsqueda de clientes (debounce 300ms) ─────────────────────────────────
  useEffect(() => {
    if (clienteQuery.length < 2) { setClienteResults([]); return }
    setBuscarCarg(true)
    const t = setTimeout(async () => {
      try { setClienteResults(await buscarClientes(clienteQuery)) }
      catch { setClienteResults([]) }
      finally { setBuscarCarg(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [clienteQuery])

  // ── Abrir panel con detalle ────────────────────────────────────────────────
  const verDetalle = async (id: string) => {
    setPanelId(id); setCargandoDet(true); setDetalle(null)
    setMostrarCancel(false); setMotivoCancel(''); setErrorDet(null)
    try { setDetalle(await getReservaDetalle(id)) }
    catch (e: unknown) { setErrorDet((e as Error).message) }
    finally { setCargandoDet(false) }
  }
  const cerrarPanel = () => { setPanelId(null); setDetalle(null); setMostrarCancel(false) }

  // ── Acciones desde el panel ───────────────────────────────────────────────
  const handleConfirmar = async () => {
    if (!detalle) return
    setProcesando(true); setErrorDet(null)
    try {
      await confirmarReserva(detalle.id)
      await cargarReservas()
      setDetalle(prev => prev ? { ...prev, estado: 'confirmada' } : null)
    } catch (e: unknown) { setErrorDet((e as Error).message) }
    finally { setProcesando(false) }
  }

  const handleCancelar = async () => {
    if (!detalle || !motivoCancel.trim()) return
    setProcesando(true); setErrorDet(null)
    try {
      await cancelarReserva(detalle.id, motivoCancel.trim())
      await cargarReservas()
      setDetalle(prev => prev ? { ...prev, estado: 'cancelada', motivo_cancelacion: motivoCancel.trim() } : null)
      setMostrarCancel(false)
    } catch (e: unknown) { setErrorDet((e as Error).message) }
    finally { setProcesando(false) }
  }

  const handleNoShow = async () => {
    if (!detalle) return
    setProcesando(true); setErrorDet(null)
    try {
      await marcarNoShow(detalle.id)
      await cargarReservas()
      setDetalle(prev => prev ? { ...prev, estado: 'no_show', motivo_cancelacion: 'No se presentó (No Show)' } : null)
    } catch (e: unknown) { setErrorDet((e as Error).message) }
    finally { setProcesando(false) }
  }

  // ── Modal nueva reserva ────────────────────────────────────────────────────
  const abrirModal = async () => {
    setModalNueva(true); setPasoModal('form'); setErrorNueva(null)
    setFormClienteId(''); setFormHabId(''); setFormFE(''); setFormFS('')
    setFormAdultos(1); setFormNinos(0); setFormObs('')
    setHabsDisp([]); setClienteQuery(''); setClienteSel(null)
    setClienteResults([]); setMostrarDrop(false)
    setMontoPago(0); setMetodoPagoId(''); setErrorPago(null)
    try { setMetodosPago(await getMetodosPago()) } catch { /* silencioso */ }
  }

  const seleccionarCliente = (c: ClienteBusqueda) => {
    setClienteSel(c); setFormClienteId(c.id); setMostrarDrop(false); setClienteQuery('')
  }

  const buscarHabs = async () => {
    if (!formFE || !formFS) return
    setBuscandoHabs(true)
    try { setHabsDisp(await getHabitacionesDisponibles(formFE, formFS)) }
    catch { /* silencioso */ }
    finally { setBuscandoHabs(false) }
  }

  // Calcular total estimado con los datos del formulario
  const calcularTotal = (): number => {
    const hab = habitacionesDisp.find(h => (h.habitacion_id ?? h.id) === formHabId)
    const precio = hab?.precio_base ?? hab?.precio ?? 0
    if (!formFE || !formFS || !precio) return 0
    const noches = Math.max(
      Math.ceil((new Date(formFS).getTime() - new Date(formFE).getTime()) / 86400000), 0
    )
    return precio * noches
  }

  const handleCrearReserva = async () => {
    if (!formClienteId || !formHabId || !formFE || !formFS) return
    setProcNueva(true); setErrorNueva(null)
    try {
      const { error } = await supabase.rpc('rpc_crear_reserva_cliente', {
        p_cliente_id: formClienteId, p_habitacion_id: formHabId,
        p_fecha_entrada: formFE, p_fecha_salida: formFS,
        p_cantidad_adultos: formAdultos, p_cantidad_ninos: formNinos,
        p_origen: 'recepcion', p_observaciones: formObs || null,
      })
      if (error) throw error

      // Obtener la reserva recién creada para el paso de pago
      const res = await getUltimaReservaCliente(formClienteId)
      const total = res?.total_estimado ?? calcularTotal()
      setNuevaReservaId(res?.id ?? '')
      setNuevaTotal(total)
      setMontoPago(Math.round(total * 0.3))  // 30% por defecto

      await cargarReservas()
      setPasoModal('pago')
    } catch (e: unknown) {
      setErrorNueva((e as Error)?.message ?? 'Error al crear la reserva.')
    } finally { setProcNueva(false) }
  }

  const handleRegistrarPago = async () => {
    if (!nuevaReservaId || !metodoPagoId || montoPago <= 0) return
    setProcPago(true); setErrorPago(null)
    try {
      const tipoP = montoPago >= nuevaReservaTotal ? 'pago_total' : 'anticipo'
      await registrarPagoReserva(nuevaReservaId, montoPago, metodoPagoId, tipoP)
      await cargarReservas()
      setPasoModal('exito')
      setTimeout(() => { setModalNueva(false); setPasoModal('form') }, 2000)
    } catch (e: unknown) {
      setErrorPago((e as Error)?.message ?? 'Error al registrar el pago.')
    } finally { setProcPago(false) }
  }

  const omitirPago = () => {
    setPasoModal('exito')
    setTimeout(() => { setModalNueva(false); setPasoModal('form') }, 1800)
  }

  // ── Tabla filtrada ─────────────────────────────────────────────────────────
  const filas = reservas.filter(r => {
    const q = busqueda.toLowerCase()
    return (filtro === 'todos' || r.estado === filtro) &&
      (!busqueda || r.codigo_reserva?.toLowerCase().includes(q) || r.cliente_nombre?.toLowerCase().includes(q))
  })

  const saldo = detalle ? Math.max(0, Number(detalle.total_estimado) - Number(detalle.total_pagado)) : 0
  const minPago30 = Math.round(nuevaReservaTotal * 0.3)

  return (
    <>
      <style>{`
        .rv-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
        .rv-search { flex:1; min-width:220px; position:relative; }
        .rv-search input { width:100%; background:#13131a; border:1px solid rgba(212,175,106,0.15); border-radius:8px; padding:10px 16px 10px 38px; font-family:'Montserrat',sans-serif; font-size:0.8rem; color:#f0ece4; outline:none; }
        .rv-search input:focus { border-color:rgba(212,175,106,0.4); }
        .rv-search input::placeholder { color:rgba(240,236,228,0.25); }
        .rv-ico { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:rgba(240,236,228,0.3); }
        .rv-ftabs { display:flex; gap:6px; flex-wrap:wrap; }
        .rv-ftab { padding:8px 14px; border-radius:8px; font-size:0.7rem; font-weight:500; cursor:pointer; border:1px solid rgba(212,175,106,0.15); background:transparent; color:rgba(240,236,228,0.45); font-family:'Montserrat',sans-serif; transition:all 0.2s; }
        .rv-ftab.act { background:rgba(212,175,106,0.12); border-color:rgba(212,175,106,0.35); color:#d4af6a; }
        .rv-btn-nueva { padding:10px 18px; border-radius:8px; background:linear-gradient(135deg,#c9a84c,#d4af6a); border:none; cursor:pointer; font-family:'Montserrat',sans-serif; font-size:0.72rem; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#0a0a0a; white-space:nowrap; }
        .rv-tabla { background:#13131a; border:1px solid rgba(212,175,106,0.1); border-radius:12px; overflow:hidden; }
        .rv-tabla-hdr { padding:16px 20px; border-bottom:1px solid rgba(212,175,106,0.07); display:flex; align-items:center; justify-content:space-between; }
        .rv-tabla-tit { font-size:0.72rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:rgba(240,236,228,0.5); }
        .rv-cnt { font-size:0.68rem; background:rgba(212,175,106,0.1); color:#d4af6a; padding:3px 10px; border-radius:20px; }
        table.rv { width:100%; border-collapse:collapse; }
        table.rv thead th { font-size:0.62rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:rgba(240,236,228,0.25); text-align:left; padding:12px 20px; border-bottom:1px solid rgba(255,255,255,0.04); }
        table.rv tbody tr { border-bottom:1px solid rgba(255,255,255,0.03); cursor:pointer; transition:background 0.15s; }
        table.rv tbody tr:last-child { border-bottom:none; }
        table.rv tbody tr:hover { background:rgba(212,175,106,0.05); }
        table.rv tbody td { padding:13px 20px; font-size:0.78rem; color:rgba(240,236,228,0.7); vertical-align:middle; }
        .rv-skel { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:rvs 1.5s infinite; border-radius:4px; }
        @keyframes rvs { 0%{background-position:200% 0}100%{background-position:-200% 0} }
        .rv-empty { padding:60px 20px; text-align:center; color:rgba(240,236,228,0.2); font-size:0.85rem; }
        .rv-err { background:rgba(224,82,82,0.08); border:1px solid rgba(224,82,82,0.2); border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:0.78rem; color:#e05252; }
        /* Panel */
        .rv-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:300; backdrop-filter:blur(4px); }
        .rv-panel { position:fixed; top:0; right:0; bottom:0; width:480px; max-width:95vw; background:#111118; border-left:1px solid rgba(212,175,106,0.15); z-index:301; display:flex; flex-direction:column; }
        .rv-panel-hdr { padding:22px 24px 16px; border-bottom:1px solid rgba(212,175,106,0.08); flex-shrink:0; display:flex; align-items:flex-start; gap:12px; }
        .rv-panel-body { flex:1; padding:20px 24px; overflow-y:auto; }
        .rv-panel-body::-webkit-scrollbar { width:3px; }
        .rv-panel-body::-webkit-scrollbar-thumb { background:rgba(212,175,106,0.2); }
        .rv-panel-foot { padding:16px 24px; border-top:1px solid rgba(212,175,106,0.08); flex-shrink:0; }
        .rv-sec-lbl { font-size:0.58rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:rgba(212,175,106,0.5); margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid rgba(212,175,106,0.07); }
        .rv-fld { margin-bottom:10px; }
        .rv-fld-l { font-size:0.58rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:rgba(240,236,228,0.28); margin-bottom:3px; }
        .rv-fld-v { font-size:0.82rem; color:#f0ece4; }
        .rv-hab-row { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px 14px; margin-bottom:8px; }
        .rv-pago-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .rv-pago-row:last-child { border-bottom:none; }
        .rv-saldo { background:rgba(212,175,106,0.06); border:1px solid rgba(212,175,106,0.2); border-radius:8px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; margin-top:10px; }
        .rv-motivo { background:rgba(212,100,100,0.08); border:1px solid rgba(212,100,100,0.2); border-radius:8px; padding:12px 16px; margin-bottom:16px; }
        .rv-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .rv-btn { padding:9px 16px; border-radius:8px; font-family:'Montserrat',sans-serif; font-size:0.68rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; border:1px solid; transition:all 0.2s; }
        .rv-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .rv-btn-gold { background:linear-gradient(135deg,#c9a84c,#d4af6a); border-color:transparent; color:#0a0a0a; }
        .rv-btn-green { background:rgba(82,201,122,0.1); border-color:rgba(82,201,122,0.3); color:#52c97a; }
        .rv-btn-green:hover:not(:disabled) { background:rgba(82,201,122,0.18); }
        .rv-btn-red { background:rgba(212,100,100,0.1); border-color:rgba(212,100,100,0.3); color:#d46464; }
        .rv-btn-red:hover:not(:disabled) { background:rgba(212,100,100,0.18); }
        .rv-btn-purple { background:rgba(180,100,180,0.1); border-color:rgba(180,100,180,0.3); color:#b464b4; }
        .rv-btn-purple:hover:not(:disabled) { background:rgba(180,100,180,0.18); }
        .rv-btn-ghost { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.1); color:rgba(240,236,228,0.5); }
        /* Modal */
        .rv-moverlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
        .rv-modal { background:#13131a; border:1px solid rgba(212,175,106,0.2); border-radius:16px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; }
        .rv-modal::-webkit-scrollbar { width:3px; }
        .rv-modal::-webkit-scrollbar-thumb { background:rgba(212,175,106,0.2); }
        .rv-modal-hdr { padding:22px 24px 14px; border-bottom:1px solid rgba(212,175,106,0.08); display:flex; align-items:flex-start; justify-content:space-between; }
        .rv-modal-body { padding:20px 24px 24px; }
        .rv-close { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:rgba(240,236,228,0.5); }
        .rv-drop { position:absolute; top:calc(100% + 4px); left:0; right:0; background:#1a1a28; border:1px solid rgba(212,175,106,0.2); border-radius:8px; max-height:220px; overflow-y:auto; z-index:10; box-shadow:0 8px 24px rgba(0,0,0,0.5); }
        .rv-drop-item { padding:10px 14px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.15s; }
        .rv-drop-item:hover { background:rgba(212,175,106,0.08); }
        .rv-drop-item:last-child { border-bottom:none; }
        .rv-pago-min { font-size:0.68rem; color:rgba(212,175,106,0.7); margin-top:5px; }
        .rv-slider { width:100%; accent-color:#d4af6a; height:4px; margin:8px 0 4px; cursor:pointer; }
        .rv-pago-opts { display:flex; gap:8px; margin-bottom:12px; }
        .rv-pago-opt { flex:1; padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:transparent; font-family:'Montserrat',sans-serif; font-size:0.68rem; font-weight:600; color:rgba(240,236,228,0.5); cursor:pointer; text-align:center; transition:all 0.2s; }
        .rv-pago-opt.sel { background:rgba(212,175,106,0.12); border-color:rgba(212,175,106,0.35); color:#d4af6a; }
      `}</style>

      <PersonalLayout titulo="Reservas" subtitulo="Gestión de reservas">

        {errorLista && <div className="rv-err">{errorLista}</div>}

        {/* Toolbar */}
        <div className="rv-toolbar">
          <div className="rv-search">
            <span className="rv-ico">🔍</span>
            <input placeholder="Buscar por código o cliente..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="rv-ftabs">
            {[
              {k:'todos',      l:'Todos'},
              {k:'pendiente',  l:'Pendientes'},
              {k:'confirmada', l:'Confirmadas'},
              {k:'en_estadia', l:'En estadía'},
              {k:'finalizada', l:'Finalizadas'},
              {k:'cancelada',  l:'Canceladas'},
              {k:'no_show',    l:'No show'},
            ].map(f => (
              <button key={f.k} className={`rv-ftab ${filtro === f.k ? 'act':''}`}
                onClick={() => setFiltro(f.k)}>{f.l}
              </button>
            ))}
          </div>
          <button className="rv-btn-nueva" onClick={abrirModal}>+ Nueva reserva</button>
        </div>

        {/* Tabla */}
        <div className="rv-tabla">
          <div className="rv-tabla-hdr">
            <span className="rv-tabla-tit">Lista de reservas</span>
            <span className="rv-cnt">{filas.length} resultados</span>
          </div>
          <table className="rv">
            <thead>
              <tr>
                <th>Código</th><th>Cliente</th><th>Entrada</th><th>Salida</th>
                <th>Total</th><th>Estado</th><th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {cargando
                ? Array.from({length:5}).map((_,i) => (
                    <tr key={i}>{Array.from({length:7}).map((__,j) => (
                      <td key={j}><div className="rv-skel" style={{height:14,width:'80%'}} /></td>
                    ))}</tr>
                  ))
                : filas.length === 0
                  ? <tr><td colSpan={7}><div className="rv-empty">
                      {busqueda || filtro !== 'todos' ? 'Sin resultados para ese criterio' : 'No hay reservas aún'}
                    </div></td></tr>
                  : filas.map(r => (
                    <tr key={r.reserva_id} onClick={() => verDetalle(r.reserva_id)}
                      style={{ background: panelId === r.reserva_id ? 'rgba(212,175,106,0.07)' : undefined }}>
                      <td style={{fontFamily:'Cormorant Garamond,serif',fontSize:'0.9rem',color:'#d4af6a'}}>{r.codigo_reserva}</td>
                      <td>
                        <div style={{fontWeight:600,fontSize:'0.8rem',color:'#f0ece4'}}>{r.cliente_nombre}</div>
                        <div style={{fontSize:'0.7rem',color:'rgba(240,236,228,0.35)',marginTop:2}}>{r.cliente_correo}</div>
                      </td>
                      <td>{r.fecha_entrada}</td>
                      <td>{r.fecha_salida}</td>
                      <td style={{color:'#d4af6a',fontFamily:'Cormorant Garamond,serif',fontSize:'0.95rem'}}>
                        Bs. {r.total_estimado}
                      </td>
                      <td><Pill estado={r.estado} /></td>
                      <td style={{textTransform:'capitalize',fontSize:'0.72rem'}}>{r.origen}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </PersonalLayout>

      {/* ══ PANEL DETALLE ══════════════════════════════════════════════════════ */}
      {panelId && (
        <>
          <div className="rv-overlay" onClick={cerrarPanel} />
          <div className="rv-panel">

            <div className="rv-panel-hdr">
              <div style={{flex:1}}>
                {cargandoDet ? (
                  <>
                    <div className="rv-skel" style={{height:28,width:170,marginBottom:8}} />
                    <div className="rv-skel" style={{height:22,width:110}} />
                  </>
                ) : detalle ? (
                  <>
                    <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.5rem',color:'#d4af6a',lineHeight:1,marginBottom:6}}>
                      {detalle.codigo_reserva}
                    </div>
                    <Pill estado={detalle.estado} />
                  </>
                ) : (
                  <div style={{fontSize:'0.82rem',color:'rgba(240,236,228,0.4)'}}>Cargando detalle...</div>
                )}
              </div>
              <button className="rv-close" onClick={cerrarPanel}>✕</button>
            </div>

            <div className="rv-panel-body">
              {cargandoDet && (
                Array.from({length:10}).map((_,i) => (
                  <div key={i} className="rv-skel" style={{height:14,marginBottom:10,width:`${55+(i%4)*12}%`}} />
                ))
              )}

              {!cargandoDet && errorDet && (
                <div className="rv-err">{errorDet}</div>
              )}

              {!cargandoDet && detalle && (
                <>
                  {/* Motivo cancelación */}
                  {['cancelada','no_show'].includes(detalle.estado) && detalle.motivo_cancelacion && (
                    <div className="rv-motivo">
                      <div style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(212,100,100,0.7)',marginBottom:5}}>
                        {detalle.estado === 'no_show' ? 'Motivo no-show' : 'Motivo de cancelación'}
                      </div>
                      <div style={{fontSize:'0.82rem',color:'#f0ece4'}}>{detalle.motivo_cancelacion}</div>
                    </div>
                  )}

                  {/* Saldo pendiente */}
                  {['pendiente','confirmada'].includes(detalle.estado) && saldo > 0 && (
                    <div className="rv-saldo" style={{marginBottom:20}}>
                      <div>
                        <div style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(212,175,106,0.6)'}}>Saldo pendiente</div>
                        <div style={{fontSize:'0.7rem',color:'rgba(240,236,228,0.4)',marginTop:2}}>
                          Total Bs.{Number(detalle.total_estimado).toLocaleString()} · Pagado Bs.{Number(detalle.total_pagado).toLocaleString()}
                        </div>
                      </div>
                      <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.6rem',color:'#d4af6a'}}>
                        Bs. {saldo.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Cliente */}
                  <div style={{marginBottom:20}}>
                    <div className="rv-sec-lbl">Cliente</div>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                      <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(212,175,106,0.12)',border:'1px solid rgba(212,175,106,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Cormorant Garamond,serif',fontSize:'1.2rem',color:'#d4af6a',flexShrink:0}}>
                        {detalle.cliente.nombre_completo.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontWeight:600,fontSize:'0.85rem',color:'#f0ece4'}}>{detalle.cliente.nombre_completo}</div>
                        {detalle.cliente.nivel_fidelidad && (
                          <div style={{fontSize:'0.65rem',color:'#d4af6a',marginTop:1}}>{detalle.cliente.nivel_fidelidad}</div>
                        )}
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 16px'}}>
                      <div className="rv-fld" style={{gridColumn:'1/-1'}}>
                        <div className="rv-fld-l">Correo</div>
                        <div className="rv-fld-v" style={{fontSize:'0.76rem'}}>{detalle.cliente.correo}</div>
                      </div>
                      {detalle.cliente.telefono && (
                        <div className="rv-fld">
                          <div className="rv-fld-l">Teléfono</div>
                          <div className="rv-fld-v">{detalle.cliente.telefono}</div>
                        </div>
                      )}
                      {detalle.cliente.numero_documento && (
                        <div className="rv-fld">
                          <div className="rv-fld-l">Documento</div>
                          <div className="rv-fld-v">{detalle.cliente.tipo_documento} {detalle.cliente.numero_documento}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estancia */}
                  <div style={{marginBottom:20}}>
                    <div className="rv-sec-lbl">Estancia</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 16px'}}>
                      <div className="rv-fld">
                        <div className="rv-fld-l">Check-in</div>
                        <div className="rv-fld-v">{detalle.fecha_entrada}</div>
                      </div>
                      <div className="rv-fld">
                        <div className="rv-fld-l">Check-out</div>
                        <div className="rv-fld-v">{detalle.fecha_salida}</div>
                      </div>
                      <div className="rv-fld">
                        <div className="rv-fld-l">Huéspedes</div>
                        <div className="rv-fld-v">{detalle.cantidad_adultos} adulto{detalle.cantidad_adultos!==1?'s':''}
                          {detalle.cantidad_ninos>0?` · ${detalle.cantidad_ninos} niño${detalle.cantidad_ninos!==1?'s':''}`:''}</div>
                      </div>
                      <div className="rv-fld">
                        <div className="rv-fld-l">Origen</div>
                        <div className="rv-fld-v" style={{textTransform:'capitalize'}}>{detalle.origen}</div>
                      </div>
                      <div className="rv-fld">
                        <div className="rv-fld-l">Total estimado</div>
                        <div className="rv-fld-v" style={{color:'#d4af6a',fontFamily:'Cormorant Garamond,serif',fontSize:'1rem'}}>
                          Bs. {Number(detalle.total_estimado).toLocaleString()}
                        </div>
                      </div>
                      <div className="rv-fld">
                        <div className="rv-fld-l">Registrada</div>
                        <div className="rv-fld-v" style={{fontSize:'0.75rem'}}>
                          {new Date(detalle.created_at).toLocaleDateString('es-BO',{day:'2-digit',month:'short',year:'numeric'})}
                        </div>
                      </div>
                    </div>
                    {detalle.observaciones && (
                      <div className="rv-fld" style={{marginTop:6}}>
                        <div className="rv-fld-l">Observaciones</div>
                        <div style={{fontSize:'0.78rem',color:'rgba(240,236,228,0.7)',background:'rgba(255,255,255,0.03)',borderRadius:6,padding:'8px 10px'}}>
                          {detalle.observaciones}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Habitaciones */}
                  {detalle.habitaciones.length > 0 && (
                    <div style={{marginBottom:20}}>
                      <div className="rv-sec-lbl">Habitación{detalle.habitaciones.length>1?'es':''}</div>
                      {detalle.habitaciones.map((h,i) => (
                        <div key={i} className="rv-hab-row">
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                            <div>
                              <div style={{fontWeight:600,fontSize:'0.82rem',color:'#f0ece4'}}>Habitación {h.numero}</div>
                              <div style={{fontSize:'0.68rem',color:'rgba(240,236,228,0.4)',marginTop:2}}>
                                {h.tipo}{h.piso?` · Piso ${h.piso}`:''}
                              </div>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1rem',color:'#d4af6a'}}>
                                Bs. {Number(h.subtotal).toLocaleString()}
                              </div>
                              <div style={{fontSize:'0.65rem',color:'rgba(240,236,228,0.3)'}}>
                                Bs. {Number(h.precio_noche).toLocaleString()} × {h.noches} noche{h.noches!==1?'s':''}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagos */}
                  <div style={{marginBottom:16}}>
                    <div className="rv-sec-lbl">Pagos</div>
                    {detalle.pagos.length === 0
                      ? <div style={{fontSize:'0.78rem',color:'rgba(240,236,228,0.3)',padding:'8px 0'}}>Sin pagos registrados</div>
                      : detalle.pagos.map(p => {
                          const pc: Record<string,string> = {aprobado:'#52c97a',pendiente:'#d4af6a',rechazado:'#d46464'}
                          return (
                            <div key={p.id} className="rv-pago-row">
                              <div style={{flex:1}}>
                                <div style={{fontSize:'0.78rem',color:'#f0ece4'}}>{p.metodo}</div>
                                {p.fecha_pago && <div style={{fontSize:'0.65rem',color:'rgba(240,236,228,0.35)'}}>{p.fecha_pago.slice(0,10)}</div>}
                              </div>
                              <span style={{fontSize:'0.6rem',fontWeight:700,color:pc[p.estado]??'#d4af6a',background:`${pc[p.estado]??'#d4af6a'}18`,border:`1px solid ${pc[p.estado]??'#d4af6a'}40`,borderRadius:20,padding:'2px 8px',textTransform:'uppercase'}}>
                                {p.estado}
                              </span>
                              <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1rem',color:'#d4af6a',minWidth:85,textAlign:'right'}}>
                                Bs. {Number(p.monto).toLocaleString()}
                              </div>
                            </div>
                          )
                        })
                    }
                    {['finalizada','en_estadia'].includes(detalle.estado) && (
                      <div className="rv-saldo" style={{marginTop:10}}>
                        <div style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(212,175,106,0.6)'}}>Total pagado</div>
                        <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.3rem',color:'#52c97a'}}>
                          Bs. {Number(detalle.total_pagado).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form cancelar */}
                  {mostrarCancel && (
                    <div style={{marginBottom:8}}>
                      <label style={labelS}>Motivo de cancelación *</label>
                      <textarea style={{...inputS,resize:'vertical',minHeight:80}}
                        placeholder="Describe el motivo..."
                        value={motivoCancel} onChange={e => setMotivoCancel(e.target.value)} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer acciones */}
            {!cargandoDet && detalle && (
              <div className="rv-panel-foot">
                {!mostrarCancel ? (
                  <div className="rv-actions">
                    {detalle.estado === 'pendiente' && (
                      <button className="rv-btn rv-btn-gold" disabled={procesando} onClick={handleConfirmar}>
                        {procesando ? '...' : '✓ Confirmar'}
                      </button>
                    )}
                    {detalle.estado === 'confirmada' && (
                      <button className="rv-btn rv-btn-green" onClick={() => navigate('/personal/checkin')}>
                        → Check-in
                      </button>
                    )}
                    {detalle.estado === 'en_estadia' && (
                      <button className="rv-btn rv-btn-green" onClick={() => navigate('/personal/checkout')}>
                        → Check-out
                      </button>
                    )}
                    {detalle.estado === 'confirmada' && (
                      <button className="rv-btn rv-btn-purple" disabled={procesando} onClick={handleNoShow}>
                        {procesando ? '...' : 'No show'}
                      </button>
                    )}
                    {['pendiente','confirmada'].includes(detalle.estado) && (
                      <button className="rv-btn rv-btn-red" onClick={() => setMostrarCancel(true)}>
                        Cancelar
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rv-actions">
                    <button className="rv-btn rv-btn-red" style={{flex:1}}
                      disabled={procesando || !motivoCancel.trim()} onClick={handleCancelar}>
                      {procesando ? 'Cancelando...' : 'Confirmar cancelación'}
                    </button>
                    <button className="rv-btn rv-btn-ghost"
                      onClick={() => { setMostrarCancel(false); setMotivoCancel('') }}>
                      Volver
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ MODAL NUEVA RESERVA ════════════════════════════════════════════════ */}
      {modalNueva && (
        <div className="rv-moverlay"
          onClick={() => !procesandoNueva && pasoModal === 'form' && setModalNueva(false)}>
          <div className="rv-modal" onClick={e => e.stopPropagation()}>

            <div className="rv-modal-hdr">
              <div>
                <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.4rem',color:'#d4af6a'}}>
                  {pasoModal === 'pago' ? 'Pago inicial' : pasoModal === 'exito' ? '¡Listo!' : 'Nueva reserva'}
                </div>
                <div style={{fontSize:'0.7rem',color:'rgba(240,236,228,0.4)',marginTop:2}}>
                  {pasoModal === 'pago'
                    ? `Total: Bs. ${nuevaReservaTotal.toLocaleString()} · mínimo 30%`
                    : pasoModal === 'exito' ? 'Reserva registrada correctamente'
                    : 'Registro desde recepción'}
                </div>
              </div>
              {pasoModal === 'form' && (
                <button className="rv-close" onClick={() => setModalNueva(false)}>✕</button>
              )}
            </div>

            <div className="rv-modal-body">

              {/* ── EXITO ── */}
              {pasoModal === 'exito' && (
                <div style={{textAlign:'center',padding:'32px 20px'}}>
                  <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(82,201,122,0.12)',border:'2px solid rgba(82,201,122,0.4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'1.4rem'}}>✓</div>
                  <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.6rem',color:'#52c97a',marginBottom:6}}>Reserva creada</div>
                  <div style={{fontSize:'0.75rem',color:'rgba(240,236,228,0.4)'}}>La reserva fue registrada correctamente</div>
                </div>
              )}

              {/* ── PASO PAGO ── */}
              {pasoModal === 'pago' && (
                <>
                  {errorPago && <div className="rv-err">{errorPago}</div>}

                  <div style={{background:'rgba(212,175,106,0.06)',border:'1px solid rgba(212,175,106,0.15)',borderRadius:10,padding:'14px 16px',marginBottom:18,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(212,175,106,0.6)'}}>Total reserva</div>
                      <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.6rem',color:'#d4af6a'}}>Bs. {nuevaReservaTotal.toLocaleString()}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(212,175,106,0.6)'}}>Mínimo (30%)</div>
                      <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.2rem',color:'rgba(212,175,106,0.8)'}}>Bs. {minPago30.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Opciones rápidas */}
                  <div className="rv-pago-opts">
                    {[
                      {l:'30%',v:minPago30},
                      {l:'50%',v:Math.round(nuevaReservaTotal*0.5)},
                      {l:'100%',v:nuevaReservaTotal},
                    ].map(o => (
                      <button key={o.l}
                        className={`rv-pago-opt ${montoPago===o.v?'sel':''}`}
                        onClick={() => setMontoPago(o.v)}>
                        {o.l}<br/>
                        <span style={{fontSize:'0.6rem',fontWeight:400,opacity:0.7}}>Bs.{o.v.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{marginBottom:14}}>
                    <label style={labelS}>Monto a cobrar</label>
                    <input type="number" style={inputS} value={montoPago}
                      min={minPago30} max={nuevaReservaTotal}
                      onChange={e => setMontoPago(Number(e.target.value))} />
                    {montoPago < minPago30 && montoPago > 0 && (
                      <div className="rv-pago-min">⚠ El mínimo requerido es Bs. {minPago30.toLocaleString()} (30%)</div>
                    )}
                  </div>

                  <div style={{marginBottom:18}}>
                    <label style={labelS}>Método de pago</label>
                    <select style={inputS} value={metodoPagoId} onChange={e => setMetodoPagoId(e.target.value)}>
                      <option value="">Seleccionar método...</option>
                      {metodosPago.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <button style={{
                    width:'100%',padding:13,borderRadius:8,border:'none',
                    fontFamily:'Montserrat,sans-serif',fontSize:'0.72rem',fontWeight:600,
                    letterSpacing:'0.15em',textTransform:'uppercase',color:'#0a0a0a',
                    background: montoPago < minPago30 || !metodoPagoId || procesandoPago
                      ? 'rgba(212,175,106,0.2)' : 'linear-gradient(135deg,#c9a84c,#d4af6a)',
                    opacity: montoPago < minPago30 || !metodoPagoId || procesandoPago ? 0.6 : 1,
                    cursor: montoPago < minPago30 || !metodoPagoId || procesandoPago ? 'not-allowed' : 'pointer',
                    marginBottom: 10,
                  }}
                  disabled={montoPago < minPago30 || !metodoPagoId || procesandoPago}
                  onClick={handleRegistrarPago}>
                    {procesandoPago ? 'Registrando...' : 'Registrar pago'}
                  </button>

                  <button style={{
                    width:'100%',padding:10,borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',
                    background:'transparent',fontFamily:'Montserrat,sans-serif',fontSize:'0.68rem',
                    fontWeight:500,color:'rgba(240,236,228,0.4)',cursor:'pointer',
                  }} onClick={omitirPago}>
                    Omitir por ahora (registrar pago después)
                  </button>
                </>
              )}

              {/* ── PASO FORM ── */}
              {pasoModal === 'form' && (
                <>
                  {errorNueva && <div className="rv-err">{errorNueva}</div>}

                  {/* Búsqueda cliente */}
                  <div style={{marginBottom:14,position:'relative'}}>
                    <label style={labelS}>Cliente</label>
                    {clienteSel ? (
                      <div style={{...inputS,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div>
                          <span style={{fontWeight:600}}>{clienteSel.nombre_completo}</span>
                          <span style={{fontSize:'0.7rem',color:'rgba(240,236,228,0.4)',marginLeft:8}}>
                            {clienteSel.tipo_documento} {clienteSel.numero_documento}
                          </span>
                        </div>
                        <button onClick={() => { setClienteSel(null); setFormClienteId('') }}
                          style={{background:'none',border:'none',color:'rgba(240,236,228,0.4)',cursor:'pointer',fontSize:'0.9rem'}}>✕</button>
                      </div>
                    ) : (
                      <>
                        <input style={inputS}
                          placeholder="Buscar por nombre, correo o documento..."
                          value={clienteQuery}
                          onChange={e => { setClienteQuery(e.target.value); setMostrarDrop(true) }}
                          onFocus={() => setMostrarDrop(true)} />
                        {mostrarDrop && clienteQuery.length >= 2 && (
                          <div className="rv-drop">
                            {buscarCarg
                              ? <div style={{padding:'14px',fontSize:'0.75rem',color:'rgba(240,236,228,0.3)',textAlign:'center'}}>Buscando...</div>
                              : clienteResults.length === 0
                                ? <div style={{padding:'14px',fontSize:'0.75rem',color:'rgba(240,236,228,0.3)',textAlign:'center'}}>Sin resultados</div>
                                : clienteResults.map(c => (
                                    <div key={c.id} className="rv-drop-item" onClick={() => seleccionarCliente(c)}>
                                      <div style={{fontSize:'0.8rem',color:'#f0ece4',fontWeight:600}}>{c.nombre_completo}</div>
                                      <div style={{fontSize:'0.67rem',color:'rgba(240,236,228,0.35)'}}>
                                        {c.tipo_documento} {c.numero_documento} · {c.correo}
                                      </div>
                                    </div>
                                  ))
                            }
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Fechas */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                    <div>
                      <label style={labelS}>Fecha entrada</label>
                      <input type="date" style={inputS} value={formFE}
                        onChange={e => { setFormFE(e.target.value); setHabsDisp([]) }} />
                    </div>
                    <div>
                      <label style={labelS}>Fecha salida</label>
                      <input type="date" style={inputS} value={formFS}
                        onChange={e => { setFormFS(e.target.value); setHabsDisp([]) }} />
                    </div>
                  </div>

                  {/* Huéspedes */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                    <div>
                      <label style={labelS}>Adultos</label>
                      <input type="number" min={1} style={inputS} value={formAdultos}
                        onChange={e => setFormAdultos(Number(e.target.value))} />
                    </div>
                    <div>
                      <label style={labelS}>Niños</label>
                      <input type="number" min={0} style={inputS} value={formNinos}
                        onChange={e => setFormNinos(Number(e.target.value))} />
                    </div>
                  </div>

                  {/* Buscar habitaciones */}
                  <button style={{
                    width:'100%',padding:11,borderRadius:8,background:'rgba(106,184,212,0.1)',
                    border:'1px solid rgba(106,184,212,0.25)',fontFamily:'Montserrat,sans-serif',
                    fontSize:'0.72rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',
                    color:'#6ab8d4',marginBottom:14,transition:'all 0.2s',
                    opacity: !formFE || !formFS ? 0.4 : 1,
                    cursor: !formFE || !formFS ? 'not-allowed' : 'pointer',
                  }}
                  disabled={!formFE || !formFS || buscandoHabs}
                  onClick={buscarHabs}>
                    {buscandoHabs ? 'Buscando...' : '🔍 Buscar habitaciones disponibles'}
                  </button>

                  {habitacionesDisp.length > 0 && (
                    <div style={{marginBottom:14}}>
                      <label style={labelS}>Habitación disponible</label>
                      <select style={inputS} value={formHabId}
                        onChange={e => setFormHabId(e.target.value)}>
                        <option value="">Seleccionar habitación...</option>
                        {habitacionesDisp.map(h => (
                          <option key={h.habitacion_id??h.id} value={h.habitacion_id??h.id}>
                            Hab. {h.numero} — {h.nombre_tipo??h.tipo} · Bs. {h.precio_base??h.precio}/noche
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{marginBottom:16}}>
                    <label style={labelS}>Observaciones (opcional)</label>
                    <textarea style={{...inputS,resize:'vertical',minHeight:72}}
                      placeholder="Notas adicionales..." value={formObs}
                      onChange={e => setFormObs(e.target.value)} />
                  </div>

                  <button style={{
                    width:'100%',padding:13,borderRadius:8,border:'none',
                    fontFamily:'Montserrat,sans-serif',fontSize:'0.72rem',fontWeight:600,
                    letterSpacing:'0.15em',textTransform:'uppercase',color:'#0a0a0a',
                    background: !formClienteId||!formHabId||procesandoNueva
                      ? 'rgba(212,175,106,0.2)' : 'linear-gradient(135deg,#c9a84c,#d4af6a)',
                    opacity: !formClienteId||!formHabId||procesandoNueva ? 0.6 : 1,
                    cursor: !formClienteId||!formHabId||procesandoNueva ? 'not-allowed' : 'pointer',
                  }}
                  disabled={!formClienteId||!formHabId||!formFE||!formFS||procesandoNueva}
                  onClick={handleCrearReserva}>
                    {procesandoNueva ? 'Creando reserva...' : 'Crear reserva →'}
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
