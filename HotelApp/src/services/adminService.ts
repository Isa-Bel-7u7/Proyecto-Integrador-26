import type {
  AdminAuditoria,
  AdminAnuncio,
  AdminClienteBusqueda,
  AdminClienteItem,
  AdminEmpleadoDetalle,
  AdminHabitacion,
  AdminHabitacionDisponible,
  AdminIncidencia,
  AdminMensajeBuzon,
  AdminNotificacionItem,
  AdminPagoResumen,
  AdminPersonalDisponible,
  AdminPersonalTiempoReal,
  AdminReserva,
  AdminReservaDetalle,
  AdminResumen,
  AdminSolicitudPermiso,
  AdminTareaHousekeeping,
} from '../interfaces';
import { supabase } from './supabase';

const ejecutarRpc = async <T>(nombre: string, params?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(nombre, params);
  if (error) throw new Error(error.message);
  return data as T;
};

export async function obtenerResumenAdministrador(): Promise<AdminResumen> {
  const data = await ejecutarRpc<AdminResumen[]>('rpc_resumen_admin');
  return data?.[0] ?? {
    total_reservas: 0, reservas_pendientes: 0, reservas_confirmadas: 0,
    reservas_en_estadia: 0, habitaciones_disponibles: 0,
    habitaciones_ocupadas: 0, habitaciones_limpieza: 0,
    incidencias_abiertas: 0, pagos_aprobados: 0,
  };
}

export async function obtenerReservasAdministrador(): Promise<AdminReserva[]> {
  const { data, error } = await supabase
    .from('vista_resumen_reservas')
    .select('*')
    .order('fecha_entrada', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminReserva[];
}

export async function obtenerProximasReservasHabitacionAdministrador(habitacionId: string): Promise<AdminReserva[]> {
  const data = await ejecutarRpc<AdminReserva[]>('rpc_get_proximas_reservas_habitacion', {
    p_habitacion_id: habitacionId,
  });
  return data ?? [];
}

export async function confirmarReservaAdministrador(reservaId: string): Promise<void> {
  const { error } = await supabase.from('reservas').update({ estado: 'confirmada' }).eq('id', reservaId);
  if (error) throw new Error(error.message);
}

export async function cancelarReservaAdministrador(reservaId: string, motivo = 'Cancelada desde la app administrativa'): Promise<void> {
  try {
    await ejecutarRpc('rpc_cancelar_reserva', { p_reserva_id: reservaId, p_motivo: motivo });
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    const normalizado = msg.toLowerCase();
    if (!(normalizado.includes('ambiguous') && normalizado.includes('estado'))) throw error;
    const { error: updateError } = await supabase
      .from('reservas')
      .update({ estado: 'cancelada', motivo_cancelacion: motivo })
      .eq('id', reservaId);
    if (updateError) throw new Error(updateError.message);
  }
}

export async function marcarNoShowAdministrador(reservaId: string): Promise<void> {
  const motivo = 'No se presentó (No Show)';
  try {
    await ejecutarRpc('rpc_cancelar_reserva', {
      p_reserva_id: reservaId,
      p_motivo: motivo,
    });
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    const normalizado = msg.toLowerCase();
    if (!(normalizado.includes('ambiguous') && normalizado.includes('estado'))) throw error;
    const { error: updateError } = await supabase
      .from('reservas')
      .update({ estado: 'no_show', motivo_cancelacion: motivo })
      .eq('id', reservaId);
    if (updateError) throw new Error(updateError.message);
  }
}

export async function obtenerDetalleReservaAdministrador(reservaId: string): Promise<AdminReservaDetalle> {
  return await ejecutarRpc<AdminReservaDetalle>('rpc_get_reserva_detalle', { p_reserva_id: reservaId });
}

export async function buscarClientesAdministrador(query: string): Promise<AdminClienteBusqueda[]> {
  if (query.trim().length < 2) return [];
  const data = await ejecutarRpc<AdminClienteBusqueda[]>('rpc_buscar_clientes', { p_query: query.trim() });
  return data ?? [];
}

export async function actualizarClienteAdministrador(params: {
  clienteId: string;
  nombreCompleto: string;
  telefono?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  nacionalidad?: string | null;
  fechaNacimiento?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  observaciones?: string | null;
}): Promise<void> {
  await ejecutarRpc('rpc_actualizar_cliente_admin', {
    p_cliente_id: params.clienteId,
    p_nombre_completo: params.nombreCompleto.trim() || null,
    p_telefono: params.telefono?.trim() || null,
    p_estado: 'activo',
    p_tipo_documento: params.tipoDocumento?.trim() || null,
    p_numero_documento: params.numeroDocumento?.trim() || null,
    p_nacionalidad: params.nacionalidad?.trim() || null,
    p_fecha_nacimiento: params.fechaNacimiento || null,
    p_direccion: params.direccion?.trim() || null,
    p_ciudad: params.ciudad?.trim() || null,
    p_pais: params.pais?.trim() || null,
    p_observaciones: params.observaciones?.trim() || null,
  });
}

export async function obtenerClienteFichaAdministrador(clienteId: string): Promise<any | null> {
  return await ejecutarRpc<any | null>('rpc_get_cliente_ficha', { p_cliente_id: clienteId }).catch(() => null);
}

export async function obtenerHabitacionesDisponiblesAdministrador(fechaEntrada: string, fechaSalida: string): Promise<AdminHabitacionDisponible[]> {
  try {
    const data = await ejecutarRpc<AdminHabitacionDisponible[]>('rpc_habitaciones_disponibles', {
      p_fecha_entrada: fechaEntrada,
      p_fecha_salida: fechaSalida,
    });
    return data ?? [];
  } catch (rpcError) {
    return obtenerHabitacionesDisponiblesFallbackAdministrador(fechaEntrada, fechaSalida, rpcError);
  }
}

async function obtenerHabitacionesDisponiblesFallbackAdministrador(
  fechaEntrada: string,
  fechaSalida: string,
  rpcError: unknown,
): Promise<AdminHabitacionDisponible[]> {
  const entrada = new Date(`${fechaEntrada}T00:00:00`);
  const salida = new Date(`${fechaSalida}T00:00:00`);
  if (Number.isNaN(entrada.getTime()) || Number.isNaN(salida.getTime()) || salida <= entrada) {
    throw new Error('La fecha de salida debe ser posterior a la fecha de llegada.');
  }

  const [habitacionesRes, tiposRes, reservasRes] = await Promise.all([
    supabase.from('habitaciones').select('id, numero, piso, estado, tipo_habitacion_id, disponible_online').order('numero'),
    supabase.from('tipos_habitacion').select('id, nombre, descripcion, capacidad_adultos, numero_camas, tipo_cama, precio_base'),
    supabase
      .from('vista_resumen_reservas')
      .select('reserva_id, habitacion_id, fecha_entrada, fecha_salida, estado')
      .not('habitacion_id', 'is', null),
  ]);

  if (habitacionesRes.error || tiposRes.error || reservasRes.error) {
    const original = rpcError instanceof Error ? rpcError.message : 'Error del RPC de disponibilidad.';
    throw new Error(habitacionesRes.error?.message ?? tiposRes.error?.message ?? reservasRes.error?.message ?? original);
  }

  const tipos = new Map((tiposRes.data ?? []).map((tipo: any) => [tipo.id, tipo]));
  const reservasActivas = (reservasRes.data ?? []).filter((reserva: any) => {
    const estado = String(reserva.estado ?? '').toLowerCase();
    if (['cancelada', 'finalizada', 'no_show'].includes(estado)) return false;
    return reserva.fecha_entrada < fechaSalida && reserva.fecha_salida > fechaEntrada;
  });
  const ocupadas = new Set(reservasActivas.map((reserva: any) => reserva.habitacion_id).filter(Boolean));

  return (habitacionesRes.data ?? [])
    .filter((habitacion: any) => {
      const estado = String(habitacion.estado ?? '').toLowerCase();
      const bloqueada = ['ocupada', 'mantenimiento', 'bloqueada', 'fuera_servicio'].includes(estado);
      return !bloqueada && !ocupadas.has(habitacion.id);
    })
    .map((habitacion: any) => {
      const tipo: any = tipos.get(habitacion.tipo_habitacion_id) ?? {};
      return {
        habitacion_id: habitacion.id,
        id: habitacion.id,
        numero: habitacion.numero,
        piso: habitacion.piso,
        nombre_tipo: tipo.nombre ?? 'Habitación',
        tipo_habitacion: tipo.nombre ?? 'Habitación',
        precio: Number(tipo.precio_base ?? 0),
        precio_base: Number(tipo.precio_base ?? 0),
      };
    });
}

export async function crearReservaManualAdministrador(params: {
  clienteId: string;
  habitacionId: string;
  fechaEntrada: string;
  fechaSalida: string;
  adultos: number;
  ninos: number;
  observaciones?: string | null;
}): Promise<{ reservaId: string | null; codigoReserva?: string | null }> {
  const data = await ejecutarRpc<any>('rpc_crear_reserva_cliente', {
    p_cliente_id: params.clienteId,
    p_habitacion_id: params.habitacionId,
    p_fecha_entrada: params.fechaEntrada,
    p_fecha_salida: params.fechaSalida,
    p_cantidad_adultos: params.adultos,
    p_cantidad_ninos: params.ninos,
    p_origen: 'recepcion',
    p_observaciones: params.observaciones || null,
  });
  const creada = Array.isArray(data) ? data[0] : data;
  const reservaId = creada?.reserva_id ?? creada?.id ?? null;
  if (reservaId) return { reservaId, codigoReserva: creada?.codigo_reserva ?? null };

  const ultima = await ejecutarRpc<{ id: string; total_estimado: number } | null>('rpc_get_ultima_reserva_cliente', {
    p_cliente_id: params.clienteId,
  }).catch(() => null);
  return { reservaId: ultima?.id ?? null, codigoReserva: null };
}

export async function cambiarHabitacionReservaAdministrador(reservaId: string, habitacionId: string): Promise<void> {
  try {
    await ejecutarRpc('rpc_cambiar_habitacion_reserva', {
      p_reserva_id: reservaId,
      p_nueva_habitacion_id: habitacionId,
    });
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (!msg.toLowerCase().includes('extract')) throw error;
    throw new Error('No se pudo cambiar la habitación porque el RPC de cambio de habitación falló al calcular noches. Ya no se intenta actualizar reservas.habitacion_id porque esa columna no existe en este esquema.');
  }
}

export async function cambiarFechasReservaAdministrador(params: {
  reservaId: string;
  fechaEntrada: string;
  fechaSalida: string;
}): Promise<{ noches: number; nuevo_total: number } | null> {
  try {
    const data = await ejecutarRpc<{ noches: number; nuevo_total: number }>('rpc_modificar_fechas_reserva', {
      p_reserva_id: params.reservaId,
      p_fecha_entrada: params.fechaEntrada,
      p_fecha_salida: params.fechaSalida,
    });
    return data ?? null;
  } catch (error: any) {
    const msg = String(error?.message ?? '').toLowerCase();
    if (!msg.includes('cliente no encontrado')) throw error;
    return await cambiarFechasReservaFallbackAdministrador(params);
  }
}

async function cambiarFechasReservaFallbackAdministrador(params: {
  reservaId: string;
  fechaEntrada: string;
  fechaSalida: string;
}): Promise<{ noches: number; nuevo_total: number }> {
  const entrada = new Date(`${params.fechaEntrada}T00:00:00`);
  const salida = new Date(`${params.fechaSalida}T00:00:00`);
  const noches = Math.ceil((salida.getTime() - entrada.getTime()) / 86400000);
  if (!Number.isFinite(noches) || noches <= 0) throw new Error('La salida debe ser posterior a la llegada.');

  const detalle = await obtenerDetalleReservaAdministrador(params.reservaId);
  const resumen = await supabase
    .from('vista_resumen_reservas')
    .select('reserva_id, habitacion_id')
    .eq('reserva_id', params.reservaId)
    .maybeSingle();
  if (resumen.error) throw new Error(resumen.error.message);
  const habitacionId = (resumen.data as any)?.habitacion_id ?? null;

  if (habitacionId) {
    const cruces = await supabase
      .from('vista_resumen_reservas')
      .select('reserva_id, codigo_reserva, fecha_entrada, fecha_salida, estado')
      .eq('habitacion_id', habitacionId)
      .neq('reserva_id', params.reservaId)
      .lt('fecha_entrada', params.fechaSalida)
      .gt('fecha_salida', params.fechaEntrada);
    if (cruces.error) throw new Error(cruces.error.message);
    const activa = (cruces.data ?? []).find((r: any) => !['cancelada', 'finalizada', 'no_show'].includes(String(r.estado ?? '').toLowerCase()));
    if (activa) throw new Error(`La habitación ya tiene cruce con la reserva ${activa.codigo_reserva ?? activa.reserva_id}.`);
  }

  const precioNoche = detalle.habitaciones.reduce((total, h) => total + Number(h.precio_noche ?? 0), 0);
  const nuevoTotal = Number((precioNoche * noches).toFixed(2));
  const { error } = await supabase
    .from('reservas')
    .update({
      fecha_entrada: params.fechaEntrada,
      fecha_salida: params.fechaSalida,
      total_estimado: nuevoTotal,
    })
    .eq('id', params.reservaId);
  if (error) throw new Error(error.message);
  return { noches, nuevo_total: nuevoTotal };
}

export async function registrarCheckinAdministrador(reservaId: string, observaciones?: string | null): Promise<void> {
  await ejecutarRpc('rpc_registrar_checkin', {
    p_reserva_id: reservaId,
    p_observaciones: observaciones || null,
  });
}

export async function registrarCheckoutAdministrador(params: {
  reservaId: string;
  checkinId?: string | null;
  cargosExtra?: number;
  descuento?: number;
  observaciones?: string | null;
}): Promise<void> {
  await ejecutarRpc('rpc_registrar_checkout', {
    p_reserva_id: params.reservaId,
    p_checkin_id: params.checkinId ?? null,
    p_cargos_extra: params.cargosExtra ?? 0,
    p_descuento: params.descuento ?? 0,
    p_observaciones: params.observaciones || null,
  });
}

export async function obtenerResumenPagosAdministrador(): Promise<AdminPagoResumen> {
  const data = await ejecutarRpc<AdminPagoResumen[]>('rpc_get_resumen_pagos');
  return data?.[0] ?? { hoy_total: 0, mes_total: 0, pagos_hoy: 0, pendientes: 0 };
}

export async function obtenerMetodosPagoAdministrador(): Promise<{ id: string; nombre: string }[]> {
  const { data, error } = await supabase
    .from('metodos_pago')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; nombre: string }[];
}

export async function registrarPagoReservaAdministrador(params: {
  reservaId: string;
  monto: number;
  metodoPagoId: string;
  tipoPago: string;
}): Promise<void> {
  await ejecutarRpc('rpc_registrar_pago_reserva', {
    p_reserva_id: params.reservaId,
    p_monto: params.monto,
    p_metodo_pago_id: params.metodoPagoId,
    p_tipo_pago: params.tipoPago,
  });
}

export async function obtenerPersonalActivoAdministrador(): Promise<number> {
  const data = await ejecutarRpc<unknown[]>('rpc_personal_en_turno_ahora').catch(async () => {
    const { count, error } = await supabase
      .from('personal')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'activo');
    if (error) throw new Error(error.message);
    return Array.from({ length: count ?? 0 });
  });
  return data?.length ?? 0;
}

export async function obtenerHabitacionesAdministrador(): Promise<AdminHabitacion[]> {
  const [habitaciones, tipos] = await Promise.all([
    supabase.from('habitaciones').select('*').order('numero'),
    supabase.from('tipos_habitacion').select('id, nombre'),
  ]);
  if (habitaciones.error) throw new Error(habitaciones.error.message);
  if (tipos.error) throw new Error(tipos.error.message);
  const mapa = new Map((tipos.data ?? []).map((tipo) => [tipo.id, tipo]));
  return (habitaciones.data ?? []).map((habitacion) => ({
    ...habitacion,
    tipos_habitacion: mapa.get(habitacion.tipo_habitacion_id) ?? null,
  })) as AdminHabitacion[];
}

export async function cambiarEstadoHabitacionAdministrador(id: string, estado: string, motivo?: string | null): Promise<void> {
  await ejecutarRpc('rpc_actualizar_estado_habitacion', {
    p_habitacion_id: id,
    p_estado: estado,
    p_motivo: motivo || 'Actualizado desde la app administrativa',
  });
}

export async function crearTareaLimpiezaAdministrador(params: {
  habitacionId: string;
  prioridad?: string;
  personalId?: string | null;
  fecha?: string | null;
  hora?: string | null;
  observaciones?: string | null;
}): Promise<void> {
  const prioridad = params.prioridad === 'normal'
    ? 'media'
    : params.prioridad === 'critica'
      ? 'urgente'
      : params.prioridad ?? 'media';
  await ejecutarRpc('rpc_crear_tarea_limpieza', {
    p_habitacion_id: params.habitacionId,
    p_personal_id: params.personalId ?? null,
    p_prioridad: prioridad,
    p_fecha: params.fecha ?? new Date().toISOString().slice(0, 10),
    p_hora: params.hora ?? null,
    p_observaciones: params.observaciones ?? 'Creada desde Hotel en vivo',
  });
}

export async function obtenerPersonalDisponibleAdministrador(): Promise<AdminPersonalDisponible[]> {
  const data = await ejecutarRpc<AdminPersonalDisponible[]>('rpc_get_personal_disponible').catch(async () => {
    const { data: rows, error } = await supabase
      .from('personal')
      .select('id, cargo, estado, usuarios(nombre_completo)')
      .eq('estado', 'activo');
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row: any) => ({
      id: row.id,
      nombre: row.usuarios?.nombre_completo ?? row.cargo ?? 'Personal',
      nombre_completo: row.usuarios?.nombre_completo ?? null,
      cargo: row.cargo ?? null,
      estado: row.estado ?? null,
    }));
  });
  return (data ?? []).map((p: any) => ({
    ...p,
    nombre: p.nombre ?? p.nombre_completo ?? 'Personal',
  }));
}

export async function reasignarTareaHousekeepingAdministrador(tareaId: string, personalId: string | null): Promise<void> {
  await ejecutarRpc('rpc_reasignar_tarea', { p_tarea_id: tareaId, p_personal_id: personalId });
}

export async function rechazarLimpiezaAdministrador(tareaId: string, motivo: string): Promise<void> {
  await ejecutarRpc('rpc_rechazar_limpieza', { p_tarea_id: tareaId, p_motivo: motivo });
}

export async function obtenerIncidenciasAdministrador(): Promise<AdminIncidencia[]> {
  return (await ejecutarRpc<AdminIncidencia[]>('rpc_get_incidencias')) ?? [];
}

export async function cambiarEstadoIncidenciaAdministrador(id: string, estado: string): Promise<void> {
  await ejecutarRpc('rpc_cambiar_estado_incidencia', {
    p_id: id,
    p_estado: estado,
    p_solucion: estado === 'resuelta' ? 'Resuelta desde la app administrativa' : null,
    p_obs_finales: estado === 'cerrada' ? 'Cerrada desde la app administrativa' : null,
  });
}

export async function crearIncidenciaHabitacionAdministrador(params: {
  habitacionId?: string | null;
  numero?: string;
  estadoHabitacion?: string;
  titulo?: string;
  descripcion?: string;
  prioridad?: string;
  areaAfectada?: string;
}): Promise<string | null> {
  const ubicacion = params.numero ? `habitación ${params.numero}` : (params.areaAfectada ?? 'área del hotel');
  const data = await ejecutarRpc<any>('rpc_crear_incidencia', {
    p_titulo: params.titulo ?? `Revisión ${ubicacion}`,
    p_descripcion: params.descripcion ?? `Incidencia creada desde Hotel en vivo. Ubicación: ${ubicacion}. Estado actual: ${params.estadoHabitacion ?? 'sin estado'}.`,
    p_categoria: 'mantenimiento',
    p_subcategoria: null,
    p_prioridad: params.prioridad ?? 'media',
    p_origen: 'recepcion',
    p_area_afectada: params.areaAfectada ?? (params.numero ? 'Habitaciones' : 'Hotel'),
    p_habitacion_id: params.habitacionId ?? null,
    p_asignado_a: null,
  });
  const row = Array.isArray(data) ? data[0] : data;
  return row?.id ?? row?.incidencia_id ?? null;
}

export async function adjuntarFotoIncidenciaAdministrador(params: {
  incidenciaId: string;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}): Promise<void> {
  const response = await fetch(params.uri);
  const blob = await response.blob();
  const nombre = params.fileName ?? `foto-${Date.now()}.jpg`;
  const path = `${params.incidenciaId}/${Date.now()}-${nombre}`;
  const { error: uploadError } = await supabase.storage
    .from('incidencias')
    .upload(path, blob, { contentType: params.mimeType ?? 'image/jpeg', upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { data } = supabase.storage.from('incidencias').getPublicUrl(path);
  await ejecutarRpc('rpc_agregar_foto_incidencia', {
    p_incidencia_id: params.incidenciaId,
    p_storage_path: path,
    p_url: data.publicUrl,
    p_nombre: nombre,
  });
}

export async function obtenerTareasHousekeepingAdministrador(): Promise<AdminTareaHousekeeping[]> {
  return (await ejecutarRpc<AdminTareaHousekeeping[]>('rpc_get_tareas_housekeeping')) ?? [];
}

export async function aprobarLimpiezaAdministrador(id: string): Promise<void> {
  await ejecutarRpc('rpc_aprobar_limpieza', {
    p_tarea_id: id,
    p_obs: 'Aprobada desde la app administrativa',
  });
}

export async function obtenerAuditoriaAdministrador(): Promise<AdminAuditoria[]> {
  const data = await ejecutarRpc<AdminAuditoria[]>('rpc_get_auditoria', {
    p_fecha_inicio: null, p_fecha_fin: null, p_modulo: null,
    p_accion: null, p_criticidad: null, p_busqueda: null, p_limite: 50,
  });
  return data ?? [];
}

export async function obtenerEmpleadosAdministrador(): Promise<AdminEmpleadoDetalle[]> {
  const data = await ejecutarRpc<AdminEmpleadoDetalle[]>('rpc_get_empleados_detalle').catch(async () => {
    const { data: rows, error } = await supabase
      .from('personal')
      .select('id, usuario_id, cargo, area, estado, documento, telefono, direccion, fecha_contratacion, usuarios(nombre_completo, correo, roles(nombre))')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row: any) => ({
      id: row.id,
      usuario_id: row.usuario_id,
      nombre: row.usuarios?.nombre_completo ?? row.cargo ?? 'Empleado',
      email: row.usuarios?.correo ?? null,
      rol: row.usuarios?.roles?.nombre ?? null,
      cargo: row.cargo ?? null,
      area: row.area ?? null,
      estado: row.estado ?? null,
      documento: row.documento ?? null,
      telefono: row.telefono ?? null,
      direccion: row.direccion ?? null,
      fecha_contratacion: row.fecha_contratacion ?? null,
      asistencia_hoy: 'sin_registro',
    }));
  });
  return data ?? [];
}

export async function obtenerPersonalTiempoRealAdministrador(): Promise<AdminPersonalTiempoReal[]> {
  const data = await ejecutarRpc<AdminPersonalTiempoReal[]>('rpc_get_personal_tiempo_real').catch(() => []);
  return data ?? [];
}

export async function obtenerSolicitudesPermisoAdministrador(): Promise<AdminSolicitudPermiso[]> {
  const data = await ejecutarRpc<AdminSolicitudPermiso[]>('rpc_get_solicitudes_vacacion').catch(() => []);
  return data ?? [];
}

export async function aprobarPermisoAdministrador(id: string, aprobado: boolean): Promise<void> {
  await ejecutarRpc('rpc_aprobar_vacacion', { p_id: id, p_aprobado: aprobado });
}

export async function cambiarRolEmpleadoAdministrador(params: {
  personalId: string;
  nombre: string;
  cargo?: string | null;
  area?: string | null;
  rol: string;
  documento?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  fechaContratacion?: string | null;
}): Promise<void> {
  await ejecutarRpc('rpc_actualizar_empleado', {
    p_personal_id: params.personalId,
    p_nombre: params.nombre.trim(),
    p_cargo: params.cargo || null,
    p_area: params.area || null,
    p_rol: params.rol,
    p_documento: params.documento || null,
    p_telefono: params.telefono || null,
    p_direccion: params.direccion || null,
    p_fecha_contratacion: params.fechaContratacion || null,
  });
}

const primero = (valor: any) => Array.isArray(valor) ? valor[0] : valor;

const normalizarClienteAdmin = (row: any): AdminClienteItem => {
  const usuario = primero(row.usuarios) ?? {};
  return {
    id: row.id ?? row.cliente_id,
    usuario_id: row.usuario_id ?? null,
    nombre_completo: row.nombre_completo ?? row.cliente_nombre ?? usuario.nombre_completo ?? 'Cliente',
    correo: row.correo ?? row.cliente_correo ?? usuario.correo ?? null,
    telefono: row.telefono ?? row.cliente_telefono ?? usuario.telefono ?? null,
    foto_url: row.foto_url ?? usuario.foto_url ?? null,
    estado: row.estado ?? usuario.estado ?? null,
    tipo_documento: row.tipo_documento ?? null,
    numero_documento: row.numero_documento ?? null,
    nacionalidad: row.nacionalidad ?? null,
    ciudad: row.ciudad ?? null,
    pais: row.pais ?? null,
    nivel_fidelidad: row.nivel_fidelidad ?? 'Visitante',
    puntos_fidelidad: Number(row.puntos_fidelidad ?? 0),
    total_reservas_completadas: Number(row.total_reservas_completadas ?? 0),
    total_gastado: Number(row.total_gastado ?? 0),
    created_at: row.created_at ?? null,
  };
};

async function obtenerClientesDirectoAdministrador(busqueda = ''): Promise<AdminClienteItem[]> {
  const q = busqueda.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, usuario_id, tipo_documento, numero_documento, nacionalidad, ciudad, pais, nivel_fidelidad, puntos_fidelidad, total_reservas_completadas, total_gastado, created_at, usuarios(nombre_completo, correo, telefono, foto_url, estado)')
      .limit(120);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map(normalizarClienteAdmin)
      .filter((c) => !q || [c.nombre_completo, c.correo, c.numero_documento, c.telefono].some((v) => String(v ?? '').toLowerCase().includes(q)));
  } catch {
    const { data: clientesRows, error: clientesError } = await supabase
      .from('clientes')
      .select('id, usuario_id, tipo_documento, numero_documento, nacionalidad, ciudad, pais, nivel_fidelidad, puntos_fidelidad, total_reservas_completadas, total_gastado, created_at')
      .limit(120);
    if (clientesError) throw new Error(clientesError.message);

    const usuarioIds = Array.from(new Set((clientesRows ?? []).map((c: any) => c.usuario_id).filter(Boolean)));
    const usuariosPorId = new Map<string, any>();
    if (usuarioIds.length) {
      const { data: usuariosRows, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, correo, telefono, foto_url, estado')
        .in('id', usuarioIds);
      if (usuariosError) throw new Error(usuariosError.message);
      (usuariosRows ?? []).forEach((u: any) => usuariosPorId.set(u.id, u));
    }

    return (clientesRows ?? [])
      .map((row: any) => normalizarClienteAdmin({ ...row, usuarios: usuariosPorId.get(row.usuario_id) ?? null }))
      .filter((c) => !q || [c.nombre_completo, c.correo, c.numero_documento, c.telefono].some((v) => String(v ?? '').toLowerCase().includes(q)));
  }
}

export async function obtenerClientesAdministrador(busqueda = ''): Promise<AdminClienteItem[]> {
  const directos = await obtenerClientesDirectoAdministrador(busqueda);
  const porId = new Map(directos.map((c) => [c.id, c]));

  const rpcRows = await ejecutarRpc<AdminClienteItem[]>('rpc_get_clientes', {
    p_busqueda: busqueda || null,
    p_estado: null,
    p_nivel: null,
  }).catch(() => []);

  const normalizados = (rpcRows ?? []).map(normalizarClienteAdmin).map((rpcCliente) => {
    const directo = porId.get(rpcCliente.id);
    return {
      ...rpcCliente,
      correo: rpcCliente.correo ?? directo?.correo ?? null,
      telefono: rpcCliente.telefono ?? directo?.telefono ?? null,
      foto_url: rpcCliente.foto_url ?? directo?.foto_url ?? null,
      estado: rpcCliente.estado ?? directo?.estado ?? null,
      usuario_id: rpcCliente.usuario_id ?? directo?.usuario_id ?? null,
    };
  });

  const idsRpc = new Set(normalizados.map((c) => c.id));
  return [...normalizados, ...directos.filter((c) => !idsRpc.has(c.id))];
}

export async function obtenerReservasClienteAdministrador(clienteId: string): Promise<any[]> {
  return (await ejecutarRpc<any[]>('rpc_get_reservas_cliente', { p_cliente_id: clienteId }).catch(() => [])) ?? [];
}

export async function obtenerPagosClienteAdministrador(clienteId: string): Promise<any[]> {
  return (await ejecutarRpc<any[]>('rpc_get_pagos_cliente', { p_cliente_id: clienteId }).catch(() => [])) ?? [];
}

export async function obtenerResenasClienteAdministrador(clienteId: string): Promise<any[]> {
  return (await ejecutarRpc<any[]>('rpc_get_resenas_cliente', { p_cliente_id: clienteId }).catch(() => [])) ?? [];
}

export async function obtenerIncidenciasClienteAdministrador(clienteId: string): Promise<any[]> {
  return (await ejecutarRpc<any[]>('rpc_get_incidencias_cliente', { p_cliente_id: clienteId }).catch(() => [])) ?? [];
}

export async function obtenerBuzonAdministrador(): Promise<AdminMensajeBuzon[]> {
  const { data, error } = await supabase
    .from('buzon_mensajes')
    .select('id, tipo, categoria, asunto, mensaje, estado, prioridad, anonimo, nombre_contacto, correo_contacto, respuesta, fecha_respuesta, created_at, usuarios!usuario_id(nombre_completo, correo)')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminMensajeBuzon[];
}

export async function responderBuzonAdministrador(id: string, respuesta: string, estado: string): Promise<void> {
  const { error } = await supabase
    .from('buzon_mensajes')
    .update({ respuesta: respuesta.trim(), estado, fecha_respuesta: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function obtenerAnunciosAdministrador(): Promise<AdminAnuncio[]> {
  const { data, error } = await supabase.from('anuncios').select('*').order('orden', { ascending: true }).limit(80);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminAnuncio[];
}

export async function crearAnuncioAdministrador(params: {
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  destinatario: 'clientes' | 'personal' | 'todos';
}): Promise<void> {
  const titulo = params.titulo.trim();
  const descripcion = params.descripcion?.trim() || null;
  if (!titulo) throw new Error('El título del anuncio es obligatorio.');
  const { error } = await supabase.from('anuncios').insert({
    titulo,
    subtitulo: params.destinatario === 'personal' ? 'Comunicado interno' : 'Comunicado del hotel',
    descripcion,
    tipo: params.tipo,
    visible_web: params.destinatario !== 'personal',
    visible_app: true,
    solo_clientes: params.destinatario === 'clientes',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: null,
    orden: 0,
    activo: true,
  });
  if (error) throw new Error(error.message);
}

export async function obtenerNotificacionesAdministrador(): Promise<AdminNotificacionItem[]> {
  const data = await ejecutarRpc<AdminNotificacionItem[]>('rpc_mis_notificaciones').catch(async () => {
    const { data: rows, error } = await supabase
      .from('notificaciones')
      .select('id, titulo, mensaje, tipo, canal, leida, referencia_tipo, referencia_id, created_at')
      .order('created_at', { ascending: false })
      .limit(80);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
  return (data ?? []).map((n: any) => ({
    ...n,
    id: n.id ?? n.notificacion_id,
    prioridad: n.prioridad ?? (String(n.tipo ?? '').includes('incidencia') ? 'alta' : 'media'),
  }));
}
