// ============================================================
// PRINCIPIO SRP (Single Responsibility Principle)
// Este servicio tiene UNA sola responsabilidad: encapsular
// las operaciones de datos del módulo Buzón. No maneja estado
// de React, no renderiza UI, no conoce el contexto de autenticación.
//
// PRINCIPIO DIP (Dependency Inversion Principle)
// Depende de hotelRepository (abstracción), no de Supabase
// directamente. El hook useBuzon tampoco llama a Supabase:
// depende de este servicio como capa intermedia.
//
// PRINCIPIO DRY (Don't Repeat Yourself)
// filtrarMensajesBuzon centraliza la lógica de filtrado.
// Ni el hook ni el componente repiten esta lógica.
// ============================================================
import type { MensajeBuzon } from '../interfaces'
// DIP: dependemos del repositorio abstracto, no de supabase directamente
import { getBuzonMensajes, responderBuzon } from '../repositories/hotelRepository'

// SRP: función dedicada exclusivamente a obtener mensajes
export const obtenerMensajesBuzon = (): Promise<MensajeBuzon[]> => getBuzonMensajes()

// SRP: función dedicada exclusivamente a guardar una respuesta
export const guardarRespuestaBuzon = (mensajeId: string, respuesta: string, estado: string) =>
  responderBuzon(mensajeId, respuesta, estado)

// DRY: lógica de filtrado definida una sola vez, reutilizada desde useBuzon.ts
export const filtrarMensajesBuzon = (
  mensajes: MensajeBuzon[], tipo: string, estado: string, busqueda: string,
) => {
  const termino = busqueda.toLowerCase()
  return mensajes.filter((mensaje) =>
    (tipo === 'todos' || mensaje.tipo === tipo) &&
    (estado === 'todos' || mensaje.estado === estado) &&
    (!termino || mensaje.asunto.toLowerCase().includes(termino) || mensaje.mensaje.toLowerCase().includes(termino)),
  )
}
