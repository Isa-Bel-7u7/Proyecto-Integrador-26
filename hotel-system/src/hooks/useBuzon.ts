// ============================================================
// PRINCIPIO SRP (Single Responsibility Principle)
// Este custom hook tiene UNA sola responsabilidad: manejar
// el estado y la coordinación asíncrona del módulo Buzón.
// No contiene JSX, no define estilos, no accede directamente
// a la base de datos. Solo orquesta estado de UI + llama al
// servicio correspondiente.
//
// PRINCIPIO DIP (Dependency Inversion Principle)
// El hook depende de la ABSTRACCIÓN buzonService (funciones
// importadas como interfaz de servicio), no de la implementación
// concreta de Supabase. Si el backend cambiara, solo cambia
// el servicio, no este hook.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import type { MensajeBuzon } from '../interfaces'
// DIP: dependemos de la capa de servicio, no de supabase directamente
import { filtrarMensajesBuzon, guardarRespuestaBuzon, obtenerMensajesBuzon } from '../services/buzonService'

export const useBuzon = () => {
  // SRP: todo el estado del buzón en un solo lugar, separado de la vista
  const [mensajes, setMensajes] = useState<MensajeBuzon[]>([])
  const [cargando, setCargando] = useState(true)
  const [seleccionado, setSeleccionado] = useState<MensajeBuzon | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [buscar, setBuscar] = useState('')

  const cargar = async () => {
    try {
      setCargando(true)
      // DIP: llama al servicio abstracto, no a supabase.from() directamente
      setMensajes(await obtenerMensajesBuzon())
    } catch (error) {
      console.error(error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { void cargar() }, [])

  const abrirMensaje = (mensaje: MensajeBuzon) => {
    setSeleccionado(mensaje)
    setRespuesta(mensaje.respuesta ?? '')
    setNuevoEstado(mensaje.estado === 'nuevo' ? 'en_revision' : mensaje.estado)
  }
  const cerrarMensaje = () => setSeleccionado(null)
  const enviarRespuesta = async () => {
    if (!seleccionado) return
    setGuardando(true)
    try {
      await guardarRespuestaBuzon(seleccionado.id, respuesta, nuevoEstado)
      cerrarMensaje()
      await cargar()
    } catch (error) {
      console.error(error)
    } finally {
      setGuardando(false)
    }
  }

  // DRY: el filtrado está definido una sola vez en buzonService.filtrarMensajesBuzon,
  // no duplicado aquí ni en el componente Buzon.tsx
  const filtrados = useMemo(
    () => filtrarMensajesBuzon(mensajes, filtroTipo, filtroEstado, buscar),
    [mensajes, filtroTipo, filtroEstado, buscar],
  )

  return {
    mensajes, cargando, seleccionado, respuesta, nuevoEstado, guardando,
    filtroTipo, filtroEstado, buscar, filtrados,
    setRespuesta, setNuevoEstado, setFiltroTipo, setFiltroEstado, setBuscar,
    abrirMensaje, cerrarMensaje, enviarRespuesta,
  }
}
