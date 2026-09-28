import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { getMisReservas, getMisNotificaciones, marcarNotificacionLeida, getHabitacionesDisponibles, actualizarPerfilUsuario, subirFotoUsuario, registrarPreCheckin, cancelarReservaCliente, enviarSolicitudCancelacionEmergencia, subirComprobanteEmergencia, crearResena, getResenasPublicas, subirFotoResena, modificarFechasReserva, getMisFavoritos, toggleFavorito, getPortadasHabitaciones } from '../../services/api'
import type { ResenaPublica, HabitacionFavorita } from '../../services/api'
import LoyaltyBadge from '../../components/LoyaltyBadge'
import type { NivelFidelidad } from '../../types'

const PAISES = [
  'Argentina','Bolivia','Brasil','Chile','Colombia','Costa Rica','Cuba','Ecuador',
  'El Salvador','España','Guatemala','Honduras','México','Nicaragua','Panamá',
  'Paraguay','Perú','Puerto Rico','República Dominicana','Uruguay','Venezuela',
  'Estados Unidos','Canadá','Alemania','Francia','Italia','Reino Unido','Portugal',
  'Japón','China','Australia','Otro',
]


const estadoReservaConfig: Record<string, { bg: string; text: string; label: string }> = {
  pendiente:   { bg: 'rgba(212,175,106,0.12)', text: '#d4af6a', label: 'Pendiente'  },
  confirmada:  { bg: 'rgba(82,201,122,0.12)',  text: '#52c97a', label: 'Confirmada' },
  en_estadia:  { bg: 'rgba(106,184,212,0.12)', text: '#6ab8d4', label: 'En estadía' },
  finalizada:  { bg: 'rgba(150,150,160,0.12)', text: '#9696a0', label: 'Finalizada' },
  cancelada:   { bg: 'rgba(212,100,100,0.12)', text: '#d46464', label: 'Cancelada'  },
}

type Reserva = {
  reserva_id: string
  codigo_reserva: string
  fecha_entrada: string
  fecha_salida: string
  estado: string
  total_estimado: number
  habitacion_numero: string
  tipo_habitacion: string
  noches: number
  cantidad_adultos: number
  cantidad_ninos: number
}

type Notificacion = {
  id: string
  titulo: string
  mensaje: string
  tipo: string
  leida: boolean
  created_at: string
}

type Habitacion = {
  id: string
  habitacion_id?: string
  numero: string
  nombre_tipo: string
  descripcion: string
  capacidad_adultos: number
  precio: number
  precio_base?: number
  numero_camas: number
  tipo_cama: string
  servicios?: string
}

const tipoNotifIcon: Record<string, string> = {
  reserva:  '📅',
  pago:     '💳',
  sistema:  '🔔',
  checkin:  '✓',
  checkout: '↗',
}

const imagenesHabitacion: Record<string, string> = {
  'Suite':        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
  'Familiar':     'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
  'Matrimonial':  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80',
  'Doble':        'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80',
  'Individual':   'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80',
}

const InicioCliente = () => {
  const { perfil, cerrarSesion, recargarPerfil } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [visible, setVisible] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [notifAbiertas, setNotifAbiertas] = useState(false)
  const [seccion, setSeccion] = useState<'inicio' | 'habitaciones' | 'favoritos' | 'reservas' | 'notificaciones' | 'perfil'>('inicio')
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [cargandoReservas, setCargandoReservas] = useState(true)
  const [cargandoNotif, setCargandoNotif] = useState(true)
  const [cargandoHabs, setCargandoHabs] = useState(false)
  const [portadas, setPortadas] = useState<Record<string, string>>({})
  const [tiposDestacados, setTiposDestacados] = useState<{ nombre: string; descripcion: string | null; capacidad_adultos: number; precio_base: number }[]>([])
  const [fechaEntrada, setFechaEntrada] = useState('')
  const [fechaSalida, setFechaSalida] = useState('')
  const [adultos, setAdultos] = useState(1)
  const [ninos, setNinos] = useState(0)
  // Perfil editable
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [perfilForm, setPerfilForm] = useState({
    nombre: '', telefono: '', ciudad: '', pais: '',
    tipoDocumento: '', numeroDocumento: '', nacionalidad: '',
    fechaNacimiento: '', direccion: '',
  })
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null)
  const [fotoSubiendo, setFotoSubiendo] = useState(false)
  const [fotoError, setFotoError] = useState<string | null>(null)
  // Pre check-in modal
  const [modalPreCheckin, setModalPreCheckin] = useState<string | null>(null)
  const [pcHora, setPcHora] = useState('')
  const [pcObs, setPcObs] = useState('')
  const [pcEnviando, setPcEnviando] = useState(false)
  const [pcExito, setPcExito] = useState(false)
  // Cancelación normal
  const [modalCancelar, setModalCancelar] = useState<{ id: string; codigo: string } | null>(null)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [cancelExito, setCancelExito] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  // Cancelación de emergencia
  const [modalEmergencia, setModalEmergencia] = useState<{ id: string; codigo: string } | null>(null)
  const [emerMotivo, setEmerMotivo] = useState('')
  const [emerFile, setEmerFile] = useState<File | null>(null)
  const [emerEnviando, setEmerEnviando] = useState(false)
  const [emerExito, setEmerExito] = useState(false)
  const [emerError, setEmerError] = useState<string | null>(null)
  const emerFileRef = useRef<HTMLInputElement>(null)

  // Reseña
  const [modalResena, setModalResena] = useState<{ id: string; codigo: string } | null>(null)
  const [resenaCal, setResenaCal] = useState(5)
  const [resenaCalLimpieza, setResenaCalLimpieza] = useState(0)
  const [resenaCalAtencion, setResenaCalAtencion] = useState(0)
  const [resenaCalUbicacion, setResenaCalUbicacion] = useState(0)
  const [resenaCalPrecio, setResenaCalPrecio] = useState(0)
  const [resenaTitulo, setResenaTitulo] = useState('')
  const [resenaComentario, setResenaComentario] = useState('')
  const [resenaEnviando, setResenaEnviando] = useState(false)
  const [resenaExito, setResenaExito] = useState(false)
  const [resenaError, setResenaError] = useState<string | null>(null)
  const [reservasConResena, setReservasConResena] = useState<Set<string>>(new Set())
  const [resenasPublicas, setResenasPublicas] = useState<ResenaPublica[]>([])
  const [favoritos, setFavoritos] = useState<HabitacionFavorita[]>([])
  const [favoritosIds, setFavoritosIds] = useState<Set<string>>(new Set())
  const [toggling, setToggling] = useState<string | null>(null)
  const [modalCambioPass, setModalCambioPass] = useState(false)
  const [cpNueva, setCpNueva] = useState('')
  const [cpConfirmar, setCpConfirmar] = useState('')
  const [cpError, setCpError] = useState<string | null>(null)
  const [cpExito, setCpExito] = useState(false)
  const [cpCargando, setCpCargando] = useState(false)
  const [resenaFoto, setResenaFoto] = useState<File | null>(null)
  const [resenaFotoPreview, setResenaFotoPreview] = useState<string | null>(null)
  const resenaFotoRef = useRef<HTMLInputElement>(null)

  // Modificar fechas
  const [modalModFechas, setModalModFechas] = useState<{ id: string; codigo: string; fechaEntrada: string; fechaSalida: string; tipo: string } | null>(null)
  const [modFechaEntrada, setModFechaEntrada] = useState('')
  const [modFechaSalida, setModFechaSalida] = useState('')
  const [modConfirmado, setModConfirmado] = useState<{ noches: number; nuevo_total: number } | null>(null)
  const [modEnviando, setModEnviando] = useState(false)
  const [modError, setModError] = useState<string | null>(null)
  const [modExito, setModExito] = useState(false)

  async function cargarDatos() {
    try {
      const [reservasData, notifData] = await Promise.all([
        getMisReservas(),
        getMisNotificaciones(),
      ])
      void supabase
        .from('tipos_habitacion')
        .select('nombre, descripcion, capacidad_adultos, precio_base')
        .eq('activo', true)
        .order('precio_base', { ascending: true })
        .limit(3)
        .then(({ data }) => { if (data) setTiposDestacados(data) }, () => {})
      setReservas(reservasData as Reserva[])
      setNotificaciones(notifData as Notificacion[])
      getResenasPublicas().then(setResenasPublicas).catch(() => {})
      getMisFavoritos().then(favs => {
        setFavoritos(favs)
        setFavoritosIds(new Set(favs.map(f => f.habitacion_id)))
      }).catch(() => {})
      getPortadasHabitaciones().then(portadasData => {
        const map: Record<string, string> = {}
        portadasData.forEach(p => { map[p.habitacion_id] = p.url })
        setPortadas(map)
      }).catch(() => {})
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoReservas(false)
      setCargandoNotif(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    cargarDatos()
    return () => clearTimeout(t)
  }, [])

  const buscarHabitaciones = async () => {
    if (!fechaEntrada || !fechaSalida) return
    try {
      setCargandoHabs(true)
      setSeccion('habitaciones')
      const [data, portadasData] = await Promise.all([
        getHabitacionesDisponibles(fechaEntrada, fechaSalida),
        getPortadasHabitaciones(),
      ])
      setHabitaciones(data as Habitacion[])
      const portadasMap: Record<string, string> = {}
      portadasData.forEach(p => { portadasMap[p.habitacion_id] = p.url })
      setPortadas(portadasMap)
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoHabs(false)
    }
  }

  const handleMarcarLeida = async (id: string) => {
    try {
      await marcarNotificacionLeida(id)
      setNotificaciones((prev) =>
        prev.map((n) => n.id === id ? { ...n, leida: true } : n)
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleCerrarSesion = async () => {
    await cerrarSesion()
    navigate('/login')
  }

  const handleAbrirEditar = () => {
    setPerfilForm({
      nombre:          perfil?.nombre_completo  ?? '',
      telefono:        perfil?.telefono         ?? '',
      ciudad:          perfil?.ciudad           ?? '',
      pais:            perfil?.pais             ?? '',
      tipoDocumento:   perfil?.tipo_documento   ?? '',
      numeroDocumento: perfil?.numero_documento ?? '',
      nacionalidad:    perfil?.nacionalidad     ?? '',
      fechaNacimiento: perfil?.fecha_nacimiento ?? '',
      direccion:       perfil?.direccion        ?? '',
    })
    setErrorPerfil(null)
    setFotoError(null)
    setEditandoPerfil(true)
  }

  const handleGuardarPerfil = async () => {
    if (!perfil) return
    setGuardandoPerfil(true)
    setErrorPerfil(null)
    try {
      await actualizarPerfilUsuario({
        usuarioId:       perfil.usuario_id,
        nombreCompleto:  perfilForm.nombre,
        telefono:        perfilForm.telefono,
        ciudad:          perfilForm.ciudad,
        pais:            perfilForm.pais,
        tipoDocumento:   perfilForm.tipoDocumento,
        numeroDocumento: perfilForm.numeroDocumento,
        nacionalidad:    perfilForm.nacionalidad,
        fechaNacimiento: perfilForm.fechaNacimiento || null,
        direccion:       perfilForm.direccion,
      })
      await recargarPerfil()
      setEditandoPerfil(false)
    } catch (err) {
      console.error('[perfil]', err)
      setErrorPerfil('No se pudo guardar. Intente de nuevo.')
    } finally {
      setGuardandoPerfil(false)
    }
  }

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !perfil) return
    setFotoSubiendo(true)
    setFotoError(null)
    try {
      await subirFotoUsuario(perfil.usuario_id, file)
      await recargarPerfil()
    } catch {
      setFotoError('No se pudo subir la foto. Verifica que el bucket hotel-assets exista en Supabase.')
    } finally {
      setFotoSubiendo(false)
    }
  }

  const handleEnviarPreCheckin = async () => {
    if (!modalPreCheckin) return
    setPcEnviando(true)
    try {
      await registrarPreCheckin({ reservaId: modalPreCheckin, clienteId: perfil?.cliente_id ?? '', horaEstimadaLlegada: pcHora || undefined, observaciones: pcObs || undefined })
      setPcExito(true)
    } catch {
      // ignorar — mostrar error inline si se quiere extender
    } finally {
      setPcEnviando(false)
    }
  }

  // ── helpers cancelación ──────────────────────────────────
  const diasHastaCheckin = (fecha: string) => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(fecha + 'T12:00:00').getTime() - hoy.getTime()) / 86400000)
  }
  const puedeCanCelar = (r: Reserva) =>
    ['pendiente', 'confirmada'].includes(r.estado) && diasHastaCheckin(r.fecha_entrada) > 7
  const puedeEmergencia = (r: Reserva) => {
    const d = diasHastaCheckin(r.fecha_entrada)
    return ['pendiente', 'confirmada'].includes(r.estado) && d <= 7 && d > 0
  }

  const handleCancelarReserva = async () => {
    if (!modalCancelar || !cancelMotivo.trim()) return
    setCancelando(true); setCancelError(null)
    try {
      await cancelarReservaCliente(modalCancelar.id, cancelMotivo)
      setReservas(prev => prev.map(r => r.reserva_id === modalCancelar.id ? { ...r, estado: 'cancelada' } : r))
      setCancelExito(true)
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'No se pudo cancelar')
    } finally { setCancelando(false) }
  }

  const handleEnviarEmergencia = async () => {
    if (!modalEmergencia || !emerMotivo.trim() || !perfil) return
    setEmerEnviando(true); setEmerError(null)
    try {
      let archivoUrl: string | undefined
      if (emerFile) {
        try { archivoUrl = await subirComprobanteEmergencia(perfil.usuario_id, emerFile) }
        catch { /* Storage no disponible — se envía el mensaje sin archivo adjunto */ }
      }
      await enviarSolicitudCancelacionEmergencia({
        usuarioId: perfil.usuario_id,
        codigoReserva: modalEmergencia.codigo,
        motivo: emerMotivo,
        archivoUrl,
      })
      setEmerExito(true)
    } catch (err: unknown) {
      setEmerError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud')
    } finally { setEmerEnviando(false) }
  }

  const abrirModalResena = (reservaId: string, codigoReserva: string) => {
    setModalResena({ id: reservaId, codigo: codigoReserva })
    setResenaCal(5); setResenaCalLimpieza(0); setResenaCalAtencion(0)
    setResenaCalUbicacion(0); setResenaCalPrecio(0)
    setResenaTitulo(''); setResenaComentario('')
    setResenaFoto(null); setResenaFotoPreview(null)
    setResenaExito(false); setResenaError(null)
  }

  const handleEnviarResena = async () => {
    if (!modalResena || resenaCal === 0) return
    setResenaEnviando(true); setResenaError(null)
    try {
      let fotoUrl: string | undefined
      if (resenaFoto && perfil) {
        try {
          fotoUrl = await subirFotoResena(perfil.usuario_id, resenaFoto)
        } catch (fotoErr: unknown) {
          const msg = fotoErr instanceof Error ? fotoErr.message : 'Error al subir la foto'
          setResenaError(`No se pudo subir la foto: ${msg}. Puedes enviar la reseña sin foto o intentar con otra imagen.`)
          setResenaEnviando(false)
          return
        }
      }
      await crearResena({
        reservaId:    modalResena.id,
        calificacion: resenaCal,
        titulo:       resenaTitulo.trim()    || undefined,
        comentario:   resenaComentario.trim() || undefined,
        calLimpieza:  resenaCalLimpieza  || undefined,
        calAtencion:  resenaCalAtencion  || undefined,
        calUbicacion: resenaCalUbicacion || undefined,
        calPrecio:    resenaCalPrecio    || undefined,
        fotoUrl,
      })
      setResenaExito(true)
      setReservasConResena(prev => new Set([...prev, modalResena.id]))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setResenaError(msg.includes('duplicada') || msg.includes('unique') ? 'Ya dejaste una reseña para esta reserva.' : 'No se pudo enviar la reseña. Intenta de nuevo.')
    } finally { setResenaEnviando(false) }
  }

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cpNueva.length < 8) { setCpError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (cpNueva !== cpConfirmar) { setCpError('Las contraseñas no coinciden.'); return }
    setCpError(null)
    setCpCargando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: cpNueva })
      if (error) throw new Error(error.message)
      setCpExito(true)
      setCpNueva('')
      setCpConfirmar('')
    } catch (e: unknown) {
      setCpError(e instanceof Error ? e.message : 'Error al cambiar contraseña')
    } finally {
      setCpCargando(false)
    }
  }

  const handleToggleFavorito = async (habitacionId: string) => {
    if (toggling) return
    setToggling(habitacionId)
    try {
      const esFavorito = await toggleFavorito(habitacionId)
      setFavoritosIds(prev => {
        const next = new Set(prev)
        if (esFavorito) next.add(habitacionId)
        else next.delete(habitacionId)
        return next
      })
      // Recargar lista completa para tener los detalles actualizados
      getMisFavoritos().then(setFavoritos).catch(() => {})
    } catch { /* silencioso */ }
    finally { setToggling(null) }
  }

  const abrirModFechas = (r: Reserva) => {
    setModalModFechas({ id: r.reserva_id, codigo: r.codigo_reserva, fechaEntrada: r.fecha_entrada, fechaSalida: r.fecha_salida, tipo: r.tipo_habitacion })
    setModFechaEntrada(r.fecha_entrada)
    setModFechaSalida(r.fecha_salida)
    setModConfirmado(null)
    setModError(null)
    setModExito(false)
  }

  const handleConfirmarModFechas = async () => {
    if (!modalModFechas || !modFechaEntrada || !modFechaSalida) return
    setModEnviando(true); setModError(null); setModConfirmado(null)
    try {
      const resultado = await modificarFechasReserva({
        reservaId:    modalModFechas.id,
        fechaEntrada: modFechaEntrada,
        fechaSalida:  modFechaSalida,
      })
      setModConfirmado(resultado)
      setModExito(true)
      // Recargar reservas para reflejar los cambios
      const nuevasReservas = await getMisReservas()
      setReservas(nuevasReservas as Reserva[])
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? 'No se pudo modificar la reserva'
      setModError(msg)
    } finally { setModEnviando(false) }
  }

  const handleReservar = (h: Habitacion) => {
    navigate('/cliente/reservar', {
      state: {
        habitacionId: h.habitacion_id ?? h.id,
        fechaEntrada,
        fechaSalida,
        adultos,
        precio: h.precio ?? h.precio_base ?? 0,
        nombreHab: `${h.nombre_tipo} — Hab. ${h.numero}`,
      },
    })
  }

  const noLeidas = notificaciones.filter((n) => !n.leida).length
  const proximaReserva = reservas.find((r) => r.estado === 'confirmada' || r.estado === 'en_estadia')

  const getImagenHab = (tipo: string) =>
    imagenesHabitacion[tipo] ??
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'

  const getImagenHabReal = (habitacionId: string, tipo: string) =>
    portadas[habitacionId] ?? getImagenHab(tipo)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .cli-root { min-height: 100vh; background: #0a0a0c; font-family: 'Montserrat', sans-serif; color: #f0ece4; }
        .cli-nav { position: sticky; top: 0; z-index: 100; height: 64px; background: rgba(10,10,12,0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(212,175,106,0.1); display: flex; align-items: center; padding: 0 28px; gap: 20px; }
        .cli-nav-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 400; color: #d4af6a; letter-spacing: 0.15em; cursor: pointer; white-space: nowrap; }
        .cli-nav-links { display: flex; gap: 4px; flex: 1; justify-content: center; }
        @media (max-width: 700px) { .cli-nav-links { display: none; } }
        .cli-nav-link { padding: 8px 14px; border-radius: 8px; font-size: 0.75rem; font-weight: 400; color: rgba(240,236,228,0.5); cursor: pointer; transition: all 0.2s; letter-spacing: 0.04em; border: none; background: transparent; font-family: 'Montserrat', sans-serif; }
        .cli-nav-link:hover { color: #f0ece4; background: rgba(255,255,255,0.04); }
        .cli-nav-link.activo { color: #d4af6a; background: rgba(212,175,106,0.1); }
        .cli-nav-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }
        .notif-btn { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,106,0.15); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; transition: background 0.2s; }
        .notif-btn:hover { background: rgba(212,175,106,0.1); }
        .notif-badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; background: #e05252; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; color: #fff; border: 2px solid #0a0a0c; padding: 0 3px; }
        .cli-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #1a1a2e, #2a2a4e); border: 1.5px solid rgba(212,175,106,0.4); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; color: #d4af6a; cursor: pointer; transition: border-color 0.2s; }
        .cli-avatar:hover { border-color: #d4af6a; }
        .mobile-menu-btn { display: none; width: 36px; height: 36px; border: 1px solid rgba(212,175,106,0.2); border-radius: 8px; background: rgba(255,255,255,0.04); align-items: center; justify-content: center; cursor: pointer; flex-direction: column; gap: 4px; }
        @media (max-width: 700px) { .mobile-menu-btn { display: flex; } }
        .mobile-menu-line { display: block; width: 16px; height: 1.5px; background: rgba(240,236,228,0.6); border-radius: 2px; }
        .mobile-menu { position: fixed; top: 64px; left: 0; right: 0; background: #0f0f12; border-bottom: 1px solid rgba(212,175,106,0.1); padding: 12px 16px; z-index: 90; display: flex; flex-direction: column; gap: 4px; }
        .hero { position: relative; min-height: 520px; display: flex; align-items: center; overflow: hidden; }
        .hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(10,10,12,0.85) 0%, rgba(10,10,12,0.5) 50%, rgba(10,10,12,0.8) 100%), url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1400&q=80') center/cover no-repeat; transform: ${visible ? 'scale(1)' : 'scale(1.05)'}; transition: transform 2s cubic-bezier(0.16,1,0.3,1); }
        .hero-content { position: relative; z-index: 2; padding: 60px 40px; max-width: 680px; opacity: ${visible ? '1' : '0'}; transform: translateY(${visible ? '0' : '24px'}); transition: all 1s cubic-bezier(0.16,1,0.3,1) 0.3s; }
        .hero-eyebrow { font-size: 0.68rem; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: #d4af6a; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
        .hero-eyebrow::before { content: ''; display: inline-block; width: 24px; height: 1px; background: #d4af6a; }
        .hero-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2.4rem, 5vw, 3.8rem); font-weight: 300; line-height: 1.1; color: #f0ece4; margin-bottom: 16px; }
        .hero-title em { font-style: italic; color: #d4af6a; }
        .hero-sub { font-size: 0.85rem; font-weight: 300; color: rgba(240,236,228,0.55); line-height: 1.6; margin-bottom: 32px; }
        .buscador { background: rgba(15,15,18,0.9); backdrop-filter: blur(12px); border: 1px solid rgba(212,175,106,0.2); border-radius: 14px; padding: 20px 24px; display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
        .buscador-field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 120px; }
        .buscador-field label { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(240,236,228,0.35); }
        .buscador-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(212,175,106,0.2); border-radius: 8px; padding: 10px 12px; font-family: 'Montserrat', sans-serif; font-size: 0.82rem; font-weight: 300; color: #f0ece4; outline: none; transition: border-color 0.3s; width: 100%; }
        .buscador-input:focus { border-color: rgba(212,175,106,0.5); }
        .buscador-input-num { background: rgba(255,255,255,0.05); border: 1px solid rgba(212,175,106,0.2); border-radius: 8px; padding: 10px 12px; font-family: 'Montserrat', sans-serif; font-size: 0.82rem; color: #f0ece4; outline: none; width: 100%; transition: border-color 0.3s; }
        .btn-buscar { padding: 12px 24px; background: linear-gradient(135deg, #c9a84c, #d4af6a); border: none; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: opacity 0.2s, transform 0.15s; white-space: nowrap; }
        .btn-buscar:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .btn-buscar:disabled { opacity: 0.4; cursor: not-allowed; }
        .cli-main { padding: 48px 28px; max-width: 1200px; margin: 0 auto; }
        .proxima-reserva { background: linear-gradient(135deg, rgba(212,175,106,0.08) 0%, rgba(212,175,106,0.03) 100%); border: 1px solid rgba(212,175,106,0.2); border-radius: 16px; padding: 24px 28px; margin-bottom: 48px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
        .proxima-left { display: flex; align-items: center; gap: 20px; }
        .proxima-icon { width: 52px; height: 52px; border-radius: 12px; background: rgba(212,175,106,0.12); border: 1px solid rgba(212,175,106,0.25); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
        .proxima-eyebrow { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #d4af6a; margin-bottom: 4px; }
        .proxima-titulo { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: #f0ece4; font-weight: 400; }
        .proxima-detalle { font-size: 0.75rem; color: rgba(240,236,228,0.45); margin-top: 2px; }
        .proxima-right { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .proxima-stat { text-align: center; padding: 10px 16px; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); }
        .proxima-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; color: #d4af6a; line-height: 1; }
        .proxima-stat-label { font-size: 0.6rem; color: rgba(240,236,228,0.3); letter-spacing: 0.08em; margin-top: 2px; }
        .seccion-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .seccion-eyebrow { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #d4af6a; margin-bottom: 4px; }
        .seccion-titulo { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 300; color: #f0ece4; }
        .btn-ver-todo { font-size: 0.72rem; font-weight: 500; color: rgba(240,236,228,0.4); background: none; border: none; cursor: pointer; font-family: 'Montserrat', sans-serif; letter-spacing: 0.06em; transition: color 0.2s; padding: 6px 12px; border-radius: 6px; }
        .btn-ver-todo:hover { color: #d4af6a; }
        .hab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 56px; }
        .hab-card { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 14px; overflow: hidden; cursor: pointer; transition: all 0.3s; }
        .hab-card:hover { border-color: rgba(212,175,106,0.3); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .hab-img-wrap { overflow: hidden; position: relative; height: 180px; }
        .hab-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .hab-card:hover .hab-img { transform: scale(1.04); }
        .hab-tipo-badge { position: absolute; top: 12px; left: 12px; background: rgba(10,10,12,0.75); backdrop-filter: blur(8px); border: 1px solid rgba(212,175,106,0.3); padding: 4px 10px; border-radius: 20px; font-size: 0.62rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #d4af6a; }
        .hab-body { padding: 18px 20px; }
        .hab-nombre { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 400; color: #f0ece4; margin-bottom: 6px; }
        .hab-desc { font-size: 0.75rem; color: rgba(240,236,228,0.45); line-height: 1.5; margin-bottom: 14px; }
        .hab-footer { display: flex; align-items: center; justify-content: space-between; }
        .hab-precio { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: #d4af6a; }
        .hab-precio span { font-size: 0.65rem; font-family: 'Montserrat', sans-serif; color: rgba(240,236,228,0.3); font-weight: 300; }
        .hab-cap { font-size: 0.68rem; color: rgba(240,236,228,0.35); }
        .btn-reservar { padding: 8px 16px; background: linear-gradient(135deg, #c9a84c, #d4af6a); border: none; border-radius: 6px; font-family: 'Montserrat', sans-serif; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: opacity 0.2s; }
        .btn-reservar:hover { opacity: 0.85; }
        .reservas-lista { display: flex; flex-direction: column; gap: 12px; margin-bottom: 56px; }
        .res-card { background: #13131a; border: 1px solid rgba(212,175,106,0.08); border-radius: 12px; padding: 18px 20px; display: flex; align-items: center; gap: 16px; transition: all 0.2s; flex-wrap: wrap; }
        .res-card:hover { border-color: rgba(212,175,106,0.2); background: rgba(212,175,106,0.03); }
        .res-numero { font-family: 'Cormorant Garamond', serif; font-size: 2rem; color: #d4af6a; font-weight: 300; line-height: 1; min-width: 48px; text-align: center; }
        .res-info { flex: 1; min-width: 160px; }
        .res-codigo { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; color: rgba(240,236,228,0.4); margin-bottom: 3px; }
        .res-tipo { font-size: 0.88rem; font-weight: 500; color: #f0ece4; margin-bottom: 3px; }
        .res-fechas { font-size: 0.72rem; color: rgba(240,236,228,0.35); }
        .res-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .res-total { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; color: #d4af6a; }
        .pill-small { display: inline-block; font-size: 0.58rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 9px; border-radius: 20px; }
        .notif-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); animation: fadeIn 0.2s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .notif-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 340px; background: #0f0f12; border-left: 1px solid rgba(212,175,106,0.15); z-index: 160; display: flex; flex-direction: column; animation: slideLeft 0.3s cubic-bezier(0.16,1,0.3,1); }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .notif-panel-header { padding: 20px 20px 16px; border-bottom: 1px solid rgba(212,175,106,0.08); display: flex; align-items: center; justify-content: space-between; }
        .notif-panel-titulo { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: #d4af6a; font-weight: 300; }
        .notif-panel-close { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(240,236,228,0.5); font-size: 0.9rem; }
        .notif-panel-body { flex: 1; overflow-y: auto; padding: 12px; }
        .notif-item { display: flex; gap: 12px; padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid; transition: all 0.2s; cursor: pointer; }
        .notif-item.no-leida { background: rgba(212,175,106,0.05); border-color: rgba(212,175,106,0.15); }
        .notif-item.leida { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04); }
        .notif-item:hover { border-color: rgba(212,175,106,0.25); }
        .notif-icon { width: 34px; height: 34px; border-radius: 8px; background: rgba(212,175,106,0.1); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
        .notif-titulo { font-size: 0.78rem; font-weight: 500; color: #f0ece4; margin-bottom: 3px; }
        .notif-msg { font-size: 0.7rem; color: rgba(240,236,228,0.45); line-height: 1.4; margin-bottom: 4px; }
        .notif-fecha { font-size: 0.62rem; color: rgba(240,236,228,0.25); }
        .notif-dot { width: 7px; height: 7px; border-radius: 50%; background: #d4af6a; flex-shrink: 0; margin-top: 4px; }
        .perfil-card { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 16px; padding: 32px; max-width: 500px; margin: 0 auto; }
        .perfil-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #1a1a2e, #2a2a4e); border: 2px solid rgba(212,175,106,0.4); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 600; color: #d4af6a; margin: 0 auto 20px; }
        .perfil-nombre { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; color: #f0ece4; text-align: center; margin-bottom: 4px; }
        .perfil-rol { font-size: 0.7rem; color: #d4af6a; text-align: center; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 24px; }
        .perfil-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .perfil-field label { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,236,228,0.3); display: block; margin-bottom: 4px; }
        .perfil-field span { font-size: 0.82rem; color: #f0ece4; }
        .perfil-field.full { grid-column: 1 / -1; }
        .btn-logout-cli { width: 100%; margin-top: 20px; padding: 12px; border-radius: 8px; background: rgba(220,60,60,0.08); border: 1px solid rgba(220,60,60,0.2); font-family: 'Montserrat', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,100,100,0.8); cursor: pointer; transition: all 0.2s; }
        .btn-logout-cli:hover { background: rgba(220,60,60,0.15); }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .empty-state { padding: 48px; text-align: center; color: rgba(240,236,228,0.25); font-size: 0.85rem; background: #13131a; border: 1px solid rgba(212,175,106,0.08); border-radius: 12px; }
        /* Modales cancelación */
        @keyframes mFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes mSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .m-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); z-index:400; display:flex; align-items:center; justify-content:center; padding:20px; animation:mFadeIn 0.2s ease; }
        .m-box { background:#13131a; border:1px solid rgba(212,175,106,0.2); border-radius:16px; padding:28px 26px; max-width:420px; width:100%; animation:mSlideUp 0.28s cubic-bezier(0.16,1,0.3,1); }
        .m-title { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:300; color:#f0ece4; margin-bottom:5px; }
        .m-sub { font-size:0.7rem; color:rgba(240,236,228,0.3); margin-bottom:20px; line-height:1.5; }
        .m-label { font-size:0.6rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:rgba(240,236,228,0.35); display:block; margin-bottom:7px; }
        .m-textarea { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(212,175,106,0.2); border-radius:8px; padding:11px 14px; font-family:'Montserrat',sans-serif; font-size:0.8rem; color:#f0ece4; outline:none; resize:vertical; min-height:90px; transition:border-color 0.2s; }
        .m-textarea:focus { border-color:rgba(212,175,106,0.45); }
        .m-file-btn { display:flex; align-items:center; gap:10px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px dashed rgba(212,175,106,0.25); border-radius:8px; cursor:pointer; transition:all 0.2s; margin-top:12px; }
        .m-file-btn:hover { border-color:rgba(212,175,106,0.5); background:rgba(212,175,106,0.05); }
        .m-file-ico { font-size:1.1rem; }
        .m-file-text { font-size:0.72rem; color:rgba(240,236,228,0.45); }
        .m-file-sel { font-size:0.68rem; color:#52c97a; margin-top:6px; }
        .m-warn { background:rgba(212,175,106,0.06); border:1px solid rgba(212,175,106,0.2); border-radius:8px; padding:12px 14px; font-size:0.7rem; color:rgba(212,175,106,0.7); line-height:1.6; margin-bottom:16px; }
        .m-err { background:rgba(224,82,82,0.08); border:1px solid rgba(224,82,82,0.2); border-radius:6px; padding:10px 12px; font-size:0.72rem; color:#e05252; margin-top:10px; }
        .m-ok { text-align:center; padding:16px 0; }
        .m-ok-icon { font-size:2.5rem; margin-bottom:12px; }
        .m-ok-title { font-family:'Cormorant Garamond',serif; font-size:1.35rem; color:#f0ece4; margin-bottom:6px; }
        .m-ok-text { font-size:0.72rem; color:rgba(240,236,228,0.4); margin-bottom:20px; line-height:1.6; }
        .m-btns { display:flex; gap:10px; margin-top:20px; }
        .m-btn-danger { flex:1; padding:13px; background:rgba(220,60,60,0.1); border:1px solid rgba(220,60,60,0.3); border-radius:8px; font-family:'Montserrat',sans-serif; font-size:0.7rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:#e05252; cursor:pointer; transition:all 0.2s; }
        .m-btn-danger:hover:not(:disabled) { background:rgba(220,60,60,0.18); }
        .m-btn-danger:disabled { opacity:0.5; cursor:not-allowed; }
        .m-btn-gold { flex:1; padding:13px; background:linear-gradient(135deg,#c9a84c,#d4af6a); border:none; border-radius:8px; font-family:'Montserrat',sans-serif; font-size:0.7rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:#0a0a0a; cursor:pointer; transition:opacity 0.2s; }
        .m-btn-gold:hover:not(:disabled) { opacity:0.88; }
        .m-btn-gold:disabled { opacity:0.5; cursor:not-allowed; }
        .m-btn-cancel { flex:1; padding:13px; background:transparent; border:1px solid rgba(212,175,106,0.18); border-radius:8px; font-family:'Montserrat',sans-serif; font-size:0.7rem; color:rgba(240,236,228,0.4); cursor:pointer; transition:all 0.2s; }
        .m-btn-cancel:hover { border-color:rgba(212,175,106,0.4); color:#f0ece4; }
        .btn-cancelar-res { font-size:0.58rem; padding:4px 9px; background:rgba(220,60,60,0.08); border:1px solid rgba(220,60,60,0.2); border-radius:6px; color:rgba(224,90,90,0.8); font-family:'Montserrat',sans-serif; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; transition:all 0.2s; }
        .btn-cancelar-res:hover { background:rgba(220,60,60,0.15); }
        .btn-emerg-res { font-size:0.58rem; padding:4px 9px; background:rgba(212,175,106,0.08); border:1px solid rgba(212,175,106,0.22); border-radius:6px; color:rgba(212,175,106,0.75); font-family:'Montserrat',sans-serif; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; transition:all 0.2s; }
        .btn-emerg-res:hover { background:rgba(212,175,106,0.16); }
        .cli-footer { border-top: 1px solid rgba(212,175,106,0.08); padding: 28px; text-align: center; }
        .cli-footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; color: #d4af6a; letter-spacing: 0.15em; margin-bottom: 8px; }
        .cli-footer-text { font-size: 0.68rem; color: rgba(240,236,228,0.2); letter-spacing: 0.06em; }
      `}</style>

      <div className="cli-root">
        {/* NAV */}
        <nav className="cli-nav">
          <div className="cli-nav-logo" onClick={() => setSeccion('inicio')}>
            Grand Hôtel
          </div>
          <div className="cli-nav-links">
            {[
              { key: 'inicio',         label: 'Inicio'         },
              { key: 'habitaciones',   label: 'Habitaciones'   },
              { key: 'favoritos',      label: `❤️ Favoritos${favoritosIds.size > 0 ? ` (${favoritosIds.size})` : ''}` },
              { key: 'reservas',       label: 'Mis reservas'   },
              { key: 'notificaciones', label: 'Notificaciones' },
              { key: 'perfil',         label: 'Perfil'         },
            ].map((item) => (
              <button key={item.key}
                className={`cli-nav-link ${seccion === item.key ? 'activo' : ''}`}
                onClick={() => setSeccion(item.key as typeof seccion)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="cli-nav-right">
            <div className="mobile-menu-btn" onClick={() => setMenuAbierto(!menuAbierto)}>
              <span className="mobile-menu-line" />
              <span className="mobile-menu-line" />
              <span className="mobile-menu-line" />
            </div>
            <div className="notif-btn" onClick={() => setNotifAbiertas(true)}>
              <span style={{ fontSize: '0.9rem' }}>🔔</span>
              {noLeidas > 0 && <div className="notif-badge">{noLeidas}</div>}
            </div>
            <div onClick={() => setSeccion('perfil')} style={{
              position: 'relative', width: 34, height: 34, cursor: 'pointer', flexShrink: 0,
            }}>
              <div className="cli-avatar" style={{
                overflow: 'hidden', padding: perfil?.foto_url ? 0 : undefined,
                border: `1.5px solid ${
                  perfil?.nivel_fidelidad === 'Diamante' ? '#f8e4ff'
                  : perfil?.nivel_fidelidad === 'Platino' ? '#b9f2ff'
                  : perfil?.nivel_fidelidad === 'Oro' ? '#d4af6a'
                  : perfil?.nivel_fidelidad === 'Plata' ? '#a8a9ad'
                  : perfil?.nivel_fidelidad === 'Bronce' ? '#cd7f32'
                  : 'rgba(212,175,106,0.4)'
                }`,
              }}>
                {perfil?.foto_url ? (
                  <img src={perfil.foto_url} alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                ) : (
                  perfil?.nombre_completo?.charAt(0).toUpperCase() ?? 'C'
                )}
              </div>
              {perfil?.nivel_fidelidad && perfil.nivel_fidelidad !== 'Visitante' && (
                <div style={{
                  position: 'absolute', bottom: -3, right: -3,
                  fontSize: '0.55rem', lineHeight: 1, background: '#0a0a0a',
                  borderRadius: '50%', padding: '1px',
                }}>
                  {perfil.nivel_fidelidad === 'Diamante' ? '👑'
                    : perfil.nivel_fidelidad === 'Platino' ? '💎'
                    : perfil.nivel_fidelidad === 'Oro' ? '🥇'
                    : perfil.nivel_fidelidad === 'Plata' ? '🥈' : '🥉'}
                </div>
              )}
            </div>
          </div>
        </nav>

        {menuAbierto && (
          <div className="mobile-menu">
            {[
              { key: 'inicio',         label: 'Inicio'         },
              { key: 'habitaciones',   label: 'Habitaciones'   },
              { key: 'favoritos',      label: `❤️ Favoritos${favoritosIds.size > 0 ? ` (${favoritosIds.size})` : ''}` },
              { key: 'reservas',       label: 'Mis reservas'   },
              { key: 'notificaciones', label: 'Notificaciones' },
              { key: 'perfil',         label: 'Perfil'         },
            ].map((item) => (
              <button key={item.key}
                className={`cli-nav-link ${seccion === item.key ? 'activo' : ''}`}
                style={{ textAlign: 'left' }}
                onClick={() => { setSeccion(item.key as typeof seccion); setMenuAbierto(false) }}>
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* INICIO */}
        {seccion === 'inicio' && (
          <>
            <div className="hero">
              <div className="hero-bg" />
              <div className="hero-content">
                <div className="hero-eyebrow">
                  Bienvenido, {perfil?.nombre_completo?.split(' ')[0] ?? 'huésped'}
                </div>
                <h1 className="hero-title">
                  Tu próxima estadía<br /><em>perfecta</em> te espera
                </h1>
                <p className="hero-sub">
                  Descubre nuestras habitaciones, realiza reservas y gestiona tu estadía de forma rápida y sencilla.
                </p>
                <div className="buscador">
                  <div className="buscador-field">
                    <label>Fecha entrada</label>
                    <input type="date" className="buscador-input"
                      value={fechaEntrada} onChange={(e) => setFechaEntrada(e.target.value)} />
                  </div>
                  <div className="buscador-field">
                    <label>Fecha salida</label>
                    <input type="date" className="buscador-input"
                      value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} />
                  </div>
                  <div className="buscador-field" style={{ maxWidth: 80 }}>
                    <label>Adultos</label>
                    <input type="number" className="buscador-input-num"
                      value={adultos} min={1} max={10}
                      onChange={(e) => setAdultos(Number(e.target.value))} />
                  </div>
                  <div className="buscador-field" style={{ maxWidth: 80 }}>
                    <label>Niños</label>
                    <input type="number" className="buscador-input-num"
                      value={ninos} min={0} max={10}
                      onChange={(e) => setNinos(Number(e.target.value))} />
                  </div>
                  <button className="btn-buscar"
                    disabled={!fechaEntrada || !fechaSalida}
                    onClick={buscarHabitaciones}>
                    Buscar disponibilidad
                  </button>
                </div>
              </div>
            </div>

            <div className="cli-main">
              {/* Banner de nivel de fidelización */}
              {perfil?.nivel_fidelidad && perfil.nivel_fidelidad !== 'Visitante' && (
                <div
                  onClick={() => setSeccion('perfil')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${
                      perfil.nivel_fidelidad === 'Diamante' ? 'rgba(248,228,255,0.25)'
                      : perfil.nivel_fidelidad === 'Platino' ? 'rgba(185,242,255,0.25)'
                      : perfil.nivel_fidelidad === 'Oro' ? 'rgba(212,175,106,0.25)'
                      : perfil.nivel_fidelidad === 'Plata' ? 'rgba(168,169,173,0.25)'
                      : 'rgba(205,127,50,0.25)'
                    }`,
                    borderRadius: 12, padding: '12px 18px', cursor: 'pointer',
                    marginBottom: 24, transition: 'all 0.2s',
                  }}>
                  <span style={{ fontSize: '1.4rem' }}>
                    {perfil.nivel_fidelidad === 'Diamante' ? '👑'
                      : perfil.nivel_fidelidad === 'Platino' ? '💎'
                      : perfil.nivel_fidelidad === 'Oro' ? '🥇'
                      : perfil.nivel_fidelidad === 'Plata' ? '🥈' : '🥉'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f0ece4', fontFamily: 'Montserrat,sans-serif' }}>
                      Miembro {perfil.nivel_fidelidad} · Grand Rewards
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(240,236,228,0.4)', fontFamily: 'Montserrat,sans-serif', marginTop: 2 }}>
                      {perfil.total_reservas_completadas ?? 0} estadías · {(perfil.puntos_fidelidad ?? 0).toLocaleString()} puntos
                    </div>
                  </div>
                  <LoyaltyBadge
                    nivel={perfil.nivel_fidelidad}
                    reservas={perfil.total_reservas_completadas ?? 0}
                    puntos={perfil.puntos_fidelidad ?? 0}
                    variant="inline"
                  />
                </div>
              )}

              {/* Próxima reserva */}
              {!cargandoReservas && proximaReserva && (
                <div className="proxima-reserva">
                  <div className="proxima-left">
                    <div className="proxima-icon">📅</div>
                    <div>
                      <div className="proxima-eyebrow">Tu próxima reserva</div>
                      <div className="proxima-titulo">
                        Hab. {proximaReserva.habitacion_numero} — {proximaReserva.tipo_habitacion}
                      </div>
                      <div className="proxima-detalle">
                        {proximaReserva.codigo_reserva} · {proximaReserva.fecha_entrada} → {proximaReserva.fecha_salida}
                      </div>
                    </div>
                  </div>
                  <div className="proxima-right">
                    <div className="proxima-stat">
                      <div className="proxima-stat-val">{proximaReserva.noches}</div>
                      <div className="proxima-stat-label">Noches</div>
                    </div>
                    <div className="proxima-stat">
                      <div className="proxima-stat-val" style={{ fontSize: '1.1rem' }}>
                        Bs. {proximaReserva.total_estimado}
                      </div>
                      <div className="proxima-stat-label">Total</div>
                    </div>
                    <button className="btn-buscar" onClick={() => setSeccion('reservas')}>
                      Ver detalles
                    </button>
                  </div>
                </div>
              )}

              {/* Acciones rápidas */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
                {[
                  { icon: '🛏️', label: 'Reservar ahora', action: () => setSeccion('habitaciones') },
                  { icon: '📋', label: 'Mis reservas',   action: () => setSeccion('reservas') },
                  { icon: '🔔', label: 'Notificaciones', action: () => setSeccion('notificaciones') },
                  { icon: '👤', label: 'Mi perfil',      action: () => setSeccion('perfil') },
                ].map(a => (
                  <button key={a.label} onClick={a.action}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 16px', color: 'rgba(240,236,228,0.7)', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.18s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,106,0.08)'; e.currentTarget.style.borderColor = 'rgba(212,175,106,0.25)'; e.currentTarget.style.color = '#d4af6a' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(240,236,228,0.7)' }}>
                    <span>{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>

              {/* Banner califica tu estadía */}
              {(() => {
                const pendientes = reservas.filter(r => r.estado === 'finalizada' && !reservasConResena.has(r.reserva_id))
                if (pendientes.length === 0) return null
                return (
                  <div onClick={() => setSeccion('reservas')} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(212,175,106,0.06)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 28, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,106,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,106,0.06)')}>
                    <span style={{ fontSize: '1.5rem' }}>⭐</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d4af6a', fontFamily: 'Montserrat,sans-serif' }}>
                        {pendientes.length === 1 ? 'Tienes 1 estadía pendiente de calificar' : `Tienes ${pendientes.length} estadías pendientes de calificar`}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.4)', fontFamily: 'Montserrat,sans-serif', marginTop: 2 }}>
                        Tu opinión ayuda a mejorar la experiencia de otros huéspedes.
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(212,175,106,0.6)', fontFamily: 'Montserrat,sans-serif' }}>Ir a Mis reservas →</span>
                  </div>
                )
              })()}

              {/* Habitaciones destacadas */}
              <div style={{ marginBottom: 48 }}>
                <div className="seccion-header">
                  <div>
                    <div className="seccion-eyebrow">Disponibles ahora</div>
                    <div className="seccion-titulo">Nuestras habitaciones</div>
                  </div>
                  <button className="btn-ver-todo" onClick={() => setSeccion('habitaciones')}>
                    Ver todas →
                  </button>
                </div>
                <div className="hab-grid">
                  {tiposDestacados.map((h) => (
                    <div key={h.nombre} className="hab-card">
                      <div className="hab-img-wrap">
                        <img src={getImagenHab(h.nombre)} alt={h.nombre} className="hab-img" />
                        <div className="hab-tipo-badge">{h.nombre}</div>
                      </div>
                      <div className="hab-body">
                        <div className="hab-nombre">{h.nombre}</div>
                        <div className="hab-desc">{h.descripcion || `Habitación tipo ${h.nombre}`}</div>
                        <div className="hab-footer">
                          <div>
                            <div className="hab-precio">Bs. {h.precio_base} <span>/ noche</span></div>
                            <div className="hab-cap">👥 hasta {h.capacidad_adultos} personas</div>
                          </div>
                          <button className="btn-reservar" onClick={() => setSeccion('habitaciones')}>
                            Ver disponibilidad
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ofertas especiales */}
              <div style={{ marginBottom: 48 }}>
                <div className="seccion-header" style={{ marginBottom: 20 }}>
                  <div>
                    <div className="seccion-eyebrow">Exclusivo para miembros</div>
                    <div className="seccion-titulo">Ofertas especiales</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  {[
                    { emoji: '🌙', titulo: 'Escapada de fin de semana', desc: '2 noches + desayuno incluido para 2 personas.', badge: '15% OFF', color: 'rgba(212,175,106,0.12)', border: 'rgba(212,175,106,0.25)' },
                    { emoji: '💆', titulo: 'Noche Spa & Relax', desc: 'Habitación Deluxe + 60 min de masaje relajante.', badge: 'Nuevo', color: 'rgba(185,242,255,0.08)', border: 'rgba(185,242,255,0.2)' },
                    { emoji: '👨‍👩‍👧', titulo: 'Plan Familiar', desc: 'Habitación familiar + niños menores de 10 gratis.', badge: 'Popular', color: 'rgba(100,200,150,0.08)', border: 'rgba(100,200,150,0.2)' },
                  ].map(o => (
                    <div key={o.titulo} style={{ background: o.color, border: `1px solid ${o.border}`, borderRadius: 14, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '1.6rem' }}>{o.emoji}</span>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', background: 'rgba(255,255,255,0.06)', border: `1px solid ${o.border}`, borderRadius: 20, padding: '3px 9px', color: '#f0ece4', fontFamily: 'Montserrat,sans-serif' }}>{o.badge}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0ece4', fontFamily: 'Montserrat,sans-serif' }}>{o.titulo}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.5)', fontFamily: 'Montserrat,sans-serif', lineHeight: 1.6 }}>{o.desc}</div>
                      <button className="btn-reservar" style={{ fontSize: '0.65rem', padding: '7px 14px', alignSelf: 'flex-start', marginTop: 4 }}
                        onClick={() => setSeccion('habitaciones')}>
                        Reservar →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Servicios del hotel */}
              <div style={{ marginBottom: 48 }}>
                <div className="seccion-header" style={{ marginBottom: 20 }}>
                  <div>
                    <div className="seccion-eyebrow">En el hotel</div>
                    <div className="seccion-titulo">Nuestros servicios</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
                  {[
                    { emoji: '🍽️', nombre: 'Restaurante', desc: 'Gastronomía de autor' },
                    { emoji: '💆', nombre: 'Spa & Wellness', desc: 'Masajes y tratamientos' },
                    { emoji: '🏊', nombre: 'Piscina', desc: 'Climatizada todo el año' },
                    { emoji: '🏋️', nombre: 'Gimnasio', desc: 'Equipamiento de primera' },
                    { emoji: '🎭', nombre: 'Salón de eventos', desc: 'Hasta 200 personas' },
                    { emoji: '🚗', nombre: 'Estacionamiento', desc: 'Gratuito para huéspedes' },
                    { emoji: '📶', nombre: 'WiFi Premium', desc: 'Alta velocidad en todo el hotel' },
                    { emoji: '🛎️', nombre: 'Concierge', desc: 'Atención 24/7' },
                  ].map(s => (
                    <div key={s.nombre} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 14px', textAlign: 'center', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,175,106,0.2)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}>
                      <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{s.emoji}</div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f0ece4', fontFamily: 'Montserrat,sans-serif', marginBottom: 4 }}>{s.nombre}</div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(240,236,228,0.35)', fontFamily: 'Montserrat,sans-serif', lineHeight: 1.4 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Galería del hotel */}
              <div style={{ marginBottom: 48 }}>
                <div className="seccion-header" style={{ marginBottom: 20 }}>
                  <div>
                    <div className="seccion-eyebrow">Nuestro hotel</div>
                    <div className="seccion-titulo">Momentos Grand Hôtel</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '180px 180px', gap: 10 }}>
                  {[
                    { src: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80', span: 'row', label: 'Lobby principal' },
                    { src: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80', span: '', label: 'Suite presidencial' },
                    { src: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80', span: '', label: 'Piscina' },
                    { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80', span: '', label: 'Restaurante' },
                    { src: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80', span: '', label: 'Spa' },
                  ].map((img, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', gridRow: i === 0 ? 'span 2' : undefined }}>
                      <img src={img.src} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(240,236,228,0.7)', fontFamily: 'Montserrat,sans-serif' }}>{img.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp contacto */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'linear-gradient(135deg, rgba(13,51,33,0.8), rgba(22,80,52,0.5))', border: '1px solid rgba(37,211,102,0.18)', borderRadius: 14, padding: '20px 24px', marginBottom: 48 }}>
                <div style={{ background: 'rgba(37,211,102,0.12)', borderRadius: '50%', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#25d366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0ece4', fontFamily: 'Montserrat,sans-serif', marginBottom: 4 }}>¿Necesitas ayuda?</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.45)', fontFamily: 'Montserrat,sans-serif', lineHeight: 1.6 }}>
                    Contáctanos por WhatsApp para consultas sobre tu reserva, servicios del hotel o cualquier información que necesites.
                  </div>
                </div>
                <a href={`https://wa.me/59170000000?text=${encodeURIComponent(`Hola, soy ${perfil?.nombre_completo ?? 'huésped'} y necesito información sobre el hotel.`)}`}
                  target="_blank" rel="noreferrer"
                  style={{ background: '#25d366', color: '#fff', borderRadius: 10, padding: '11px 20px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: 'Montserrat,sans-serif', flexShrink: 0, transition: 'background 0.2s' }}
                  onMouseEnter={e => ((e.target as HTMLAnchorElement).style.background = '#1ebe5d')}
                  onMouseLeave={e => ((e.target as HTMLAnchorElement).style.background = '#25d366')}>
                  Contactar →
                </a>
              </div>

              {/* Reseñas recientes */}
              {resenasPublicas.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div className="seccion-header" style={{ marginBottom: 20 }}>
                    <div>
                      <div className="seccion-eyebrow">Lo que dicen</div>
                      <div className="seccion-titulo">Opiniones de huéspedes</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d4af6a', fontFamily: 'Montserrat,sans-serif', lineHeight: 1 }}>
                        {(resenasPublicas.reduce((s, r) => s + r.calificacion, 0) / resenasPublicas.length).toFixed(1)}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.35)', fontFamily: 'Montserrat,sans-serif' }}>
                        {'★'.repeat(Math.round(resenasPublicas.reduce((s, r) => s + r.calificacion, 0) / resenasPublicas.length))} · {resenasPublicas.length} reseñas
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    {resenasPublicas.slice(0, 3).map((r, i) => (
                      <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {r.foto_url && (
                          <div style={{ height: 140, overflow: 'hidden', flexShrink: 0 }}>
                            <img src={r.foto_url} alt="Foto de estadía"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.35s' }}
                              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                          </div>
                        )}
                        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                          <div style={{ color: '#d4af6a', fontSize: '0.85rem', letterSpacing: '2px' }}>{'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}</div>
                          {r.titulo && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f0ece4', fontFamily: 'Montserrat,sans-serif' }}>"{r.titulo}"</div>}
                          <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,228,0.5)', fontFamily: 'Montserrat,sans-serif', lineHeight: 1.6, flex: 1 }}>
                            {r.comentario ? (r.comentario.length > 140 ? r.comentario.slice(0, 140) + '…' : r.comentario) : 'Excelente experiencia.'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(212,175,106,0.12)', border: '1px solid rgba(212,175,106,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#d4af6a', fontWeight: 700 }}>H{i + 1}</div>
                            <div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(240,236,228,0.5)', fontFamily: 'Montserrat,sans-serif' }}>Huésped verificado</div>
                              <div style={{ fontSize: '0.58rem', color: 'rgba(240,236,228,0.25)', fontFamily: 'Montserrat,sans-serif' }}>{new Date(r.created_at).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}</div>
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', color: '#d4af6a', background: 'rgba(212,175,106,0.08)', border: '1px solid rgba(212,175,106,0.15)', borderRadius: 20, padding: '2px 6px' }}>✓ Real</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <span style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.3)', fontFamily: 'Montserrat,sans-serif' }}>
                      ¿Ya te hospedaste? Deja tu reseña en la sección{' '}
                      <span style={{ color: '#d4af6a', cursor: 'pointer' }} onClick={() => setSeccion('reservas')}>Mis reservas →</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* HABITACIONES */}
        {seccion === 'habitaciones' && (
          <div className="cli-main">
            <div className="seccion-header" style={{ marginBottom: 32 }}>
              <div>
                <div className="seccion-eyebrow">Catálogo</div>
                <div className="seccion-titulo">Habitaciones disponibles</div>
              </div>
            </div>

            <div style={{ background: '#13131a', border: '1px solid rgba(212,175,106,0.15)', borderRadius: 12, padding: '20px 24px', marginBottom: 32 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.35)', marginBottom: 14 }}>
                Buscar disponibilidad
              </div>
              <div className="buscador" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                <div className="buscador-field">
                  <label>Fecha entrada</label>
                  <input type="date" className="buscador-input"
                    value={fechaEntrada} onChange={(e) => setFechaEntrada(e.target.value)} />
                </div>
                <div className="buscador-field">
                  <label>Fecha salida</label>
                  <input type="date" className="buscador-input"
                    value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} />
                </div>
                <div className="buscador-field" style={{ maxWidth: 80 }}>
                  <label>Adultos</label>
                  <input type="number" className="buscador-input-num"
                    value={adultos} min={1} onChange={(e) => setAdultos(Number(e.target.value))} />
                </div>
                <div className="buscador-field" style={{ maxWidth: 80 }}>
                  <label>Niños</label>
                  <input type="number" className="buscador-input-num"
                    value={ninos} min={0} onChange={(e) => setNinos(Number(e.target.value))} />
                </div>
                <button className="btn-buscar"
                  disabled={!fechaEntrada || !fechaSalida || cargandoHabs}
                  onClick={buscarHabitaciones}>
                  {cargandoHabs ? 'Buscando...' : 'Verificar disponibilidad'}
                </button>
              </div>
            </div>

            {cargandoHabs ? (
              <div className="hab-grid">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 320 }} />
                ))}
              </div>
            ) : habitaciones.length === 0 ? (
              <div className="empty-state">
                {fechaEntrada && fechaSalida
                  ? 'No hay habitaciones disponibles para las fechas seleccionadas'
                  : 'Selecciona fechas para ver habitaciones disponibles'}
              </div>
            ) : (
              <div className="hab-grid">
                {habitaciones.map((h) => (
                  <div key={h.id} className="hab-card">
                    <div className="hab-img-wrap" style={{ position: 'relative' }}>
                      <img src={getImagenHabReal(h.id, h.nombre_tipo)} alt={h.nombre_tipo} className="hab-img" />
                      <div className="hab-tipo-badge">{h.nombre_tipo}</div>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleFavorito(h.id) }}
                        disabled={toggling === h.id}
                        style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: 'transform 0.15s', backdropFilter: 'blur(4px)' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                        {favoritosIds.has(h.id) ? '❤️' : '🤍'}
                      </button>
                    </div>
                    <div className="hab-body">
                      <div className="hab-nombre">Habitación {h.numero}</div>
                      <div className="hab-desc">
                        {h.descripcion || `${h.nombre_tipo} · ${h.numero_camas} cama(s) ${h.tipo_cama}`}
                      </div>
                      <div className="hab-footer">
                        <div>
                          <div className="hab-precio">
                            Bs. {h.precio ?? h.precio_base} <span>/ noche</span>
                          </div>
                          <div className="hab-cap">👥 hasta {h.capacidad_adultos} adultos</div>
                        </div>
                        <button className="btn-reservar" onClick={() => handleReservar(h)}>Reservar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FAVORITOS */}
        {seccion === 'favoritos' && (
          <div className="cli-main">
            <div className="seccion-header" style={{ marginBottom: 32 }}>
              <div>
                <div className="seccion-eyebrow">Guardadas</div>
                <div className="seccion-titulo">Mis habitaciones favoritas</div>
              </div>
              {favoritos.length > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.3)', fontFamily: 'Montserrat,sans-serif' }}>
                  {favoritos.length} habitación{favoritos.length !== 1 ? 'es' : ''} guardada{favoritos.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {favoritos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🤍</div>
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.4rem', color: 'rgba(240,236,228,0.5)', marginBottom: 8 }}>
                  Aún no tienes favoritos
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(240,236,228,0.3)', fontFamily: 'Montserrat,sans-serif', marginBottom: 24 }}>
                  Explora nuestras habitaciones y guarda las que más te gusten con ❤️
                </div>
                <button className="btn-reservar" onClick={() => setSeccion('habitaciones')}>
                  Ver habitaciones →
                </button>
              </div>
            ) : (
              <div className="hab-grid">
                {favoritos.map(f => (
                  <div key={f.habitacion_id} className="hab-card">
                    <div className="hab-img-wrap" style={{ position: 'relative' }}>
                      <img src={getImagenHabReal(f.habitacion_id, f.tipo_habitacion)} alt={f.tipo_habitacion} className="hab-img" />
                      <div className="hab-tipo-badge">{f.tipo_habitacion}</div>
                      <button
                        onClick={() => handleToggleFavorito(f.habitacion_id)}
                        disabled={toggling === f.habitacion_id}
                        style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', backdropFilter: 'blur(4px)' }}>
                        ❤️
                      </button>
                    </div>
                    <div className="hab-body">
                      <div className="hab-nombre">Habitación {f.numero}</div>
                      <div className="hab-desc">{f.descripcion || `${f.tipo_habitacion} para ${f.capacidad_adultos} adultos`}</div>
                      <div className="hab-footer">
                        <div>
                          <div className="hab-precio">Bs. {f.precio_base} <span>/ noche</span></div>
                          <div className="hab-cap">👥 hasta {f.capacidad_adultos} adultos</div>
                        </div>
                        <button className="btn-reservar" onClick={() => {
                          navigate('/cliente/reservar', {
                            state: { habitacionId: f.habitacion_id, precio: f.precio_base, nombreHab: `${f.tipo_habitacion} — Hab. ${f.numero}` }
                          })
                        }}>
                          Reservar →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MIS RESERVAS */}
        {seccion === 'reservas' && (
          <div className="cli-main">
            <div className="seccion-header" style={{ marginBottom: 28 }}>
              <div>
                <div className="seccion-eyebrow">Mi historial</div>
                <div className="seccion-titulo">Mis reservas</div>
              </div>
            </div>
            {cargandoReservas ? (
              <div className="reservas-lista">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 88 }} />
                ))}
              </div>
            ) : reservas.length === 0 ? (
              <div className="empty-state">No tienes reservas registradas aún</div>
            ) : (
              <div className="reservas-lista">
                {reservas.map((r) => {
                  const ec = estadoReservaConfig[r.estado] ?? estadoReservaConfig.pendiente
                  return (
                    <div key={r.reserva_id} className="res-card">
                      <div className="res-numero">{r.habitacion_numero}</div>
                      <div className="res-info">
                        <div className="res-codigo">{r.codigo_reserva}</div>
                        <div className="res-tipo">
                          Hab. {r.habitacion_numero} — {r.tipo_habitacion}
                        </div>
                        <div className="res-fechas">
                          {r.fecha_entrada} → {r.fecha_salida} · {r.noches} noches
                        </div>
                      </div>
                      <div className="res-right">
                        <div className="res-total">Bs. {r.total_estimado}</div>
                        <span className="pill-small"
                          style={{ background: ec.bg, color: ec.text }}>
                          {ec.label}
                        </span>
                        {(r.estado === 'pendiente' || r.estado === 'confirmada') && (
                          <button className="btn-reservar"
                            style={{ fontSize: '0.6rem', padding: '5px 10px', background: 'rgba(100,160,255,0.12)', color: '#7eb8ff', border: '1px solid rgba(100,160,255,0.25)' }}
                            onClick={() => abrirModFechas(r)}>
                            ✏️ Modificar fechas
                          </button>
                        )}
                        {r.estado === 'confirmada' && (
                          <button className="btn-reservar"
                            style={{ fontSize: '0.6rem', padding: '5px 10px' }}
                            onClick={() => { setModalPreCheckin(r.reserva_id); setPcExito(false); setPcHora(''); setPcObs('') }}>
                            Pre check-in
                          </button>
                        )}
                        {(r.estado === 'finalizada' || r.estado === 'en_estadia') && (
                          <button className="btn-reservar"
                            style={{ fontSize: '0.6rem', padding: '5px 10px', background: 'rgba(212,175,106,0.15)', color: '#d4af6a', border: '1px solid rgba(212,175,106,0.3)' }}
                            onClick={() => navigate(`/cliente/factura/${r.reserva_id}`)}>
                            Ver factura
                          </button>
                        )}
                        {r.estado === 'finalizada' && !reservasConResena.has(r.reserva_id) && (
                          <button className="btn-reservar"
                            style={{ fontSize: '0.6rem', padding: '5px 10px', background: 'rgba(100,200,150,0.12)', color: '#6ecf9a', border: '1px solid rgba(100,200,150,0.25)' }}
                            onClick={() => abrirModalResena(r.reserva_id, r.codigo_reserva)}>
                            ★ Calificar estadía
                          </button>
                        )}
                        {r.estado === 'finalizada' && reservasConResena.has(r.reserva_id) && (
                          <span style={{ fontSize: '0.6rem', color: 'rgba(110,207,154,0.5)', fontFamily: 'Montserrat,sans-serif' }}>✓ Reseña enviada</span>
                        )}
                        {puedeCanCelar(r) && (
                          <button className="btn-cancelar-res"
                            onClick={() => { setModalCancelar({ id: r.reserva_id, codigo: r.codigo_reserva }); setCancelMotivo(''); setCancelExito(false); setCancelError(null) }}>
                            Cancelar
                          </button>
                        )}
                        {puedeEmergencia(r) && (
                          <button className="btn-emerg-res"
                            onClick={() => { setModalEmergencia({ id: r.reserva_id, codigo: r.codigo_reserva }); setEmerMotivo(''); setEmerFile(null); setEmerExito(false); setEmerError(null) }}>
                            Solicitar cancelación
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* NOTIFICACIONES */}
        {seccion === 'notificaciones' && (
          <div className="cli-main">
            <div className="seccion-header" style={{ marginBottom: 24 }}>
              <div>
                <div className="seccion-eyebrow">Centro de mensajes</div>
                <div className="seccion-titulo">Notificaciones</div>
              </div>
              {noLeidas > 0 && (
                <span style={{ fontSize: '0.68rem', background: 'rgba(212,175,106,0.12)', color: '#d4af6a', padding: '4px 12px', borderRadius: 20 }}>
                  {noLeidas} sin leer
                </span>
              )}
            </div>
            {cargandoNotif ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 80 }} />
                ))}
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="empty-state">No tienes notificaciones</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 }}>
                {notificaciones.map((n) => (
                  <div key={n.id}
                    className={`notif-item ${n.leida ? 'leida' : 'no-leida'}`}
                    onClick={() => !n.leida && handleMarcarLeida(n.id)}>
                    <div className="notif-icon">
                      {tipoNotifIcon[n.tipo] ?? '🔔'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="notif-titulo">{n.titulo}</div>
                      <div className="notif-msg">{n.mensaje}</div>
                      <div className="notif-fecha">
                        {n.created_at
                          ? new Date(n.created_at).toLocaleString('es-BO')
                          : '—'}
                      </div>
                    </div>
                    {!n.leida && <div className="notif-dot" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PERFIL */}
        {seccion === 'perfil' && (
          <div className="cli-main">
            <div className="seccion-header" style={{ marginBottom: 28 }}>
              <div>
                <div className="seccion-eyebrow">Mi cuenta</div>
                <div className="seccion-titulo">Perfil</div>
              </div>
            </div>
            <div className="perfil-card">
              {/* Avatar / foto */}
              <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
                {perfil?.foto_url ? (
                  <img src={perfil.foto_url} alt="avatar"
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,106,0.4)' }} />
                ) : (
                  <div className="perfil-avatar" style={{ width: 80, height: 80, margin: 0, fontSize: '2rem' }}>
                    {perfil?.nombre_completo?.charAt(0).toUpperCase() ?? 'C'}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fotoSubiendo}
                  style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: '#d4af6a', border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a' }}
                  title="Cambiar foto">
                  {fotoSubiendo ? '…' : '📷'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
              </div>

              {/* Error foto */}
              {fotoError && (
                <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.2)', borderRadius: 6, padding: '8px 12px', fontSize: '0.72rem', color: '#f08080', marginBottom: 14, textAlign: 'center' }}>
                  {fotoError}
                </div>
              )}

              {!editandoPerfil ? (
                <>
                  <div className="perfil-nombre">{perfil?.nombre_completo ?? 'Cliente'}</div>
                  <div className="perfil-rol">{perfil?.rol ?? 'Cliente'}</div>

                  {/* Loyalty card */}
                  <div style={{ marginBottom: 20 }}>
                    <LoyaltyBadge
                      nivel={(perfil?.nivel_fidelidad ?? 'Visitante') as NivelFidelidad}
                      reservas={perfil?.total_reservas_completadas ?? 0}
                      puntos={perfil?.puntos_fidelidad ?? 0}
                      gastado={perfil?.total_gastado ?? 0}
                      variant="card"
                    />
                  </div>
                  <div className="perfil-grid">
                    <div className="perfil-field full">
                      <label>Correo electrónico</label>
                      <span>{perfil?.correo ?? '—'}</span>
                    </div>
                    <div className="perfil-field">
                      <label>Teléfono</label>
                      <span>{perfil?.telefono ?? '—'}</span>
                    </div>
                    <div className="perfil-field">
                      <label>Fecha de nacimiento</label>
                      <span>{perfil?.fecha_nacimiento ?? '—'}</span>
                    </div>
                    <div className="perfil-field">
                      <label>Tipo de documento</label>
                      <span>{perfil?.tipo_documento ?? '—'}</span>
                    </div>
                    <div className="perfil-field">
                      <label>Nº documento</label>
                      <span>{perfil?.numero_documento ?? '—'}</span>
                    </div>
                    <div className="perfil-field">
                      <label>Nacionalidad</label>
                      <span>{perfil?.nacionalidad ?? '—'}</span>
                    </div>
                    <div className="perfil-field full">
                      <label>Dirección</label>
                      <span>{perfil?.direccion ?? '—'}</span>
                    </div>
                    <div className="perfil-field">
                      <label>Ciudad</label>
                      <span>{perfil?.ciudad ?? '—'}</span>
                    </div>
                    <div className="perfil-field">
                      <label>País</label>
                      <span>{perfil?.pais ?? '—'}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleAbrirEditar}
                    style={{ width: '100%', marginTop: 16, padding: '11px', borderRadius: 8, background: 'rgba(212,175,106,0.1)', border: '1px solid rgba(212,175,106,0.25)', fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d4af6a', cursor: 'pointer', transition: 'all 0.2s' }}>
                    Editar perfil
                  </button>
                  <button
                    onClick={() => { setModalCambioPass(true); setCpNueva(''); setCpConfirmar(''); setCpError(null); setCpExito(false) }}
                    style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    Cambiar contraseña
                  </button>
                </>
              ) : (
                <>
                  <div className="perfil-nombre" style={{ marginBottom: 20 }}>{perfil?.nombre_completo}</div>
                  {errorPerfil && (
                    <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.2)', borderRadius: 6, padding: '10px 14px', fontSize: '0.75rem', color: '#f08080', marginBottom: 14 }}>
                      {errorPerfil}
                    </div>
                  )}

                  {/* Sección: Datos personales */}
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#d4af6a', marginBottom: 10 }}>Datos personales</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>Nombre completo</label>
                      <input type="text" value={perfilForm.nombre}
                        onChange={(e) => setPerfilForm(p => ({ ...p, nombre: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: '#f0ece4', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>Teléfono</label>
                      <input type="tel" value={perfilForm.telefono}
                        onChange={(e) => setPerfilForm(p => ({ ...p, telefono: e.target.value }))}
                        placeholder="Ej. +591 70000000"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: '#f0ece4', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>Fecha de nacimiento</label>
                      <input type="date" value={perfilForm.fechaNacimiento}
                        onChange={(e) => setPerfilForm(p => ({ ...p, fechaNacimiento: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: perfilForm.fechaNacimiento ? '#f0ece4' : 'rgba(240,236,228,0.3)', outline: 'none', colorScheme: 'dark' }} />
                    </div>
                  </div>

                  {/* Sección: Documento de identidad */}
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#d4af6a', marginBottom: 10 }}>Documento de identidad</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>Tipo de documento</label>
                      <select value={perfilForm.tipoDocumento}
                        onChange={(e) => setPerfilForm(p => ({ ...p, tipoDocumento: e.target.value }))}
                        style={{ width: '100%', background: '#1a1a22', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: perfilForm.tipoDocumento ? '#f0ece4' : 'rgba(240,236,228,0.3)', outline: 'none', cursor: 'pointer' }}>
                        <option value="">Selecciona tipo</option>
                        <option value="CI">Cédula de Identidad (CI)</option>
                        <option value="Pasaporte">Pasaporte</option>
                        <option value="Carnet de Extranjería">Carnet de Extranjería</option>
                        <option value="DNI">DNI</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>Número de documento</label>
                      <input type="text" value={perfilForm.numeroDocumento}
                        onChange={(e) => setPerfilForm(p => ({ ...p, numeroDocumento: e.target.value }))}
                        placeholder="Ej. 12345678"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: '#f0ece4', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>Nacionalidad</label>
                      <input type="text" value={perfilForm.nacionalidad}
                        onChange={(e) => setPerfilForm(p => ({ ...p, nacionalidad: e.target.value }))}
                        placeholder="Ej. Boliviana"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: '#f0ece4', outline: 'none' }} />
                    </div>
                  </div>

                  {/* Sección: Ubicación */}
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#d4af6a', marginBottom: 10 }}>Ubicación</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>Dirección</label>
                      <input type="text" value={perfilForm.direccion}
                        onChange={(e) => setPerfilForm(p => ({ ...p, direccion: e.target.value }))}
                        placeholder="Ej. Av. Venezuela 123"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: '#f0ece4', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>País</label>
                      <select value={perfilForm.pais}
                        onChange={(e) => setPerfilForm(p => ({ ...p, pais: e.target.value }))}
                        style={{ width: '100%', background: '#1a1a22', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: perfilForm.pais ? '#f0ece4' : 'rgba(240,236,228,0.3)', outline: 'none', cursor: 'pointer' }}>
                        <option value="">Selecciona tu país</option>
                        {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>Ciudad</label>
                      <input type="text" value={perfilForm.ciudad}
                        onChange={(e) => setPerfilForm(p => ({ ...p, ciudad: e.target.value }))}
                        placeholder="Ej. Sucre"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: '#f0ece4', outline: 'none' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button
                      onClick={() => setEditandoPerfil(false)}
                      style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(240,236,228,0.4)', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarPerfil}
                      disabled={guardandoPerfil}
                      style={{ flex: 2, padding: '11px', borderRadius: 8, background: 'linear-gradient(135deg,#c9a84c,#d4af6a)', border: 'none', fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0a0a0a', cursor: 'pointer', opacity: guardandoPerfil ? 0.5 : 1 }}>
                      {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </>
              )}

              <button className="btn-logout-cli" onClick={handleCerrarSesion} style={{ marginTop: 20 }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        <footer className="cli-footer">
          <div className="cli-footer-logo">Grand Hôtel</div>
          <div className="cli-footer-text">
            © 2026 — Sistema integral de gestión de alojamiento hotelero
          </div>
        </footer>
      </div>

      {/* MODAL CAMBIO DE CONTRASEÑA */}
      {modalCambioPass && (
        <div className="modal-overlay" onClick={() => setModalCambioPass(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="m-title">Cambiar contraseña</h3>
              <button className="modal-close" onClick={() => setModalCambioPass(false)}>✕</button>
            </div>
            {cpExito ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>✅</div>
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.3rem', color: '#f0ece4', marginBottom: 8 }}>Contraseña actualizada</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(240,236,228,0.45)', marginBottom: 24 }}>Tu contraseña fue cambiada exitosamente.</div>
                <button className="btn-reservar" onClick={() => setModalCambioPass(false)}>Cerrar</button>
              </div>
            ) : (
              <form onSubmit={handleCambiarPassword} style={{ padding: '0 24px 24px' }}>
                {cpError && (
                  <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.2)', borderRadius: 6, padding: '10px 14px', fontSize: '0.75rem', color: '#f08080', marginBottom: 14 }}>
                    {cpError}
                  </div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.35)', marginBottom: 8 }}>Nueva contraseña</label>
                  <input
                    type="password"
                    value={cpNueva}
                    onChange={e => setCpNueva(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    required
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: '#f0ece4', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.35)', marginBottom: 8 }}>Confirmar contraseña</label>
                  <input
                    type="password"
                    value={cpConfirmar}
                    onChange={e => setCpConfirmar(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: '#f0ece4', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {cpConfirmar && cpNueva !== cpConfirmar && (
                    <div style={{ fontSize: '0.65rem', color: '#f08080', marginTop: 5 }}>Las contraseñas no coinciden</div>
                  )}
                  {cpConfirmar && cpNueva === cpConfirmar && cpNueva.length >= 8 && (
                    <div style={{ fontSize: '0.65rem', color: '#6ecf9a', marginTop: 5 }}>✓ Las contraseñas coinciden</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn-cancelar-res" style={{ flex: 1 }} onClick={() => setModalCambioPass(false)}>Cancelar</button>
                  <button type="submit" className="btn-reservar" style={{ flex: 2 }} disabled={cpCargando}>
                    {cpCargando ? 'Actualizando...' : 'Actualizar contraseña'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PANEL NOTIFICACIONES */}
      {notifAbiertas && (
        <div>
          <div className="notif-overlay" onClick={() => setNotifAbiertas(false)} />
          <div className="notif-panel">
            <div className="notif-panel-header">
              <div className="notif-panel-titulo">Notificaciones</div>
              <div className="notif-panel-close" onClick={() => setNotifAbiertas(false)}>✕</div>
            </div>
            <div className="notif-panel-body">
              {notificaciones.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(240,236,228,0.2)', fontSize: '0.8rem' }}>
                  Sin notificaciones
                </div>
              ) : (
                notificaciones.map((n) => (
                  <div key={n.id}
                    className={`notif-item ${n.leida ? 'leida' : 'no-leida'}`}
                    onClick={() => !n.leida && handleMarcarLeida(n.id)}>
                    <div className="notif-icon">{tipoNotifIcon[n.tipo] ?? '🔔'}</div>
                    <div style={{ flex: 1 }}>
                      <div className="notif-titulo">{n.titulo}</div>
                      <div className="notif-msg">{n.mensaje}</div>
                      <div className="notif-fecha">
                        {n.created_at
                          ? new Date(n.created_at).toLocaleString('es-BO')
                          : '—'}
                      </div>
                    </div>
                    {!n.leida && <div className="notif-dot" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRE CHECK-IN */}
      {modalPreCheckin && (
        <div>
          <div className="notif-overlay" onClick={() => { setModalPreCheckin(null); setPcExito(false) }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#13131a', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 16, padding: '32px', width: '90%', maxWidth: 440, zIndex: 200, fontFamily: 'Montserrat,sans-serif' }}>
            {pcExito ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.4rem', color: '#f0ece4', marginBottom: 8 }}>Pre check-in enviado</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(240,236,228,0.4)', marginBottom: 24 }}>
                  El hotel ha sido notificado de tu llegada estimada.
                </div>
                <button onClick={() => { setModalPreCheckin(null); setPcExito(false) }}
                  style={{ padding: '10px 28px', background: 'linear-gradient(135deg,#c9a84c,#d4af6a)', border: 'none', borderRadius: 8, fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0a0a0a', cursor: 'pointer' }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#d4af6a', marginBottom: 6 }}>Operaciones</div>
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.5rem', color: '#f0ece4', marginBottom: 20 }}>Pre check-in en línea</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>
                    Hora estimada de llegada (opcional)
                  </label>
                  <input type="time" value={pcHora} onChange={e => setPcHora(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.82rem', color: '#f0ece4', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 6 }}>
                    Observaciones (opcional)
                  </label>
                  <textarea value={pcObs} onChange={e => setPcObs(e.target.value)} rows={3}
                    placeholder="Solicitudes especiales, alergias, etc."
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 6, padding: '10px 14px', fontFamily: 'Montserrat,sans-serif', fontSize: '0.78rem', color: '#f0ece4', outline: 'none', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setModalPreCheckin(null)}
                    style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(240,236,228,0.4)', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleEnviarPreCheckin} disabled={pcEnviando}
                    style={{ flex: 2, padding: '11px', borderRadius: 8, background: 'linear-gradient(135deg,#c9a84c,#d4af6a)', border: 'none', fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0a0a0a', cursor: 'pointer', opacity: pcEnviando ? 0.5 : 1 }}>
                    {pcEnviando ? 'Enviando...' : 'Confirmar llegada'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* MODAL MODIFICAR FECHAS */}
      {modalModFechas && (
        <div className="m-overlay" onClick={() => !modEnviando && !modExito && setModalModFechas(null)}>
          <div className="m-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            {modExito && modConfirmado ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>✅</div>
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.2rem', color: '#d4af6a', marginBottom: 8 }}>
                  Fechas actualizadas
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(240,236,228,0.5)', fontFamily: 'Montserrat,sans-serif', marginBottom: 6 }}>
                  {modFechaEntrada} → {modFechaSalida}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f0ece4', fontFamily: 'Montserrat,sans-serif', marginBottom: 24 }}>
                  {modConfirmado.noches} noche{modConfirmado.noches !== 1 ? 's' : ''} · Bs. {modConfirmado.nuevo_total.toFixed(2)}
                </div>
                <button className="btn-reservar" onClick={() => setModalModFechas(null)}>Cerrar</button>
              </div>
            ) : (
              <>
                <h3 className="m-title">Modificar fechas</h3>
                <div style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.35)', fontFamily: 'Montserrat,sans-serif', marginBottom: 20 }}>
                  Reserva #{modalModFechas.codigo} · {modalModFechas.tipo}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(240,236,228,0.3)', fontFamily: 'Montserrat,sans-serif', marginBottom: 6 }}>Fechas actuales</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(240,236,228,0.6)', fontFamily: 'Montserrat,sans-serif' }}>
                    {modalModFechas.fechaEntrada} → {modalModFechas.fechaSalida}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div>
                    <div className="m-label" style={{ marginBottom: 6 }}>Nueva fecha entrada</div>
                    <input type="date" className="m-input"
                      value={modFechaEntrada}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => { setModFechaEntrada(e.target.value); setModConfirmado(null); setModError(null) }} />
                  </div>
                  <div>
                    <div className="m-label" style={{ marginBottom: 6 }}>Nueva fecha salida</div>
                    <input type="date" className="m-input"
                      value={modFechaSalida}
                      min={modFechaEntrada || new Date().toISOString().split('T')[0]}
                      onChange={e => { setModFechaSalida(e.target.value); setModConfirmado(null); setModError(null) }} />
                  </div>
                </div>

                {modFechaEntrada && modFechaSalida && modFechaSalida > modFechaEntrada && (
                  <div style={{ background: 'rgba(100,160,255,0.06)', border: '1px solid rgba(100,160,255,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.72rem', color: '#7eb8ff', fontFamily: 'Montserrat,sans-serif' }}>
                    {Math.ceil((new Date(modFechaSalida).getTime() - new Date(modFechaEntrada).getTime()) / 86400000)} noche{Math.ceil((new Date(modFechaSalida).getTime() - new Date(modFechaEntrada).getTime()) / 86400000) !== 1 ? 's' : ''} seleccionadas
                  </div>
                )}

                {modError && <div className="m-err" style={{ marginBottom: 12 }}>{modError}</div>}

                <div style={{ fontSize: '0.65rem', color: 'rgba(240,236,228,0.25)', fontFamily: 'Montserrat,sans-serif', marginBottom: 16, lineHeight: 1.6 }}>
                  El total se recalculará según el precio por noche de la habitación. El cambio es inmediato si la habitación está disponible.
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn-cancelar" onClick={() => setModalModFechas(null)} disabled={modEnviando}>
                    Cancelar
                  </button>
                  <button className="btn-reservar" onClick={handleConfirmarModFechas}
                    disabled={modEnviando || !modFechaEntrada || !modFechaSalida || modFechaSalida <= modFechaEntrada}
                    style={{ opacity: (!modFechaEntrada || !modFechaSalida || modFechaSalida <= modFechaEntrada) ? 0.5 : 1 }}>
                    {modEnviando ? 'Verificando...' : 'Confirmar cambio'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL RESEÑA */}
      {modalResena && (
        <div className="m-overlay" onClick={() => !resenaEnviando && setModalResena(null)}>
          <div className="m-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {resenaExito ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌟</div>
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.2rem', color: '#d4af6a', marginBottom: 8 }}>¡Gracias por tu reseña!</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(240,236,228,0.5)', fontFamily: 'Montserrat,sans-serif', marginBottom: 24 }}>
                  Tu opinión ayuda a otros viajeros a elegir su estadía ideal.
                </div>
                <button className="btn-reservar" onClick={() => setModalResena(null)}>Cerrar</button>
              </div>
            ) : (
              <>
                <h3 className="m-title">Calificar estadía</h3>
                <div style={{ fontSize: '0.7rem', color: 'rgba(240,236,228,0.35)', fontFamily: 'Montserrat,sans-serif', marginBottom: 20 }}>
                  Reserva #{modalResena.codigo}
                </div>

                {/* Calificación general */}
                <div style={{ marginBottom: 20 }}>
                  <div className="m-label" style={{ marginBottom: 8 }}>Calificación general</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} onClick={() => setResenaCal(s)}
                        style={{ cursor: 'pointer', fontSize: '1.8rem', color: s <= resenaCal ? '#d4af6a' : 'rgba(255,255,255,0.12)', transition: 'color 0.15s' }}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sub-calificaciones */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 20 }}>
                  {([
                    ['Limpieza', resenaCalLimpieza, setResenaCalLimpieza],
                    ['Atención', resenaCalAtencion, setResenaCalAtencion],
                    ['Ubicación', resenaCalUbicacion, setResenaCalUbicacion],
                    ['Precio/valor', resenaCalPrecio, setResenaCalPrecio],
                  ] as [string, number, React.Dispatch<React.SetStateAction<number>>][]).map(([label, val, set]) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(240,236,228,0.4)', fontFamily: 'Montserrat,sans-serif', marginBottom: 4 }}>{label}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} onClick={() => set(prev => prev === s ? 0 : s)}
                            style={{ cursor: 'pointer', fontSize: '1rem', color: s <= val ? '#d4af6a' : 'rgba(255,255,255,0.1)', transition: 'color 0.15s' }}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Título */}
                <div style={{ marginBottom: 12 }}>
                  <div className="m-label" style={{ marginBottom: 6 }}>Título (opcional)</div>
                  <input className="m-input" value={resenaTitulo}
                    onChange={e => setResenaTitulo(e.target.value)}
                    placeholder="Resumen de tu experiencia..." maxLength={100} />
                </div>

                {/* Comentario */}
                <div style={{ marginBottom: 16 }}>
                  <div className="m-label" style={{ marginBottom: 6 }}>Comentario (opcional)</div>
                  <textarea className="m-textarea" rows={3} value={resenaComentario}
                    onChange={e => setResenaComentario(e.target.value)}
                    placeholder="Cuéntanos más sobre tu estadía..." maxLength={600}
                    style={{ resize: 'vertical' }} />
                  <div style={{ fontSize: '0.6rem', color: 'rgba(240,236,228,0.2)', textAlign: 'right', fontFamily: 'Montserrat,sans-serif', marginTop: 3 }}>
                    {resenaComentario.length}/600
                  </div>
                </div>

                {/* Foto */}
                <div style={{ marginBottom: 20 }}>
                  <div className="m-label" style={{ marginBottom: 8 }}>Foto de tu estadía (opcional)</div>
                  <input type="file" accept="image/*" ref={resenaFotoRef} style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setResenaFoto(f)
                      setResenaFotoPreview(URL.createObjectURL(f))
                    }} />
                  {resenaFotoPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ position: 'relative', width: 120, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={resenaFotoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.5)', fontFamily: 'Montserrat,sans-serif' }}>
                          {resenaFoto?.name}
                        </div>
                        <button onClick={() => { setResenaFoto(null); setResenaFotoPreview(null); if (resenaFotoRef.current) resenaFotoRef.current.value = '' }}
                          style={{ background: 'rgba(220,80,80,0.1)', border: '1px solid rgba(220,80,80,0.2)', color: '#e05252', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'Montserrat,sans-serif', width: 'fit-content' }}>
                          Quitar foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => resenaFotoRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(212,175,106,0.2)', borderRadius: 8, padding: '12px 18px', color: 'rgba(240,236,228,0.4)', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', width: '100%', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,175,106,0.4)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(212,175,106,0.2)')}>
                      <span style={{ fontSize: '1.1rem' }}>📷</span>
                      Subir foto de tu estadía
                    </button>
                  )}
                </div>

                {resenaError && <div className="m-err" style={{ marginBottom: 12 }}>{resenaError}</div>}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn-cancelar" onClick={() => setModalResena(null)} disabled={resenaEnviando}>Cancelar</button>
                  <button className="btn-reservar" onClick={handleEnviarResena}
                    disabled={resenaEnviando || resenaCal === 0}
                    style={{ opacity: resenaCal === 0 ? 0.5 : 1 }}>
                    {resenaEnviando ? 'Enviando...' : 'Publicar reseña'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL CANCELACIÓN NORMAL */}
      {modalCancelar && (
        <div className="m-overlay">
          <div className="m-box">
            {cancelExito ? (
              <div className="m-ok">
                <div className="m-ok-icon">✅</div>
                <div className="m-ok-title">Reserva cancelada</div>
                <div className="m-ok-text">Tu reserva <strong style={{ color: '#d4af6a' }}>{modalCancelar.codigo}</strong> ha sido cancelada correctamente.</div>
                <button className="m-btn-cancel" style={{ width: '100%' }} onClick={() => setModalCancelar(null)}>Cerrar</button>
              </div>
            ) : (
              <>
                <div className="m-title">Cancelar reserva</div>
                <div className="m-sub">
                  Código: <strong style={{ color: '#d4af6a' }}>{modalCancelar.codigo}</strong><br />
                  Esta acción no puede deshacerse. El hotel procesará el reembolso del anticipo según las políticas vigentes.
                </div>
                <label className="m-label">Motivo de cancelación <span style={{ color: '#e05252' }}>*</span></label>
                <textarea className="m-textarea"
                  value={cancelMotivo}
                  onChange={e => setCancelMotivo(e.target.value)}
                  placeholder="Describe brevemente el motivo de tu cancelación..."
                />
                {cancelError && <div className="m-err">{cancelError}</div>}
                <div className="m-btns">
                  <button className="m-btn-cancel" onClick={() => setModalCancelar(null)}>Volver</button>
                  <button className="m-btn-danger"
                    disabled={cancelando || !cancelMotivo.trim()}
                    onClick={handleCancelarReserva}>
                    {cancelando ? 'Cancelando...' : 'Sí, cancelar reserva'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL CANCELACIÓN DE EMERGENCIA */}
      {modalEmergencia && (
        <div className="m-overlay">
          <div className="m-box">
            {emerExito ? (
              <div className="m-ok">
                <div className="m-ok-icon">📨</div>
                <div className="m-ok-title">Solicitud enviada</div>
                <div className="m-ok-text">
                  Tu solicitud de cancelación por emergencia fue enviada al gerente. Te contactaremos a la brevedad para resolver tu caso.
                </div>
                <button className="m-btn-cancel" style={{ width: '100%' }} onClick={() => setModalEmergencia(null)}>Cerrar</button>
              </div>
            ) : (
              <>
                <div className="m-title">Solicitud de emergencia</div>
                <div className="m-warn">
                  ⚠️ Tu check-in es en menos de 7 días, por lo que no es posible cancelar directamente.
                  Puedes enviar una solicitud al gerente con un comprobante que justifique la emergencia.
                  La aprobación queda a criterio del hotel.
                </div>
                <label className="m-label">Reserva</label>
                <div style={{ fontSize: '0.8rem', color: '#d4af6a', marginBottom: 14, padding: '6px 10px', background: 'rgba(212,175,106,0.07)', borderRadius: 6, display: 'inline-block' }}>
                  {modalEmergencia.codigo}
                </div>
                <label className="m-label">Describe tu situación <span style={{ color: '#e05252' }}>*</span></label>
                <textarea className="m-textarea"
                  value={emerMotivo}
                  onChange={e => setEmerMotivo(e.target.value)}
                  placeholder="Explica detalladamente la emergencia o situación que motiva esta solicitud..."
                />
                <label className="m-label" style={{ marginTop: 14 }}>Comprobante (opcional pero recomendado)</label>
                <div className="m-file-btn" onClick={() => emerFileRef.current?.click()}>
                  <span className="m-file-ico">📎</span>
                  <span className="m-file-text">Adjuntar documento o imagen (PDF, JPG, PNG)</span>
                </div>
                <input ref={emerFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                  onChange={e => setEmerFile(e.target.files?.[0] ?? null)} />
                {emerFile && <div className="m-file-sel">✓ {emerFile.name}</div>}
                {emerError && <div className="m-err">{emerError}</div>}
                <div className="m-btns">
                  <button className="m-btn-cancel" onClick={() => setModalEmergencia(null)}>Cancelar</button>
                  <button className="m-btn-gold"
                    disabled={emerEnviando || !emerMotivo.trim()}
                    onClick={handleEnviarEmergencia}>
                    {emerEnviando ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default InicioCliente
