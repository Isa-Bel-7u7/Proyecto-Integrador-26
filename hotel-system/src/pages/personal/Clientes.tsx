import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import PersonalLayout from '../../components/PersonalLayout'
import { executeRpc as rpc } from '../../repositories/rpcRepository'

// ── Types ─────────────────────────────────────────────────────────────────────
type ClienteItem = {
  id: string; usuario_id: string; nombre_completo: string; correo: string
  telefono: string | null; foto_url: string | null; estado: string
  tipo_documento: string; numero_documento: string; nacionalidad: string | null
  ciudad: string | null; pais: string | null; nivel_fidelidad: string
  puntos_fidelidad: number; total_reservas_completadas: number
  total_gastado: number; created_at: string
}
type ClienteFicha = ClienteItem & {
  fecha_nacimiento: string | null; direccion: string | null; observaciones: string | null
  updated_at: string; total_reservas: number; reservas_activas: number
  total_pagado: number; pagos_pendientes: number; ultima_reserva: string | null
  proxima_reserva: { fecha_entrada: string; fecha_salida: string; codigo: string } | null
  calificacion_promedio: number | null
}
type Reserva = {
  id: string; codigo_reserva: string; fecha_entrada: string; fecha_salida: string
  estado: string; total_estimado: number; total_pagado: number; noches: number
  cantidad_adultos: number; cantidad_ninos: number; observaciones: string | null
  created_at: string; habitaciones: { numero: string; tipo: string }[]
}
type Pago = {
  id: string; monto: number; moneda: string; tipo_pago: string; estado: string
  referencia: string | null; fecha_pago: string; observaciones: string | null; codigo_reserva: string
}
type Estadia = {
  codigo_reserva: string; fecha_entrada: string; fecha_salida: string; noches: number
  estado_reserva: string; fecha_checkin: string | null; fecha_checkout: string | null
  total_final: number | null; cargos_extra: number | null; descuento: number | null
}
type Resena = {
  id: string; calificacion: number; titulo: string | null; comentario: string | null
  cal_limpieza: number | null; cal_atencion: number | null; cal_ubicacion: number | null
  cal_precio: number | null; visible: boolean; created_at: string; codigo_reserva: string
}
type Incidencia = {
  id: string; codigo: string; titulo: string; categoria: string
  prioridad: string; estado: string; solucion: string | null; created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtMoney = (n: number) => `Bs ${Number(n).toFixed(2)}`

const NIVEL_COLOR: Record<string, string> = {
  Visitante: '#9696a0', Bronce: '#cd7f32', Plata: '#a8a9ad',
  Oro: '#d4af6a', Platino: '#b9f2ff', Diamante: '#f8e4ff',
}
const NIVEL_EMOJI: Record<string, string> = {
  Visitante: '⭐', Bronce: '🥉', Plata: '🥈', Oro: '🥇', Platino: '💎', Diamante: '👑',
}
const ESTADO_COLOR: Record<string, string> = {
  activo: '#34d399', bloqueado: '#f87171', inactivo: '#9696a0', pendiente: '#d4af6a',
}
const RES_COLOR: Record<string, string> = {
  pendiente: '#d4af6a', confirmada: '#52c97a', en_estadia: '#6ab8d4',
  completada: '#9696a0', cancelada: '#e05252', rechazada: '#e05252',
}
const TABS = [
  { id: 'general',     icon: '📋', label: 'General' },
  { id: 'reservas',    icon: '🏨', label: 'Reservas' },
  { id: 'estadias',    icon: '🛏️', label: 'Estadías' },
  { id: 'pagos',       icon: '💰', label: 'Pagos' },
  { id: 'resenas',     icon: '⭐', label: 'Reseñas' },
  { id: 'incidencias', icon: '⚠️', label: 'Incidencias' },
  { id: 'fidelizacion',icon: '🎁', label: 'Fidelización' },
]

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({ cliente, onClose, onSaved }: {
  cliente: ClienteFicha; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    nombre_completo: cliente.nombre_completo,
    telefono: cliente.telefono ?? '',
    estado: cliente.estado,
    tipo_documento: cliente.tipo_documento,
    numero_documento: cliente.numero_documento,
    nacionalidad: cliente.nacionalidad ?? '',
    fecha_nacimiento: cliente.fecha_nacimiento ?? '',
    direccion: cliente.direccion ?? '',
    ciudad: cliente.ciudad ?? '',
    pais: cliente.pais ?? '',
    observaciones: cliente.observaciones ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const inp: React.CSSProperties = {
    background: '#0f0f12', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 7,
    padding: '8px 11px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.78rem',
    color: '#f0ece4', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'rgba(240,236,228,0.35)', marginBottom: 4, display: 'block',
  }

  const guardar = async () => {
    setGuardando(true); setErr(null)
    try {
      await rpc('rpc_actualizar_cliente_admin', {
        p_cliente_id:       cliente.id,
        p_nombre_completo:  form.nombre_completo || null,
        p_telefono:         form.telefono || null,
        p_estado:           form.estado,
        p_tipo_documento:   form.tipo_documento || null,
        p_numero_documento: form.numero_documento || null,
        p_nacionalidad:     form.nacionalidad || null,
        p_fecha_nacimiento: form.fecha_nacimiento || null,
        p_direccion:        form.direccion || null,
        p_ciudad:           form.ciudad || null,
        p_pais:             form.pais || null,
        p_observaciones:    form.observaciones || null,
      })
      onSaved()
      onClose()
    } catch (e) { setErr((e as Error).message) }
    finally { setGuardando(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#111118', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 14, width: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.3rem', color: '#d4af6a' }}>Editar Cliente</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(240,236,228,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { key: 'nombre_completo', label: 'Nombre completo', span: 2 },
            { key: 'telefono',        label: 'Teléfono' },
            { key: 'estado',          label: 'Estado', type: 'select', opts: ['activo','inactivo','bloqueado'] },
            { key: 'tipo_documento',  label: 'Tipo documento', type: 'select', opts: ['CI','Pasaporte','RUC','Otro'] },
            { key: 'numero_documento',label: 'Nro. documento' },
            { key: 'nacionalidad',    label: 'Nacionalidad' },
            { key: 'fecha_nacimiento',label: 'Fecha nacimiento', type: 'date' },
            { key: 'ciudad',          label: 'Ciudad' },
            { key: 'pais',            label: 'País' },
            { key: 'direccion',       label: 'Dirección', span: 2 },
            { key: 'observaciones',   label: 'Observaciones', span: 2, type: 'textarea' },
          ].map(f => (
            <div key={f.key} style={{ gridColumn: f.span === 2 ? '1 / -1' : undefined }}>
              <label style={lbl}>{f.label}</label>
              {f.type === 'select' ? (
                <select value={form[f.key as keyof typeof form] as string}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...inp, cursor: 'pointer' }}>
                  {f.opts?.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={2} value={form[f.key as keyof typeof form] as string}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...inp, resize: 'none' }} />
              ) : (
                <input type={f.type ?? 'text'} value={form[f.key as keyof typeof form] as string}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inp} />
              )}
            </div>
          ))}
        </div>
        {err && <div style={{ margin: '0 24px 12px', padding: '8px 12px', background: 'rgba(224,82,82,0.1)', borderRadius: 7, fontSize: '0.72rem', color: '#e05252' }}>{err}</div>}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,236,228,0.5)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.73rem' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ background: 'rgba(212,175,106,0.15)', border: '1px solid rgba(212,175,106,0.3)', color: '#d4af6a', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.73rem', fontWeight: 600, opacity: guardando ? 0.6 : 1 }}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Clientes() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'Administrador' || perfil?.rol === 'Supervisor'

  const [clientes, setClientes]   = useState<ClienteItem[]>([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [fNivel,   setFNivel]     = useState('')
  const [fEstado,  setFEstado]    = useState('')
  const [sel,      setSel]        = useState<ClienteFicha | null>(null)
  const [tabActiva,setTabActiva]  = useState('general')
  const [editando, setEditando]   = useState(false)
  const [cargandoFicha, setCargandoFicha] = useState(false)

  // Datos de tabs lazy
  const [reservas,    setReservas]    = useState<Reserva[]>([])
  const [pagos,       setPagos]       = useState<Pago[]>([])
  const [estadias,    setEstadias]    = useState<Estadia[]>([])
  const [resenas,     setResenas]     = useState<Resena[]>([])
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [cargandoTab, setCargandoTab] = useState(false)

  const cargarClientes = useCallback(async () => {
    setCargando(true)
    try {
      const d = await rpc('rpc_get_clientes', {
        p_busqueda: busqueda || null,
        p_nivel:    fNivel   || null,
        p_estado:   fEstado  || null,
      })
      setClientes((d as ClienteItem[]) ?? [])
    } catch { /* silencioso */ }
    finally { setCargando(false) }
  }, [busqueda, fNivel, fEstado])

  useEffect(() => { cargarClientes() }, [cargarClientes])

  const abrirCliente = async (id: string) => {
    setCargandoFicha(true); setTabActiva('general')
    setReservas([]); setPagos([]); setEstadias([]); setResenas([]); setIncidencias([])
    try {
      const d = await rpc('rpc_get_cliente_ficha', { p_cliente_id: id })
      setSel(d as ClienteFicha)
    } catch { /* silencioso */ }
    finally { setCargandoFicha(false) }
  }

  useEffect(() => {
    if (!sel) return
    const cargarTab = async () => {
      setCargandoTab(true)
      try {
        if (tabActiva === 'reservas' && reservas.length === 0) {
          const d = await rpc('rpc_get_reservas_cliente', { p_cliente_id: sel.id })
          setReservas((d as Reserva[]) ?? [])
        }
        if (tabActiva === 'pagos' && pagos.length === 0) {
          const d = await rpc('rpc_get_pagos_cliente', { p_cliente_id: sel.id })
          setPagos((d as Pago[]) ?? [])
        }
        if (tabActiva === 'estadias' && estadias.length === 0) {
          const d = await rpc('rpc_get_estadias_cliente', { p_cliente_id: sel.id })
          setEstadias((d as Estadia[]) ?? [])
        }
        if (tabActiva === 'resenas' && resenas.length === 0) {
          const d = await rpc('rpc_get_resenas_cliente', { p_cliente_id: sel.id })
          setResenas((d as Resena[]) ?? [])
        }
        if (tabActiva === 'incidencias' && incidencias.length === 0) {
          const d = await rpc('rpc_get_incidencias_cliente', { p_cliente_id: sel.id })
          setIncidencias((d as Incidencia[]) ?? [])
        }
      } catch { /* silencioso */ }
      finally { setCargandoTab(false) }
    }
    cargarTab()
  }, [tabActiva, sel]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    total:      clientes.length,
    activos:    clientes.filter(c => c.estado === 'activo').length,
    vip:        clientes.filter(c => ['Oro','Platino','Diamante'].includes(c.nivel_fidelidad)).length,
    nuevos_mes: clientes.filter(c => new Date(c.created_at) >= new Date(new Date().setDate(1))).length,
    frecuentes: clientes.filter(c => c.total_reservas_completadas >= 3).length,
  }), [clientes])

  const pill = (txt: string, color: string) => (
    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', background: color + '20', color, border: `1px solid ${color}40` }}>{txt}</span>
  )

  const row = (lbl: string, val: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: '0.62rem', color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lbl}</span>
      <span style={{ fontSize: '0.78rem', color: 'rgba(240,236,228,0.75)', textAlign: 'right', maxWidth: '60%' }}>{val ?? '—'}</span>
    </div>
  )

  return (
    <>
      <style>{`
        .cli-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s}
        .cli-row:hover{background:rgba(212,175,106,0.03)}
        .cli-row.sel{background:rgba(212,175,106,0.06);border-left:2px solid rgba(212,175,106,0.4)}
        .cli-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;background:rgba(212,175,106,0.1);display:flex;align-items:center;justify-content:center;font-size:1rem;color:#d4af6a;flex-shrink:0}
        .cli-panel{position:fixed;top:0;right:0;bottom:0;width:520px;max-width:96vw;background:#0f0f12;border-left:1px solid rgba(212,175,106,0.15);z-index:200;display:flex;flex-direction:column;animation:cpslide 0.28s cubic-bezier(0.16,1,0.3,1)}
        @keyframes cpslide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .cp-tabs{display:flex;overflow-x:auto;border-bottom:1px solid rgba(212,175,106,0.1);padding:0 16px}
        .cp-tabs::-webkit-scrollbar{height:0}
        .cp-tab{padding:10px 14px;font-family:Montserrat,sans-serif;font-size:0.63rem;font-weight:600;letter-spacing:0.08em;white-space:nowrap;background:transparent;border:none;cursor:pointer;color:rgba(240,236,228,0.35);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s;text-transform:uppercase}
        .cp-tab.active{color:#d4af6a;border-bottom-color:#d4af6a}
        .cp-body{flex:1;overflow-y:auto;padding:16px 20px 28px}
        .cp-body::-webkit-scrollbar{width:3px}
        .cp-body::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.18)}
        .res-card{background:#13131a;border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:12px 14px;margin-bottom:10px}
        .stars{color:#d4af6a;font-size:0.85rem}
      `}</style>

      <PersonalLayout titulo="Clientes" subtitulo="Gestión de huéspedes y clientes">

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total',      val: stats.total,      color: '#d4af6a' },
            { label: 'Activos',    val: stats.activos,    color: '#34d399' },
            { label: 'VIP+',       val: stats.vip,        color: '#f8e4ff' },
            { label: 'Frecuentes', val: stats.frecuentes, color: '#6ab8d4' },
            { label: 'Nuevos mes', val: stats.nuevos_mes, color: '#d4af6a' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,106,0.1)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2rem', color: s.color, lineHeight: 1 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18, alignItems: 'center' }}>
          <input placeholder="Buscar nombre, correo, documento..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', color: '#f0ece4', fontFamily: 'Montserrat,sans-serif', fontSize: '0.75rem', outline: 'none', flex: '1 1 220px' }} />
          <select value={fEstado} onChange={e => setFEstado(e.target.value)}
            style={{ background: '#0f0f12', border: '1px solid rgba(212,175,106,0.15)', borderRadius: 8, padding: '8px 10px', color: 'rgba(240,236,228,0.6)', fontFamily: 'Montserrat,sans-serif', fontSize: '0.73rem', outline: 'none', cursor: 'pointer' }}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <select value={fNivel} onChange={e => setFNivel(e.target.value)}
            style={{ background: '#0f0f12', border: '1px solid rgba(212,175,106,0.15)', borderRadius: 8, padding: '8px 10px', color: 'rgba(240,236,228,0.6)', fontFamily: 'Montserrat,sans-serif', fontSize: '0.73rem', outline: 'none', cursor: 'pointer' }}>
            <option value="">Todos los niveles</option>
            {['Visitante','Bronce','Plata','Oro','Platino','Diamante'].map(n => (
              <option key={n} value={n}>{NIVEL_EMOJI[n]} {n}</option>
            ))}
          </select>
          <button onClick={cargarClientes} style={{ background: 'none', border: '1px solid rgba(212,175,106,0.2)', color: '#d4af6a', borderRadius: 8, padding: '7px 13px', cursor: 'pointer', fontSize: '0.8rem' }}>↻</button>
        </div>

        {/* Lista */}
        <div style={{ background: '#111118', border: '1px solid rgba(212,175,106,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 14, padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['', 'Cliente', 'Nivel', 'Estado'].map(h => (
              <div key={h} style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.25)' }}>{h}</div>
            ))}
          </div>
          {cargando ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(240,236,228,0.25)', fontSize: '0.78rem' }}>Cargando clientes...</div>
          ) : clientes.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(240,236,228,0.25)', fontSize: '0.78rem' }}>No se encontraron clientes</div>
          ) : clientes.map(c => (
            <div key={c.id} className={`cli-row ${sel?.id === c.id ? 'sel' : ''}`} onClick={() => abrirCliente(c.id)}>
              <div className="cli-avatar">
                {c.foto_url ? <img src={c.foto_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : c.nombre_completo.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#f0ece4', marginBottom: 2 }}>{c.nombre_completo}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.35)' }}>{c.correo} · {c.numero_documento}</div>
              </div>
              <div style={{ color: NIVEL_COLOR[c.nivel_fidelidad] || '#d4af6a', fontSize: '0.75rem' }}>
                {NIVEL_EMOJI[c.nivel_fidelidad]} {c.nivel_fidelidad}
              </div>
              <div>{pill(c.estado, ESTADO_COLOR[c.estado] || '#9696a0')}</div>
            </div>
          ))}
        </div>
      </PersonalLayout>

      {/* Panel detalle */}
      {(sel || cargandoFicha) && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.3)' }} onClick={() => setSel(null)} />
          <div className="cli-panel">
            {cargandoFicha || !sel ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,236,228,0.25)', fontSize: '0.78rem' }}>Cargando ficha...</div>
            ) : (
              <>
                {/* Header del panel */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(212,175,106,0.1)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div className="cli-avatar" style={{ width: 48, height: 48, fontSize: '1.4rem', flexShrink: 0 }}>
                    {sel.foto_url ? <img src={sel.foto_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : sel.nombre_completo.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.25rem', color: '#f0ece4' }}>{sel.nombre_completo}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.4)', marginBottom: 6 }}>{sel.correo}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {pill(sel.estado, ESTADO_COLOR[sel.estado] || '#9696a0')}
                      <span style={{ fontSize: '0.7rem', color: NIVEL_COLOR[sel.nivel_fidelidad] || '#d4af6a' }}>{NIVEL_EMOJI[sel.nivel_fidelidad]} {sel.nivel_fidelidad}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {esAdmin && (
                      <button onClick={() => setEditando(true)}
                        style={{ background: 'rgba(212,175,106,0.1)', border: '1px solid rgba(212,175,106,0.25)', color: '#d4af6a', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'Montserrat,sans-serif' }}>
                        ✎ Editar
                      </button>
                    )}
                    <button onClick={() => setSel(null)}
                      style={{ background: 'none', border: 'none', color: 'rgba(240,236,228,0.3)', cursor: 'pointer', fontSize: '1.1rem', padding: 4 }}>✕</button>
                  </div>
                </div>

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid rgba(212,175,106,0.08)' }}>
                  {[
                    { label: 'Reservas',  val: sel.total_reservas },
                    { label: 'Estadías',  val: sel.total_reservas_completadas },
                    { label: 'Gastado',   val: fmtMoney(sel.total_gastado) },
                    { label: 'Puntos',    val: sel.puntos_fidelidad },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '10px 14px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.4rem', color: '#d4af6a' }}>{s.val}</div>
                      <div style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="cp-tabs">
                  {TABS.map(t => (
                    <button key={t.id} className={`cp-tab ${tabActiva === t.id ? 'active' : ''}`} onClick={() => setTabActiva(t.id)}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="cp-body">
                  {cargandoTab && <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.25)', fontSize: '0.75rem', padding: 24 }}>Cargando...</div>}

                  {/* GENERAL */}
                  {!cargandoTab && tabActiva === 'general' && (
                    <>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.27)', marginBottom: 10 }}>Datos Personales</div>
                      {row('Teléfono', sel.telefono)}
                      {row('Documento', `${sel.tipo_documento} · ${sel.numero_documento}`)}
                      {row('Nacionalidad', sel.nacionalidad)}
                      {row('Nacimiento', sel.fecha_nacimiento ? fmt(sel.fecha_nacimiento) : null)}
                      {row('Dirección', sel.direccion)}
                      {row('Ciudad / País', [sel.ciudad, sel.pais].filter(Boolean).join(', '))}
                      {row('Registrado', fmt(sel.created_at))}
                      {row('Actualizado', fmt(sel.updated_at))}
                      {sel.observaciones && (
                        <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(212,175,106,0.05)', borderRadius: 8, fontSize: '0.73rem', color: 'rgba(240,236,228,0.55)' }}>{sel.observaciones}</div>
                      )}
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.27)', margin: '18px 0 10px' }}>Hospedaje</div>
                      {row('Última reserva', sel.ultima_reserva ? fmt(sel.ultima_reserva) : null)}
                      {row('Próxima reserva', sel.proxima_reserva ? `${fmt(sel.proxima_reserva.fecha_entrada)} · ${sel.proxima_reserva.codigo}` : 'Sin reservas futuras')}
                      {row('Calificación promedio', sel.calificacion_promedio ? `${sel.calificacion_promedio} / 5` : null)}
                      {row('Pagos pendientes', sel.pagos_pendientes > 0 ? `${sel.pagos_pendientes} pendiente(s)` : 'Al día')}
                    </>
                  )}

                  {/* RESERVAS */}
                  {!cargandoTab && tabActiva === 'reservas' && (
                    reservas.length === 0
                      ? <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.25)', fontSize: '0.75rem', padding: 24 }}>Sin reservas registradas</div>
                      : reservas.map(r => (
                        <div key={r.id} className="res-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1rem', color: '#d4af6a' }}>{r.codigo_reserva}</span>
                            {pill(r.estado, RES_COLOR[r.estado] || '#9696a0')}
                          </div>
                          {row('Fechas', `${fmt(r.fecha_entrada)} → ${fmt(r.fecha_salida)} (${r.noches}n)`)}
                          {row('Habitación', r.habitaciones.map(h => `${h.numero} · ${h.tipo}`).join(', '))}
                          {row('Total estimado', fmtMoney(r.total_estimado))}
                          {row('Total pagado', fmtMoney(r.total_pagado))}
                          {row('Huéspedes', `${r.cantidad_adultos} adultos${r.cantidad_ninos ? `, ${r.cantidad_ninos} niños` : ''}`)}
                        </div>
                      ))
                  )}

                  {/* ESTADÍAS */}
                  {!cargandoTab && tabActiva === 'estadias' && (
                    estadias.length === 0
                      ? <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.25)', fontSize: '0.75rem', padding: 24 }}>Sin estadías registradas</div>
                      : estadias.map((e, i) => (
                        <div key={i} className="res-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '0.95rem', color: '#d4af6a' }}>{e.codigo_reserva}</span>
                            {pill(e.estado_reserva, RES_COLOR[e.estado_reserva] || '#9696a0')}
                          </div>
                          {row('Fechas', `${fmt(e.fecha_entrada)} → ${fmt(e.fecha_salida)} (${e.noches}n)`)}
                          {row('Check-in', e.fecha_checkin ? fmt(e.fecha_checkin) : null)}
                          {row('Check-out', e.fecha_checkout ? fmt(e.fecha_checkout) : null)}
                          {row('Total final', e.total_final ? fmtMoney(e.total_final) : null)}
                          {e.descuento ? row('Descuento', fmtMoney(e.descuento)) : null}
                        </div>
                      ))
                  )}

                  {/* PAGOS */}
                  {!cargandoTab && tabActiva === 'pagos' && (
                    pagos.length === 0
                      ? <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.25)', fontSize: '0.75rem', padding: 24 }}>Sin pagos registrados</div>
                      : pagos.map(p => (
                        <div key={p.id} className="res-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', color: '#52c97a' }}>{fmtMoney(p.monto)}</span>
                            {pill(p.estado, p.estado === 'aprobado' ? '#52c97a' : '#e05252')}
                          </div>
                          {row('Reserva', p.codigo_reserva)}
                          {row('Tipo', p.tipo_pago)}
                          {row('Fecha', fmt(p.fecha_pago))}
                          {row('Referencia', p.referencia)}
                        </div>
                      ))
                  )}

                  {/* RESEÑAS */}
                  {!cargandoTab && tabActiva === 'resenas' && (
                    resenas.length === 0
                      ? <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.25)', fontSize: '0.75rem', padding: 24 }}>Sin reseñas registradas</div>
                      : resenas.map(r => (
                        <div key={r.id} className="res-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div className="stars">{'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}</div>
                            <span style={{ fontSize: '0.62rem', color: 'rgba(240,236,228,0.35)' }}>{fmt(r.created_at)}</span>
                          </div>
                          {r.titulo && <div style={{ fontSize: '0.82rem', color: '#f0ece4', marginBottom: 4 }}>{r.titulo}</div>}
                          {r.comentario && <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.55)', lineHeight: 1.5 }}>{r.comentario}</div>}
                          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                            {[['Limpieza', r.cal_limpieza],['Atención', r.cal_atencion],['Ubicación', r.cal_ubicacion],['Precio', r.cal_precio]].map(([l, v]) =>
                              v ? <span key={l as string} style={{ fontSize: '0.6rem', color: 'rgba(240,236,228,0.4)' }}>{l as string}: {'★'.repeat(v as number)}</span> : null
                            )}
                          </div>
                          {row('Reserva', r.codigo_reserva)}
                        </div>
                      ))
                  )}

                  {/* INCIDENCIAS */}
                  {!cargandoTab && tabActiva === 'incidencias' && (
                    incidencias.length === 0
                      ? <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.25)', fontSize: '0.75rem', padding: 24 }}>Sin incidencias registradas</div>
                      : incidencias.map(i => (
                        <div key={i.id} className="res-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.62rem', color: 'rgba(240,236,228,0.35)', fontFamily: 'monospace' }}>{i.codigo}</span>
                            {pill(i.estado, i.estado === 'resuelto' ? '#52c97a' : i.estado === 'en_proceso' ? '#d4af6a' : '#9696a0')}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#f0ece4', marginBottom: 6 }}>{i.titulo}</div>
                          {row('Categoría', i.categoria)}
                          {row('Prioridad', i.prioridad)}
                          {row('Fecha', fmt(i.created_at))}
                          {i.solucion && <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(82,201,122,0.07)', borderRadius: 6, fontSize: '0.7rem', color: 'rgba(82,201,122,0.8)' }}>✓ {i.solucion}</div>}
                        </div>
                      ))
                  )}

                  {/* FIDELIZACIÓN */}
                  {!cargandoTab && tabActiva === 'fidelizacion' && (
                    <>
                      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>{NIVEL_EMOJI[sel.nivel_fidelidad]}</div>
                        <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2rem', color: NIVEL_COLOR[sel.nivel_fidelidad] }}>{sel.nivel_fidelidad}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.35)', marginTop: 4 }}>Nivel de fidelización</div>
                      </div>
                      <div style={{ background: '#13131a', border: '1px solid rgba(212,175,106,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                        {row('Puntos acumulados', `${sel.puntos_fidelidad} pts`)}
                        {row('Reservas completadas', sel.total_reservas_completadas)}
                        {row('Total gastado', fmtMoney(sel.total_gastado))}
                        {row('Calificación promedio', sel.calificacion_promedio ? `${sel.calificacion_promedio} / 5` : '—')}
                      </div>
                      <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(212,175,106,0.04)', border: '1px solid rgba(212,175,106,0.1)', borderRadius: 10 }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 8 }}>Niveles del programa</div>
                        {[['Visitante','0 pts','⭐'],['Bronce','100 pts','🥉'],['Plata','500 pts','🥈'],['Oro','1000 pts','🥇'],['Platino','3000 pts','💎'],['Diamante','7000 pts','👑']].map(([n, p, e]) => (
                          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: n === sel.nivel_fidelidad ? 1 : 0.4 }}>
                            <span style={{ fontSize: '0.75rem', color: n === sel.nivel_fidelidad ? NIVEL_COLOR[n] : 'rgba(240,236,228,0.6)' }}>{e} {n}</span>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.4)' }}>{p}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Modal de edición */}
      {editando && sel && (
        <EditModal
          cliente={sel}
          onClose={() => setEditando(false)}
          onSaved={() => { cargarClientes(); abrirCliente(sel.id) }}
        />
      )}
    </>
  )
}
