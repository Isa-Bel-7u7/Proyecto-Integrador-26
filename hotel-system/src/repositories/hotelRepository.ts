import { supabase } from '../services/supabase'
import type { MensajeBuzon } from '../interfaces'

// ── DASHBOARD ─────────────────────────────────────
export const getResumenAdmin = async () => {
  const { data, error } = await supabase.rpc('rpc_resumen_admin')
  if (error) throw error
  return data?.[0] ?? null
}

// ── PAGOS ─────────────────────────────────────────
export type ReservaPago = {
  reserva_id: string; codigo_reserva: string
  fecha_entrada: string; fecha_salida: string
  estado_reserva: string; total_estimado: number
  cliente_nombre: string; habitacion_numero: string | null
  tipo_habitacion: string | null
  total_pagado: number; saldo_pendiente: number
  ultimo_pago: string | null
  estado_pago: 'sin_pago' | 'parcial' | 'pagado'
}
export type PagoHistorial = {
  id: string; monto: number; tipo_pago: string; estado: string
  metodo_nombre: string | null; fecha_pago: string
  observaciones: string | null; referencia: string | null
  registrado_por: string | null
}
export type StatsPagos = {
  hoy_total: number; mes_total: number; pagos_hoy: number; pendientes: number
}

export const getResumenPagos = async (): Promise<StatsPagos> => {
  const { data, error } = await supabase.rpc('rpc_get_resumen_pagos')
  if (error) throw error
  return (data as StatsPagos[])?.[0] ?? { hoy_total: 0, mes_total: 0, pagos_hoy: 0, pendientes: 0 }
}

export const getReservasConPagos = async (): Promise<ReservaPago[]> => {
  const { data, error } = await supabase.rpc('rpc_get_reservas_con_pagos')
  if (error) throw error
  return (data as ReservaPago[]) ?? []
}

export const getHistorialPagos = async (reservaId: string): Promise<PagoHistorial[]> => {
  const { data, error } = await supabase.rpc('rpc_get_historial_pagos', { p_reserva_id: reservaId })
  if (error) throw error
  return (data as PagoHistorial[]) ?? []
}

// ── RESERVAS ──────────────────────────────────────
export const getReservas = async () => {
  const { data, error } = await supabase
    .from('vista_resumen_reservas')
    .select('*')
    .order('fecha_entrada', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const confirmarReserva = async (reservaId: string) => {
  const { data, error } = await supabase
    .from('reservas')
    .update({ estado: 'confirmada' })
    .eq('id', reservaId)
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

export const cancelarReserva = async (reservaId: string, motivo: string) => {
  const { data, error } = await supabase.rpc('rpc_cancelar_reserva', {
    p_reserva_id: reservaId,
    p_motivo: motivo,
  })
  if (error) throw error
  return data?.[0] ?? null
}

// ── HABITACIONES ──────────────────────────────────
export const getHabitaciones = async () => {
  const [habsRes, tiposRes] = await Promise.all([
    supabase.from('habitaciones').select('*').order('numero'),
    supabase.from('tipos_habitacion').select('id, nombre, capacidad_adultos, capacidad_ninos, numero_camas, tipo_cama, descripcion'),
  ])
  if (habsRes.error) throw habsRes.error
  if (tiposRes.error) throw tiposRes.error

  const tiposMap: Record<string, typeof tiposRes.data[0]> = {}
  for (const tipo of tiposRes.data ?? []) {
    tiposMap[tipo.id] = tipo
  }

  return (habsRes.data ?? []).map((h) => ({
    ...h,
    tipos_habitacion: tiposMap[h.tipo_habitacion_id] ?? null,
  }))
}

export const actualizarEstadoHabitacion = async (
  habitacionId: string,
  estado: string,
  motivo?: string
): Promise<void> => {
  const { error } = await supabase.rpc('rpc_actualizar_estado_habitacion', {
    p_habitacion_id: habitacionId,
    p_estado: estado,
    p_motivo: motivo ?? null,
  })
  if (error) throw new Error(error.message)
}

export const actualizarHabitacion = async (params: {
  habitacionId: string; numero: string; piso: number; tipoHabitacionId: string
  descripcion?: string; disponibleOnline?: boolean; amenidades?: string[]; observaciones?: string
}): Promise<void> => {
  const { error } = await supabase.rpc('rpc_actualizar_habitacion', {
    p_habitacion_id: params.habitacionId,
    p_numero: params.numero,
    p_piso: params.piso,
    p_tipo_habitacion_id: params.tipoHabitacionId,
    p_descripcion: params.descripcion ?? null,
    p_disponible_online: params.disponibleOnline ?? true,
    p_amenidades: params.amenidades ?? [],
    p_observaciones: params.observaciones ?? null,
  })
  if (error) throw new Error(error.message)
}

export const getProximasReservasHabitacion = async (
  habitacionId: string
): Promise<{ codigo_reserva: string; cliente_nombre: string; fecha_entrada: string; fecha_salida: string; estado: string }[]> => {
  const { data, error } = await supabase.rpc('rpc_get_proximas_reservas_habitacion', {
    p_habitacion_id: habitacionId,
  })
  if (error) throw new Error(error.message)
  return (data as unknown[]) as { codigo_reserva: string; cliente_nombre: string; fecha_entrada: string; fecha_salida: string; estado: string }[]
}

// ── FOTOS HABITACIÓN ──────────────────────────────
export type FotoHab = {
  id: string; storage_path: string; url: string
  tipo: 'imagen' | 'video'; titulo: string | null; orden: number
}

export const getFotosHabitacion = async (habitacionId: string): Promise<FotoHab[]> => {
  const { data, error } = await supabase.rpc('rpc_get_fotos_habitacion', {
    p_habitacion_id: habitacionId,
  })
  if (error) throw new Error(error.message)
  return (data as FotoHab[]) ?? []
}

export const subirFotoHabitacion = async (habitacionId: string, file: File): Promise<void> => {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${habitacionId}/${Date.now()}.${ext}`
  const tipo = file.type.startsWith('video') ? 'video' : 'imagen'

  const { error: uploadErr } = await supabase.storage
    .from('habitaciones')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (uploadErr) throw new Error(uploadErr.message)

  const { data: { publicUrl } } = supabase.storage.from('habitaciones').getPublicUrl(path)

  const { error: dbErr } = await supabase.rpc('rpc_agregar_foto_habitacion', {
    p_habitacion_id: habitacionId,
    p_storage_path: path,
    p_url: publicUrl,
    p_tipo: tipo,
    p_titulo: null,
  })
  if (dbErr) throw new Error(dbErr.message)
}

export const eliminarFotoHabitacion = async (fotoId: string, storagePath: string): Promise<void> => {
  await supabase.rpc('rpc_eliminar_foto_habitacion', { p_foto_id: fotoId })
  await supabase.storage.from('habitaciones').remove([storagePath])
}

export type Portada = { habitacion_id: string; url: string; tipo: 'imagen' | 'video' }

export const getPortadasHabitaciones = async (): Promise<Portada[]> => {
  const { data, error } = await supabase.rpc('rpc_get_portadas_habitaciones')
  if (error) throw new Error(error.message)
  return (data as Portada[]) ?? []
}

export const getHabitacionesDisponibles = async (
  fechaEntrada: string,
  fechaSalida: string
) => {
  const { data, error } = await supabase.rpc('rpc_habitaciones_disponibles', {
    p_fecha_entrada: fechaEntrada,
    p_fecha_salida: fechaSalida,
  })
  if (error) throw error
  return data ?? []
}

export const getReservasParaCheckin = async () => {
  const { data, error } = await supabase.rpc('rpc_get_reservas_para_checkin')
  if (error) throw error
  return (data as unknown[]) ?? []
}

export const getPersonalActual = async () => {
  const { data, error } = await supabase.rpc('rpc_get_personal_activo')
  if (error) throw error
  return (data as unknown[]) ?? []
}

export const registrarCheckin = async (params: {
  reservaId: string
  observaciones?: string
}): Promise<void> => {
  const { error } = await supabase.rpc('rpc_registrar_checkin', {
    p_reserva_id: params.reservaId,
    p_observaciones: params.observaciones ?? null,
  })
  if (error) throw new Error(error.message)
}

export const cambiarHabitacionReserva = async (
  reservaId: string,
  nuevaHabitacionId: string
): Promise<{ total_estimado: number }> => {
  const { data, error } = await supabase.rpc('rpc_cambiar_habitacion_reserva', {
    p_reserva_id: reservaId,
    p_nueva_habitacion_id: nuevaHabitacionId,
  })
  if (error) throw new Error(error.message)
  return data as { total_estimado: number }
}

// ── CHECK-OUT ─────────────────────────────────────
export const getReservasEnEstadia = async () => {
  const { data, error } = await supabase.rpc('rpc_get_reservas_en_estadia')
  if (error) throw error
  return (data as unknown[]) ?? []
}

export const getMetodosPago = async (): Promise<{ id: string; nombre: string }[]> => {
  const { data, error } = await supabase.from('metodos_pago').select('id, nombre').eq('activo', true).order('nombre')
  if (error) throw error
  return (data ?? []) as { id: string; nombre: string }[]
}

export const registrarPagoReserva = async (
  reservaId: string, monto: number, metodoPagoId: string, tipoPago = 'anticipo'
): Promise<void> => {
  const { error } = await supabase.rpc('rpc_registrar_pago_reserva', {
    p_reserva_id: reservaId, p_monto: monto,
    p_metodo_pago_id: metodoPagoId, p_tipo_pago: tipoPago,
  })
  if (error) throw new Error(error.message)
}

export const getUltimaReservaCliente = async (clienteId: string): Promise<{ id: string; total_estimado: number } | null> => {
  const { data, error } = await supabase.rpc('rpc_get_ultima_reserva_cliente', { p_cliente_id: clienteId })
  if (error) throw new Error(error.message)
  return data as { id: string; total_estimado: number } | null
}

export const registrarCheckout = async (params: {
  reservaId: string
  checkinId: string | null
  cargosExtra?: number
  descuento?: number
  observaciones?: string
}): Promise<void> => {
  const { error } = await supabase.rpc('rpc_registrar_checkout', {
    p_reserva_id: params.reservaId,
    p_checkin_id: params.checkinId,
    p_cargos_extra: params.cargosExtra ?? 0,
    p_descuento: params.descuento ?? 0,
    p_observaciones: params.observaciones ?? null,
  })
  if (error) throw new Error(error.message)
}

// ── HOUSEKEEPING ──────────────────────────────────
export const getTareasHousekeeping = async () => {
  const { data, error } = await supabase.rpc('rpc_tareas_housekeeping')
  if (error) throw error
  return data ?? []
}

export const crearTareaHousekeeping = async (params: {
  habitacionId: string
  personalId: string
  prioridad: string
  observaciones?: string
}) => {
  const { data, error } = await supabase
    .from('housekeeping')
    .insert({
      habitacion_id: params.habitacionId,
      personal_id: params.personalId,
      prioridad: params.prioridad,
      estado: 'pendiente',
      observaciones: params.observaciones ?? null,
    })
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

export const actualizarHousekeeping = async (
  housekeepingId: string,
  estado: string,
  observaciones?: string
) => {
  const { data, error } = await supabase.rpc('rpc_actualizar_housekeeping', {
    p_housekeeping_id: housekeepingId,
    p_estado: estado,
    p_observaciones: observaciones ?? null,
  })
  if (error) throw error
  return data?.[0] ?? null
}

// ── PAGOS ─────────────────────────────────────────
export const getPagos = async () => {
  const { data, error } = await supabase
    .from('pagos')
    .select(`
      id, monto, moneda, tipo_pago, estado,
      referencia, fecha_pago, observaciones,
      reservas (
        id, codigo_reserva,
        clientes ( usuarios ( nombre_completo ) )
      ),
      metodos_pago ( nombre )
    `)
    .order('fecha_pago', { ascending: false })
  if (error) throw error
  return data ?? []
}


export const getReservasConSaldo = async () => {
  const { data, error } = await supabase
    .from('reservas')
    .select(`
      id, codigo_reserva, total_estimado,
      clientes ( usuarios ( nombre_completo ) )
    `)
    .in('estado', ['pendiente', 'confirmada', 'en_estadia'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const registrarPago = async (params: {
  reservaId: string
  metodoPagoId: string
  monto: number
  tipoPago: string
  referencia?: string
  observaciones?: string
}) => {
  const { data, error } = await supabase.rpc('rpc_registrar_pago', {
    p_reserva_id: params.reservaId,
    p_metodo_pago_id: params.metodoPagoId,
    p_monto: params.monto,
    p_tipo: params.tipoPago,
    p_referencia: params.referencia ?? null,
    p_notas: params.observaciones ?? null,
  })
  if (error) throw error
  return data?.[0] ?? null
}

// ── INCIDENCIAS ───────────────────────────────────
export const getIncidencias = async () => {
  const { data, error } = await supabase.rpc('rpc_get_incidencias')
  if (error) throw new Error(error.message)
  return (data as unknown[]) ?? []
}

export const crearIncidencia = async (params: {
  habitacionId?: string
  reservaId?: string
  tipo: string
  titulo: string
  descripcion: string
  prioridad: string
  reportadoPor: string
}) => {
  const { data, error } = await supabase
    .from('incidencias')
    .insert({
      habitacion_id: params.habitacionId ?? null,
      reserva_id: params.reservaId ?? null,
      reportado_por: params.reportadoPor,
      tipo: params.tipo,
      titulo: params.titulo,
      descripcion: params.descripcion,
      prioridad: params.prioridad,
      estado: 'abierta',
    })
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

export const actualizarIncidencia = async (
  incidenciaId: string,
  estado: string,
  solucion?: string
) => {
  const updates: Record<string, unknown> = { estado }
  if (solucion) updates.solucion = solucion
  if (['resuelta', 'cerrada'].includes(estado)) {
    updates.fecha_cierre = new Date().toISOString()
  }
  const { data, error } = await supabase
    .from('incidencias')
    .update(updates)
    .eq('id', incidenciaId)
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

// ── AUDITORÍA ─────────────────────────────────────
export const getAuditoria = async () => {
  const { data, error } = await supabase
    .from('auditoria')
    .select(`
      id, accion, tabla_afectada, descripcion,
      ip_origen, created_at,
      usuarios ( nombre_completo )
    `)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data ?? []
}

// ── CLIENTE ───────────────────────────────────────
export const getMisReservas = async () => {
  const { data, error } = await supabase.rpc('rpc_mis_reservas')
  if (error) throw error
  return data ?? []
}

export const getMisNotificaciones = async () => {
  // RLS en notificaciones filtra automáticamente por el usuario autenticado
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, titulo, mensaje, tipo, leida, created_at')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data ?? []
}

export const marcarNotificacionLeida = async (id: string) => {
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id)
  if (error) throw error
}

export const crearReservaCliente = async (params: {
  clienteId: string
  habitacionId: string
  fechaEntrada: string
  fechaSalida: string
  cantidadAdultos: number
  cantidadNinos: number
  origen: string
  observaciones?: string
}) => {
  const { data, error } = await supabase.rpc('rpc_crear_reserva_cliente', {
    p_cliente_id: params.clienteId,
    p_habitacion_id: params.habitacionId,
    p_fecha_entrada: params.fechaEntrada,
    p_fecha_salida: params.fechaSalida,
    p_cantidad_adultos: params.cantidadAdultos,
    p_cantidad_ninos: params.cantidadNinos,
    p_origen: params.origen,
    p_observaciones: params.observaciones ?? null,
  })
  if (error) throw error
  return data?.[0] ?? null
}

export const getHabitacionesCliente = async () => {
  const { data, error } = await supabase
    .from('vista_habitaciones_disponibles')
    .select('*')
  if (error) throw error
  return data ?? []
}

// ── REPORTES ──────────────────────────────────────
export const getReportesResumen = async () => {
  const [reservasRes, pagosRes, habitacionesRes, incidenciasRes] = await Promise.all([
    supabase.from('reservas').select('id, estado, created_at, total_estimado'),
    supabase.from('pagos').select('id, monto, estado, fecha_pago, metodos_pago(nombre)'),
    supabase.from('habitaciones').select('id, estado, tipo_habitacion_id'),
    supabase.from('incidencias').select('id, estado, categoria, prioridad'),
  ])

  return {
    reservas: reservasRes.data ?? [],
    pagos: pagosRes.data ?? [],
    habitaciones: habitacionesRes.data ?? [],
    incidencias: incidenciasRes.data ?? [],
  }
}

export type TopHabitacion = {
  numero: string
  tipo: string
  total_reservas: number
  ingresos: number
  promedio_noches: number
}

export const getTopHabitaciones = async (): Promise<TopHabitacion[]> => {
  const { data, error } = await supabase.rpc('rpc_top_habitaciones', { p_limite: 6 })
  if (error) throw new Error(error.message)
  return (data as TopHabitacion[]) ?? []
}

export type ClienteConUsuario = {
  id: string
  tipo_documento: string | null
  numero_documento: string | null
  usuario_id: string
  usuarios: {
    nombre_completo: string
    correo: string
    telefono: string | null
    foto_url: string | null
    estado: string
    nivel_fidelidad: string | null
    total_reservas_completadas: number | null
    puntos_fidelidad: number | null
    total_gastado: number | null
    created_at: string
  } | null
}

export const getClientes = async (): Promise<ClienteConUsuario[]> => {
  const { data, error } = await supabase
    .from('clientes')
    .select(`
      id,
      usuario_id,
      tipo_documento,
      numero_documento,
      usuarios!usuario_id (
        nombre_completo,
        correo,
        telefono,
        foto_url,
        estado,
        nivel_fidelidad,
        total_reservas_completadas,
        puntos_fidelidad,
        total_gastado,
        created_at
      )
    `)
    .order('id')
  if (error) throw error
  return (data ?? []) as unknown as ClienteConUsuario[]
}

export const toggleEstadoCliente = async (usuarioId: string, nuevoEstado: 'activo' | 'bloqueado'): Promise<void> => {
  const { error } = await supabase
    .from('usuarios')
    .update({ estado: nuevoEstado })
    .eq('id', usuarioId)
  if (error) throw new Error(error.message)
}

export const getTiposHabitacion = async () => {
  const { data, error } = await supabase
    .from('tipos_habitacion')
    .select('id, nombre, capacidad_adultos, capacidad_ninos, precio_base, numero_camas, tipo_cama, descripcion')
  if (error) throw error
  return data ?? []
}

export const crearHabitacion = async (params: {
  numero: string; piso: number; tipoHabitacionId: string
  descripcion?: string; disponibleOnline?: boolean; amenidades?: string[]
}): Promise<void> => {
  const { error } = await supabase.rpc('rpc_crear_habitacion', {
    p_numero: params.numero,
    p_piso: params.piso,
    p_tipo_habitacion_id: params.tipoHabitacionId,
    p_descripcion: params.descripcion ?? null,
    p_disponible_online: params.disponibleOnline ?? true,
    p_amenidades: params.amenidades ?? [],
  })
  if (error) throw new Error(error.message)
}

// ── ANUNCIOS ──────────────────────────────────────
export const getAnuncios = async (soloWeb = false, soloApp = false) => {
  const { data, error } = await supabase.rpc('rpc_anuncios_vigentes', {
    p_solo_web: soloWeb,
    p_solo_app: soloApp,
  })
  if (error) throw error
  return data ?? []
}

export const getAnunciosAdmin = async () => {
  const { data, error } = await supabase
    .from('anuncios')
    .select('*')
    .order('orden', { ascending: true })
  if (error) throw error
  return data ?? []
}

export const crearAnuncio = async (params: {
  titulo: string
  subtitulo?: string
  descripcion?: string
  tipo: string
  imagenUrl?: string
  urlAccion?: string
  textoBoton?: string
  visibleWeb: boolean
  visibleApp: boolean
  soloClientes: boolean
  fechaInicio: string
  fechaFin?: string
  orden: number
}) => {
  const { data, error } = await supabase
    .from('anuncios')
    .insert({
      titulo: params.titulo,
      subtitulo: params.subtitulo ?? null,
      descripcion: params.descripcion ?? null,
      tipo: params.tipo,
      imagen_url: params.imagenUrl ?? null,
      url_accion: params.urlAccion ?? null,
      texto_boton: params.textoBoton ?? null,
      visible_web: params.visibleWeb,
      visible_app: params.visibleApp,
      solo_clientes: params.soloClientes,
      fecha_inicio: params.fechaInicio,
      fecha_fin: params.fechaFin ?? null,
      orden: params.orden,
      activo: true,
    })
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

export const actualizarAnuncio = async (
  anuncioId: string,
  campos: Record<string, unknown>
) => {
  const { data, error } = await supabase
    .from('anuncios')
    .update(campos)
    .eq('id', anuncioId)
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

export const eliminarAnuncio = async (anuncioId: string) => {
  const { error } = await supabase.from('anuncios').delete().eq('id', anuncioId)
  if (error) throw error
}

// ── BUZÓN ─────────────────────────────────────────
export const enviarBuzon = async (params: {
  tipo: string
  asunto: string
  mensaje: string
  categoria?: string
  reservaId?: string
  nombreContacto?: string
  correoContacto?: string
  telefonoContacto?: string
  anonimo?: boolean
}) => {
  const { data, error } = await supabase.rpc('rpc_enviar_buzon', {
    p_tipo: params.tipo,
    p_asunto: params.asunto,
    p_mensaje: params.mensaje,
    p_categoria: params.categoria ?? null,
    p_reserva_id: params.reservaId ?? null,
    p_nombre_contacto: params.nombreContacto ?? null,
    p_correo_contacto: params.correoContacto ?? null,
    p_telefono_contacto: params.telefonoContacto ?? null,
    p_anonimo: params.anonimo ?? false,
  })
  if (error) throw error
  return data?.[0] ?? null
}

export const getBuzonMensajes = async (): Promise<MensajeBuzon[]> => {
  // Hint FK explícito para resolver PGRST201 (múltiples FK a usuarios)
  // Si falla, revisar el nombre de la columna FK en buzon_mensajes
  const { data, error } = await supabase
    .from('buzon_mensajes')
    .select(`
      id, tipo, categoria, asunto, mensaje, estado, prioridad,
      anonimo, nombre_contacto, correo_contacto,
      respuesta, fecha_respuesta, valoracion, created_at,
      usuarios!usuario_id ( nombre_completo, correo )
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as MensajeBuzon[]
}

export const responderBuzon = async (
  mensajeId: string,
  respuesta: string,
  estado: string
) => {
  const { data, error } = await supabase
    .from('buzon_mensajes')
    .update({
      respuesta,
      estado,
      fecha_respuesta: new Date().toISOString(),
    })
    .eq('id', mensajeId)
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

// ── TURNOS Y ASISTENCIA ───────────────────────────
export const getTurnos = async () => {
  const { data, error } = await supabase
    .from('turnos_hotel')
    .select('*')
    .eq('activo', true)
    .order('hora_inicio')
  if (error) throw error
  return data ?? []
}

export const getProgramacionTurnos = async (fechaInicio: string, fechaFin: string) => {
  const { data, error } = await supabase
    .from('programacion_turnos')
    .select(`
      id, fecha, estado, notas, hora_inicio_real, hora_fin_real,
      personal (
        id, cargo,
        usuarios ( nombre_completo )
      ),
      turnos_hotel ( id, nombre, hora_inicio, hora_fin, cruza_medianoche )
    `)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha')
  if (error) throw error
  return data ?? []
}

export const asignarTurno = async (params: {
  personalId: string
  turnoId: string
  fecha: string
  notas?: string
}) => {
  const { data, error } = await supabase
    .from('programacion_turnos')
    .upsert(
      {
        personal_id: params.personalId,
        turno_id: params.turnoId,
        fecha: params.fecha,
        estado: 'programado',
        notas: params.notas ?? null,
      },
      { onConflict: 'personal_id,fecha' }
    )
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

export const getPersonalEnTurnoAhora = async () => {
  const { data, error } = await supabase.rpc('rpc_personal_en_turno_ahora')
  if (error) throw error
  return data ?? []
}

export const getAsistencia = async (fechaInicio: string, fechaFin: string) => {
  const { data, error } = await supabase.rpc('rpc_reporte_asistencia', {
    p_fecha_inicio: fechaInicio,
    p_fecha_fin: fechaFin,
  })
  if (error) throw error
  return data ?? []
}

export const getPersonalCompleto = async () => {
  const { data, error } = await supabase
    .from('personal')
    .select(`
      id, cargo, turno, estado, codigo_empleado,
      usuarios ( nombre_completo, correo )
    `)
    .eq('estado', 'activo')
    .order('cargo')
  if (error) throw error
  return data ?? []
}

// ── PERFIL CLIENTE ────────────────────────────────
export const actualizarPerfilUsuario = async (params: {
  usuarioId: string
  nombreCompleto?: string
  telefono?: string
  ciudad?: string
  pais?: string
  tipoDocumento?: string
  numeroDocumento?: string
  nacionalidad?: string
  fechaNacimiento?: string | null
  direccion?: string
}) => {
  const { error } = await supabase.rpc('rpc_actualizar_mi_perfil', {
    p_nombre_completo:  params.nombreCompleto  ?? null,
    p_telefono:         params.telefono        ?? null,
    p_ciudad:           params.ciudad          ?? null,
    p_pais:             params.pais            ?? null,
    p_tipo_documento:   params.tipoDocumento   ?? null,
    p_numero_documento: params.numeroDocumento ?? null,
    p_nacionalidad:     params.nacionalidad    ?? null,
    p_fecha_nacimiento: params.fechaNacimiento ?? null,
    p_direccion:        params.direccion       ?? null,
  })
  if (error) throw error
  return true
}

export const subirFotoUsuario = async (usuarioId: string, file: File) => {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${usuarioId}.${ext}`
  const { error: uploadErr } = await supabase.storage
    .from('hotel-assets')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadErr) throw uploadErr
  const { data: urlData } = supabase.storage.from('hotel-assets').getPublicUrl(path)
  // Usar RPC para guardar URL (evita RLS block en PATCH directo)
  await supabase.rpc('rpc_actualizar_foto_perfil', { p_foto_url: urlData.publicUrl })
  return urlData.publicUrl
}

export const getDetalleReservaCompleto = async (reservaId: string) => {
  const { data, error } = await supabase
    .from('reservas')
    .select(`
      id, codigo_reserva, fecha_entrada, fecha_salida, estado, total_estimado,
      cantidad_adultos, cantidad_ninos, created_at,
      clientes (
        tipo_documento, numero_documento,
        usuarios ( nombre_completo, correo, telefono )
      ),
      detalle_reserva ( precio_noche, noches, subtotal,
        habitaciones ( numero, piso, tipos_habitacion ( nombre ) )
      ),
      pagos ( id, monto, tipo_pago, estado, fecha_pago, metodos_pago ( nombre ) )
    `)
    .eq('id', reservaId)
    .single()
  if (error) throw error
  return data
}

export const cancelarReservaCliente = async (reservaId: string, motivo: string) => {
  const { error } = await supabase.rpc('rpc_cancelar_reserva_cliente', {
    p_reserva_id: reservaId,
    p_motivo: motivo,
  })
  if (error) throw error
}

// ── CLIENTES (búsqueda con RPC para bypassar RLS) ─────────────────────────────
export type ClienteBusqueda = {
  id: string
  usuario_id: string
  tipo_documento: string | null
  numero_documento: string | null
  nombre_completo: string
  correo: string
  telefono: string | null
}

export const buscarClientes = async (query: string): Promise<ClienteBusqueda[]> => {
  const { data, error } = await supabase.rpc('rpc_buscar_clientes', { p_query: query.trim() })
  if (error) throw new Error(error.message)
  return (data as ClienteBusqueda[]) ?? []
}

// ── DETALLE COMPLETO DE RESERVA ───────────────────────────────────────────────
export type ReservaDetalleHab = {
  numero: string; piso: number | null; tipo: string
  precio_noche: number; noches: number; subtotal: number
}
export type ReservaDetallePago = {
  id: string; monto: number; estado: string; tipo_pago: string
  fecha_pago: string | null; metodo: string
}
export type ReservaDetalle = {
  id: string; codigo_reserva: string; estado: string
  fecha_entrada: string; fecha_salida: string
  cantidad_adultos: number; cantidad_ninos: number
  total_estimado: number; total_pagado: number
  origen: string; observaciones: string | null; motivo_cancelacion: string | null; created_at: string
  cliente: {
    id: string; nombre_completo: string; correo: string; telefono: string | null
    tipo_documento: string | null; numero_documento: string | null; nivel_fidelidad: string | null
  }
  habitaciones: ReservaDetalleHab[]
  pagos: ReservaDetallePago[]
}

export const getReservaDetalle = async (reservaId: string): Promise<ReservaDetalle> => {
  const { data, error } = await supabase.rpc('rpc_get_reserva_detalle', { p_reserva_id: reservaId })
  if (error) throw new Error(error.message)
  return data as ReservaDetalle
}

export const marcarNoShow = async (reservaId: string): Promise<void> => {
  const { error } = await supabase.rpc('rpc_cancelar_reserva', {
    p_reserva_id: reservaId,
    p_motivo: 'No se presentó (No Show)',
  })
  if (error) throw new Error(error.message)
}

export const subirComprobanteEmergencia = async (usuarioId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `comprobantes/${usuarioId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('hotel-assets').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('hotel-assets').getPublicUrl(path)
  return data.publicUrl
}

export const enviarSolicitudCancelacionEmergencia = async (params: {
  usuarioId: string
  codigoReserva: string
  motivo: string
  archivoUrl?: string
}) => {
  const { error } = await supabase.from('buzon_mensajes').insert({
    usuario_id: params.usuarioId,
    tipo: 'otro',
    asunto: `[EMERGENCIA] Cancelacion reserva ${params.codigoReserva}`,
    mensaje: `Solicitud de cancelacion por emergencia. Codigo: ${params.codigoReserva}. Motivo: ${params.motivo}${params.archivoUrl ? `. Comprobante: ${params.archivoUrl}` : ''}`,
    estado: 'nuevo',
    prioridad: 'alta',
  })
  if (error) throw error
}

export const registrarPreCheckin = async (params: {
  reservaId: string
  clienteId: string
  horaEstimadaLlegada?: string
  observaciones?: string
}) => {
  const { data, error } = await supabase
    .from('pre_checkin')
    .upsert({
      reserva_id: params.reservaId,
      cliente_id: params.clienteId,
      estado: 'pendiente',
      hora_estimada_llegada: params.horaEstimadaLlegada ?? null,
      observaciones: params.observaciones ?? null,
    }, { onConflict: 'reserva_id' })
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

// ─── Reseñas ────────────────────────────────────────────────────────────────

export type ResenaPublica = {
  id: string
  calificacion: number
  titulo: string | null
  comentario: string | null
  cal_limpieza: number | null
  cal_atencion: number | null
  cal_ubicacion: number | null
  cal_precio: number | null
  foto_url: string | null
  created_at: string
}

export const getResenasPublicas = async (): Promise<ResenaPublica[]> => {
  const { data, error } = await supabase
    .from('resenas')
    .select('id, calificacion, titulo, comentario, cal_limpieza, cal_atencion, cal_ubicacion, cal_precio, foto_url, created_at')
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(9)
  if (error) throw error
  return (data ?? []) as ResenaPublica[]
}

export const subirFotoResena = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop() ?? 'jpg'
  // Usa el mismo prefijo "avatars/" que ya tienen permisos en las políticas del bucket
  const path = `avatars/${userId}/review-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('hotel-assets')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('hotel-assets').getPublicUrl(path)
  return data.publicUrl
}

export const crearResena = async (params: {
  reservaId: string
  calificacion: number
  titulo?: string
  comentario?: string
  calLimpieza?: number
  calAtencion?: number
  calUbicacion?: number
  calPrecio?: number
  fotoUrl?: string
}) => {
  const { error } = await supabase.rpc('rpc_crear_resena', {
    p_reserva_id:    params.reservaId,
    p_calificacion:  params.calificacion,
    p_titulo:        params.titulo        ?? null,
    p_comentario:    params.comentario    ?? null,
    p_cal_limpieza:  params.calLimpieza   ?? null,
    p_cal_atencion:  params.calAtencion   ?? null,
    p_cal_ubicacion: params.calUbicacion  ?? null,
    p_cal_precio:    params.calPrecio     ?? null,
    p_foto_url:      params.fotoUrl       ?? null,
  })
  if (error) throw error
}

export const tieneResena = async (reservaId: string): Promise<boolean> => {
  const { count } = await supabase
    .from('resenas')
    .select('id', { count: 'exact', head: true })
    .eq('reserva_id', reservaId)
  return (count ?? 0) > 0
}

export const modificarFechasReserva = async (params: {
  reservaId: string
  fechaEntrada: string
  fechaSalida: string
}): Promise<{ noches: number; nuevo_total: number }> => {
  const { data, error } = await supabase.rpc('rpc_modificar_fechas_reserva', {
    p_reserva_id:    params.reservaId,
    p_fecha_entrada: params.fechaEntrada,
    p_fecha_salida:  params.fechaSalida,
  })
  if (error) throw new Error(error.message || error.details || 'Error al modificar fechas')
  return data as { noches: number; nuevo_total: number }
}

// ─── Favoritos ───────────────────────────────────────────────────────────────

export type HabitacionFavorita = {
  habitacion_id: string
  numero: string
  tipo_habitacion: string
  precio_base: number
  descripcion: string | null
  capacidad_adultos: number
  capacidad_ninos: number
  estado: string
  fecha_favorito: string
}

export const getMisFavoritos = async (): Promise<HabitacionFavorita[]> => {
  const { data, error } = await supabase.rpc('rpc_get_mis_favoritos')
  if (error) throw new Error(error.message)
  return (data ?? []) as HabitacionFavorita[]
}

export const toggleFavorito = async (habitacionId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('rpc_toggle_favorito', {
    p_habitacion_id: habitacionId,
  })
  if (error) throw new Error(error.message)
  return (data as { favorito: boolean }).favorito
}

// ─── Reseñas (personal) ──────────────────────────────────────────────────────

export type ResenaPersonal = {
  id: string
  calificacion: number
  titulo: string | null
  comentario: string | null
  cal_limpieza: number | null
  cal_atencion: number | null
  cal_ubicacion: number | null
  cal_precio: number | null
  foto_url: string | null
  visible: boolean
  created_at: string
  cliente_nombre: string
  cliente_email: string
  habitacion_numero: string
  tipo_habitacion: string
  codigo_reserva: string
}

export const getTodasLasResenas = async (): Promise<ResenaPersonal[]> => {
  const { data, error } = await supabase.rpc('rpc_get_todas_resenas')
  if (error) throw new Error(error.message)
  return (data as ResenaPersonal[]) ?? []
}

export const toggleVisibilidadResena = async (resenaId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('rpc_toggle_visibilidad_resena', {
    p_resena_id: resenaId,
  })
  if (error) throw new Error(error.message)
  return (data as { visible: boolean }).visible
}
