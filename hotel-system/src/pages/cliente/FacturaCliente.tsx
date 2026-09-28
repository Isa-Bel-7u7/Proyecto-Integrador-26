import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'

type DetalleReserva = {
  id: string
  codigo_reserva: string
  fecha_entrada: string
  fecha_salida: string
  estado: string
  total_estimado: number
  cantidad_adultos: number
  cantidad_ninos: number
  created_at: string
  detalle_reserva: Array<{
    precio_noche: number
    noches: number
    subtotal: number
    habitaciones: {
      numero: string
      piso: number
      tipos_habitacion: { nombre: string } | null
    } | null
  }>
  pagos: Array<{
    id: string
    monto: number
    tipo_pago: string
    estado: string
    fecha_pago: string | null
    metodos_pago: { nombre: string } | null
  }>
}

const FacturaCliente = () => {
  const { reservaId } = useParams<{ reservaId: string }>()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [reserva, setReserva] = useState<DetalleReserva | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (reservaId) cargarReserva()
  }, [reservaId])

  const cargarReserva = async () => {
    try {
      const { data, error: err } = await supabase
        .rpc('rpc_get_factura_reserva', { p_reserva_id: reservaId })
      if (err) throw err
      setReserva(data as DetalleReserva)
    } catch {
      setError('No se pudo cargar la factura.')
    } finally {
      setCargando(false)
    }
  }

  const handleImprimir = () => {
    window.print()
  }

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat,sans-serif', color: 'rgba(240,236,228,0.3)' }}>
        Cargando factura...
      </div>
    )
  }

  if (error || !reserva) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'Montserrat,sans-serif' }}>
        <div style={{ fontSize: '2rem' }}>❌</div>
        <p style={{ color: '#e05252', fontSize: '0.85rem' }}>{error ?? 'Factura no encontrada'}</p>
        <button onClick={() => navigate('/cliente/inicio')}
          style={{ padding: '10px 24px', background: 'rgba(212,175,106,0.1)', border: '1px solid rgba(212,175,106,0.25)', borderRadius: 6, color: '#d4af6a', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem' }}>
          Volver al inicio
        </button>
      </div>
    )
  }

  const pagosAprobados = reserva.pagos.filter(p => p.estado === 'aprobado')
  const totalPagado = pagosAprobados.reduce((s, p) => s + Number(p.monto), 0)
  const saldoPendiente = Number(reserva.total_estimado) - totalPagado
  const noches = reserva.detalle_reserva.reduce((s, d) => s + d.noches, 0)

  const fmtFecha = (f: string) =>
    new Date(f + 'T12:00:00').toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })

  const fmtFechaHora = (f: string) =>
    new Date(f).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; color: #f0ece4; font-family: 'Montserrat', sans-serif; }
        .fac-root { min-height: 100vh; background: #0a0a0a; }

        /* Barra de acciones — se oculta al imprimir */
        .fac-actions-bar { background: rgba(15,15,18,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(212,175,106,0.1); padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .fac-logo { font-family: 'Cormorant Garamond',serif; font-size: 1.2rem; font-weight: 300; color: #d4af6a; letter-spacing: 0.2em; cursor: pointer; }
        .fac-actions { display: flex; gap: 10px; }
        .fac-btn-back { padding: 8px 16px; background: transparent; border: 1px solid rgba(240,236,228,0.15); border-radius: 6px; font-family: 'Montserrat',sans-serif; font-size: 0.65rem; font-weight: 500; letter-spacing: 0.1em; color: rgba(240,236,228,0.5); cursor: pointer; transition: all 0.2s; }
        .fac-btn-back:hover { border-color: rgba(212,175,106,0.3); color: #d4af6a; }
        .fac-btn-print { padding: 8px 20px; background: linear-gradient(135deg,#c9a84c,#d4af6a); border: none; border-radius: 6px; font-family: 'Montserrat',sans-serif; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .fac-btn-print:hover { opacity: 0.9; }

        /* Factura */
        .fac-doc { max-width: 720px; margin: 36px auto; background: #13131a; border: 1px solid rgba(212,175,106,0.15); border-radius: 16px; overflow: hidden; }

        /* Header dorado */
        .fac-header { background: linear-gradient(135deg, #0f0f12 0%, #1a1608 50%, #0f0f12 100%); border-bottom: 1px solid rgba(212,175,106,0.2); padding: 36px 40px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 24px; }
        .fac-hotel-brand { font-family: 'Cormorant Garamond',serif; font-size: 2rem; font-weight: 300; color: #d4af6a; letter-spacing: 0.2em; line-height: 1; }
        .fac-hotel-sub { font-size: 0.62rem; color: rgba(212,175,106,0.4); letter-spacing: 0.18em; text-transform: uppercase; margin-top: 6px; }
        .fac-invoice-info { text-align: right; }
        .fac-invoice-label { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,236,228,0.3); margin-bottom: 6px; }
        .fac-invoice-code { font-family: 'Cormorant Garamond',serif; font-size: 1.6rem; font-weight: 400; color: #d4af6a; }
        .fac-invoice-date { font-size: 0.68rem; color: rgba(240,236,228,0.35); margin-top: 4px; }

        /* Estado */
        .fac-estado-bar { padding: 12px 40px; background: rgba(82,201,122,0.06); border-bottom: 1px solid rgba(82,201,122,0.12); display: flex; align-items: center; gap: 10px; }
        .fac-estado-dot { width: 8px; height: 8px; border-radius: 50%; background: #52c97a; flex-shrink: 0; }
        .fac-estado-text { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #52c97a; }

        /* Cuerpo */
        .fac-body { padding: 36px 40px; }
        .fac-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
        @media (max-width: 600px) { .fac-grid-2 { grid-template-columns: 1fr; } }
        .fac-info-block-label { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,236,228,0.25); margin-bottom: 12px; }
        .fac-info-row { margin-bottom: 8px; }
        .fac-info-key { font-size: 0.65rem; color: rgba(240,236,228,0.4); margin-bottom: 2px; }
        .fac-info-val { font-size: 0.8rem; color: #f0ece4; font-weight: 400; }

        /* Tabla detalle */
        .fac-table-title { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,236,228,0.25); margin-bottom: 12px; }
        .fac-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
        .fac-table th { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,236,228,0.25); text-align: left; padding: 0 0 10px; border-bottom: 1px solid rgba(212,175,106,0.1); }
        .fac-table th:last-child { text-align: right; }
        .fac-table td { font-size: 0.78rem; color: rgba(240,236,228,0.75); padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: top; }
        .fac-table td:last-child { text-align: right; font-weight: 500; color: #f0ece4; }
        .fac-table tr:last-child td { border-bottom: none; }
        .fac-table-desc { font-size: 0.68rem; color: rgba(240,236,228,0.35); margin-top: 2px; }

        /* Totales */
        .fac-totales { border-top: 1px solid rgba(212,175,106,0.1); padding-top: 20px; }
        .fac-total-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
        .fac-total-key { font-size: 0.72rem; color: rgba(240,236,228,0.45); }
        .fac-total-val { font-size: 0.78rem; color: #f0ece4; }
        .fac-total-key.bold { font-weight: 600; color: rgba(240,236,228,0.7); font-size: 0.75rem; }
        .fac-total-val.gold { font-family: 'Cormorant Garamond',serif; font-size: 1.6rem; font-weight: 300; color: #d4af6a; }
        .fac-total-val.green { color: #52c97a; font-weight: 600; }
        .fac-total-val.red { color: #e05252; font-weight: 600; }
        .fac-divider { height: 1px; background: rgba(212,175,106,0.1); margin: 10px 0; }

        /* Pagos registrados */
        .fac-pagos { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 16px; margin-top: 24px; }
        .fac-pago-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .fac-pago-item:last-child { border-bottom: none; }
        .fac-pago-info { font-size: 0.72rem; color: rgba(240,236,228,0.55); }
        .fac-pago-tipo { font-size: 0.6rem; color: rgba(240,236,228,0.3); text-transform: capitalize; }
        .fac-pago-monto { font-size: 0.8rem; font-weight: 600; color: #52c97a; }

        /* Footer */
        .fac-footer-doc { border-top: 1px solid rgba(212,175,106,0.1); padding: 24px 40px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: rgba(255,255,255,0.01); }
        .fac-footer-note { font-size: 0.65rem; color: rgba(240,236,228,0.2); line-height: 1.6; }
        .fac-footer-logo { font-family: 'Cormorant Garamond',serif; font-size: 1rem; color: rgba(212,175,106,0.3); letter-spacing: 0.15em; }

        .fac-badge { display: inline-block; font-size: 0.58rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; }
        .fac-badge-confirmada { background: rgba(82,201,122,0.1); color: #52c97a; }
        .fac-badge-en_estadia { background: rgba(106,184,212,0.1); color: #6ab8d4; }
        .fac-badge-finalizada { background: rgba(150,150,160,0.1); color: #9696a0; }
        .fac-badge-pendiente { background: rgba(212,175,106,0.1); color: #d4af6a; }

        @media print {
          .fac-actions-bar { display: none !important; }
          body { background: white !important; color: black !important; }
          .fac-root { background: white; }
          .fac-doc { background: white; border: none; border-radius: 0; box-shadow: none; margin: 0; max-width: 100%; }
          .fac-header { background: #f8f5ed !important; border-color: #c9a84c !important; }
          .fac-hotel-brand { color: #8a6d2a !important; }
          .fac-invoice-code { color: #8a6d2a !important; }
          .fac-header * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .fac-estado-bar { background: #f0fdf4 !important; }
          .fac-total-val.gold { color: #8a6d2a !important; }
          .fac-pago-monto { color: #2d6a4f !important; }
          * { color-adjust: exact; }
        }
      `}</style>

      <div className="fac-root">
        {/* Barra de acciones (no imprime) */}
        <div className="fac-actions-bar">
          <span className="fac-logo" onClick={() => navigate('/')}>Grand Hôtel</span>
          <div className="fac-actions">
            <button className="fac-btn-back" onClick={() => navigate('/cliente/inicio')}>
              ← Mis reservas
            </button>
            <button className="fac-btn-print" onClick={handleImprimir}>
              🖨️ Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        {/* Documento factura */}
        <div className="fac-doc">
          {/* Header */}
          <div className="fac-header">
            <div>
              <div className="fac-hotel-brand">Grand Hôtel</div>
              <div className="fac-hotel-sub">Av. Principal 123 · Tel: +591 2 123-4567</div>
            </div>
            <div className="fac-invoice-info">
              <div className="fac-invoice-label">Comprobante de reserva</div>
              <div className="fac-invoice-code">{reserva.codigo_reserva}</div>
              <div className="fac-invoice-date">
                Emitido: {fmtFechaHora(reserva.created_at)}
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="fac-estado-bar">
            <div className="fac-estado-dot" style={{
              background: reserva.estado === 'finalizada' ? '#9696a0'
                : reserva.estado === 'en_estadia' ? '#6ab8d4'
                : reserva.estado === 'confirmada' ? '#52c97a'
                : '#d4af6a'
            }} />
            <span className="fac-estado-text" style={{
              color: reserva.estado === 'finalizada' ? '#9696a0'
                : reserva.estado === 'en_estadia' ? '#6ab8d4'
                : reserva.estado === 'confirmada' ? '#52c97a'
                : '#d4af6a'
            }}>
              Reserva {reserva.estado.replace('_', ' ')}
            </span>
          </div>

          {/* Cuerpo */}
          <div className="fac-body">
            {/* Info huésped y estancia */}
            <div className="fac-grid-2">
              <div>
                <div className="fac-info-block-label">Huésped</div>
                <div className="fac-info-row">
                  <div className="fac-info-key">Nombre completo</div>
                  <div className="fac-info-val">{perfil?.nombre_completo ?? '—'}</div>
                </div>
                <div className="fac-info-row">
                  <div className="fac-info-key">Correo</div>
                  <div className="fac-info-val">{perfil?.correo ?? '—'}</div>
                </div>
                {perfil?.tipo_documento && (
                  <div className="fac-info-row">
                    <div className="fac-info-key">{perfil.tipo_documento}</div>
                    <div className="fac-info-val">{perfil.numero_documento ?? '—'}</div>
                  </div>
                )}
              </div>
              <div>
                <div className="fac-info-block-label">Estancia</div>
                <div className="fac-info-row">
                  <div className="fac-info-key">Check-in</div>
                  <div className="fac-info-val">{fmtFecha(reserva.fecha_entrada)}</div>
                </div>
                <div className="fac-info-row">
                  <div className="fac-info-key">Check-out</div>
                  <div className="fac-info-val">{fmtFecha(reserva.fecha_salida)}</div>
                </div>
                <div className="fac-info-row">
                  <div className="fac-info-key">Duración</div>
                  <div className="fac-info-val">{noches} noche{noches !== 1 ? 's' : ''}</div>
                </div>
                <div className="fac-info-row">
                  <div className="fac-info-key">Huéspedes</div>
                  <div className="fac-info-val">
                    {reserva.cantidad_adultos} adulto{reserva.cantidad_adultos !== 1 ? 's' : ''}
                    {reserva.cantidad_ninos > 0 && `, ${reserva.cantidad_ninos} niño${reserva.cantidad_ninos !== 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Detalle habitaciones */}
            <div className="fac-table-title">Detalle de habitaciones</div>
            <table className="fac-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Noches</th>
                  <th>Precio/noche</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {reserva.detalle_reserva.map((d, i) => (
                  <tr key={i}>
                    <td>
                      <div>{d.habitaciones?.tipos_habitacion?.nombre ?? 'Habitación'}</div>
                      {d.habitaciones && (
                        <div className="fac-table-desc">Habitación {d.habitaciones.numero} · Piso {d.habitaciones.piso}</div>
                      )}
                    </td>
                    <td>{d.noches}</td>
                    <td>Bs. {Number(d.precio_noche).toLocaleString()}</td>
                    <td>Bs. {Number(d.subtotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div className="fac-totales">
              <div className="fac-total-row">
                <span className="fac-total-key">Subtotal</span>
                <span className="fac-total-val">Bs. {Number(reserva.total_estimado).toLocaleString()}</span>
              </div>
              <div className="fac-divider" />
              <div className="fac-total-row">
                <span className="fac-total-key bold">Total</span>
                <span className="fac-total-val gold">Bs. {Number(reserva.total_estimado).toLocaleString()}</span>
              </div>
              <div className="fac-total-row">
                <span className="fac-total-key">Total pagado</span>
                <span className="fac-total-val green">Bs. {totalPagado.toLocaleString()}</span>
              </div>
              {saldoPendiente > 0 && (
                <div className="fac-total-row">
                  <span className="fac-total-key">Saldo pendiente</span>
                  <span className="fac-total-val red">Bs. {saldoPendiente.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Registro de pagos */}
            {reserva.pagos.length > 0 && (
              <div className="fac-pagos">
                <div className="fac-table-title" style={{ marginBottom: 12 }}>Pagos registrados</div>
                {reserva.pagos.map(p => (
                  <div key={p.id} className="fac-pago-item">
                    <div>
                      <div className="fac-pago-info">{p.metodos_pago?.nombre ?? 'Método de pago'}</div>
                      <div className="fac-pago-tipo">
                        {p.tipo_pago.replace('_', ' ')} ·{' '}
                        {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-BO') : '—'}
                      </div>
                    </div>
                    <div className="fac-pago-monto" style={{
                      color: p.estado === 'aprobado' ? '#52c97a'
                        : p.estado === 'pendiente' ? '#d4af6a'
                        : '#e05252'
                    }}>
                      Bs. {Number(p.monto).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="fac-footer-doc">
            <div className="fac-footer-note">
              Conserva este comprobante como prueba de tu reserva.<br />
              Para consultas: recepcion@grandhotel.com · +591 2 123-4567
            </div>
            <div className="fac-footer-logo">Grand Hôtel</div>
          </div>
        </div>
      </div>
    </>
  )
}

export default FacturaCliente
