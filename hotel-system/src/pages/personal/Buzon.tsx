import PersonalLayout from '../../components/PersonalLayout'
import { useBuzon } from '../../hooks/useBuzon'

const tipoConfig: Record<string, { color: string; label: string; icon: string }> = {
  queja:        { color: '#d46464', label: 'Queja',        icon: '⚠' },
  sugerencia:   { color: '#6ab8d4', label: 'Sugerencia',   icon: '💡' },
  felicitacion: { color: '#52c97a', label: 'Felicitación', icon: '⭐' },
  consulta:     { color: '#d4af6a', label: 'Consulta',     icon: '❓' },
  otro:         { color: '#9696a0', label: 'Otro',         icon: '📝' },
}

const estadoConfig: Record<string, { color: string; label: string }> = {
  nuevo:       { color: '#d4af6a', label: 'Nuevo'       },
  en_revision: { color: '#6ab8d4', label: 'En revisión' },
  respondido:  { color: '#52c97a', label: 'Respondido'  },
  cerrado:     { color: '#9696a0', label: 'Cerrado'     },
  descartado:  { color: '#666',    label: 'Descartado'  },
}

const Buzon = () => {
  const {
    mensajes, cargando, seleccionado, respuesta, nuevoEstado, guardando,
    filtroTipo, filtroEstado, buscar, filtrados,
    setRespuesta, setNuevoEstado, setFiltroTipo, setFiltroEstado, setBuscar,
    abrirMensaje, cerrarMensaje, enviarRespuesta,
  } = useBuzon()

  const conteo = (tipo: string) => mensajes.filter(m => m.tipo === tipo).length
  const nuevos = mensajes.filter(m => m.estado === 'nuevo').length

  const badgeNuevos = nuevos > 0
    ? <span style={{ background: 'rgba(212,100,100,0.15)', color: '#d46464', border: '1px solid rgba(212,100,100,0.3)', borderRadius: 20, padding: '3px 12px', fontSize: '0.68rem', fontWeight: 600 }}>{nuevos} nuevos</span>
    : null

  return (
    <PersonalLayout titulo="Buzon de quejas" subtitulo="Mensajes y retroalimentacion de clientes" accionesTopbar={badgeNuevos}>
      <style>{`
        .stats-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .stat-chip { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 8px; padding: 9px 14px; display: flex; align-items: center; gap: 7px; cursor: pointer; transition: border-color 0.2s; min-width: 0; flex-shrink: 1; }
        .stat-chip:hover { border-color: rgba(212,175,106,0.3); }
        .stat-chip.activo { border-color: rgba(212,175,106,0.4); background: rgba(212,175,106,0.06); }
        .stat-chip-icon { font-size: 0.9rem; flex-shrink: 0; }
        .stat-chip-label { font-size: 0.68rem; color: rgba(240,236,228,0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .stat-chip-count { font-family: 'Cormorant Garamond',serif; font-size: 1rem; color: #f0ece4; flex-shrink: 0; }
        .filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .filter-select { background: #13131a; border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 8px 12px; color: #f0ece4; font-size: 0.75rem; font-family: 'Montserrat',sans-serif; outline: none; cursor: pointer; flex-shrink: 0; }
        .search-box { flex: 1; min-width: 140px; background: #13131a; border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 8px 12px; color: #f0ece4; font-size: 0.75rem; font-family: 'Montserrat',sans-serif; outline: none; }
        .search-box:focus { border-color: rgba(212,175,106,0.35); }
        .msg-list {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}
  .msg-row {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
        .msg-row:hover { border-color: rgba(212,175,106,0.25); background: #16161f; }
        .msg-row.nuevo-item { border-left: 3px solid #d4af6a; }
        .msg-tipo-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
        .msg-body,
.msg-top,
.msg-preview,
.msg-remitente,
.msg-asunto {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
  .msg-preview,
.msg-remitente,
.msg-asunto {
  white-space: nowrap;
  text-overflow: ellipsis;
}


        .msg-asunto { font-size: 0.82rem; font-weight: 500; color: #f0ece4; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pill { font-size: 0.6rem; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
        .msg-remitente { font-size: 0.68rem; color: rgba(240,236,228,0.35); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .msg-preview { font-size: 0.72rem; color: rgba(240,236,228,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .msg-fecha { font-size: 0.62rem; color: rgba(240,236,228,0.25); flex-shrink: 0; margin-top: 2px; white-space: nowrap; }
        @media (max-width: 768px) {
  .stats-row {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }

  .stat-chip {
    flex: 0 0 auto;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box,
  .filter-select {
    width: 100%;
  }
}
  .pl-main {
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}
  .pl-content {
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}
        .empty { text-align: center; padding: 60px 20px; color: rgba(240,236,228,0.2); }
        .empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .empty-text { font-size: 0.85rem; }
        .skeleton { background: linear-gradient(90deg,#13131a 25%,#1a1a24 50%,#13131a 75%); background-size: 200% 100%; animation: shimmerB 1.5s infinite; border-radius: 10px; }
        @keyframes shimmerB { 0%{background-position:200% 0}100%{background-position:-200% 0} }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #13131a; border: 1px solid rgba(212,175,106,0.2); border-radius: 16px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; }
        .modal::-webkit-scrollbar { width: 4px; }
        .modal::-webkit-scrollbar-thumb { background: rgba(212,175,106,0.2); border-radius: 2px; }
        .modal-header { padding: 24px 24px 0; display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 12px; }
        .modal-titulo { font-family: 'Cormorant Garamond',serif; font-size: 1.25rem; font-weight: 400; color: #f0ece4; flex: 1; }
        .modal-close { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,106,0.15); display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(240,236,228,0.5); flex-shrink: 0; }
        .modal-body { padding: 0 24px 24px; display: flex; flex-direction: column; gap: 16px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-item { background: #0f0f12; border-radius: 8px; padding: 10px 12px; }
        .info-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(240,236,228,0.3); margin-bottom: 4px; }
        .info-value { font-size: 0.78rem; color: #f0ece4; }
        .msg-texto-box { background: #0f0f12; border-radius: 8px; padding: 14px; font-size: 0.78rem; color: rgba(240,236,228,0.7); line-height: 1.6; }
        .divider { height: 1px; background: rgba(212,175,106,0.08); }
        .field-label { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,236,228,0.4); margin-bottom: 6px; }
        .field-select { width: 100%; background: #0f0f12; border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 9px 12px; color: #f0ece4; font-size: 0.78rem; font-family: 'Montserrat',sans-serif; outline: none; }
        .field-textarea { width: 100%; background: #0f0f12; border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 10px 12px; color: #f0ece4; font-size: 0.78rem; font-family: 'Montserrat',sans-serif; outline: none; resize: vertical; min-height: 100px; }
        .field-textarea:focus { border-color: rgba(212,175,106,0.35); }
        .field-textarea::placeholder { color: rgba(240,236,228,0.2); }
        .respuesta-existente { background: rgba(82,201,122,0.06); border: 1px solid rgba(82,201,122,0.2); border-radius: 8px; padding: 12px 14px; font-size: 0.78rem; color: rgba(240,236,228,0.7); line-height: 1.6; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; }
        .btn-cancel { background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,106,0.15); border-radius: 8px; padding: 9px 18px; color: rgba(240,236,228,0.5); font-size: 0.75rem; font-family: 'Montserrat',sans-serif; cursor: pointer; }
        .btn-save { background: rgba(212,175,106,0.15); border: 1px solid rgba(212,175,106,0.35); border-radius: 8px; padding: 9px 22px; color: #d4af6a; font-size: 0.75rem; font-weight: 600; font-family: 'Montserrat',sans-serif; cursor: pointer; letter-spacing: 0.08em; transition: background 0.2s; }
        .btn-save:hover:not(:disabled) { background: rgba(212,175,106,0.25); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* Stats chips */}
      <div className="stats-row">
        {(['todos', ...Object.keys(tipoConfig)] as string[]).map(t => {
          const cfg = t === 'todos' ? { icon: '📬', label: 'Todos' } : { icon: tipoConfig[t].icon, label: tipoConfig[t].label }
          const count = t === 'todos' ? mensajes.length : conteo(t)
          return (
            <div key={t} className={`stat-chip ${filtroTipo === t ? 'activo' : ''}`}
              onClick={() => setFiltroTipo(t)}>
              <span className="stat-chip-icon">{cfg.icon}</span>
              <span className="stat-chip-label">{cfg.label}</span>
              <span className="stat-chip-count">{count}</span>
            </div>
          )
        })}
      </div>

      <div className="filters">
        <select className="filter-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          {Object.entries(estadoConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input className="search-box" placeholder="Buscar en mensajes..." value={buscar} onChange={e => setBuscar(e.target.value)} />
      </div>

      {cargando ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💬</div>
          <div className="empty-text">No hay mensajes que coincidan con los filtros.</div>
        </div>
      ) : (
        <div className="msg-list">
          {filtrados.map(m => {
            const tc = tipoConfig[m.tipo] ?? tipoConfig.otro
            const ec = estadoConfig[m.estado] ?? estadoConfig.nuevo
            return (
              <div key={m.id}
                className={`msg-row ${m.estado === 'nuevo' ? 'nuevo-item' : ''}`}
                onClick={() => abrirMensaje(m)}>
                <span className="msg-tipo-icon">{tc.icon}</span>
                <div className="msg-body">
                  <div className="msg-top">
                    <span className="msg-asunto">{m.asunto}</span>
                    <span className="pill" style={{ background: `${tc.color}18`, color: tc.color }}>{tc.label}</span>
                    <span className="pill" style={{ background: `${ec.color}18`, color: ec.color }}>{ec.label}</span>
                  </div>
                  <div className="msg-remitente">
                    {m.anonimo ? 'Anonimo' : (m.usuarios?.nombre_completo ?? m.nombre_contacto ?? 'Desconocido')}
                    {m.categoria ? ` · ${m.categoria}` : ''}
                  </div>
                  <div className="msg-preview">{m.mensaje}</div>
                </div>
                <span className="msg-fecha">{new Date(m.created_at).toLocaleDateString('es-BO')}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL DETALLE */}
      {seleccionado && (
        <div className="overlay" onClick={cerrarMensaje}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-titulo">{seleccionado.asunto}</span>
              <div className="modal-close" onClick={cerrarMensaje}>✕</div>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Tipo</div>
                  <div className="info-value">{tipoConfig[seleccionado.tipo]?.label ?? seleccionado.tipo}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Categoria</div>
                  <div className="info-value">{seleccionado.categoria ?? '—'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Remitente</div>
                  <div className="info-value">
                    {seleccionado.anonimo ? 'Anonimo' : (seleccionado.usuarios?.nombre_completo ?? seleccionado.nombre_contacto ?? '—')}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Fecha</div>
                  <div className="info-value">{new Date(seleccionado.created_at).toLocaleString('es-BO')}</div>
                </div>
                {seleccionado.correo_contacto && (
                  <div className="info-item" style={{ gridColumn: '1/-1' }}>
                    <div className="info-label">Correo de contacto</div>
                    <div className="info-value">{seleccionado.correo_contacto}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="field-label">Mensaje</div>
                <div className="msg-texto-box">{seleccionado.mensaje}</div>
              </div>

              {seleccionado.respuesta && (
                <div>
                  <div className="field-label">Respuesta enviada</div>
                  <div className="respuesta-existente">{seleccionado.respuesta}</div>
                </div>
              )}

              <div className="divider" />

              <div>
                <div className="field-label">Estado</div>
                <select className="field-select" value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
                  {Object.entries(estadoConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div>
                <div className="field-label">{seleccionado.respuesta ? 'Actualizar respuesta' : 'Escribir respuesta'}</div>
                <textarea
                  className="field-textarea"
                  value={respuesta}
                  onChange={e => setRespuesta(e.target.value)}
                  placeholder="Escribe una respuesta para el huesped..."
                />
              </div>

              <div className="modal-footer">
                <button className="btn-cancel" onClick={cerrarMensaje}>Cancelar</button>
                <button className="btn-save" onClick={enviarRespuesta} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar respuesta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PersonalLayout>
  )
}

export default Buzon
