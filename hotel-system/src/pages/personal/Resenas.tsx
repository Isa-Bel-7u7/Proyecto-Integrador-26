import React, { useEffect, useState, useMemo } from 'react'
import { getTodasLasResenas, toggleVisibilidadResena } from '../../services/api'
import type { ResenaPersonal } from '../../services/api'
import PersonalLayout from '../../components/PersonalLayout'

const ESTRELLAS = [1, 2, 3, 4, 5]

function Estrella({ llena }: { llena: boolean }) {
  return <span style={{ color: llena ? '#d4af6a' : 'rgba(212,175,106,0.2)', fontSize: '0.85rem' }}>★</span>
}

function FilaEstrellas({ valor }: { valor: number | null }) {
  if (!valor) return <span style={{ color: 'rgba(240,236,228,0.2)', fontSize: '0.72rem' }}>—</span>
  return (
    <span>{ESTRELLAS.map(i => <Estrella key={i} llena={i <= valor} />)}</span>
  )
}

export default function Resenas() {
  const [resenas, setResenas] = useState<ResenaPersonal[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [filtroVisible, setFiltroVisible] = useState<'todas' | 'visibles' | 'ocultas'>('todas')
  const [filtroCal, setFiltroCal] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [expandida, setExpandida] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await getTodasLasResenas()
      setResenas(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar reseñas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleToggle = async (id: string) => {
    if (toggling) return
    setToggling(id)
    try {
      const nuevoEstado = await toggleVisibilidadResena(id)
      setResenas(prev => prev.map(r => r.id === id ? { ...r, visible: nuevoEstado } : r))
    } catch { /* silencioso */ }
    finally { setToggling(null) }
  }

  const filtradas = useMemo(() => {
    return resenas.filter(r => {
      if (filtroVisible === 'visibles' && !r.visible) return false
      if (filtroVisible === 'ocultas' && r.visible) return false
      if (filtroCal !== null && r.calificacion !== filtroCal) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (
          !r.cliente_nombre.toLowerCase().includes(q) &&
          !r.cliente_email.toLowerCase().includes(q) &&
          !(r.comentario ?? '').toLowerCase().includes(q) &&
          !(r.titulo ?? '').toLowerCase().includes(q) &&
          !r.codigo_reserva.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [resenas, filtroVisible, filtroCal, busqueda])

  const stats = useMemo(() => {
    if (!resenas.length) return null
    const total = resenas.length
    const visibles = resenas.filter(r => r.visible).length
    const promedio = resenas.reduce((s, r) => s + r.calificacion, 0) / total
    const dist = [5, 4, 3, 2, 1].map(n => ({
      cal: n,
      count: resenas.filter(r => r.calificacion === n).length,
    }))
    return { total, visibles, promedio, dist }
  }, [resenas])

  return (
    <PersonalLayout titulo="Reseñas de huéspedes" subtitulo="Gestión y moderación de valoraciones">
    <div style={{ color: '#f0ece4', fontFamily: 'Montserrat, sans-serif' }}>
      <style>{`
        .res-stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,106,0.12); border-radius: 14px; padding: 20px 24px; }
        .res-tabla { width: 100%; border-collapse: collapse; }
        .res-tabla th { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,236,228,0.3); padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: left; }
        .res-tabla td { padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: top; }
        .res-tabla tr:hover td { background: rgba(255,255,255,0.02); }
        .badge-visible { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.25); border-radius: 20px; padding: 2px 10px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; }
        .badge-oculta  { background: rgba(255,255,255,0.05); color: rgba(240,236,228,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 2px 10px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; }
        .btn-toggle { border: none; cursor: pointer; border-radius: 8px; padding: 6px 14px; font-size: 0.68rem; font-weight: 600; font-family: Montserrat,sans-serif; transition: all 0.2s; letter-spacing: 0.04em; }
        .btn-toggle-ocultar { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .btn-toggle-ocultar:hover { background: rgba(239,68,68,0.18); }
        .btn-toggle-mostrar  { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
        .btn-toggle-mostrar:hover { background: rgba(52,211,153,0.18); }
        .filtro-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(240,236,228,0.5); border-radius: 8px; padding: 7px 16px; font-size: 0.7rem; font-family: Montserrat,sans-serif; cursor: pointer; transition: all 0.18s; }
        .filtro-btn.activo { background: rgba(212,175,106,0.1); border-color: rgba(212,175,106,0.35); color: #d4af6a; }
        .res-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 9px 14px; color: #f0ece4; font-family: Montserrat,sans-serif; font-size: 0.78rem; outline: none; width: 260px; }
        .res-input:focus { border-color: rgba(212,175,106,0.4); }
        .dist-bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; flex: 1; overflow: hidden; }
        .dist-fill { height: 100%; background: linear-gradient(90deg, rgba(212,175,106,0.5), #d4af6a); border-radius: 3px; transition: width 0.6s ease; }
        .expandir-btn { background: none; border: none; color: rgba(212,175,106,0.6); cursor: pointer; font-size: 0.68rem; font-family: Montserrat,sans-serif; padding: 0; }
        .expandir-btn:hover { color: #d4af6a; }
      `}</style>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div className="res-stat-card">
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 8 }}>Total reseñas</div>
            <div style={{ fontSize: '2rem', fontFamily: 'Cormorant Garamond,serif', color: '#d4af6a' }}>{stats.total}</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.35)', marginTop: 4 }}>{stats.visibles} visibles · {stats.total - stats.visibles} ocultas</div>
          </div>
          <div className="res-stat-card">
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 8 }}>Calificación promedio</div>
            <div style={{ fontSize: '2rem', fontFamily: 'Cormorant Garamond,serif', color: '#d4af6a', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {stats.promedio.toFixed(1)}
              <span style={{ fontSize: '1rem', color: '#d4af6a' }}>★</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.35)', marginTop: 4 }}>sobre 5 estrellas</div>
          </div>
          <div className="res-stat-card" style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 12 }}>Distribución</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stats.dist.map(({ cal, count }) => (
                <div key={cal} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.68rem', color: '#d4af6a', width: 12, textAlign: 'right', flexShrink: 0 }}>{cal}</span>
                  <span style={{ color: '#d4af6a', fontSize: '0.75rem', flexShrink: 0 }}>★</span>
                  <div className="dist-bar">
                    <div className="dist-fill" style={{ width: stats.total ? `${(count / stats.total) * 100}%` : '0%' }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.35)', width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24, alignItems: 'center' }}>
        <input
          className="res-input"
          placeholder="Buscar por cliente, comentario, reserva..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['todas', 'visibles', 'ocultas'] as const).map(v => (
            <button key={v} className={`filtro-btn ${filtroVisible === v ? 'activo' : ''}`} onClick={() => setFiltroVisible(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`filtro-btn ${filtroCal === null ? 'activo' : ''}`} onClick={() => setFiltroCal(null)}>Todas ★</button>
          {[5, 4, 3, 2, 1].map(n => (
            <button key={n} className={`filtro-btn ${filtroCal === n ? 'activo' : ''}`} onClick={() => setFiltroCal(n)}>
              {n}★
            </button>
          ))}
        </div>
        <button onClick={cargar} style={{ background: 'none', border: '1px solid rgba(212,175,106,0.2)', color: 'rgba(212,175,106,0.7)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'Montserrat,sans-serif' }}>
          ↻ Recargar
        </button>
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'rgba(240,236,228,0.3)', fontSize: '0.8rem' }}>Cargando reseñas...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#f87171', fontSize: '0.8rem' }}>{error}</div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'rgba(240,236,228,0.3)', fontSize: '0.8rem' }}>No hay reseñas con los filtros seleccionados</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
          <table className="res-tabla">
            <thead>
              <tr>
                <th>Huésped</th>
                <th>Habitación</th>
                <th>Calificación</th>
                <th>Subcategorías</th>
                <th>Reseña</th>
                <th>Foto</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(r => (
                <React.Fragment key={r.id}>
                  <tr>
                    <td>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0ece4', marginBottom: 2 }}>{r.cliente_nombre}</div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.35)' }}>{r.cliente_email}</div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(212,175,106,0.5)', marginTop: 2 }}>#{r.codigo_reserva}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: '#f0ece4' }}>Hab. {r.habitacion_numero}</div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.35)' }}>{r.tipo_habitacion}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 1 }}>
                        {ESTRELLAS.map(i => <Estrella key={i} llena={i <= r.calificacion} />)}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.35)', marginTop: 2 }}>{r.calificacion}/5</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {[
                          { label: 'Limpieza', val: r.cal_limpieza },
                          { label: 'Atención', val: r.cal_atencion },
                          { label: 'Ubicación', val: r.cal_ubicacion },
                          { label: 'Precio',   val: r.cal_precio   },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.58rem', color: 'rgba(240,236,228,0.3)', width: 50 }}>{label}</span>
                            <FilaEstrellas valor={val} />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      {r.titulo && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f0ece4', marginBottom: 4 }}>"{r.titulo}"</div>
                      )}
                      {r.comentario && (
                        <>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.6)', lineHeight: 1.5, overflow: 'hidden', maxHeight: expandida === r.id ? 'none' : '3.6em' }}>
                            {r.comentario}
                          </div>
                          {r.comentario.length > 100 && (
                            <button className="expandir-btn" onClick={() => setExpandida(prev => prev === r.id ? null : r.id)}>
                              {expandida === r.id ? 'Ver menos ↑' : 'Ver más ↓'}
                            </button>
                          )}
                        </>
                      )}
                      {!r.titulo && !r.comentario && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.2)' }}>Sin texto</span>
                      )}
                    </td>
                    <td>
                      {r.foto_url ? (
                        <a href={r.foto_url} target="_blank" rel="noreferrer">
                          <img src={r.foto_url} alt="foto" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', display: 'block' }} />
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.2)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={r.visible ? 'badge-visible' : 'badge-oculta'}>
                        {r.visible ? 'Visible' : 'Oculta'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.5)' }}>
                        {new Date(r.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td>
                      <button
                        className={`btn-toggle ${r.visible ? 'btn-toggle-ocultar' : 'btn-toggle-mostrar'}`}
                        onClick={() => handleToggle(r.id)}
                        disabled={toggling === r.id}>
                        {toggling === r.id ? '...' : r.visible ? 'Ocultar' : 'Publicar'}
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.65rem', color: 'rgba(240,236,228,0.25)' }}>
            {filtradas.length} reseña{filtradas.length !== 1 ? 's' : ''} mostrada{filtradas.length !== 1 ? 's' : ''}
            {filtradas.length !== resenas.length && ` de ${resenas.length} en total`}
          </div>
        </div>
      )}
    </div>
    </PersonalLayout>
  )
}
