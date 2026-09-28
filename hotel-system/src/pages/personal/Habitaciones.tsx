import { useState, useEffect, useCallback, useRef } from 'react'
import PersonalLayout from '../../components/PersonalLayout'
import {
  getHabitaciones, getTiposHabitacion, crearHabitacion,
  actualizarHabitacion, actualizarEstadoHabitacion, getProximasReservasHabitacion,
  getFotosHabitacion, subirFotoHabitacion, eliminarFotoHabitacion, getPortadasHabitaciones,
} from '../../services/api'
import type { FotoHab } from '../../services/api'

// ── Types ──────────────────────────────────────────────────────────────────
type TipoHab = {
  id: string; nombre: string; precio_base: number
  capacidad_adultos: number; capacidad_ninos: number
  numero_camas: number; tipo_cama: string
}
type Habitacion = {
  id: string; numero: string; piso: number; estado: string
  descripcion: string | null; observaciones: string | null
  disponible_online: boolean; amenidades: string[] | null
  motivo_mantenimiento: string | null; tipo_habitacion_id: string
  tipos_habitacion: TipoHab | null
}
type ProximaRes = {
  codigo_reserva: string; cliente_nombre: string
  fecha_entrada: string; fecha_salida: string; estado: string
}

// ── Config ────────────────────────────────────────────────────────────────
const EC: Record<string, { bg: string; color: string; label: string }> = {
  disponible:     { bg: 'rgba(82,201,122,0.12)',  color: '#52c97a', label: 'Disponible'        },
  ocupada:        { bg: 'rgba(106,184,212,0.12)', color: '#6ab8d4', label: 'Ocupada'           },
  reservada:      { bg: 'rgba(212,175,106,0.12)', color: '#d4af6a', label: 'Reservada'         },
  limpieza:       { bg: 'rgba(160,106,212,0.12)', color: '#a06ad4', label: 'En limpieza'       },
  mantenimiento:  { bg: 'rgba(212,122,106,0.12)', color: '#d47a6a', label: 'Mantenimiento'     },
  bloqueada:      { bg: 'rgba(150,150,160,0.12)', color: '#9696a0', label: 'Bloqueada'         },
  fuera_servicio: { bg: 'rgba(80,80,90,0.15)',    color: '#64646e', label: 'Fuera de servicio' },
}

const AMENIDADES = [
  { key: 'wifi',            label: 'WiFi'            },
  { key: 'ac',              label: 'A/C'             },
  { key: 'tv',              label: 'TV'              },
  { key: 'netflix',         label: 'Streaming'       },
  { key: 'minibar',         label: 'Minibar'         },
  { key: 'caja_fuerte',     label: 'Caja fuerte'     },
  { key: 'escritorio',      label: 'Escritorio'      },
  { key: 'balcon',          label: 'Balcón'          },
  { key: 'jacuzzi',         label: 'Jacuzzi'         },
  { key: 'bano_privado',    label: 'Baño privado'    },
  { key: 'secador',         label: 'Secador'         },
  { key: 'room_service',    label: 'Room service'    },
  { key: 'vista_panoramica',label: 'Vista panorámica'},
]

const ESTADOS_CAMBIO    = ['disponible', 'mantenimiento', 'fuera_servicio', 'bloqueada']
const ESTADOS_CON_MOTIVO = ['mantenimiento', 'fuera_servicio']

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
export default function Habitaciones() {
  const [habs,    setHabs]    = useState<Habitacion[]>([])
  const [tipos,   setTipos]   = useState<TipoHab[]>([])
  const [cargando,setCargando]= useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [vista,        setVista]        = useState<'grid' | 'lista'>('grid')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPiso,   setFiltroPiso]   = useState('todos')
  const [busqueda,     setBusqueda]     = useState('')

  // Panel derecho
  const [panelId,     setPanelId]    = useState<string | null>(null)
  const [proximasRes, setProximasRes]= useState<ProximaRes[]>([])
  const [cargRes,     setCargRes]    = useState(false)
  const [errorPanel,  setErrorPanel] = useState<string | null>(null)

  // Fotos
  const [fotos,       setFotos]      = useState<FotoHab[]>([])
  const [portadas,    setPortadas]   = useState<Record<string, string>>({})
  const [subiendoFoto,setSubiendoFoto]= useState(false)
  const [errorFoto,   setErrorFoto]  = useState<string | null>(null)
  const [galeriaIdx,  setGaleriaIdx] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado change en panel
  const [nuevoEstado,  setNuevoEstado]  = useState('')
  const [motivoEstado, setMotivoEstado] = useState('')
  const [cambiandoEst, setCambiandoEst] = useState(false)
  const [errorEstado,  setErrorEstado]  = useState<string | null>(null)
  const [exitoEstado,  setExitoEstado]  = useState(false)

  // Modal crear / editar
  const [modoModal,  setModoModal]  = useState<'crear' | 'editar' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [exitoModal, setExitoModal] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [fNumero,    setFNumero]    = useState('')
  const [fPiso,      setFPiso]      = useState(1)
  const [fTipoId,    setFTipoId]    = useState('')
  const [fDesc,      setFDesc]      = useState('')
  const [fObs,       setFObs]       = useState('')
  const [fOnline,    setFOnline]    = useState(true)
  const [fAmen,      setFAmen]      = useState<string[]>([])

  // ── Data ──────────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true)
      const [habsData, tiposData, portadasData] = await Promise.all([
        getHabitaciones(), getTiposHabitacion(), getPortadasHabitaciones().catch(() => []),
      ])
      setHabs(habsData as Habitacion[])
      setTipos(tiposData as TipoHab[])
      const map: Record<string, string> = {}
      portadasData.forEach(p => { map[p.habitacion_id] = p.url })
      setPortadas(map)
    } catch {
      setError('No se pudieron cargar las habitaciones.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  useEffect(() => {
    if (!panelId) {
      setProximasRes([]); setFotos([]); setErrorPanel(null)
      setErrorFoto(null); setGaleriaIdx(null); return
    }
    setCargRes(true); setErrorPanel(null)
    Promise.all([
      getProximasReservasHabitacion(panelId).catch(() => []),
      getFotosHabitacion(panelId).catch(() => []),
    ]).then(([res, fts]) => {
      setProximasRes(res)
      setFotos(fts)
    }).finally(() => setCargRes(false))
  }, [panelId])

  useEffect(() => {
    setNuevoEstado(''); setMotivoEstado('')
    setErrorEstado(null); setExitoEstado(false)
  }, [panelId])

  // ── Derivados ─────────────────────────────────────────────────────────
  const sel = panelId ? habs.find(h => h.id === panelId) ?? null : null
  const pisos = [...new Set(habs.map(h => h.piso))].sort((a, b) => a - b)

  const filtradas = habs.filter(h => {
    const mE = filtroEstado === 'todos' || h.estado === filtroEstado
    const mP = filtroPiso   === 'todos' || h.piso === Number(filtroPiso)
    const mB = !busqueda ||
      h.numero.includes(busqueda) ||
      (h.tipos_habitacion?.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
    return mE && mP && mB
  })

  const stats = Object.entries(EC).map(([key, val]) => ({
    key, ...val, count: habs.filter(h => h.estado === key).length,
  }))

  // ── Acciones ──────────────────────────────────────────────────────────
  const handleCambiarEstado = async () => {
    if (!sel || !nuevoEstado) return
    if (ESTADOS_CON_MOTIVO.includes(nuevoEstado) && !motivoEstado.trim()) {
      setErrorEstado('Debes indicar el motivo.'); return
    }
    setCambiandoEst(true); setErrorEstado(null)
    try {
      await actualizarEstadoHabitacion(sel.id, nuevoEstado, motivoEstado || undefined)
      setHabs(prev => prev.map(h => h.id === sel.id
        ? { ...h, estado: nuevoEstado,
            motivo_mantenimiento: ESTADOS_CON_MOTIVO.includes(nuevoEstado) ? motivoEstado : null }
        : h))
      setExitoEstado(true); setNuevoEstado(''); setMotivoEstado('')
      setTimeout(() => setExitoEstado(false), 3000)
    } catch (e) {
      setErrorEstado((e as Error).message)
    } finally {
      setCambiandoEst(false)
    }
  }

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !panelId) return
    setSubiendoFoto(true); setErrorFoto(null)
    try {
      await subirFotoHabitacion(panelId, file)
      const nuevas = await getFotosHabitacion(panelId)
      setFotos(nuevas)
      // Actualizar portada en el grid si es la primera foto
      if (nuevas.length > 0) {
        setPortadas(prev => ({ ...prev, [panelId]: nuevas[0].url }))
      }
    } catch (err) {
      setErrorFoto((err as Error).message)
    } finally {
      setSubiendoFoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleEliminarFoto = async (foto: FotoHab, ev: React.MouseEvent) => {
    ev.stopPropagation()
    try {
      await eliminarFotoHabitacion(foto.id, foto.storage_path)
      setFotos(prev => prev.filter(f => f.id !== foto.id))
      setGaleriaIdx(null)
    } catch (err) {
      setErrorFoto((err as Error).message)
    }
  }

  const abrirCrear = () => {
    setModoModal('crear')
    setFNumero(''); setFPiso(1); setFTipoId(tipos[0]?.id ?? '')
    setFDesc(''); setFObs(''); setFOnline(true); setFAmen([])
    setExitoModal(false); setErrorModal(null)
  }

  const abrirEditar = () => {
    if (!sel) return
    setModoModal('editar')
    setFNumero(sel.numero); setFPiso(sel.piso)
    setFTipoId(sel.tipo_habitacion_id)
    setFDesc(sel.descripcion ?? '')
    setFObs(sel.observaciones ?? '')
    setFOnline(sel.disponible_online)
    setFAmen(sel.amenidades ?? [])
    setExitoModal(false); setErrorModal(null)
  }

  const handleGuardar = async () => {
    if (!fNumero.trim() || !fTipoId) { setErrorModal('Completa los campos requeridos.'); return }
    setProcesando(true); setErrorModal(null)
    try {
      if (modoModal === 'crear') {
        await crearHabitacion({
          numero: fNumero.trim(), piso: fPiso, tipoHabitacionId: fTipoId,
          descripcion: fDesc || undefined, disponibleOnline: fOnline, amenidades: fAmen,
        })
      } else if (sel) {
        await actualizarHabitacion({
          habitacionId: sel.id, numero: fNumero.trim(), piso: fPiso,
          tipoHabitacionId: fTipoId, descripcion: fDesc || undefined,
          observaciones: fObs || undefined, disponibleOnline: fOnline, amenidades: fAmen,
        })
      }
      setExitoModal(true)
      await cargarDatos()
      setTimeout(() => { setExitoModal(false); setModoModal(null) }, 2000)
    } catch (e) {
      setErrorModal((e as Error).message)
    } finally {
      setProcesando(false)
    }
  }

  const toggleAmen = (key: string) =>
    setFAmen(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const gFoto = galeriaIdx !== null ? fotos[galeriaIdx] ?? null : null

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .hb-stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px}
        .hb-stat{display:flex;align-items:center;gap:9px;padding:11px 15px;background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:10px;cursor:pointer;transition:all 0.2s}
        .hb-stat:hover{border-color:rgba(212,175,106,0.25);transform:translateY(-1px)}
        .hb-stat.act{border-color:rgba(212,175,106,0.35);background:rgba(212,175,106,0.05)}
        .hb-stat-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
        .hb-stat-n{font-family:'Cormorant Garamond',serif;font-size:1.25rem;color:#f0ece4;line-height:1}
        .hb-stat-l{font-size:0.62rem;color:rgba(240,236,228,0.38);margin-top:1px}
        .hb-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .hb-search{flex:1;min-width:200px;position:relative}
        .hb-search input{width:100%;background:#13131a;border:1px solid rgba(212,175,106,0.15);border-radius:8px;padding:9px 14px 9px 36px;font-family:Montserrat,sans-serif;font-size:0.78rem;color:#f0ece4;outline:none;transition:border-color 0.3s}
        .hb-search input::placeholder{color:rgba(240,236,228,0.22)}
        .hb-search input:focus{border-color:rgba(212,175,106,0.35)}
        .hb-search-ic{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:rgba(240,236,228,0.28);font-size:0.85rem}
        .hb-sel{background:#13131a;border:1px solid rgba(212,175,106,0.15);border-radius:8px;padding:9px 12px;font-family:Montserrat,sans-serif;font-size:0.76rem;color:rgba(240,236,228,0.55);outline:none;cursor:pointer}
        .hb-sel option{background:#1a1a22}
        .hb-vista{display:flex;gap:5px}
        .hb-vbtn{width:34px;height:34px;background:#13131a;border:1px solid rgba(212,175,106,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;font-size:0.85rem}
        .hb-vbtn.act{background:rgba(212,175,106,0.1);border-color:rgba(212,175,106,0.3)}
        .hb-btn-new{padding:9px 16px;border-radius:8px;background:linear-gradient(135deg,#c9a84c,#d4af6a);border:none;cursor:pointer;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#0a0a0a;white-space:nowrap;transition:opacity 0.2s,transform 0.15s}
        .hb-btn-new:hover{opacity:0.88;transform:translateY(-1px)}
        .hb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
        .hb-card{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;overflow:hidden;cursor:pointer;transition:all 0.22s;position:relative}
        .hb-card:hover{border-color:rgba(212,175,106,0.28);transform:translateY(-2px)}
        .hb-card.sel{border-color:rgba(212,175,106,0.45);background:rgba(212,175,106,0.04)}
        .hb-card-thumb{height:120px;position:relative;overflow:hidden;background:#0d0d14;display:flex;align-items:center;justify-content:center}
        .hb-card-thumb img,.hb-card-thumb video{width:100%;height:100%;object-fit:cover;display:block}
        .hb-card-thumb-placeholder{font-size:2rem;color:rgba(212,175,106,0.15)}
        .hb-card-thumb-count{position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.65);color:rgba(240,236,228,0.8);font-size:0.6rem;padding:3px 7px;border-radius:4px;backdrop-filter:blur(4px)}
        .hb-card-body{padding:14px}
        .hb-card-corner{position:absolute;top:0;right:0;width:42px;height:42px;pointer-events:none}
        .hb-card-num{font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:300;line-height:1;margin-bottom:3px}
        .hb-card-tipo{font-size:0.64rem;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:rgba(240,236,228,0.38);margin-bottom:10px}
        .hb-card-row{display:flex;gap:12px;margin-bottom:10px}
        .hb-card-item span{display:block;font-size:0.58rem;color:rgba(240,236,228,0.25);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:1px}
        .hb-card-item{font-size:0.68rem;color:rgba(240,236,228,0.5)}
        .hb-card-precio{font-family:'Cormorant Garamond',serif;font-size:1rem;color:#d4af6a;margin-bottom:10px}
        .hb-pill{display:inline-block;font-size:0.58rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 9px;border-radius:20px}
        .hb-table-wrap{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;overflow:hidden}
        .hb-table-head{padding:14px 20px;border-bottom:1px solid rgba(212,175,106,0.07);display:flex;align-items:center;justify-content:space-between}
        .hb-table-tit{font-size:0.7rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.45)}
        .hb-table-cnt{font-size:0.66rem;background:rgba(212,175,106,0.1);color:#d4af6a;padding:3px 10px;border-radius:20px}
        table{width:100%;border-collapse:collapse}
        thead th{font-size:0.6rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.22);text-align:left;padding:11px 20px;border-bottom:1px solid rgba(255,255,255,0.04)}
        tbody tr{border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.15s;cursor:pointer}
        tbody tr:last-child{border-bottom:none}
        tbody tr:hover{background:rgba(212,175,106,0.04)}
        tbody td{padding:12px 20px;font-size:0.76rem;color:rgba(240,236,228,0.65);vertical-align:middle}
        .td-num{font-family:'Cormorant Garamond',serif;font-size:1.08rem;color:#d4af6a}
        .hb-empty{padding:56px;text-align:center;color:rgba(240,236,228,0.22);font-size:0.82rem}
        .hb-skel{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:4px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .hb-err{background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:0.76rem;color:#e05252}
        .hb-ok{background:rgba(82,201,122,0.08);border:1px solid rgba(82,201,122,0.2);border-radius:8px;padding:10px 14px;font-size:0.76rem;color:#52c97a;text-align:center}
        /* Panel */
        .hb-panel-ov{position:fixed;inset:0;z-index:180;background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);animation:fadein 0.2s}
        @keyframes fadein{from{opacity:0}to{opacity:1}}
        .hb-panel{position:fixed;top:0;right:0;bottom:0;width:460px;max-width:96vw;z-index:190;background:#0f0f12;border-left:1px solid rgba(212,175,106,0.15);display:flex;flex-direction:column;animation:slidein 0.3s cubic-bezier(0.16,1,0.3,1);overflow:hidden}
        @keyframes slidein{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .hb-panel-scroll{flex:1;overflow-y:auto}
        .hb-panel-scroll::-webkit-scrollbar{width:3px}
        .hb-panel-scroll::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.18)}
        .hb-panel-hdr{padding:24px 24px 16px;border-bottom:1px solid rgba(212,175,106,0.08);display:flex;align-items:flex-start;justify-content:space-between}
        .hb-panel-num{font-family:'Cormorant Garamond',serif;font-size:2.8rem;font-weight:300;line-height:1}
        .hb-panel-sub{font-size:0.72rem;color:rgba(240,236,228,0.4);margin-top:3px}
        .hb-panel-close{width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.45);font-size:0.78rem;transition:background 0.2s;flex-shrink:0}
        .hb-panel-close:hover{background:rgba(255,255,255,0.1)}
        .hb-panel-body{padding:20px 24px 28px}
        .hb-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
        .hb-info-item label{font-size:0.58rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.28);display:block;margin-bottom:4px}
        .hb-info-item .val{font-size:0.82rem;color:#f0ece4}
        .hb-sec-lbl{font-size:0.6rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:10px}
        .hb-amen-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px}
        .hb-amen-badge{font-size:0.62rem;padding:4px 10px;border-radius:20px;background:rgba(212,175,106,0.1);color:rgba(240,236,228,0.6);border:1px solid rgba(212,175,106,0.18)}
        .hb-sep{height:1px;background:rgba(212,175,106,0.07);margin:18px 0}
        .hb-res-item{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .hb-res-item:last-child{border-bottom:none}
        .hb-res-cod{font-size:0.7rem;color:#d4af6a}
        .hb-res-cli{font-size:0.68rem;color:rgba(240,236,228,0.5);margin-top:1px}
        .hb-res-dates{font-size:0.65rem;color:rgba(240,236,228,0.35);text-align:right}
        .hb-est-btns{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}
        .hb-est-btn{padding:6px 12px;border-radius:20px;font-size:0.6rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;border:1px solid;transition:all 0.18s;font-family:Montserrat,sans-serif}
        .hb-est-btn:disabled{opacity:0.4;cursor:not-allowed}
        .hb-btn-confirm{padding:11px 20px;border-radius:8px;background:linear-gradient(135deg,#c9a84c,#d4af6a);border:none;color:#0a0a0a;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:opacity 0.2s;margin-bottom:14px}
        .hb-btn-confirm:disabled{opacity:0.4;cursor:not-allowed}
        .hb-btn-edit{width:100%;padding:11px;border-radius:8px;background:rgba(212,175,106,0.08);border:1px solid rgba(212,175,106,0.22);color:#d4af6a;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;margin-top:6px}
        .hb-btn-edit:hover{background:rgba(212,175,106,0.15)}
        /* Fotos */
        .hb-foto-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}
        .hb-foto-thumb{position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer;background:#1a1a22;border:1px solid rgba(255,255,255,0.06)}
        .hb-foto-thumb:hover .hb-foto-ov{opacity:1}
        .hb-foto-thumb img,.hb-foto-thumb video{width:100%;height:100%;object-fit:cover;display:block}
        .hb-foto-ov{position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;gap:8px;opacity:0;transition:opacity 0.2s}
        .hb-foto-view{background:rgba(212,175,106,0.25);border:1px solid rgba(212,175,106,0.5);border-radius:5px;padding:5px 9px;font-size:0.6rem;color:#d4af6a;cursor:pointer;font-family:Montserrat,sans-serif;font-weight:600;letter-spacing:0.08em}
        .hb-foto-del{background:rgba(224,82,82,0.25);border:1px solid rgba(224,82,82,0.5);border-radius:5px;padding:5px 9px;font-size:0.6rem;color:#e05252;cursor:pointer;font-family:Montserrat,sans-serif;font-weight:600;letter-spacing:0.08em}
        .hb-foto-video-ic{position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.6);color:rgba(240,236,228,0.9);font-size:0.65rem;padding:2px 6px;border-radius:3px;pointer-events:none}
        .hb-btn-foto{width:100%;padding:10px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px dashed rgba(212,175,106,0.25);color:rgba(212,175,106,0.6);font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;margin-bottom:4px}
        .hb-btn-foto:hover:not(:disabled){background:rgba(212,175,106,0.06);border-color:rgba(212,175,106,0.4);color:#d4af6a}
        .hb-btn-foto:disabled{opacity:0.4;cursor:not-allowed}
        /* Galería lightbox */
        .hb-galeria-ov{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.92);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:fadein 0.18s}
        .hb-galeria-media{max-width:90vw;max-height:85vh;border-radius:10px;object-fit:contain;display:block}
        .hb-galeria-close{position:absolute;top:20px;right:24px;width:38px;height:38px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.7);font-size:0.85rem;z-index:10;transition:background 0.2s}
        .hb-galeria-close:hover{background:rgba(255,255,255,0.15)}
        .hb-galeria-nav{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.7);font-size:1rem;transition:background 0.2s;z-index:10}
        .hb-galeria-nav:hover{background:rgba(255,255,255,0.15)}
        .hb-galeria-prev{left:20px}
        .hb-galeria-next{right:20px}
        .hb-galeria-cnt{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);font-size:0.68rem;color:rgba(240,236,228,0.4);background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:20px}
        .hb-galeria-del{position:absolute;bottom:20px;right:20px;padding:7px 14px;background:rgba(224,82,82,0.2);border:1px solid rgba(224,82,82,0.4);border-radius:7px;color:#e05252;font-size:0.65rem;font-weight:600;cursor:pointer;font-family:Montserrat,sans-serif;letter-spacing:0.08em;text-transform:uppercase;transition:background 0.2s}
        .hb-galeria-del:hover{background:rgba(224,82,82,0.35)}
        /* Modal */
        .hb-modal-ov{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.72);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadein 0.18s}
        .hb-modal{background:#13131a;border:1px solid rgba(212,175,106,0.2);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;animation:slideup 0.28s cubic-bezier(0.16,1,0.3,1)}
        @keyframes slideup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .hb-modal::-webkit-scrollbar{width:3px}
        .hb-modal::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.2)}
        .hb-modal-hdr{padding:22px 22px 14px;border-bottom:1px solid rgba(212,175,106,0.08);display:flex;align-items:flex-start;justify-content:space-between}
        .hb-modal-body{padding:18px 22px 24px}
        .hb-modal-close{width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.4);font-size:0.78rem;transition:background 0.2s}
        .hb-modal-close:hover{background:rgba(255,255,255,0.1)}
        .hb-modal-g2{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:13px}
        .hb-modal-f{margin-bottom:13px}
        .hb-amen-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}
        .hb-amen-chk{display:flex;align-items:center;gap:7px;padding:7px 9px;border-radius:7px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.15s}
        .hb-amen-chk:hover{border-color:rgba(212,175,106,0.22)}
        .hb-amen-chk.on{background:rgba(212,175,106,0.08);border-color:rgba(212,175,106,0.3)}
        .hb-amen-box{width:14px;height:14px;border-radius:3px;border:1px solid rgba(212,175,106,0.3);background:transparent;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.58rem;color:#d4af6a;transition:all 0.15s}
        .hb-amen-chk.on .hb-amen-box{background:rgba(212,175,106,0.22);border-color:rgba(212,175,106,0.6)}
        .hb-amen-txt{font-size:0.66rem;color:rgba(240,236,228,0.52)}
        .hb-amen-chk.on .hb-amen-txt{color:rgba(240,236,228,0.85)}
        .hb-toggle{display:flex;align-items:center;gap:10px;cursor:pointer}
        .hb-tog-box{width:38px;height:20px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(212,175,106,0.2);position:relative;transition:all 0.2s}
        .hb-tog-box.on{background:rgba(82,201,122,0.2);border-color:rgba(82,201,122,0.4)}
        .hb-tog-thumb{width:14px;height:14px;border-radius:50%;background:rgba(240,236,228,0.35);position:absolute;top:2px;left:2px;transition:all 0.2s}
        .hb-tog-box.on .hb-tog-thumb{left:20px;background:#52c97a}
        .hb-btn-save{width:100%;padding:12px;border-radius:8px;border:none;font-family:Montserrat,sans-serif;font-size:0.7rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#0a0a0a;cursor:pointer;margin-top:8px;transition:all 0.2s}
        .hb-exito-m{text-align:center;padding:30px 20px}
        .hb-exito-ic{width:52px;height:52px;border-radius:50%;background:rgba(82,201,122,0.1);border:2px solid rgba(82,201,122,0.35);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:1.3rem}
      `}</style>

      <PersonalLayout titulo="Habitaciones" subtitulo="Gestión de habitaciones">
        {error && <div className="hb-err">{error}</div>}

        {/* Stats */}
        <div className="hb-stats">
          <div className={`hb-stat ${filtroEstado === 'todos' ? 'act' : ''}`}
            onClick={() => setFiltroEstado('todos')}>
            <div className="hb-stat-dot" style={{ background: '#d4af6a' }} />
            <div><div className="hb-stat-n">{habs.length}</div><div className="hb-stat-l">Todas</div></div>
          </div>
          {stats.filter(s => s.count > 0).map(s => (
            <div key={s.key} className={`hb-stat ${filtroEstado === s.key ? 'act' : ''}`}
              onClick={() => setFiltroEstado(filtroEstado === s.key ? 'todos' : s.key)}>
              <div className="hb-stat-dot" style={{ background: s.color }} />
              <div><div className="hb-stat-n">{s.count}</div><div className="hb-stat-l">{s.label}</div></div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="hb-toolbar">
          <div className="hb-search">
            <span className="hb-search-ic">🔍</span>
            <input type="text" placeholder="Buscar por número o tipo..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <select className="hb-sel" value={filtroPiso} onChange={e => setFiltroPiso(e.target.value)}>
            <option value="todos">Todos los pisos</option>
            {pisos.map(p => <option key={p} value={p}>Piso {p}</option>)}
          </select>
          <div className="hb-vista">
            <div className={`hb-vbtn ${vista === 'grid' ? 'act' : ''}`} onClick={() => setVista('grid')}>⊞</div>
            <div className={`hb-vbtn ${vista === 'lista' ? 'act' : ''}`} onClick={() => setVista('lista')}>☰</div>
          </div>
          <button className="hb-btn-new" onClick={abrirCrear}>+ Nueva habitación</button>
        </div>

        {/* Grid */}
        {vista === 'grid' && (
          <div className="hb-grid">
            {cargando
              ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="hb-card">
                  <div className="hb-skel" style={{ height: 120 }} />
                  <div className="hb-card-body">
                    <div className="hb-skel" style={{ height: 36, width: '45%', marginBottom: 7 }} />
                    <div className="hb-skel" style={{ height: 10, width: '65%', marginBottom: 14 }} />
                    <div className="hb-skel" style={{ height: 18, width: '38%' }} />
                  </div>
                </div>
              ))
              : filtradas.length === 0
                ? <div className="hb-empty" style={{ gridColumn: '1/-1' }}>No se encontraron habitaciones</div>
                : filtradas.map(h => {
                  const ec = EC[h.estado] ?? EC.disponible
                  return (
                    <div key={h.id} className={`hb-card ${panelId === h.id ? 'sel' : ''}`}
                      onClick={() => setPanelId(h.id)}>
                      <div className="hb-card-thumb">
                        <div className="hb-card-corner"
                          style={{ background: `linear-gradient(225deg,${ec.color}33 0%,transparent 70%)` }} />
                        {portadas[h.id]
                          ? <img src={portadas[h.id]} alt={`Hab. ${h.numero}`} />
                          : <div className="hb-card-thumb-placeholder">🛏</div>
                        }
                      </div>
                      <div className="hb-card-body">
                        <div className="hb-card-num" style={{ color: ec.color }}>{h.numero}</div>
                        <div className="hb-card-tipo">{h.tipos_habitacion?.nombre ?? '—'} · Piso {h.piso}</div>
                        <div className="hb-card-row">
                          <div className="hb-card-item">
                            <span>Capacidad</span>{h.tipos_habitacion?.capacidad_adultos ?? '—'} pers.
                          </div>
                          <div className="hb-card-item">
                            <span>Camas</span>{h.tipos_habitacion?.numero_camas ?? '—'} {h.tipos_habitacion?.tipo_cama ?? ''}
                          </div>
                        </div>
                        <div className="hb-card-precio">
                          {h.tipos_habitacion?.precio_base ? `Bs. ${h.tipos_habitacion.precio_base}/noche` : '—'}
                        </div>
                        <span className="hb-pill" style={{ background: ec.bg, color: ec.color }}>{ec.label}</span>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        )}

        {/* Lista */}
        {vista === 'lista' && (
          <div className="hb-table-wrap">
            <div className="hb-table-head">
              <span className="hb-table-tit">Lista de habitaciones</span>
              <span className="hb-table-cnt">{filtradas.length} hab.</span>
            </div>
            <table>
              <thead>
                <tr><th>N°</th><th>Tipo</th><th>Piso</th><th>Capacidad</th><th>Precio/noche</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {cargando
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((__, j) => (
                      <td key={j}><div className="hb-skel" style={{ height: 13, width: '80%' }} /></td>
                    ))}</tr>
                  ))
                  : filtradas.length === 0
                    ? <tr><td colSpan={6}><div className="hb-empty">No se encontraron habitaciones</div></td></tr>
                    : filtradas.map(h => {
                      const ec = EC[h.estado] ?? EC.disponible
                      return (
                        <tr key={h.id}
                          style={panelId === h.id ? { background: 'rgba(212,175,106,0.05)' } : {}}
                          onClick={() => setPanelId(h.id)}>
                          <td className="td-num">{h.numero}</td>
                          <td>{h.tipos_habitacion?.nombre ?? '—'}</td>
                          <td>Piso {h.piso}</td>
                          <td>{h.tipos_habitacion?.capacidad_adultos ?? '—'} pers.</td>
                          <td style={{ color: '#d4af6a' }}>
                            {h.tipos_habitacion?.precio_base ? `Bs. ${h.tipos_habitacion.precio_base}` : '—'}
                          </td>
                          <td>
                            <span className="hb-pill" style={{ background: ec.bg, color: ec.color }}>{ec.label}</span>
                          </td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>
        )}
      </PersonalLayout>

      {/* ── Panel Derecho ── */}
      {panelId && (
        <>
          <div className="hb-panel-ov" onClick={() => setPanelId(null)} />
          <div className="hb-panel">
            {!sel ? null : (
              <>
                <div className="hb-panel-hdr">
                  <div>
                    <div className="hb-panel-num" style={{ color: (EC[sel.estado] ?? EC.disponible).color }}>
                      Hab. {sel.numero}
                    </div>
                    <div className="hb-panel-sub">{sel.tipos_habitacion?.nombre ?? '—'} · Piso {sel.piso}</div>
                    <span className="hb-pill" style={{
                      background: (EC[sel.estado] ?? EC.disponible).bg,
                      color: (EC[sel.estado] ?? EC.disponible).color,
                      marginTop: 8, display: 'inline-block',
                    }}>
                      {(EC[sel.estado] ?? EC.disponible).label}
                    </span>
                  </div>
                  <button className="hb-panel-close" onClick={() => setPanelId(null)}>✕</button>
                </div>

                <div className="hb-panel-scroll">
                  <div className="hb-panel-body">

                    {/* Info */}
                    <div className="hb-info-grid">
                      <div className="hb-info-item">
                        <label>Precio / noche</label>
                        <div className="val" style={{ color: '#d4af6a' }}>
                          {sel.tipos_habitacion?.precio_base ? `Bs. ${sel.tipos_habitacion.precio_base}` : '—'}
                        </div>
                      </div>
                      <div className="hb-info-item">
                        <label>Online</label>
                        <div className="val" style={{ color: sel.disponible_online ? '#52c97a' : 'rgba(240,236,228,0.4)' }}>
                          {sel.disponible_online ? 'Sí' : 'No'}
                        </div>
                      </div>
                      <div className="hb-info-item">
                        <label>Adultos</label><div className="val">{sel.tipos_habitacion?.capacidad_adultos ?? '—'}</div>
                      </div>
                      <div className="hb-info-item">
                        <label>Niños</label><div className="val">{sel.tipos_habitacion?.capacidad_ninos ?? '—'}</div>
                      </div>
                      <div className="hb-info-item">
                        <label>Camas</label>
                        <div className="val">
                          {sel.tipos_habitacion?.numero_camas ?? '—'} {sel.tipos_habitacion?.tipo_cama ?? ''}
                        </div>
                      </div>
                      <div className="hb-info-item">
                        <label>Piso</label><div className="val">{sel.piso}</div>
                      </div>
                    </div>

                    {sel.descripcion && (
                      <><div className="hb-sec-lbl">Descripción</div>
                      <p style={{ fontSize: '0.78rem', color: 'rgba(240,236,228,0.55)', marginBottom: 18, lineHeight: 1.6 }}>
                        {sel.descripcion}
                      </p></>
                    )}

                    {sel.motivo_mantenimiento && ESTADOS_CON_MOTIVO.includes(sel.estado) && (
                      <><div className="hb-sec-lbl" style={{ color: '#d47a6a' }}>
                        {sel.estado === 'mantenimiento' ? 'Motivo de mantenimiento' : 'Motivo fuera de servicio'}
                      </div>
                      <div style={{ background: 'rgba(212,122,106,0.08)', border: '1px solid rgba(212,122,106,0.2)', borderRadius: 8, padding: '10px 13px', fontSize: '0.76rem', color: 'rgba(240,236,228,0.6)', marginBottom: 18 }}>
                        {sel.motivo_mantenimiento}
                      </div></>
                    )}

                    {sel.observaciones && (
                      <><div className="hb-sec-lbl">Observaciones internas</div>
                      <p style={{ fontSize: '0.76rem', color: 'rgba(240,236,228,0.45)', marginBottom: 18, lineHeight: 1.6 }}>
                        {sel.observaciones}
                      </p></>
                    )}

                    {(sel.amenidades?.length ?? 0) > 0 && (
                      <><div className="hb-sec-lbl">Amenidades</div>
                      <div className="hb-amen-list">
                        {(sel.amenidades ?? []).map(key => {
                          const a = AMENIDADES.find(x => x.key === key)
                          return <span key={key} className="hb-amen-badge">{a?.label ?? key}</span>
                        })}
                      </div></>
                    )}

                    <div className="hb-sep" />

                    {/* ── Fotos y videos ── */}
                    <div className="hb-sec-lbl">Fotos y videos</div>
                    {cargRes ? (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.25)', marginBottom: 12 }}>Cargando...</div>
                    ) : fotos.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.22)', marginBottom: 12 }}>
                        Sin fotos cargadas aún
                      </div>
                    ) : (
                      <div className="hb-foto-grid">
                        {fotos.map((f, idx) => (
                          <div key={f.id} className="hb-foto-thumb">
                            {f.tipo === 'video'
                              ? <video src={f.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <img src={f.url} alt={f.titulo ?? ''} />
                            }
                            {f.tipo === 'video' && <div className="hb-foto-video-ic">▶ video</div>}
                            <div className="hb-foto-ov">
                              <button className="hb-foto-view" onClick={() => setGaleriaIdx(idx)}>Ver</button>
                              <button className="hb-foto-del" onClick={ev => handleEliminarFoto(f, ev)}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {errorFoto && <div className="hb-err" style={{ marginBottom: 8 }}>{errorFoto}</div>}
                    <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
                      onChange={handleSubirFoto} />
                    <button className="hb-btn-foto" disabled={subiendoFoto}
                      onClick={() => fileInputRef.current?.click()}>
                      {subiendoFoto ? 'Subiendo...' : '+ Subir foto / video'}
                    </button>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(240,236,228,0.2)', marginBottom: 4 }}>
                      Formatos: JPG, PNG, WebP · MP4
                    </div>

                    <div className="hb-sep" />

                    {/* Próximas reservas */}
                    <div className="hb-sec-lbl">Próximas reservas</div>
                    {cargRes ? (
                      <div style={{ color: 'rgba(240,236,228,0.25)', fontSize: '0.72rem', marginBottom: 18 }}>Cargando...</div>
                    ) : errorPanel ? (
                      <div className="hb-err">{errorPanel}</div>
                    ) : proximasRes.length === 0 ? (
                      <div style={{ color: 'rgba(240,236,228,0.25)', fontSize: '0.72rem', marginBottom: 18 }}>Sin reservas próximas</div>
                    ) : (
                      <div style={{ marginBottom: 18 }}>
                        {proximasRes.map(r => (
                          <div key={r.codigo_reserva} className="hb-res-item">
                            <div>
                              <div className="hb-res-cod">{r.codigo_reserva}</div>
                              <div className="hb-res-cli">{r.cliente_nombre}</div>
                            </div>
                            <div className="hb-res-dates">
                              <div>{r.fecha_entrada}</div><div>→ {r.fecha_salida}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="hb-sep" />

                    {/* Cambiar estado */}
                    <div className="hb-sec-lbl">Cambiar estado</div>
                    <div style={{ fontSize: '0.67rem', color: 'rgba(240,236,228,0.28)', marginBottom: 10, lineHeight: 1.5 }}>
                      Puedes cambiar manualmente a: Disponible, Mantenimiento, Fuera de servicio o Bloqueada.
                    </div>
                    <div className="hb-est-btns">
                      {ESTADOS_CAMBIO.map(e => {
                        const ec2 = EC[e]
                        const activo   = nuevoEstado === e
                        const esActual = sel.estado === e
                        return (
                          <button key={e} className="hb-est-btn"
                            disabled={cambiandoEst || exitoEstado}
                            style={{
                              background:  activo ? ec2.bg : 'transparent',
                              borderColor: esActual ? ec2.color : activo ? ec2.color : 'rgba(255,255,255,0.1)',
                              color:       esActual ? ec2.color : activo ? ec2.color : 'rgba(240,236,228,0.35)',
                              fontWeight:  esActual ? 700 : 600,
                            }}
                            onClick={() => {
                              if (esActual) return
                              setNuevoEstado(nuevoEstado === e ? '' : e)
                              setMotivoEstado(''); setErrorEstado(null)
                            }}>
                            {ec2.label}{esActual ? ' ✓' : ''}
                          </button>
                        )
                      })}
                    </div>

                    {nuevoEstado && ESTADOS_CON_MOTIVO.includes(nuevoEstado) && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={lbl}>
                          {nuevoEstado === 'mantenimiento' ? 'Motivo de mantenimiento *' : 'Motivo (fuera de servicio) *'}
                        </label>
                        <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }}
                          placeholder="Describe el motivo..."
                          value={motivoEstado}
                          onChange={e => { setMotivoEstado(e.target.value); setErrorEstado(null) }} />
                      </div>
                    )}

                    {errorEstado && <div className="hb-err" style={{ marginBottom: 8 }}>{errorEstado}</div>}
                    {exitoEstado && <div className="hb-ok" style={{ marginBottom: 8 }}>Estado actualizado correctamente</div>}

                    {nuevoEstado && nuevoEstado !== sel.estado && (
                      <button className="hb-btn-confirm"
                        disabled={cambiandoEst || (ESTADOS_CON_MOTIVO.includes(nuevoEstado) && !motivoEstado.trim())}
                        style={{
                          opacity: cambiandoEst || (ESTADOS_CON_MOTIVO.includes(nuevoEstado) && !motivoEstado.trim()) ? 0.4 : 1,
                          cursor:  cambiandoEst || (ESTADOS_CON_MOTIVO.includes(nuevoEstado) && !motivoEstado.trim()) ? 'not-allowed' : 'pointer',
                        }}
                        onClick={handleCambiarEstado}>
                        {cambiandoEst ? 'Aplicando...' : `Cambiar a ${(EC[nuevoEstado] ?? EC.disponible).label}`}
                      </button>
                    )}

                    <div className="hb-sep" />
                    <button className="hb-btn-edit" onClick={abrirEditar}>
                      Editar información de la habitación
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Galería lightbox ── */}
      {gFoto && (
        <div className="hb-galeria-ov" onClick={() => setGaleriaIdx(null)}>
          <button className="hb-galeria-close" onClick={() => setGaleriaIdx(null)}>✕</button>
          {fotos.length > 1 && galeriaIdx! > 0 && (
            <button className="hb-galeria-nav hb-galeria-prev"
              onClick={ev => { ev.stopPropagation(); setGaleriaIdx(i => Math.max(0, (i ?? 0) - 1)) }}>
              ‹
            </button>
          )}
          {gFoto.tipo === 'video'
            ? <video src={gFoto.url} className="hb-galeria-media" controls autoPlay onClick={ev => ev.stopPropagation()} />
            : <img src={gFoto.url} className="hb-galeria-media" alt={gFoto.titulo ?? ''} onClick={ev => ev.stopPropagation()} />
          }
          {fotos.length > 1 && galeriaIdx! < fotos.length - 1 && (
            <button className="hb-galeria-nav hb-galeria-next"
              onClick={ev => { ev.stopPropagation(); setGaleriaIdx(i => Math.min(fotos.length - 1, (i ?? 0) + 1)) }}>
              ›
            </button>
          )}
          <div className="hb-galeria-cnt">{(galeriaIdx ?? 0) + 1} / {fotos.length}</div>
          <button className="hb-galeria-del"
            onClick={ev => { handleEliminarFoto(gFoto, ev); setGaleriaIdx(null) }}>
            Eliminar
          </button>
        </div>
      )}

      {/* ── Modal Crear / Editar ── */}
      {modoModal && (
        <div className="hb-modal-ov" onClick={() => !procesando && !exitoModal && setModoModal(null)}>
          <div className="hb-modal" onClick={e => e.stopPropagation()}>
            <div className="hb-modal-hdr">
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.4rem', color: '#d4af6a', fontWeight: 300 }}>
                  {modoModal === 'crear' ? 'Nueva habitación' : `Editar Hab. ${sel?.numero}`}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.35)', marginTop: 3 }}>
                  {modoModal === 'crear' ? 'Registrar nueva habitación en el sistema' : 'Actualizar datos de la habitación'}
                </div>
              </div>
              {!procesando && !exitoModal && (
                <button className="hb-modal-close" onClick={() => setModoModal(null)}>✕</button>
              )}
            </div>
            <div className="hb-modal-body">
              {exitoModal ? (
                <div className="hb-exito-m">
                  <div className="hb-exito-ic">✓</div>
                  <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.6rem', color: '#52c97a', marginBottom: 6 }}>
                    {modoModal === 'crear' ? 'Habitación creada' : 'Cambios guardados'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.35)' }}>Los datos fueron actualizados correctamente</div>
                </div>
              ) : (
                <>
                  {errorModal && <div className="hb-err">{errorModal}</div>}
                  <div className="hb-modal-g2">
                    <div>
                      <label style={lbl}>Número *</label>
                      <input type="text" style={inp} placeholder="Ej: 201"
                        value={fNumero} onChange={e => setFNumero(e.target.value)} />
                    </div>
                    <div>
                      <label style={lbl}>Piso *</label>
                      <input type="number" min={1} style={inp}
                        value={fPiso} onChange={e => setFPiso(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="hb-modal-f">
                    <label style={lbl}>Tipo de habitación *</label>
                    <select style={inp} value={fTipoId} onChange={e => setFTipoId(e.target.value)}>
                      {tipos.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} — Bs. {t.precio_base} · {t.capacidad_adultos} adultos
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="hb-modal-f">
                    <label style={lbl}>Descripción</label>
                    <textarea style={{ ...inp, resize: 'vertical', minHeight: 66 }}
                      placeholder="Características especiales de esta habitación..."
                      value={fDesc} onChange={e => setFDesc(e.target.value)} />
                  </div>
                  {modoModal === 'editar' && (
                    <div className="hb-modal-f">
                      <label style={lbl}>Observaciones internas</label>
                      <textarea style={{ ...inp, resize: 'vertical', minHeight: 55 }}
                        placeholder="Notas internas del personal..."
                        value={fObs} onChange={e => setFObs(e.target.value)} />
                    </div>
                  )}
                  <div className="hb-modal-f">
                    <label style={lbl}>Disponible para reservas online</label>
                    <div className="hb-toggle" onClick={() => setFOnline(!fOnline)}>
                      <div className={`hb-tog-box ${fOnline ? 'on' : ''}`}>
                        <div className="hb-tog-thumb" />
                      </div>
                      <span style={{ fontSize: '0.76rem', color: 'rgba(240,236,228,0.55)' }}>
                        {fOnline ? 'Sí, visible para clientes' : 'No, solo uso interno'}
                      </span>
                    </div>
                  </div>
                  <div className="hb-modal-f">
                    <label style={lbl}>Amenidades</label>
                    <div className="hb-amen-grid">
                      {AMENIDADES.map(a => {
                        const on = fAmen.includes(a.key)
                        return (
                          <div key={a.key} className={`hb-amen-chk ${on ? 'on' : ''}`} onClick={() => toggleAmen(a.key)}>
                            <div className="hb-amen-box">{on ? '✓' : ''}</div>
                            <span className="hb-amen-txt">{a.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <button className="hb-btn-save"
                    disabled={!fNumero.trim() || !fTipoId || procesando}
                    style={{
                      background: !fNumero.trim() || !fTipoId || procesando ? 'rgba(212,175,106,0.2)' : 'linear-gradient(135deg,#c9a84c,#d4af6a)',
                      opacity:    !fNumero.trim() || !fTipoId || procesando ? 0.5 : 1,
                      cursor:     !fNumero.trim() || !fTipoId || procesando ? 'not-allowed' : 'pointer',
                    }}
                    onClick={handleGuardar}>
                    {procesando ? 'Guardando...' : modoModal === 'crear' ? 'Crear habitación' : 'Guardar cambios'}
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
