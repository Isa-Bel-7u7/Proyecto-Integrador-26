import { useState, useEffect, useCallback } from 'react'
import PersonalLayout from '../../components/PersonalLayout'
import {
  getResumenPagos, getReservasConPagos, getHistorialPagos,
  getMetodosPago, registrarPago,
} from '../../services/api'
import type { ReservaPago, PagoHistorial, StatsPagos } from '../../services/api'

type MetodoPago = { id: string; nombre: string }

// ── Config ────────────────────────────────────────────────────────────────
const EP: Record<string, { bg: string; color: string; label: string }> = {
  sin_pago: { bg: 'rgba(224,82,82,0.1)',   color: '#e05252', label: 'Sin pago'   },
  parcial:  { bg: 'rgba(212,175,106,0.1)', color: '#d4af6a', label: 'Parcial'    },
  pagado:   { bg: 'rgba(82,201,122,0.1)',  color: '#52c97a', label: 'Pagado'     },
}
const ER: Record<string, { color: string; label: string }> = {
  pendiente:    { color: '#d4af6a', label: 'Pendiente'    },
  confirmada:   { color: '#6ab8d4', label: 'Confirmada'   },
  en_estadia:   { color: '#52c97a', label: 'En estadía'   },
  completada:   { color: '#9696a0', label: 'Completada'   },
  cancelada:    { color: '#e05252', label: 'Cancelada'    },
}
const TIPO_LABEL: Record<string, string> = {
  anticipo:    'Anticipo',
  pago_total:  'Pago total',
  saldo:       'Saldo',
  cargo_extra: 'Cargo extra',
  reembolso:   'Reembolso',
}
const ESTADO_PAGO_LABEL: Record<string, string> = {
  aprobado:  'Aprobado',
  pendiente: 'Pendiente',
  anulado:   'Anulado',
}

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(212,175,106,0.2)', borderRadius: 8,
  padding: '10px 13px', fontFamily: 'Montserrat,sans-serif',
  fontSize: '0.82rem', fontWeight: 300, color: '#f0ece4', outline: 'none',
}
const lbl: React.CSSProperties = {
  fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)',
  display: 'block', marginBottom: 5,
}

// ── Component ─────────────────────────────────────────────────────────────
export default function Pagos() {
  const [stats,    setStats]    = useState<StatsPagos>({ hoy_total: 0, mes_total: 0, pagos_hoy: 0, pendientes: 0 })
  const [reservas, setReservas] = useState<ReservaPago[]>([])
  const [metodos,  setMetodos]  = useState<MetodoPago[]>([])
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const [busqueda,     setBusqueda]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // Panel
  const [panelId,   setPanelId]   = useState<string | null>(null)
  const [historial, setHistorial] = useState<PagoHistorial[]>([])
  const [cargPanel, setCargPanel] = useState(false)

  // Formulario de pago en panel
  const [monto,      setMonto]      = useState('')
  const [metodoPId,  setMetodoPId]  = useState('')
  const [tipoPago,   setTipoPago]   = useState('anticipo')
  const [referencia, setReferencia] = useState('')
  const [notas,      setNotas]      = useState('')
  const [registrando,setRegistrando]= useState(false)
  const [errorPago,  setErrorPago]  = useState<string | null>(null)
  const [exitoPago,  setExitoPago]  = useState(false)

  // ── Data ──────────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true)
      const [s, r, m] = await Promise.all([
        getResumenPagos(), getReservasConPagos(), getMetodosPago(),
      ])
      setStats(s)
      setReservas(r)
      setMetodos(m as MetodoPago[])
      if ((m as MetodoPago[]).length > 0) setMetodoPId((m as MetodoPago[])[0].id)
    } catch {
      setError('No se pudieron cargar los datos de pagos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  useEffect(() => {
    if (!panelId) { setHistorial([]); return }
    setCargPanel(true)
    getHistorialPagos(panelId)
      .then(setHistorial)
      .catch(() => setHistorial([]))
      .finally(() => setCargPanel(false))
  }, [panelId])

  // Pre-fill saldo + auto-referencia when opening panel
  useEffect(() => {
    if (!panelId) return
    const sel = reservas.find(r => r.reserva_id === panelId)
    if (!sel) return
    const saldo = Math.max(0, sel.saldo_pendiente)
    setMonto(saldo > 0 ? saldo.toFixed(2) : '')
    setTipoPago(sel.estado_pago === 'sin_pago' ? 'anticipo' : 'saldo')
    // Referencia automática
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const num = String(Math.floor(Math.random() * 900000) + 100000)
    setReferencia(`PAG-${fecha}-${num}`)
    setNotas(''); setErrorPago(null); setExitoPago(false)
  }, [panelId, reservas])

  // ── Derivados ─────────────────────────────────────────────────────────
  const sel = panelId ? reservas.find(r => r.reserva_id === panelId) ?? null : null

  const filtradas = reservas.filter(r => {
    const mE = filtroEstado === 'todos' || r.estado_pago === filtroEstado
    const mB = !busqueda ||
      r.codigo_reserva.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.habitacion_numero ?? '').includes(busqueda)
    return mE && mB
  })

  // ── Acciones ──────────────────────────────────────────────────────────
  const handleRegistrar = async () => {
    if (!panelId || !monto || !metodoPId) { setErrorPago('Completa monto y método de pago.'); return }
    const montoNum = Number(monto)
    if (isNaN(montoNum) || montoNum <= 0) { setErrorPago('El monto debe ser mayor a 0.'); return }
    if (sel && montoNum > sel.saldo_pendiente + 0.01) {
      setErrorPago(`El monto excede el saldo pendiente (Bs. ${sel.saldo_pendiente.toFixed(2)}).`); return
    }
    setRegistrando(true); setErrorPago(null)
    try {
      await registrarPago({
        reservaId: panelId, metodoPagoId: metodoPId,
        monto: montoNum, tipoPago,
        referencia: referencia || undefined,
        observaciones: notas || undefined,
      })
      setExitoPago(true)
      await cargarDatos()
      // Reload historial
      const h = await getHistorialPagos(panelId)
      setHistorial(h)
      setTimeout(() => { setExitoPago(false) }, 3000)
    } catch (e) {
      setErrorPago((e as Error).message)
    } finally {
      setRegistrando(false)
    }
  }

  // ── Factura ───────────────────────────────────────────────────────────
  const handleImprimirFactura = () => {
    if (!sel) return
    const numFactura = `FAC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`
    const noches = Math.ceil(
      (new Date(sel.fecha_salida).getTime() - new Date(sel.fecha_entrada).getTime()) / 86400000
    )
    const precioPorNoche = noches > 0 ? (sel.total_estimado / noches) : sel.total_estimado

    const pagosRows = historial.length > 0
      ? historial.map(p => `
          <tr>
            <td>${new Date(p.fecha_pago).toLocaleDateString('es-BO')}</td>
            <td>${TIPO_LABEL[p.tipo_pago] ?? p.tipo_pago}</td>
            <td>${p.metodo_nombre ?? '—'}</td>
            <td>${p.referencia ?? '—'}</td>
            <td style="text-align:right;color:#1a5c2e;font-weight:600">Bs. ${Number(p.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:center">${p.estado === 'aprobado' ? '✓' : p.estado}</td>
          </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:#888">Sin pagos registrados</td></tr>'

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${numFactura}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff;padding:40px}
    .invoice{max-width:720px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #c9a84c}
    .hotel-name{font-size:24px;font-weight:700;color:#1a1a2e;letter-spacing:0.05em}
    .hotel-sub{font-size:12px;color:#666;margin-top:4px}
    .fac-info{text-align:right}
    .fac-num{font-size:18px;font-weight:700;color:#c9a84c}
    .fac-fecha{font-size:12px;color:#666;margin-top:4px}
    .section{margin-bottom:24px}
    .section-title{font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #eee}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .info-item label{font-size:10px;font-weight:600;text-transform:uppercase;color:#999;display:block;margin-bottom:2px}
    .info-item span{font-size:13px;color:#1a1a2e;font-weight:500}
    table{width:100%;border-collapse:collapse;font-size:13px}
    thead th{background:#1a1a2e;color:#fff;padding:10px 12px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase}
    tbody td{padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
    tbody tr:last-child td{border-bottom:none}
    tbody tr:nth-child(even){background:#fafafa}
    .totals{margin-top:24px;border-top:2px solid #1a1a2e;padding-top:16px}
    .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
    .total-row.main{font-size:16px;font-weight:700;color:#1a1a2e;border-top:1px solid #eee;padding-top:10px;margin-top:4px}
    .total-row.saldo{color:${sel.saldo_pendiente <= 0 ? '#1a5c2e' : '#c0392b'}}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#aaa}
    .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}
    .badge-pagado{background:#d4edda;color:#155724}
    .badge-parcial{background:#fff3cd;color:#856404}
    .badge-sinpago{background:#f8d7da;color:#721c24}
    @media print{
      body{padding:20px}
      @page{margin:1.5cm}
    }
  </style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div>
      <div class="hotel-name">Grand Hôtel</div>
      <div class="hotel-sub">Sistema de Gestión Hotelera</div>
    </div>
    <div class="fac-info">
      <div class="fac-num">FACTURA ${numFactura}</div>
      <div class="fac-fecha">Fecha de emisión: ${new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      <div style="margin-top:6px">
        <span class="badge badge-${sel.estado_pago === 'pagado' ? 'pagado' : sel.estado_pago === 'parcial' ? 'parcial' : 'sinpago'}">
          ${EP[sel.estado_pago]?.label ?? sel.estado_pago}
        </span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del huésped</div>
    <div class="info-grid">
      <div class="info-item"><label>Nombre completo</label><span>${sel.cliente_nombre}</span></div>
      <div class="info-item"><label>Código de reserva</label><span>${sel.codigo_reserva}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detalle de la estancia</div>
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Habitación</th>
          <th>Período</th>
          <th>Noches</th>
          <th style="text-align:right">Precio/noche</th>
          <th style="text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${sel.tipo_habitacion ?? 'Habitación'}</td>
          <td>${sel.habitacion_numero ? `Hab. ${sel.habitacion_numero}` : '—'}</td>
          <td>${sel.fecha_entrada} → ${sel.fecha_salida}</td>
          <td style="text-align:center">${noches}</td>
          <td style="text-align:right">Bs. ${precioPorNoche.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
          <td style="text-align:right;font-weight:600">Bs. ${Number(sel.total_estimado).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Historial de pagos</div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th><th>Tipo</th><th>Método</th><th>Referencia</th><th style="text-align:right">Monto</th><th style="text-align:center">Estado</th>
        </tr>
      </thead>
      <tbody>${pagosRows}</tbody>
    </table>
  </div>

  <div class="totals">
    <div class="total-row"><span>Total de la reserva</span><span>Bs. ${Number(sel.total_estimado).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span></div>
    <div class="total-row" style="color:#1a5c2e"><span>Total pagado</span><span>Bs. ${Number(sel.total_pagado).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span></div>
    <div class="total-row saldo main"><span>Saldo pendiente</span><span>Bs. ${Math.max(0, sel.saldo_pendiente).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span></div>
  </div>

  <div class="footer">
    <p>Documento generado el ${new Date().toLocaleString('es-BO')} · Grand Hôtel · Sistema de Gestión</p>
    <p style="margin-top:4px">Este documento es un comprobante interno de pago.</p>
  </div>
</div>
<script>window.onload = () => { window.print() }</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .pg-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:14px;margin-bottom:24px}
        .pg-stat{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;padding:20px}
        .pg-stat-lbl{font-size:0.62rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.32);margin-bottom:8px}
        .pg-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.9rem;font-weight:300;line-height:1;margin-bottom:3px}
        .pg-stat-sub{font-size:0.65rem;color:rgba(240,236,228,0.28)}
        .pg-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:18px}
        .pg-search{flex:1;min-width:200px;position:relative}
        .pg-search input{width:100%;background:#13131a;border:1px solid rgba(212,175,106,0.15);border-radius:8px;padding:9px 14px 9px 36px;font-family:Montserrat,sans-serif;font-size:0.78rem;color:#f0ece4;outline:none;transition:border-color 0.3s}
        .pg-search input::placeholder{color:rgba(240,236,228,0.22)}
        .pg-search input:focus{border-color:rgba(212,175,106,0.35)}
        .pg-search-ic{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:rgba(240,236,228,0.28);font-size:0.85rem}
        .pg-tabs{display:flex;gap:4px}
        .pg-tab{padding:7px 13px;border-radius:8px;font-size:0.68rem;font-weight:500;cursor:pointer;border:1px solid rgba(212,175,106,0.15);background:transparent;color:rgba(240,236,228,0.4);transition:all 0.2s;font-family:Montserrat,sans-serif}
        .pg-tab:hover{border-color:rgba(212,175,106,0.3);color:#f0ece4}
        .pg-tab.on{background:rgba(212,175,106,0.12);border-color:rgba(212,175,106,0.35);color:#d4af6a}
        .pg-wrap{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;overflow:hidden}
        .pg-tbl-hdr{padding:14px 20px;border-bottom:1px solid rgba(212,175,106,0.07);display:flex;align-items:center;justify-content:space-between}
        .pg-tbl-tit{font-size:0.7rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.4)}
        .pg-tbl-cnt{font-size:0.65rem;background:rgba(212,175,106,0.1);color:#d4af6a;padding:3px 10px;border-radius:20px}
        table{width:100%;border-collapse:collapse}
        thead th{font-size:0.6rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.22);text-align:left;padding:11px 18px;border-bottom:1px solid rgba(255,255,255,0.04)}
        tbody tr{border-bottom:1px solid rgba(255,255,255,0.03);cursor:pointer;transition:background 0.15s}
        tbody tr:last-child{border-bottom:none}
        tbody tr:hover{background:rgba(212,175,106,0.04)}
        tbody td{padding:11px 18px;font-size:0.76rem;color:rgba(240,236,228,0.65);vertical-align:middle}
        .td-cod{font-family:'Cormorant Garamond',serif;font-size:0.9rem;color:#d4af6a}
        .td-bs{font-family:'Cormorant Garamond',serif;font-size:0.98rem;color:#f0ece4}
        .td-saldo{font-family:'Cormorant Garamond',serif;font-size:0.98rem;color:#e05252;font-weight:400}
        .td-saldo.ok{color:#52c97a}
        .pg-pill{display:inline-block;font-size:0.58rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 9px;border-radius:20px}
        .pg-empty{padding:48px;text-align:center;color:rgba(240,236,228,0.2);font-size:0.82rem}
        .pg-skel{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:pgshim 1.5s infinite;border-radius:4px}
        @keyframes pgshim{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .pg-err{background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:0.76rem;color:#e05252}
        .pg-ok{background:rgba(82,201,122,0.08);border:1px solid rgba(82,201,122,0.2);border-radius:8px;padding:10px 14px;font-size:0.76rem;color:#52c97a;text-align:center}
        /* Panel */
        .pg-ov{position:fixed;inset:0;z-index:180;background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);animation:pgfade 0.2s}
        @keyframes pgfade{from{opacity:0}to{opacity:1}}
        .pg-panel{position:fixed;top:0;right:0;bottom:0;width:480px;max-width:96vw;z-index:190;background:#0f0f12;border-left:1px solid rgba(212,175,106,0.15);display:flex;flex-direction:column;animation:pgslide 0.3s cubic-bezier(0.16,1,0.3,1)}
        @keyframes pgslide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .pg-panel-scroll{flex:1;overflow-y:auto}
        .pg-panel-scroll::-webkit-scrollbar{width:3px}
        .pg-panel-scroll::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.18)}
        .pg-panel-hdr{padding:22px 24px 16px;border-bottom:1px solid rgba(212,175,106,0.08);display:flex;align-items:flex-start;justify-content:space-between}
        .pg-panel-cod{font-family:'Cormorant Garamond',serif;font-size:1.5rem;color:#d4af6a;font-weight:300}
        .pg-panel-cli{font-size:0.75rem;color:rgba(240,236,228,0.5);margin-top:3px}
        .pg-panel-close{width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.4);font-size:0.78rem;transition:background 0.2s;flex-shrink:0}
        .pg-panel-close:hover{background:rgba(255,255,255,0.1)}
        .pg-panel-body{padding:20px 24px 30px}
        /* Saldo destacado */
        .pg-saldo-box{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
        .pg-saldo-item{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px}
        .pg-saldo-item.pendiente{border-color:rgba(224,82,82,0.25);background:rgba(224,82,82,0.05)}
        .pg-saldo-item.ok{border-color:rgba(82,201,122,0.2);background:rgba(82,201,122,0.04)}
        .pg-saldo-lbl{font-size:0.58rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:5px}
        .pg-saldo-val{font-family:'Cormorant Garamond',serif;font-size:1.35rem;font-weight:300;line-height:1}
        .pg-sec-lbl{font-size:0.6rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:10px}
        .pg-sep{height:1px;background:rgba(212,175,106,0.07);margin:18px 0}
        /* Historial */
        .pg-hist-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .pg-hist-item:last-child{border-bottom:none}
        .pg-hist-tipo{font-size:0.68rem;color:#f0ece4;font-weight:500}
        .pg-hist-meta{font-size:0.62rem;color:rgba(240,236,228,0.35);margin-top:2px}
        .pg-hist-monto{font-family:'Cormorant Garamond',serif;font-size:1.05rem;text-align:right}
        .pg-hist-est{font-size:0.58rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;text-align:right}
        /* Form */
        .pg-form-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
        .pg-form-f{margin-bottom:12px}
        .pg-btn-pagar{width:100%;padding:12px;border-radius:8px;border:none;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#0a0a0a;cursor:pointer;margin-top:4px;transition:all 0.2s}
        .pg-btn-pagar:disabled{opacity:0.4;cursor:not-allowed}
        /* Barra de progreso */
        .pg-prog-wrap{height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-bottom:16px}
        .pg-prog-bar{height:100%;border-radius:3px;transition:width 0.5s ease}
      `}</style>

      <PersonalLayout titulo="Pagos" subtitulo="Gestión de pagos y cobros">
        {error && <div className="pg-err">{error}</div>}

        {/* Stats */}
        <div className="pg-stats">
          <div className="pg-stat">
            <div className="pg-stat-lbl">Recaudado hoy</div>
            <div className="pg-stat-val" style={{ color: '#52c97a' }}>
              {cargando ? '—' : `Bs. ${Number(stats.hoy_total).toLocaleString()}`}
            </div>
            <div className="pg-stat-sub">{stats.pagos_hoy} pago{stats.pagos_hoy !== 1 ? 's' : ''} hoy</div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-lbl">Recaudado este mes</div>
            <div className="pg-stat-val" style={{ color: '#d4af6a' }}>
              {cargando ? '—' : `Bs. ${Number(stats.mes_total).toLocaleString()}`}
            </div>
            <div className="pg-stat-sub">Mes en curso</div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-lbl">Con saldo pendiente</div>
            <div className="pg-stat-val" style={{ color: '#e05252' }}>
              {cargando ? '—' : stats.pendientes}
            </div>
            <div className="pg-stat-sub">Reservas sin pago completo</div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-lbl">Total reservas</div>
            <div className="pg-stat-val" style={{ color: '#6ab8d4' }}>
              {cargando ? '—' : reservas.length}
            </div>
            <div className="pg-stat-sub">En seguimiento</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="pg-toolbar">
          <div className="pg-search">
            <span className="pg-search-ic">🔍</span>
            <input type="text" placeholder="Buscar por código, cliente o habitación..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="pg-tabs">
            {[
              { key: 'todos',    label: 'Todos'     },
              { key: 'sin_pago', label: 'Sin pago'  },
              { key: 'parcial',  label: 'Parcial'   },
              { key: 'pagado',   label: 'Pagados'   },
            ].map(t => (
              <button key={t.key} className={`pg-tab ${filtroEstado === t.key ? 'on' : ''}`}
                onClick={() => setFiltroEstado(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="pg-wrap">
          <div className="pg-tbl-hdr">
            <span className="pg-tbl-tit">Reservas y estado de pago</span>
            <span className="pg-tbl-cnt">{filtradas.length} reservas</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Habitación</th>
                <th>Fechas</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Saldo</th>
                <th>Estado pago</th>
              </tr>
            </thead>
            <tbody>
              {cargando
                ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((__, j) => (
                    <td key={j}><div className="pg-skel" style={{ height: 13, width: '80%' }} /></td>
                  ))}</tr>
                ))
                : filtradas.length === 0
                  ? <tr><td colSpan={8}><div className="pg-empty">No se encontraron reservas</div></td></tr>
                  : filtradas.map(r => {
                    const ep = EP[r.estado_pago] ?? EP.sin_pago
                    const porcentaje = r.total_estimado > 0
                      ? Math.min(100, Math.round((r.total_pagado / r.total_estimado) * 100))
                      : 0
                    return (
                      <tr key={r.reserva_id}
                        style={panelId === r.reserva_id ? { background: 'rgba(212,175,106,0.05)' } : {}}
                        onClick={() => setPanelId(r.reserva_id)}>
                        <td className="td-cod">{r.codigo_reserva}</td>
                        <td style={{ color: '#f0ece4' }}>{r.cliente_nombre}</td>
                        <td>
                          {r.habitacion_numero
                            ? `Hab. ${r.habitacion_numero}`
                            : <span style={{ color: 'rgba(240,236,228,0.25)' }}>—</span>}
                        </td>
                        <td style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.45)' }}>
                          {r.fecha_entrada}<br />{r.fecha_salida}
                        </td>
                        <td className="td-bs">Bs. {Number(r.total_estimado).toLocaleString()}</td>
                        <td style={{ color: '#52c97a', fontFamily: "'Cormorant Garamond',serif", fontSize: '0.98rem' }}>
                          Bs. {Number(r.total_pagado).toLocaleString()}
                          <div style={{ fontSize: '0.6rem', color: 'rgba(82,201,122,0.55)', marginTop: 1 }}>
                            {porcentaje}%
                          </div>
                        </td>
                        <td className={`td-saldo ${r.saldo_pendiente <= 0 ? 'ok' : ''}`}>
                          Bs. {Math.max(0, r.saldo_pendiente).toLocaleString()}
                        </td>
                        <td>
                          <span className="pg-pill" style={{ background: ep.bg, color: ep.color }}>
                            {ep.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </PersonalLayout>

      {/* ── Panel lateral ── */}
      {panelId && sel && (
        <>
          <div className="pg-ov" onClick={() => setPanelId(null)} />
          <div className="pg-panel">
            <div className="pg-panel-hdr">
              <div>
                <div className="pg-panel-cod">{sel.codigo_reserva}</div>
                <div className="pg-panel-cli">{sel.cliente_nombre}</div>
                {sel.habitacion_numero && (
                  <div className="pg-panel-cli" style={{ marginTop: 2 }}>
                    Hab. {sel.habitacion_numero} · {sel.tipo_habitacion}
                  </div>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <span className="pg-pill"
                    style={{ background: (EP[sel.estado_pago] ?? EP.sin_pago).bg, color: (EP[sel.estado_pago] ?? EP.sin_pago).color }}>
                    {(EP[sel.estado_pago] ?? EP.sin_pago).label}
                  </span>
                  <span className="pg-pill"
                    style={{ background: 'rgba(106,184,212,0.1)', color: (ER[sel.estado_reserva] ?? ER.pendiente).color }}>
                    {(ER[sel.estado_reserva] ?? ER.pendiente).label}
                  </span>
                </div>
              </div>
              <button className="pg-panel-close" onClick={() => setPanelId(null)}>✕</button>
            </div>

            <div className="pg-panel-scroll">
              <div className="pg-panel-body">

                {/* Saldo automático */}
                <div className="pg-saldo-box">
                  <div className="pg-saldo-item">
                    <div className="pg-saldo-lbl">Total</div>
                    <div className="pg-saldo-val" style={{ color: '#f0ece4' }}>
                      Bs. {Number(sel.total_estimado).toLocaleString()}
                    </div>
                  </div>
                  <div className="pg-saldo-item">
                    <div className="pg-saldo-lbl">Pagado</div>
                    <div className="pg-saldo-val" style={{ color: '#52c97a' }}>
                      Bs. {Number(sel.total_pagado).toLocaleString()}
                    </div>
                  </div>
                  <div className={`pg-saldo-item ${sel.saldo_pendiente <= 0 ? 'ok' : 'pendiente'}`}>
                    <div className="pg-saldo-lbl">Saldo</div>
                    <div className="pg-saldo-val" style={{ color: sel.saldo_pendiente <= 0 ? '#52c97a' : '#e05252' }}>
                      Bs. {Math.max(0, sel.saldo_pendiente).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Barra de progreso */}
                {sel.total_estimado > 0 && (() => {
                  const pct = Math.min(100, Math.round((sel.total_pagado / sel.total_estimado) * 100))
                  return (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>
                        <span>Progreso de pago</span><span>{pct}%</span>
                      </div>
                      <div className="pg-prog-wrap">
                        <div className="pg-prog-bar" style={{
                          width: `${pct}%`,
                          background: pct >= 100 ? '#52c97a' : pct >= 50 ? '#d4af6a' : '#e05252',
                        }} />
                      </div>
                    </div>
                  )
                })()}

                {/* Fechas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <div>
                    <div style={{ ...lbl }}>Entrada</div>
                    <div style={{ fontSize: '0.8rem', color: '#f0ece4' }}>{sel.fecha_entrada}</div>
                  </div>
                  <div>
                    <div style={{ ...lbl }}>Salida</div>
                    <div style={{ fontSize: '0.8rem', color: '#f0ece4' }}>{sel.fecha_salida}</div>
                  </div>
                  {sel.ultimo_pago && (
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ ...lbl }}>Último pago</div>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(240,236,228,0.5)' }}>
                        {new Date(sel.ultimo_pago).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pg-sep" />

                {/* Historial */}
                <div className="pg-sec-lbl">Historial de pagos</div>
                {cargPanel ? (
                  <div style={{ color: 'rgba(240,236,228,0.25)', fontSize: '0.72rem', marginBottom: 16 }}>Cargando...</div>
                ) : historial.length === 0 ? (
                  <div style={{ color: 'rgba(240,236,228,0.22)', fontSize: '0.72rem', marginBottom: 16 }}>Sin pagos registrados</div>
                ) : (
                  <div style={{ marginBottom: 18 }}>
                    {historial.map(p => {
                      const esAprobado = p.estado === 'aprobado'
                      return (
                        <div key={p.id} className="pg-hist-item">
                          <div>
                            <div className="pg-hist-tipo">{TIPO_LABEL[p.tipo_pago] ?? p.tipo_pago}</div>
                            <div className="pg-hist-meta">
                              {p.metodo_nombre ?? '—'} · {new Date(p.fecha_pago).toLocaleDateString('es-BO')}
                              {p.referencia && ` · Ref: ${p.referencia}`}
                            </div>
                            {p.registrado_por && (
                              <div className="pg-hist-meta">Por: {p.registrado_por}</div>
                            )}
                          </div>
                          <div>
                            <div className="pg-hist-monto" style={{ color: esAprobado ? '#52c97a' : '#9696a0' }}>
                              Bs. {Number(p.monto).toLocaleString()}
                            </div>
                            <div className="pg-hist-est" style={{ color: esAprobado ? 'rgba(82,201,122,0.5)' : '#9696a0' }}>
                              {ESTADO_PAGO_LABEL[p.estado] ?? p.estado}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Registrar pago — solo si hay saldo */}
                {sel.saldo_pendiente > 0 && (
                  <>
                    <div className="pg-sep" />
                    <div className="pg-sec-lbl">Registrar pago</div>

                    {exitoPago && (
                      <div className="pg-ok" style={{ marginBottom: 12 }}>
                        ✓ Pago registrado correctamente
                      </div>
                    )}
                    {errorPago && <div className="pg-err">{errorPago}</div>}

                    <div className="pg-form-g2">
                      <div>
                        <label style={lbl}>Monto (Bs.) *</label>
                        <input type="number" min="0.01" step="0.01" style={inp}
                          value={monto}
                          onChange={e => { setMonto(e.target.value); setErrorPago(null) }}
                          placeholder={`Max: ${Math.max(0, sel.saldo_pendiente).toFixed(2)}`} />
                      </div>
                      <div>
                        <label style={lbl}>Tipo de pago</label>
                        <select style={inp} value={tipoPago} onChange={e => setTipoPago(e.target.value)}>
                          <option value="anticipo">Anticipo</option>
                          <option value="saldo">Saldo</option>
                          <option value="pago_total">Pago total</option>
                          <option value="cargo_extra">Cargo extra</option>
                        </select>
                      </div>
                    </div>

                    <div className="pg-form-f">
                      <label style={lbl}>Método de pago *</label>
                      <select style={inp} value={metodoPId} onChange={e => setMetodoPId(e.target.value)}>
                        {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>

                    <div className="pg-form-g2">
                      <div>
                        <label style={lbl}>Referencia</label>
                        <input type="text" style={inp} placeholder="N° comprobante..."
                          value={referencia} onChange={e => setReferencia(e.target.value)} />
                      </div>
                      <div>
                        <label style={lbl}>Notas</label>
                        <input type="text" style={inp} placeholder="Observaciones..."
                          value={notas} onChange={e => setNotas(e.target.value)} />
                      </div>
                    </div>

                    <button className="pg-btn-pagar"
                      disabled={registrando || !monto || !metodoPId}
                      style={{
                        background: registrando || !monto || !metodoPId
                          ? 'rgba(212,175,106,0.2)'
                          : 'linear-gradient(135deg,#c9a84c,#d4af6a)',
                        opacity: registrando || !monto || !metodoPId ? 0.5 : 1,
                        cursor: registrando || !monto || !metodoPId ? 'not-allowed' : 'pointer',
                      }}
                      onClick={handleRegistrar}>
                      {registrando ? 'Registrando...' : `Registrar Bs. ${monto || '0'}`}
                    </button>
                  </>
                )}

                {sel.saldo_pendiente <= 0 && (
                  <>
                    <div className="pg-sep" />
                    <div className="pg-ok">✓ Reserva completamente pagada</div>
                  </>
                )}

                {/* Botón factura — visible cuando hay al menos un pago */}
                {historial.length > 0 && (
                  <>
                    <div className="pg-sep" />
                    <button
                      onClick={handleImprimirFactura}
                      style={{
                        width: '100%', padding: '11px', borderRadius: 8,
                        background: 'rgba(212,175,106,0.08)',
                        border: '1px solid rgba(212,175,106,0.3)',
                        color: '#d4af6a', fontFamily: 'Montserrat,sans-serif',
                        fontSize: '0.7rem', fontWeight: 600,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,106,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,106,0.08)')}
                    >
                      🖨 Imprimir / Descargar factura
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
