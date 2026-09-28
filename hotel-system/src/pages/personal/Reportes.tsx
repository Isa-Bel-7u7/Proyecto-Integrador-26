import { useState, useEffect, useMemo } from 'react'
import { getReportesResumen, getTodasLasResenas, getTopHabitaciones } from '../../services/api'
import type { ResenaPersonal, TopHabitacion } from '../../services/api'
import PersonalLayout from '../../components/PersonalLayout'

type ReservaReporte    = { id: string; estado: string; created_at: string; total_estimado: number }
type PagoReporte       = { estado: string; monto: number; fecha_pago: string | null; metodos_pago: { nombre: string } | null }
type HabitacionReporte = { estado: string; tipo_habitacion_id: string }
type IncidenciaReporte = { categoria: string; estado: string; prioridad: string }

type DatosReporte = {
  reservas:     ReservaReporte[]
  pagos:        PagoReporte[]
  habitaciones: HabitacionReporte[]
  incidencias:  IncidenciaReporte[]
}

const COLORES_HAB: Record<string, string> = {
  disponible: '#52c97a', ocupada: '#d4af6a', reservada: '#6ab8d4',
  limpieza: '#a06ad4', mantenimiento: '#d47a6a',
}

const getFechaInicio = (periodo: string): string => {
  const d = new Date()
  if (periodo === 'semana')    d.setDate(d.getDate() - 7)
  else if (periodo === 'mes')  d.setMonth(d.getMonth() - 1)
  else if (periodo === 'trimestre') d.setMonth(d.getMonth() - 3)
  else if (periodo === 'año')  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().split('T')[0]
}

const Reportes = () => {
  const [periodoActivo, setPeriodoActivo] = useState('mes')
  const [tabActivo, setTabActivo]         = useState('general')
  const [datos, setDatos]   = useState<DatosReporte>({ reservas: [], pagos: [], habitaciones: [], incidencias: [] })
  const [resenas, setResenas]             = useState<ResenaPersonal[]>([])
  const [topHabs, setTopHabs]             = useState<TopHabitacion[]>([])
  const [cargando, setCargando]           = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)
      try {
        const [d, r, t] = await Promise.all([
          getReportesResumen(),
          getTodasLasResenas(),
          getTopHabitaciones(),
        ])
        setDatos(d as unknown as DatosReporte)
        setResenas(r)
        setTopHabs(t)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar reportes')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  // ── Datos filtrados por período ───────────────────────────────────────────
  const fechaInicio = getFechaInicio(periodoActivo)

  const reservasPeriodo = useMemo(() =>
    datos.reservas.filter(r => r.created_at >= fechaInicio), [datos.reservas, fechaInicio])

  const pagosAprobados = useMemo(() =>
    datos.pagos.filter(p => p.estado === 'aprobado' && p.fecha_pago && p.fecha_pago >= fechaInicio),
    [datos.pagos, fechaInicio])

  const resenasPeriodo = useMemo(() =>
    resenas.filter(r => r.created_at >= fechaInicio), [resenas, fechaInicio])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalIngresos   = pagosAprobados.reduce((s, p) => s + Number(p.monto), 0)
  const totalReservas   = reservasPeriodo.length
  const finalizadas     = reservasPeriodo.filter(r => r.estado === 'finalizada')
  const ticketPromedio  = finalizadas.length > 0
    ? finalizadas.reduce((s, r) => s + Number(r.total_estimado), 0) / finalizadas.length : 0
  const totalHabitaciones = datos.habitaciones.length
  const ocupadas          = datos.habitaciones.filter(h => h.estado === 'ocupada').length
  const tasaOcupacion     = totalHabitaciones > 0 ? Math.round((ocupadas / totalHabitaciones) * 100) : 0
  const tasaCancelacion   = totalReservas > 0
    ? Math.round((reservasPeriodo.filter(r => r.estado === 'cancelada').length / totalReservas) * 100) : 0
  const calPromedio = resenasPeriodo.length > 0
    ? resenasPeriodo.reduce((s, r) => s + r.calificacion, 0) / resenasPeriodo.length : 0

  // ── Distribuciones ────────────────────────────────────────────────────────
  const reservasPorEstado = [
    { estado: 'Confirmadas', cantidad: reservasPeriodo.filter(r => r.estado === 'confirmada').length,  color: '#52c97a' },
    { estado: 'En estadía',  cantidad: reservasPeriodo.filter(r => r.estado === 'en_estadia').length,  color: '#6ab8d4' },
    { estado: 'Finalizadas', cantidad: reservasPeriodo.filter(r => r.estado === 'finalizada').length,  color: '#9696a0' },
    { estado: 'Canceladas',  cantidad: reservasPeriodo.filter(r => r.estado === 'cancelada').length,   color: '#e05252' },
    { estado: 'Pendientes',  cantidad: reservasPeriodo.filter(r => r.estado === 'pendiente').length,   color: '#d4af6a' },
  ].filter(r => r.cantidad > 0)

  const habitacionesPorEstado = [
    { estado: 'Disponibles',   cantidad: datos.habitaciones.filter(h => h.estado === 'disponible').length,    color: COLORES_HAB.disponible },
    { estado: 'Ocupadas',      cantidad: datos.habitaciones.filter(h => h.estado === 'ocupada').length,       color: COLORES_HAB.ocupada },
    { estado: 'Reservadas',    cantidad: datos.habitaciones.filter(h => h.estado === 'reservada').length,     color: COLORES_HAB.reservada },
    { estado: 'Limpieza',      cantidad: datos.habitaciones.filter(h => h.estado === 'limpieza').length,      color: COLORES_HAB.limpieza },
    { estado: 'Mantenimiento', cantidad: datos.habitaciones.filter(h => h.estado === 'mantenimiento').length, color: COLORES_HAB.mantenimiento },
  ].filter(h => h.cantidad > 0)

  const pagosPorMetodo = useMemo(() => {
    const mapa: Record<string, { monto: number; cantidad: number }> = {}
    pagosAprobados.forEach(p => {
      const n = p.metodos_pago?.nombre ?? 'Otro'
      if (!mapa[n]) mapa[n] = { monto: 0, cantidad: 0 }
      mapa[n].monto += Number(p.monto)
      mapa[n].cantidad++
    })
    return Object.entries(mapa).map(([metodo, v]) => ({ metodo, ...v })).sort((a, b) => b.monto - a.monto)
  }, [pagosAprobados])

  const incidenciasPorTipo = useMemo(() => {
    const mapa: Record<string, number> = {}
    datos.incidencias.forEach(i => { mapa[i.categoria] = (mapa[i.categoria] ?? 0) + 1 })
    return Object.entries(mapa).map(([tipo, cantidad]) => ({ tipo, cantidad })).sort((a, b) => b.cantidad - a.cantidad)
  }, [datos.incidencias])

  // ── Ingresos mensuales (últimos 6 meses) ─────────────────────────────────
  const ingresosPorMes = useMemo(() => {
    const meses: Record<string, number> = {}
    const ahora = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      meses[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0
    }
    datos.pagos.filter(p => p.estado === 'aprobado').forEach(p => {
      if (!p.fecha_pago) return
      const key = p.fecha_pago.slice(0, 7)
      if (key in meses) meses[key] += Number(p.monto)
    })
    return Object.entries(meses).map(([mes, monto]) => ({
      label: new Date(mes + '-01').toLocaleDateString('es-BO', { month: 'short' }),
      monto,
    }))
  }, [datos.pagos])
  const maxIngreso = Math.max(...ingresosPorMes.map(m => m.monto), 1)

  // ── Reseñas: distribución y tendencia ────────────────────────────────────
  const distResenas = [5, 4, 3, 2, 1].map(n => ({
    cal: n,
    count: resenasPeriodo.filter(r => r.calificacion === n).length,
  }))

  const resenasPorMes = useMemo(() => {
    const meses: Record<string, { count: number; suma: number }> = {}
    const ahora = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      meses[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = { count: 0, suma: 0 }
    }
    resenas.forEach(r => {
      const key = r.created_at.slice(0, 7)
      if (key in meses) { meses[key].count++; meses[key].suma += r.calificacion }
    })
    return Object.entries(meses).map(([mes, v]) => ({
      label: new Date(mes + '-01').toLocaleDateString('es-BO', { month: 'short' }),
      count: v.count,
      promedio: v.count > 0 ? v.suma / v.count : 0,
    }))
  }, [resenas])
  const maxResenas = Math.max(...resenasPorMes.map(m => m.count), 1)

  const btnImprimir = (
    <button onClick={() => window.print()}
      style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#c9a84c,#d4af6a)', border: 'none', borderRadius: 6, fontFamily: 'Montserrat,sans-serif', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', color: '#0a0a0a', cursor: 'pointer' }}>
      🖨️ Imprimir / PDF
    </button>
  )

  const BarraEstado = ({ cantidad, total, color }: { cantidad: number; total: number; color: string }) => (
    <div style={{ flex: 2, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 3, background: color, width: `${total > 0 ? (cantidad / total) * 100 : 0}%`, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
    </div>
  )

  return (
    <>
      <style>{`
        .rep-tabs-bar { display: flex; gap: 8px; margin-bottom: 28px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
        .rep-tabs-left { display: flex; gap: 6px; flex-wrap: wrap; }
        .rep-tab-btn { padding: 9px 18px; border-radius: 8px; font-size: 0.72rem; font-weight: 500; letter-spacing: 0.08em; cursor: pointer; border: 1px solid rgba(212,175,106,0.15); background: transparent; color: rgba(240,236,228,0.45); transition: all 0.2s; font-family: 'Montserrat', sans-serif; }
        .rep-tab-btn:hover { border-color: rgba(212,175,106,0.3); color: #f0ece4; }
        .rep-tab-btn.activo { background: rgba(212,175,106,0.12); border-color: rgba(212,175,106,0.35); color: #d4af6a; }
        .rep-periodo-tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,106,0.1); border-radius: 8px; padding: 3px; }
        .rep-periodo-tab { padding: 6px 14px; border-radius: 6px; font-size: 0.68rem; font-weight: 500; cursor: pointer; transition: all 0.2s; color: rgba(240,236,228,0.4); font-family: 'Montserrat', sans-serif; border: none; background: transparent; }
        .rep-periodo-tab.activo { background: rgba(212,175,106,0.15); color: #d4af6a; }
        .rep-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px; margin-bottom: 28px; }
        .rep-kpi-card { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 12px; padding: 20px; }
        .rep-kpi-label { font-size: 0.62rem; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,236,228,0.35); margin-bottom: 8px; }
        .rep-kpi-valor { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 300; line-height: 1; margin-bottom: 6px; }
        .rep-kpi-sub { font-size: 0.68rem; color: rgba(240,236,228,0.3); }
        .rep-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        @media (max-width: 1100px) { .rep-grid { grid-template-columns: 1fr; } }
        .rep-wide { grid-column: 1 / -1; }
        @media (max-width: 1100px) { .rep-wide { grid-column: 1; } }
        .rep-panel { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 12px; overflow: hidden; }
        .rep-panel-header { padding: 16px 20px; border-bottom: 1px solid rgba(212,175,106,0.07); display: flex; align-items: center; justify-content: space-between; }
        .rep-panel-title { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,236,228,0.5); }
        .rep-panel-badge { font-size: 0.65rem; background: rgba(212,175,106,0.1); color: #d4af6a; padding: 3px 10px; border-radius: 20px; }
        .rep-panel-body { padding: 20px; }
        .rep-chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 140px; padding-bottom: 24px; }
        .rep-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
        .rep-bar { border-radius: 4px 4px 0 0; transition: opacity 0.2s; position: relative; width: 28px; min-height: 4px; }
        .rep-bar:hover { opacity: 0.8; }
        .rep-bar-val { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 0.55rem; color: rgba(240,236,228,0.5); white-space: nowrap; }
        .rep-bar-label { font-size: 0.62rem; color: rgba(240,236,228,0.35); margin-top: 6px; }
        .rep-estados-lista { display: flex; flex-direction: column; gap: 10px; }
        .rep-estado-row { display: flex; align-items: center; gap: 12px; }
        .rep-estado-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .rep-estado-nombre { font-size: 0.75rem; color: rgba(240,236,228,0.65); flex: 1; }
        .rep-estado-cantidad { font-family: 'Cormorant Garamond', serif; font-size: 1rem; color: #f0ece4; min-width: 28px; text-align: right; }
        .rep-metodos-lista { display: flex; flex-direction: column; gap: 12px; }
        .rep-metodo-row { display: flex; align-items: center; gap: 10px; }
        .rep-metodo-nombre { font-size: 0.72rem; color: rgba(240,236,228,0.6); min-width: 120px; }
        .rep-metodo-barra-bg { flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
        .rep-metodo-barra-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg,#c9a84c,#d4af6a); transition: width 0.8s ease; }
        .rep-metodo-monto { font-family: 'Cormorant Garamond', serif; font-size: 0.9rem; color: #d4af6a; min-width: 80px; text-align: right; }
        .rep-metodo-cantidad { font-size: 0.65rem; color: rgba(240,236,228,0.25); min-width: 50px; text-align: right; }
        .rep-skeleton { background: linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: repShimmer 1.5s infinite; border-radius: 8px; }
        @keyframes repShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .rep-error-box { background: rgba(224,82,82,0.08); border: 1px solid rgba(224,82,82,0.2); border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 0.78rem; color: #e05252; }
        .rep-empty-chart { padding: 32px; text-align: center; color: rgba(240,236,228,0.2); font-size: 0.8rem; }
        .top-hab-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .top-hab-row:last-child { border-bottom: none; }
        .top-hab-rank { font-family:'Cormorant Garamond',serif; font-size:1.4rem; color:rgba(212,175,106,0.35); min-width:28px; }
        .top-hab-info { flex:1 }
        .top-hab-num { font-size:0.78rem; font-weight:600; color:#f0ece4; }
        .top-hab-tipo { font-size:0.65rem; color:rgba(240,236,228,0.35); }
        .top-hab-res { font-family:'Cormorant Garamond',serif; font-size:1.1rem; color:#d4af6a; min-width:30px; text-align:right; }
        .top-hab-ing { font-size:0.65rem; color:rgba(212,175,106,0.5); min-width:80px; text-align:right; }
        @media print {
          .pl-sidebar, .pl-topbar { display:none !important; }
          .pl-main { margin-left:0 !important; }
          .pl-content { padding:16px !important; }
        }
      `}</style>

      <PersonalLayout titulo="Reportes" subtitulo="Análisis operativo y financiero" accionesTopbar={btnImprimir}>
        {error && <div className="rep-error-box">{error}</div>}

        {/* Tabs + Período */}
        <div className="rep-tabs-bar">
          <div className="rep-tabs-left">
            {[
              { key: 'general',      label: 'General'      },
              { key: 'reservas',     label: 'Reservas'     },
              { key: 'financiero',   label: 'Financiero'   },
              { key: 'habitaciones', label: 'Habitaciones' },
              { key: 'resenas',      label: '⭐ Reseñas'   },
            ].map(t => (
              <button key={t.key}
                className={`rep-tab-btn ${tabActivo === t.key ? 'activo' : ''}`}
                onClick={() => setTabActivo(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="rep-periodo-tabs">
            {['semana','mes','trimestre','año'].map(p => (
              <button key={p}
                className={`rep-periodo-tab ${periodoActivo === p ? 'activo' : ''}`}
                onClick={() => setPeriodoActivo(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        {cargando ? (
          <div className="rep-kpi-grid">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rep-skeleton" style={{ height: 100 }} />)}
          </div>
        ) : (
          <div className="rep-kpi-grid">
            <div className="rep-kpi-card">
              <div className="rep-kpi-label">Total ingresos</div>
              <div className="rep-kpi-valor" style={{ color: '#d4af6a' }}>Bs. {totalIngresos.toLocaleString()}</div>
              <div className="rep-kpi-sub">Pagos aprobados</div>
            </div>
            <div className="rep-kpi-card">
              <div className="rep-kpi-label">Ticket promedio</div>
              <div className="rep-kpi-valor" style={{ color: '#c9a84c' }}>Bs. {Math.round(ticketPromedio).toLocaleString()}</div>
              <div className="rep-kpi-sub">{finalizadas.length} estadías finalizadas</div>
            </div>
            <div className="rep-kpi-card">
              <div className="rep-kpi-label">Total reservas</div>
              <div className="rep-kpi-valor" style={{ color: '#6ab8d4' }}>{totalReservas}</div>
              <div className="rep-kpi-sub">En el período</div>
            </div>
            <div className="rep-kpi-card">
              <div className="rep-kpi-label">Ocupación actual</div>
              <div className="rep-kpi-valor" style={{ color: '#52c97a' }}>{tasaOcupacion}%</div>
              <div className="rep-kpi-sub">{ocupadas} de {totalHabitaciones} hab.</div>
            </div>
            <div className="rep-kpi-card">
              <div className="rep-kpi-label">Tasa cancelación</div>
              <div className="rep-kpi-valor" style={{ color: '#e05252' }}>{tasaCancelacion}%</div>
              <div className="rep-kpi-sub">{reservasPeriodo.filter(r => r.estado === 'cancelada').length} canceladas</div>
            </div>
            <div className="rep-kpi-card">
              <div className="rep-kpi-label">Calificación prom.</div>
              <div className="rep-kpi-valor" style={{ color: '#d4af6a' }}>
                {resenasPeriodo.length > 0 ? calPromedio.toFixed(1) : '—'}
                {resenasPeriodo.length > 0 && <span style={{ fontSize: '1rem' }}> ★</span>}
              </div>
              <div className="rep-kpi-sub">{resenasPeriodo.length} reseñas</div>
            </div>
          </div>
        )}

        {!cargando && (
          <>
            {/* ── GENERAL / FINANCIERO ── */}
            {(tabActivo === 'general' || tabActivo === 'financiero') && (
              <div className="rep-grid">
                <div className="rep-panel rep-wide">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Ingresos mensuales</span>
                    <span className="rep-panel-badge">Últimos 6 meses</span>
                  </div>
                  <div className="rep-panel-body">
                    {ingresosPorMes.every(m => m.monto === 0)
                      ? <div className="rep-empty-chart">Sin ingresos registrados</div>
                      : (
                        <div className="rep-chart-bars">
                          {ingresosPorMes.map(m => (
                            <div key={m.label} className="rep-bar-wrap">
                              <div className="rep-bar" style={{ height: `${Math.max(4, (m.monto / maxIngreso) * 120)}px`, background: 'linear-gradient(180deg,#d4af6a,#b4900a)' }}>
                                {m.monto > 0 && <span className="rep-bar-val">{m.monto >= 1000 ? `${(m.monto/1000).toFixed(1)}k` : m.monto}</span>}
                              </div>
                              <span className="rep-bar-label">{m.label}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>
                </div>

                <div className="rep-panel">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Por método de pago</span>
                    <span className="rep-panel-badge">Bs. {totalIngresos.toLocaleString()}</span>
                  </div>
                  <div className="rep-panel-body">
                    {pagosPorMetodo.length === 0
                      ? <div className="rep-empty-chart">Sin pagos en el período</div>
                      : (
                        <div className="rep-metodos-lista">
                          {pagosPorMetodo.map(p => {
                            const max = Math.max(...pagosPorMetodo.map(x => x.monto), 1)
                            return (
                              <div key={p.metodo} className="rep-metodo-row">
                                <div className="rep-metodo-nombre">{p.metodo}</div>
                                <div className="rep-metodo-barra-bg">
                                  <div className="rep-metodo-barra-fill" style={{ width: `${(p.monto/max)*100}%` }} />
                                </div>
                                <div className="rep-metodo-monto">Bs. {p.monto.toLocaleString()}</div>
                                <div className="rep-metodo-cantidad">{p.cantidad}</div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    }
                  </div>
                </div>

                <div className="rep-panel">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Incidencias por tipo</span>
                    <span className="rep-panel-badge">{datos.incidencias.length} total</span>
                  </div>
                  <div className="rep-panel-body">
                    {incidenciasPorTipo.length === 0
                      ? <div className="rep-empty-chart">Sin incidencias</div>
                      : (
                        <div className="rep-estados-lista">
                          {incidenciasPorTipo.map(i => (
                            <div key={i.tipo} className="rep-estado-row">
                              <div className="rep-estado-dot" style={{ background: '#a06ad4' }} />
                              <div className="rep-estado-nombre" style={{ textTransform: 'capitalize' }}>{i.tipo}</div>
                              <BarraEstado cantidad={i.cantidad} total={datos.incidencias.length} color="#a06ad4" />
                              <div className="rep-estado-cantidad">{i.cantidad}</div>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>
                </div>
              </div>
            )}

            {/* ── RESERVAS ── */}
            {(tabActivo === 'general' || tabActivo === 'reservas') && (
              <div className="rep-grid">
                <div className="rep-panel">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Reservas por estado</span>
                    <span className="rep-panel-badge">{totalReservas} total</span>
                  </div>
                  <div className="rep-panel-body">
                    {reservasPorEstado.length === 0
                      ? <div className="rep-empty-chart">Sin reservas en el período</div>
                      : (
                        <div className="rep-estados-lista">
                          {reservasPorEstado.map(r => (
                            <div key={r.estado} className="rep-estado-row">
                              <div className="rep-estado-dot" style={{ background: r.color }} />
                              <div className="rep-estado-nombre">{r.estado}</div>
                              <BarraEstado cantidad={r.cantidad} total={totalReservas} color={r.color} />
                              <div className="rep-estado-cantidad">{r.cantidad}</div>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>
                </div>

                <div className="rep-panel">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Top habitaciones</span>
                    <span className="rep-panel-badge">Por reservas</span>
                  </div>
                  <div className="rep-panel-body" style={{ padding: '12px 20px' }}>
                    {topHabs.length === 0
                      ? <div className="rep-empty-chart">Sin datos</div>
                      : topHabs.map((h, i) => (
                        <div key={h.numero} className="top-hab-row">
                          <div className="top-hab-rank">{i + 1}</div>
                          <div className="top-hab-info">
                            <div className="top-hab-num">Hab. {h.numero}</div>
                            <div className="top-hab-tipo">{h.tipo} · {h.promedio_noches} noches prom.</div>
                          </div>
                          <div className="top-hab-res">{h.total_reservas}</div>
                          <div className="top-hab-ing">Bs. {Number(h.ingresos).toLocaleString()}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}

            {/* ── HABITACIONES ── */}
            {(tabActivo === 'habitaciones') && (
              <div className="rep-grid">
                <div className="rep-panel">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Estado actual</span>
                    <span className="rep-panel-badge">{totalHabitaciones} hab.</span>
                  </div>
                  <div className="rep-panel-body">
                    {habitacionesPorEstado.length === 0
                      ? <div className="rep-empty-chart">Sin datos</div>
                      : (
                        <div className="rep-estados-lista">
                          {habitacionesPorEstado.map(h => (
                            <div key={h.estado} className="rep-estado-row">
                              <div className="rep-estado-dot" style={{ background: h.color }} />
                              <div className="rep-estado-nombre">{h.estado}</div>
                              <BarraEstado cantidad={h.cantidad} total={totalHabitaciones} color={h.color} />
                              <div className="rep-estado-cantidad">{h.cantidad}</div>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>
                </div>

                <div className="rep-panel">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Top habitaciones</span>
                    <span className="rep-panel-badge">Más reservadas</span>
                  </div>
                  <div className="rep-panel-body" style={{ padding: '12px 20px' }}>
                    {topHabs.map((h, i) => (
                      <div key={h.numero} className="top-hab-row">
                        <div className="top-hab-rank">{i + 1}</div>
                        <div className="top-hab-info">
                          <div className="top-hab-num">Hab. {h.numero}</div>
                          <div className="top-hab-tipo">{h.tipo}</div>
                        </div>
                        <div className="top-hab-res">{h.total_reservas} res.</div>
                        <div className="top-hab-ing">Bs. {Number(h.ingresos).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── RESEÑAS ── */}
            {tabActivo === 'resenas' && (
              <div className="rep-grid">
                <div className="rep-panel">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Distribución de calificaciones</span>
                    <span className="rep-panel-badge">{resenasPeriodo.length} reseñas</span>
                  </div>
                  <div className="rep-panel-body">
                    {resenasPeriodo.length === 0
                      ? <div className="rep-empty-chart">Sin reseñas en el período</div>
                      : (
                        <div className="rep-estados-lista">
                          {distResenas.map(({ cal, count }) => (
                            <div key={cal} className="rep-estado-row">
                              <span style={{ color: '#d4af6a', fontSize: '0.8rem', minWidth: 16 }}>{cal}</span>
                              <span style={{ color: '#d4af6a', fontSize: '0.75rem' }}>★</span>
                              <BarraEstado cantidad={count} total={resenasPeriodo.length} color="#d4af6a" />
                              <div className="rep-estado-cantidad">{count}</div>
                            </div>
                          ))}
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.35)' }}>Promedio del período</span>
                            <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', color: '#d4af6a' }}>
                              {calPromedio.toFixed(2)} ★
                            </span>
                          </div>
                        </div>
                      )
                    }
                  </div>
                </div>

                <div className="rep-panel">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Reseñas por mes</span>
                    <span className="rep-panel-badge">Últimos 6 meses</span>
                  </div>
                  <div className="rep-panel-body">
                    {resenasPorMes.every(m => m.count === 0)
                      ? <div className="rep-empty-chart">Sin reseñas registradas</div>
                      : (
                        <div className="rep-chart-bars">
                          {resenasPorMes.map(m => (
                            <div key={m.label} className="rep-bar-wrap">
                              <div className="rep-bar" style={{ height: `${Math.max(4, (m.count / maxResenas) * 120)}px`, background: 'linear-gradient(180deg,#d4af6a,#b4900a)' }}>
                                {m.count > 0 && <span className="rep-bar-val">{m.count}</span>}
                              </div>
                              <span className="rep-bar-label">{m.label}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>
                </div>

                <div className="rep-panel rep-wide">
                  <div className="rep-panel-header">
                    <span className="rep-panel-title">Subcategorías promedio</span>
                    <span className="rep-panel-badge">Período seleccionado</span>
                  </div>
                  <div className="rep-panel-body">
                    {resenasPeriodo.length === 0
                      ? <div className="rep-empty-chart">Sin reseñas en el período</div>
                      : (() => {
                        const conSub = resenasPeriodo.filter(r => r.cal_limpieza || r.cal_atencion || r.cal_ubicacion || r.cal_precio)
                        if (conSub.length === 0) return <div className="rep-empty-chart">Las reseñas no tienen subcategorías</div>
                        const avg = (campo: keyof ResenaPersonal) => {
                          const vals = conSub.filter(r => r[campo] !== null).map(r => Number(r[campo]))
                          return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
                        }
                        const cats = [
                          { label: 'Limpieza',  val: avg('cal_limpieza'),  color: '#52c97a' },
                          { label: 'Atención',  val: avg('cal_atencion'),  color: '#6ab8d4' },
                          { label: 'Ubicación', val: avg('cal_ubicacion'), color: '#a06ad4' },
                          { label: 'Precio',    val: avg('cal_precio'),    color: '#d4af6a' },
                        ].filter(c => c.val > 0)
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 20 }}>
                            {cats.map(c => (
                              <div key={c.label} style={{ textAlign: 'center' }}>
                                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2.4rem', color: c.color, lineHeight: 1 }}>{c.val.toFixed(1)}</div>
                                <div style={{ fontSize: '0.75rem', color: c.color, marginTop: 2 }}>★★★★★</div>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.35)', marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{c.label}</div>
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    }
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {cargando && (
          <div className="rep-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`rep-skeleton ${i === 0 ? 'rep-wide' : ''}`} style={{ height: 240 }} />
            ))}
          </div>
        )}
      </PersonalLayout>
    </>
  )
}

export default Reportes
