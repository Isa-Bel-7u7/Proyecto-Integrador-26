import { useState, useEffect } from 'react'
import PersonalLayout from '../../components/PersonalLayout'
import { getAnunciosAdmin, crearAnuncio, actualizarAnuncio, eliminarAnuncio } from '../../services/api'

type Anuncio = {
  id: string
  titulo: string
  subtitulo: string | null
  descripcion: string | null
  tipo: string
  imagen_url: string | null
  url_accion: string | null
  texto_boton: string | null
  visible_web: boolean
  visible_app: boolean
  solo_clientes: boolean
  fecha_inicio: string
  fecha_fin: string | null
  orden: number
  activo: boolean
  created_at: string
}

const TIPOS = ['evento', 'promocion', 'informativo', 'novedad', 'otro']
const tipoColor: Record<string, string> = {
  evento:      '#d4af6a',
  promocion:   '#52c97a',
  informativo: '#6ab8d4',
  novedad:     '#a06ad4',
  otro:        '#9696a0',
}
const tipoLabel: Record<string, string> = {
  evento: 'Evento', promocion: 'Promoción',
  informativo: 'Informativo', novedad: 'Novedad', otro: 'Otro',
}

const VACIO = {
  titulo: '', subtitulo: '', descripcion: '', tipo: 'evento',
  imagen_url: '', url_accion: '', texto_boton: '',
  visible_web: true, visible_app: true, solo_clientes: false,
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin: '', orden: 0,
}

const Anuncios = () => {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Anuncio | null>(null)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [filtroBuscar, setFiltroBuscar] = useState('')
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    try {
      setCargando(true)
      const data = await getAnunciosAdmin()
      setAnuncios(data as Anuncio[])
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  const abrirNuevo = () => {
    setEditando(null)
    setForm(VACIO)
    setError('')
    setModalAbierto(true)
  }

  const abrirEditar = (a: Anuncio) => {
    setEditando(a)
    setForm({
      titulo: a.titulo,
      subtitulo: a.subtitulo ?? '',
      descripcion: a.descripcion ?? '',
      tipo: a.tipo,
      imagen_url: a.imagen_url ?? '',
      url_accion: a.url_accion ?? '',
      texto_boton: a.texto_boton ?? '',
      visible_web: a.visible_web,
      visible_app: a.visible_app,
      solo_clientes: a.solo_clientes,
      fecha_inicio: a.fecha_inicio,
      fecha_fin: a.fecha_fin ?? '',
      orden: a.orden,
    })
    setError('')
    setModalAbierto(true)
  }

  const guardar = async () => {
    if (!form.titulo.trim()) { setError('El título es obligatorio.'); return }
    if (!form.fecha_inicio) { setError('La fecha de inicio es obligatoria.'); return }
    setGuardando(true)
    setError('')
    try {
      if (editando) {
        await actualizarAnuncio(editando.id, {
          titulo: form.titulo,
          subtitulo: form.subtitulo || null,
          descripcion: form.descripcion || null,
          tipo: form.tipo,
          imagen_url: form.imagen_url || null,
          url_accion: form.url_accion || null,
          texto_boton: form.texto_boton || null,
          visible_web: form.visible_web,
          visible_app: form.visible_app,
          solo_clientes: form.solo_clientes,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin || null,
          orden: Number(form.orden),
        })
      } else {
        await crearAnuncio({
          titulo: form.titulo,
          subtitulo: form.subtitulo || undefined,
          descripcion: form.descripcion || undefined,
          tipo: form.tipo,
          imagenUrl: form.imagen_url || undefined,
          urlAccion: form.url_accion || undefined,
          textoBoton: form.texto_boton || undefined,
          visibleWeb: form.visible_web,
          visibleApp: form.visible_app,
          soloClientes: form.solo_clientes,
          fechaInicio: form.fecha_inicio,
          fechaFin: form.fecha_fin || undefined,
          orden: Number(form.orden),
        })
      }
      setModalAbierto(false)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  const toggleActivo = async (a: Anuncio) => {
    try {
      await actualizarAnuncio(a.id, { activo: !a.activo })
      cargar()
    } catch (e) { console.error(e) }
  }

  const eliminar = async (id: string) => {
    try {
      await eliminarAnuncio(id)
      setConfirmarEliminar(null)
      cargar()
    } catch (e) { console.error(e) }
  }

  const filtrados = anuncios.filter(a =>
    a.titulo.toLowerCase().includes(filtroBuscar.toLowerCase()) ||
    a.tipo.includes(filtroBuscar.toLowerCase())
  )

  const f = (campo: keyof typeof VACIO, valor: unknown) =>
    setForm(prev => ({ ...prev, [campo]: valor }))

  return (
    <PersonalLayout titulo="Anuncios" subtitulo="Comunicados internos del hotel">
      <style>{`
        .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .search-box { flex: 1; min-width: 200px; background: #13131a; border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 9px 14px; color: #f0ece4; font-size: 0.8rem; font-family: 'Montserrat',sans-serif; outline: none; }
        .search-box:focus { border-color: rgba(212,175,106,0.4); }
        .btn-primary { background: rgba(212,175,106,0.12); border: 1px solid rgba(212,175,106,0.3); border-radius: 8px; padding: 9px 18px; color: #d4af6a; font-size: 0.75rem; font-weight: 600; font-family: 'Montserrat',sans-serif; cursor: pointer; letter-spacing: 0.08em; transition: background 0.2s; white-space: nowrap; }
        .btn-primary:hover { background: rgba(212,175,106,0.2); }
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .anuncio-card { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 12px; overflow: hidden; transition: border-color 0.2s, transform 0.2s; }
        .anuncio-card:hover { border-color: rgba(212,175,106,0.3); transform: translateY(-2px); }
        .anuncio-card.inactivo { opacity: 0.5; }
        .card-img { width: 100%; height: 160px; object-fit: cover; display: block; background: #1a1a22; }
        .card-img-placeholder { width: 100%; height: 160px; background: linear-gradient(135deg,#1a1a22,#13131a); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
        .card-body { padding: 16px; }
        .card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
        .card-tipo { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; white-space: nowrap; }
        .card-titulo { font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; font-weight: 400; color: #f0ece4; flex: 1; line-height: 1.3; }
        .card-subtitulo { font-size: 0.72rem; color: rgba(240,236,228,0.4); margin-bottom: 8px; }
        .card-desc { font-size: 0.75rem; color: rgba(240,236,228,0.55); line-height: 1.5; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .card-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
        .pill { font-size: 0.6rem; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
        .pill-web { background: rgba(106,184,212,0.1); color: #6ab8d4; }
        .pill-app { background: rgba(160,106,212,0.1); color: #a06ad4; }
        .pill-privado { background: rgba(212,175,106,0.1); color: #d4af6a; }
        .card-fechas { font-size: 0.65rem; color: rgba(240,236,228,0.3); margin-bottom: 14px; }
        .card-actions { display: flex; gap: 8px; }
        .btn-sm { padding: 6px 12px; border-radius: 6px; font-size: 0.68rem; font-weight: 500; font-family: 'Montserrat',sans-serif; cursor: pointer; border: none; transition: background 0.2s; letter-spacing: 0.04em; }
        .btn-edit { background: rgba(212,175,106,0.1); color: #d4af6a; border: 1px solid rgba(212,175,106,0.25) !important; }
        .btn-edit:hover { background: rgba(212,175,106,0.2); }
        .btn-toggle { background: rgba(82,201,122,0.1); color: #52c97a; border: 1px solid rgba(82,201,122,0.25) !important; }
        .btn-toggle.off { background: rgba(150,150,150,0.1); color: #9696a0; border-color: rgba(150,150,150,0.2) !important; }
        .btn-toggle:hover { background: rgba(82,201,122,0.2); }
        .btn-toggle.off:hover { background: rgba(150,150,150,0.2); }
        .btn-danger { background: rgba(212,100,100,0.1); color: #d46464; border: 1px solid rgba(212,100,100,0.2) !important; }
        .btn-danger:hover { background: rgba(212,100,100,0.2); }
        .empty { text-align: center; padding: 60px 20px; color: rgba(240,236,228,0.2); }
        .empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .empty-text { font-size: 0.85rem; }
        .skeleton { background: linear-gradient(90deg, #13131a 25%, #1a1a24 50%, #13131a 75%); background-size: 200% 100%; animation: shimmerA 1.5s infinite; border-radius: 12px; }
        @keyframes shimmerA { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #13131a; border: 1px solid rgba(212,175,106,0.2); border-radius: 16px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
        .modal::-webkit-scrollbar { width: 4px; }
        .modal::-webkit-scrollbar-thumb { background: rgba(212,175,106,0.2); border-radius: 2px; }
        .modal-header { padding: 24px 24px 0; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .modal-titulo { font-family: 'Cormorant Garamond',serif; font-size: 1.3rem; font-weight: 400; color: #f0ece4; }
        .modal-close { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,106,0.15); display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(240,236,228,0.5); font-size: 0.9rem; }
        .modal-close:hover { background: rgba(212,175,106,0.08); }
        .modal-body { padding: 0 24px 24px; display: flex; flex-direction: column; gap: 14px; }
        .field-label { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,236,228,0.4); margin-bottom: 6px; }
        .field-input { width: 100%; background: #0f0f12; border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 10px 12px; color: #f0ece4; font-size: 0.8rem; font-family: 'Montserrat',sans-serif; outline: none; transition: border-color 0.2s; }
        .field-input:focus { border-color: rgba(212,175,106,0.4); }
        .field-input::placeholder { color: rgba(240,236,228,0.2); }
        .field-select { width: 100%; background: #0f0f12; border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 10px 12px; color: #f0ece4; font-size: 0.8rem; font-family: 'Montserrat',sans-serif; outline: none; cursor: pointer; }
        .field-textarea { width: 100%; background: #0f0f12; border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 10px 12px; color: #f0ece4; font-size: 0.8rem; font-family: 'Montserrat',sans-serif; outline: none; resize: vertical; min-height: 80px; }
        .field-textarea:focus { border-color: rgba(212,175,106,0.4); }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .check-row { display: flex; align-items: center; gap: 10px; }
        .check-row input[type=checkbox] { width: 16px; height: 16px; accent-color: #d4af6a; cursor: pointer; }
        .check-row label { font-size: 0.78rem; color: rgba(240,236,228,0.7); cursor: pointer; }
        .modal-error { background: rgba(212,100,100,0.08); border: 1px solid rgba(212,100,100,0.2); border-radius: 8px; padding: 10px 14px; font-size: 0.75rem; color: #d46464; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
        .btn-cancel { background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 9px 18px; color: rgba(240,236,228,0.5); font-size: 0.75rem; font-family: 'Montserrat',sans-serif; cursor: pointer; }
        .btn-save { background: rgba(212,175,106,0.15); border: 1px solid rgba(212,175,106,0.35); border-radius: 8px; padding: 9px 22px; color: #d4af6a; font-size: 0.75rem; font-weight: 600; font-family: 'Montserrat',sans-serif; cursor: pointer; letter-spacing: 0.08em; transition: background 0.2s; }
        .btn-save:hover:not(:disabled) { background: rgba(212,175,106,0.25); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 300; display: flex; align-items: center; justify-content: center; }
        .confirm-box { background: #13131a; border: 1px solid rgba(212,100,100,0.3); border-radius: 12px; padding: 28px; max-width: 360px; text-align: center; }
        .confirm-titulo { font-family: 'Cormorant Garamond',serif; font-size: 1.2rem; color: #f0ece4; margin-bottom: 10px; }
        .confirm-msg { font-size: 0.78rem; color: rgba(240,236,228,0.45); margin-bottom: 24px; }
        .confirm-btns { display: flex; gap: 10px; justify-content: center; }
      `}</style>

      <div className="toolbar">
        <input
          className="search-box"
          placeholder="Buscar anuncio..."
          value={filtroBuscar}
          onChange={e => setFiltroBuscar(e.target.value)}
        />
        <button className="btn-primary" onClick={abrirNuevo}>+ Nuevo anuncio</button>
      </div>

      {cargando ? (
        <div className="cards-grid">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 300 }} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📢</div>
          <div className="empty-text">
            {filtroBuscar ? 'No hay resultados para tu búsqueda.' : 'No hay anuncios creados aún.'}
          </div>
        </div>
      ) : (
        <div className="cards-grid">
          {filtrados.map(a => {
            const color = tipoColor[a.tipo] ?? '#9696a0'
            return (
              <div key={a.id} className={`anuncio-card ${!a.activo ? 'inactivo' : ''}`}>
                {a.imagen_url
                  ? <img src={a.imagen_url} alt={a.titulo} className="card-img" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  : <div className="card-img-placeholder">📢</div>
                }
                <div className="card-body">
                  <div className="card-top">
                    <span className="card-tipo" style={{ background: `${color}18`, color }}>
                      {tipoLabel[a.tipo] ?? a.tipo}
                    </span>
                    <span className="card-titulo">{a.titulo}</span>
                  </div>
                  {a.subtitulo && <div className="card-subtitulo">{a.subtitulo}</div>}
                  {a.descripcion && <div className="card-desc">{a.descripcion}</div>}
                  <div className="card-meta">
                    {a.visible_web && <span className="pill pill-web">Web</span>}
                    {a.visible_app && <span className="pill pill-app">App</span>}
                    {a.solo_clientes && <span className="pill pill-privado">Solo clientes</span>}
                  </div>
                  <div className="card-fechas">
                    Desde {a.fecha_inicio}{a.fecha_fin ? ` · Hasta ${a.fecha_fin}` : ' · Sin vencimiento'}
                    {' · '}Orden: {a.orden}
                  </div>
                  <div className="card-actions">
                    <button className="btn-sm btn-edit" onClick={() => abrirEditar(a)}>Editar</button>
                    <button className={`btn-sm btn-toggle ${!a.activo ? 'off' : ''}`} onClick={() => toggleActivo(a)}>
                      {a.activo ? 'Activo' : 'Inactivo'}
                    </button>
                    <button className="btn-sm btn-danger" onClick={() => setConfirmarEliminar(a.id)}>Eliminar</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {modalAbierto && (
        <div className="overlay" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-titulo">{editando ? 'Editar anuncio' : 'Nuevo anuncio'}</span>
              <div className="modal-close" onClick={() => setModalAbierto(false)}>✕</div>
            </div>
            <div className="modal-body">
              <div>
                <div className="field-label">Título *</div>
                <input className="field-input" value={form.titulo} onChange={e => f('titulo', e.target.value)} placeholder="Título del anuncio" />
              </div>
              <div>
                <div className="field-label">Subtítulo</div>
                <input className="field-input" value={form.subtitulo} onChange={e => f('subtitulo', e.target.value)} placeholder="Subtítulo opcional" />
              </div>
              <div>
                <div className="field-label">Descripción</div>
                <textarea className="field-textarea" value={form.descripcion} onChange={e => f('descripcion', e.target.value)} placeholder="Descripción del anuncio..." />
              </div>
              <div className="row2">
                <div>
                  <div className="field-label">Tipo *</div>
                  <select className="field-select" value={form.tipo} onChange={e => f('tipo', e.target.value)}>
                    {TIPOS.map(t => <option key={t} value={t}>{tipoLabel[t]}</option>)}
                  </select>
                </div>
                <div>
                  <div className="field-label">Orden</div>
                  <input className="field-input" type="number" min="0" value={form.orden} onChange={e => f('orden', e.target.value)} />
                </div>
              </div>
              <div>
                <div className="field-label">URL de imagen</div>
                <input className="field-input" value={form.imagen_url} onChange={e => f('imagen_url', e.target.value)} placeholder="https://..." />
              </div>
              <div className="row2">
                <div>
                  <div className="field-label">URL del botón</div>
                  <input className="field-input" value={form.url_accion} onChange={e => f('url_accion', e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <div className="field-label">Texto del botón</div>
                  <input className="field-input" value={form.texto_boton} onChange={e => f('texto_boton', e.target.value)} placeholder="Ver más" />
                </div>
              </div>
              <div className="row2">
                <div>
                  <div className="field-label">Fecha inicio *</div>
                  <input className="field-input" type="date" value={form.fecha_inicio} onChange={e => f('fecha_inicio', e.target.value)} />
                </div>
                <div>
                  <div className="field-label">Fecha fin</div>
                  <input className="field-input" type="date" value={form.fecha_fin} onChange={e => f('fecha_fin', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="check-row">
                  <input type="checkbox" id="vweb" checked={form.visible_web} onChange={e => f('visible_web', e.target.checked)} />
                  <label htmlFor="vweb">Visible en la web</label>
                </div>
                <div className="check-row">
                  <input type="checkbox" id="vapp" checked={form.visible_app} onChange={e => f('visible_app', e.target.checked)} />
                  <label htmlFor="vapp">Visible en la app móvil</label>
                </div>
                <div className="check-row">
                  <input type="checkbox" id="vsolo" checked={form.solo_clientes} onChange={e => f('solo_clientes', e.target.checked)} />
                  <label htmlFor="vsolo">Solo para clientes autenticados</label>
                </div>
              </div>
              {error && <div className="modal-error">{error}</div>}
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button className="btn-save" onClick={guardar} disabled={guardando}>
                  {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear anuncio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAR ELIMINAR */}
      {confirmarEliminar && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div className="confirm-titulo">¿Eliminar anuncio?</div>
            <div className="confirm-msg">Esta acción no se puede deshacer.</div>
            <div className="confirm-btns">
              <button className="btn-cancel" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
              <button className="btn-sm btn-danger" style={{ padding: '8px 20px' }} onClick={() => eliminar(confirmarEliminar)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </PersonalLayout>
  )
}

export default Anuncios
