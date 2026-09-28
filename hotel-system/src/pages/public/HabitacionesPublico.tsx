import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'
import { getFotosHabitacion } from '../../services/api'
import type { FotoHab } from '../../services/api'

type HabDisponible = {
  habitacion_id: string
  numero: string
  piso: number
  nombre_tipo: string
  descripcion: string | null
  capacidad_adultos: number
  capacidad_ninos: number
  numero_camas: number
  tipo_cama: string
  precio: number
  id?: string
}

type TipoHab = {
  id: string
  nombre: string
  descripcion: string | null
  capacidad_adultos: number
  numero_camas: number
  tipo_cama: string
}

const HabitacionesPublico = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { perfil } = useAuth()

  const [fechaEntrada, setFechaEntrada] = useState(params.get('entrada') || '')
  const [fechaSalida, setFechaSalida] = useState(params.get('salida') || '')
  const [adultos, setAdultos] = useState(1)

  const [habitaciones, setHabitaciones] = useState<HabDisponible[]>([])
  const [tiposBase, setTiposBase] = useState<TipoHab[]>([])
  const [cargando, setCargando] = useState(false)
  const [busquedaHecha, setBusquedaHecha] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Fotos por habitación
  const [fotosPorHab, setFotosPorHab] = useState<Record<string, FotoHab[]>>({})
  const [galeriaHabId, setGaleriaHabId] = useState<string | null>(null)
  const [galeriaIdx, setGaleriaIdx] = useState(0)

  // Modal de login requerido
  const [modalLogin, setModalLogin] = useState(false)
  const [habSeleccionada, setHabSeleccionada] = useState<HabDisponible | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    cargarTiposBase()
    if (params.get('entrada') && params.get('salida')) buscar(params.get('entrada')!, params.get('salida')!)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const cargarTiposBase = async () => {
    const { data } = await supabase
      .from('tipos_habitacion')
      .select('id, nombre, descripcion, capacidad_adultos, numero_camas, tipo_cama')
    if (data) setTiposBase(data)
  }

  const buscar = async (entrada = fechaEntrada, salida = fechaSalida) => {
    if (!entrada || !salida) return
    setCargando(true)
    setBusquedaHecha(false)
    try {
      const { data } = await supabase.rpc('rpc_habitaciones_disponibles', {
        p_fecha_entrada: entrada,
        p_fecha_salida: salida,
      })
      const results: HabDisponible[] = data ?? []
      setHabitaciones(results)
      // Cargar fotos en paralelo para todas las habitaciones encontradas
      if (results.length > 0) {
        const entries = await Promise.all(
          results.map(async h => {
            const id = h.habitacion_id || h.id!
            const fotos = await getFotosHabitacion(id).catch(() => [])
            return [id, fotos] as [string, FotoHab[]]
          })
        )
        setFotosPorHab(Object.fromEntries(entries))
      }
    } catch { setHabitaciones([]) }
    finally { setCargando(false); setBusquedaHecha(true) }
  }

  const handleReservar = (hab: HabDisponible) => {
    if (!perfil) {
      setHabSeleccionada(hab)
      setModalLogin(true)
      return
    }
    if (perfil.rol !== 'Cliente') {
      alert('Solo los clientes pueden hacer reservas.')
      return
    }
    navigate('/cliente/reservar', {
      state: {
        habitacionId: hab.habitacion_id || hab.id,
        fechaEntrada,
        fechaSalida,
        adultos,
        precio: hab.precio,
        nombreHab: `${hab.nombre_tipo} - Hab. ${hab.numero}`,
      }
    })
  }

  const noches = fechaEntrada && fechaSalida
    ? Math.max(0, Math.ceil((new Date(fechaSalida).getTime() - new Date(fechaEntrada).getTime()) / 86400000))
    : 0

  const hoy = new Date().toISOString().split('T')[0]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; color: #f0ece4; font-family: 'Montserrat', sans-serif; }
        .hp-nav { position: sticky; top: 0; z-index: 200; padding: 0 40px; height: 68px; display: flex; align-items: center; justify-content: space-between; background: ${scrolled ? 'rgba(10,10,10,0.97)' : 'rgba(10,10,10,0.9)'}; backdrop-filter: blur(20px); border-bottom: 1px solid rgba(212,175,106,0.12); }
        .hp-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 300; color: #d4af6a; letter-spacing: 0.2em; cursor: pointer; }
        .hp-nav-actions { display: flex; gap: 12px; align-items: center; }
        .hp-back-btn { font-size: 0.68rem; font-weight: 500; letter-spacing: 0.1em; color: rgba(240,236,228,0.5); cursor: pointer; background: none; border: none; transition: color 0.2s; font-family: 'Montserrat', sans-serif; padding: 8px 0; }
        .hp-back-btn:hover { color: #d4af6a; }
        .hp-auth-btn { padding: 8px 20px; border: 1px solid rgba(212,175,106,0.35); border-radius: 4px; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; font-family: 'Montserrat', sans-serif; cursor: pointer; transition: all 0.2s; }
        .hp-auth-btn.outline { background: transparent; color: #d4af6a; }
        .hp-auth-btn.outline:hover { background: rgba(212,175,106,0.1); }
        .hp-auth-btn.gold { background: linear-gradient(135deg,#c9a84c,#d4af6a); border: none; color: #0a0a0a; }
        .hp-auth-btn.gold:hover { opacity: 0.9; }

        .hp-buscador-wrap { background: #0f0f12; border-bottom: 1px solid rgba(212,175,106,0.1); padding: 24px 40px; }
        .hp-buscador { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; max-width: 900px; margin: 0 auto; }
        .hp-campo { flex: 1; min-width: 140px; }
        .hp-campo label { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(240,236,228,0.3); display: block; margin-bottom: 7px; }
        .hp-campo input, .hp-campo select { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(212,175,106,0.2); border-radius: 6px; padding: 10px 12px; font-family: 'Montserrat', sans-serif; font-size: 0.8rem; color: #f0ece4; outline: none; transition: border-color 0.2s; color-scheme: dark; }
        .hp-campo input:focus, .hp-campo select:focus { border-color: rgba(212,175,106,0.5); }
        .hp-campo select option { background: #0f0f12; }
        .hp-buscar-btn { padding: 11px 28px; background: linear-gradient(135deg,#c9a84c,#d4af6a); border: none; border-radius: 6px; font-family: 'Montserrat', sans-serif; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .hp-buscar-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .hp-buscar-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .hp-main { padding: 32px 40px; max-width: 1200px; margin: 0 auto; }
        @media (max-width: 768px) { .hp-main { padding: 24px 20px; } .hp-buscador-wrap { padding: 20px 20px; } .hp-nav { padding: 0 20px; } }
        .hp-results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .hp-results-title { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 300; color: #f0ece4; }
        .hp-results-sub { font-size: 0.68rem; color: rgba(240,236,228,0.35); letter-spacing: 0.08em; margin-top: 4px; }
        .hp-noches-badge { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.1em; background: rgba(212,175,106,0.1); color: #d4af6a; border: 1px solid rgba(212,175,106,0.2); padding: 6px 14px; border-radius: 20px; }

        .hp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
        @media (max-width: 768px) { .hp-grid { grid-template-columns: 1fr; } }
        .hp-card { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 12px; overflow: hidden; transition: all 0.3s; }
        .hp-card:hover { border-color: rgba(212,175,106,0.25); transform: translateY(-2px); box-shadow: 0 16px 48px rgba(0,0,0,0.35); }
        .hp-card-img { height: 180px; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f18 100%); display: flex; align-items: center; justify-content: center; font-size: 3rem; color: rgba(212,175,106,0.2); }
        .hp-card-body { padding: 20px; }
        .hp-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .hp-card-nombre { font-family: 'Cormorant Garamond', serif; font-size: 1.25rem; font-weight: 400; color: #f0ece4; }
        .hp-card-num { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.12em; color: rgba(212,175,106,0.6); background: rgba(212,175,106,0.08); padding: 3px 8px; border-radius: 4px; margin-top: 3px; }
        .hp-card-desc { font-size: 0.72rem; color: rgba(240,236,228,0.4); line-height: 1.6; margin-bottom: 14px; }
        .hp-card-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
        .hp-chip { font-size: 0.58rem; font-weight: 500; letter-spacing: 0.08em; padding: 3px 10px; border-radius: 20px; background: rgba(106,184,212,0.1); color: #6ab8d4; border: 1px solid rgba(106,184,212,0.2); }
        .hp-card-precio-section { display: flex; align-items: flex-end; justify-content: space-between; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .hp-precio-noche { font-size: 0.6rem; color: rgba(240,236,228,0.3); letter-spacing: 0.1em; text-transform: uppercase; }
        .hp-precio-valor { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 300; color: #d4af6a; line-height: 1; }
        .hp-precio-total { font-size: 0.62rem; color: rgba(240,236,228,0.3); margin-top: 2px; }
        .hp-reservar-btn { padding: 11px 24px; background: linear-gradient(135deg,#c9a84c,#d4af6a); border: none; border-radius: 6px; font-family: 'Montserrat', sans-serif; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: all 0.2s; }
        .hp-reservar-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        .hp-empty { text-align: center; padding: 80px 20px; }
        .hp-empty-icon { font-size: 3rem; margin-bottom: 20px; opacity: 0.3; }
        .hp-empty-title { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 300; color: rgba(240,236,228,0.4); margin-bottom: 12px; }
        .hp-empty-sub { font-size: 0.75rem; color: rgba(240,236,228,0.2); }

        .hp-inicial { text-align: center; padding: 80px 20px; }
        .hp-inicial-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 300; color: rgba(240,236,228,0.6); margin-bottom: 12px; }
        .hp-inicial-sub { font-size: 0.75rem; color: rgba(240,236,228,0.25); line-height: 1.7; }

        .hp-skeleton { background: linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
        @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }

        /* Modal */
        .hp-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .hp-modal { background: #13131a; border: 1px solid rgba(212,175,106,0.2); border-radius: 16px; max-width: 440px; width: 100%; padding: 36px; text-align: center; }
        .hp-modal-icon { font-size: 2.5rem; margin-bottom: 20px; }
        .hp-modal h3 { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 300; color: #f0ece4; margin-bottom: 12px; }
        .hp-modal p { font-size: 0.78rem; color: rgba(240,236,228,0.45); line-height: 1.7; margin-bottom: 28px; }
        .hp-modal-btns { display: flex; flex-direction: column; gap: 10px; }
        .hp-modal-btn-gold { padding: 14px; background: linear-gradient(135deg,#c9a84c,#d4af6a); border: none; border-radius: 6px; font-family: 'Montserrat', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: all 0.2s; }
        .hp-modal-btn-gold:hover { opacity: 0.9; }
        .hp-modal-btn-outline { padding: 12px; background: transparent; border: 1px solid rgba(212,175,106,0.3); border-radius: 6px; font-family: 'Montserrat', sans-serif; font-size: 0.72rem; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #d4af6a; cursor: pointer; transition: all 0.2s; }
        .hp-modal-btn-outline:hover { background: rgba(212,175,106,0.08); }
        .hp-modal-cancel { font-size: 0.65rem; color: rgba(240,236,228,0.3); cursor: pointer; margin-top: 8px; transition: color 0.2s; }
        .hp-modal-cancel:hover { color: rgba(240,236,228,0.6); }

        /* Foto en card */
        .hp-card-img { height: 180px; background: linear-gradient(135deg,#1a1a2e 0%,#0f0f18 100%); display: flex; align-items: center; justify-content: center; font-size: 3rem; color: rgba(212,175,106,0.2); position: relative; overflow: hidden; }
        .hp-card-img img, .hp-card-img video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hp-card-img-btn { position: absolute; bottom: 10px; right: 10px; padding: 5px 12px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; font-size: 0.6rem; font-weight: 600; color: rgba(240,236,228,0.85); cursor: pointer; font-family: 'Montserrat',sans-serif; letter-spacing: 0.08em; backdrop-filter: blur(6px); transition: all 0.2s; }
        .hp-card-img-btn:hover { background: rgba(212,175,106,0.4); border-color: rgba(212,175,106,0.6); color: #d4af6a; }

        /* Galería lightbox */
        .hp-galeria-ov { position: fixed; inset: 0; z-index: 600; background: rgba(0,0,0,0.94); backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; animation: hpfadein 0.18s; }
        @keyframes hpfadein { from { opacity: 0 } to { opacity: 1 } }
        .hp-galeria-media { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 10px; display: block; }
        .hp-galeria-close { position: absolute; top: 20px; right: 24px; width: 40px; height: 40px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(240,236,228,0.7); font-size: 0.9rem; transition: background 0.2s; z-index: 10; font-family: 'Montserrat',sans-serif; }
        .hp-galeria-close:hover { background: rgba(255,255,255,0.18); }
        .hp-galeria-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(240,236,228,0.7); font-size: 1.2rem; transition: background 0.2s; z-index: 10; }
        .hp-galeria-nav:hover { background: rgba(255,255,255,0.18); }
        .hp-galeria-prev { left: 20px; }
        .hp-galeria-next { right: 20px; }
        .hp-galeria-cnt { position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); font-size: 0.7rem; color: rgba(240,236,228,0.4); background: rgba(0,0,0,0.55); padding: 5px 14px; border-radius: 20px; font-family: 'Montserrat',sans-serif; }
        .hp-galeria-video-lbl { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; color: rgba(240,236,228,0.5); background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 12px; font-family: 'Montserrat',sans-serif; letter-spacing: 0.08em; }
      `}</style>

      {/* Navbar */}
      <nav className="hp-nav">
        <span className="hp-logo" onClick={() => navigate('/')}>Grand Hôtel</span>
        <div className="hp-nav-actions">
          <button className="hp-back-btn" onClick={() => navigate('/')}>← Inicio</button>
          {!perfil ? (
            <>
              <button className="hp-auth-btn outline" onClick={() => navigate('/login', { state: { redirectHabitaciones: true } })}>Iniciar sesión</button>
              <button className="hp-auth-btn gold" onClick={() => navigate('/registro')}>Crear cuenta</button>
            </>
          ) : perfil.rol === 'Cliente' ? (
            <button className="hp-auth-btn gold" onClick={() => navigate('/cliente/inicio')}>Mi cuenta</button>
          ) : (
            <button className="hp-auth-btn gold" onClick={() => navigate('/personal/dashboard')}>Panel</button>
          )}
        </div>
      </nav>

      {/* Buscador */}
      <div className="hp-buscador-wrap">
        <div className="hp-buscador">
          <div className="hp-campo">
            <label>Llegada</label>
            <input type="date" value={fechaEntrada} min={hoy}
              onChange={e => setFechaEntrada(e.target.value)} />
          </div>
          <div className="hp-campo">
            <label>Salida</label>
            <input type="date" value={fechaSalida} min={fechaEntrada || hoy}
              onChange={e => setFechaSalida(e.target.value)} />
          </div>
          <div className="hp-campo" style={{ maxWidth: 120 }}>
            <label>Adultos</label>
            <select value={adultos} onChange={e => setAdultos(Number(e.target.value))}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button className="hp-buscar-btn"
            disabled={!fechaEntrada || !fechaSalida || cargando}
            onClick={() => buscar()}>
            {cargando ? 'Buscando...' : 'Buscar disponibilidad'}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="hp-main">
        {!busquedaHecha && !cargando && tiposBase.length > 0 && (
          <>
            <div className="hp-results-header">
              <div>
                <div className="hp-results-title">Nuestras habitaciones</div>
                <div className="hp-results-sub">Selecciona fechas para ver disponibilidad y precios exactos</div>
              </div>
            </div>
            <div className="hp-grid">
              {tiposBase.map(tipo => (
                <div key={tipo.id} className="hp-card">
                  <div className="hp-card-img">🛏</div>
                  <div className="hp-card-body">
                    <div className="hp-card-header">
                      <div className="hp-card-nombre">{tipo.nombre}</div>
                    </div>
                    {tipo.descripcion && <div className="hp-card-desc">{tipo.descripcion}</div>}
                    <div className="hp-card-chips">
                      <span className="hp-chip">{tipo.capacidad_adultos} adultos</span>
                      <span className="hp-chip">{tipo.numero_camas} {tipo.numero_camas === 1 ? 'cama' : 'camas'}</span>
                      <span className="hp-chip">{tipo.tipo_cama}</span>
                    </div>
                    <div className="hp-card-precio-section">
                      <div>
                        <div className="hp-precio-noche">Precio desde</div>
                        <div className="hp-precio-valor" style={{ fontSize: '1rem', color: 'rgba(240,236,228,0.4)' }}>Consultar</div>
                        <div className="hp-precio-total">Selecciona fechas para ver precio</div>
                      </div>
                      <button className="hp-reservar-btn" onClick={() => {
                        document.querySelector('.hp-buscador-wrap')?.scrollIntoView({ behavior: 'smooth' })
                      }}>
                        Ver precio
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {cargando && (
          <div className="hp-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="hp-skeleton" style={{ height: 380 }} />
            ))}
          </div>
        )}

        {busquedaHecha && !cargando && (
          <>
            <div className="hp-results-header">
              <div>
                <div className="hp-results-title">
                  {habitaciones.length > 0
                    ? `${habitaciones.length} habitación${habitaciones.length !== 1 ? 'es' : ''} disponible${habitaciones.length !== 1 ? 's' : ''}`
                    : 'Sin disponibilidad'}
                </div>
                <div className="hp-results-sub">
                  {fechaEntrada} → {fechaSalida}
                  {noches > 0 && ` · ${noches} noche${noches !== 1 ? 's' : ''}`}
                </div>
              </div>
              {noches > 0 && (
                <div className="hp-noches-badge">{noches} noche{noches !== 1 ? 's' : ''}</div>
              )}
            </div>

            {habitaciones.length === 0 ? (
              <div className="hp-empty">
                <div className="hp-empty-icon">🔍</div>
                <div className="hp-empty-title">No hay disponibilidad</div>
                <p className="hp-empty-sub">No encontramos habitaciones para esas fechas.<br />Intenta con otras fechas o contacta con nosotros.</p>
              </div>
            ) : (
              <div className="hp-grid">
                {habitaciones.filter(h => h.capacidad_adultos >= adultos).map(hab => {
                  const habId = hab.habitacion_id || hab.id!
                  const fotos = fotosPorHab[habId] ?? []
                  const portada = fotos[0] ?? null
                  return (
                  <div key={habId} className="hp-card">
                    <div className="hp-card-img">
                      {portada
                        ? portada.tipo === 'video'
                          ? <video src={portada.url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <img src={portada.url} alt={portada.titulo ?? ''} />
                        : '🛏'
                      }
                      {fotos.length > 0 && (
                        <button className="hp-card-img-btn"
                          onClick={e => { e.stopPropagation(); setGaleriaHabId(habId); setGaleriaIdx(0) }}>
                          📷 {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    <div className="hp-card-body">
                      <div className="hp-card-header">
                        <div>
                          <div className="hp-card-nombre">{hab.nombre_tipo}</div>
                          <div className="hp-card-num">Hab. {hab.numero} · Piso {hab.piso}</div>
                        </div>
                      </div>
                      {hab.descripcion && <div className="hp-card-desc">{hab.descripcion}</div>}
                      <div className="hp-card-chips">
                        <span className="hp-chip">{hab.capacidad_adultos} adultos</span>
                        {hab.capacidad_ninos > 0 && <span className="hp-chip">{hab.capacidad_ninos} niños</span>}
                        <span className="hp-chip">{hab.numero_camas} {hab.numero_camas === 1 ? 'cama' : 'camas'}</span>
                        <span className="hp-chip">{hab.tipo_cama}</span>
                      </div>
                      <div className="hp-card-precio-section">
                        <div>
                          <div className="hp-precio-noche">Por noche</div>
                          <div className="hp-precio-valor">Bs. {Number(hab.precio).toLocaleString()}</div>
                          {noches > 0 && (
                            <div className="hp-precio-total">
                              Total: Bs. {(Number(hab.precio) * noches).toLocaleString()} ({noches} noches)
                            </div>
                          )}
                        </div>
                        <button className="hp-reservar-btn" onClick={() => handleReservar(hab)}>
                          Reservar
                        </button>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Galería lightbox */}
      {galeriaHabId && (() => {
        const fotos = fotosPorHab[galeriaHabId] ?? []
        const foto  = fotos[galeriaIdx] ?? null
        if (!foto) return null
        return (
          <div className="hp-galeria-ov" onClick={() => setGaleriaHabId(null)}>
            <button className="hp-galeria-close" onClick={() => setGaleriaHabId(null)}>✕</button>
            {foto.tipo === 'video' && <div className="hp-galeria-video-lbl">▶ Video</div>}
            {foto.tipo === 'video'
              ? <video src={foto.url} className="hp-galeria-media" controls autoPlay onClick={e => e.stopPropagation()} />
              : <img src={foto.url} className="hp-galeria-media" alt={foto.titulo ?? ''} onClick={e => e.stopPropagation()} />
            }
            {fotos.length > 1 && galeriaIdx > 0 && (
              <button className="hp-galeria-nav hp-galeria-prev"
                onClick={e => { e.stopPropagation(); setGaleriaIdx(i => Math.max(0, i - 1)) }}>‹</button>
            )}
            {fotos.length > 1 && galeriaIdx < fotos.length - 1 && (
              <button className="hp-galeria-nav hp-galeria-next"
                onClick={e => { e.stopPropagation(); setGaleriaIdx(i => Math.min(fotos.length - 1, i + 1)) }}>›</button>
            )}
            {fotos.length > 1 && (
              <div className="hp-galeria-cnt">{galeriaIdx + 1} / {fotos.length}</div>
            )}
          </div>
        )
      })()}

      {/* Modal: Login requerido */}
      {modalLogin && (
        <div className="hp-modal-overlay" onClick={() => setModalLogin(false)}>
          <div className="hp-modal" onClick={e => e.stopPropagation()}>
            <div className="hp-modal-icon">🔐</div>
            <h3>Inicia sesión para reservar</h3>
            <p>Para completar tu reserva necesitas una cuenta. Es rápido y gratuito.</p>
            <div className="hp-modal-btns">
              <button className="hp-modal-btn-gold" onClick={() => {
                setModalLogin(false)
                navigate('/cliente/login', {
                  state: {
                    redirect: '/habitaciones',
                    habitacionId: habSeleccionada?.habitacion_id || habSeleccionada?.id,
                    fechaEntrada,
                    fechaSalida,
                    adultos,
                    precio: habSeleccionada?.precio,
                    nombreHab: habSeleccionada ? `${habSeleccionada.nombre_tipo} - Hab. ${habSeleccionada.numero}` : '',
                  }
                })
              }}>
                Iniciar sesión
              </button>
              <button className="hp-modal-btn-outline" onClick={() => {
                setModalLogin(false)
                navigate('/registro', {
                  state: {
                    redirect: '/habitaciones',
                    habitacionId: habSeleccionada?.habitacion_id || habSeleccionada?.id,
                    fechaEntrada,
                    fechaSalida,
                  }
                })
              }}>
                Crear cuenta gratis
              </button>
              <span className="hp-modal-cancel" onClick={() => setModalLogin(false)}>Cancelar</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default HabitacionesPublico
