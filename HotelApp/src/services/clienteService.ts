// SRP: único responsable de todas las consultas del módulo Cliente.
// DIP: pantallas dependen de estas funciones, no de supabase directamente.
// DRY: centraliza error handling y transformaciones de datos.
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import type { Reserva, Notificacion, HabitacionDisponible, ConfiguracionHotel } from '../types';

// rpc_mis_reservas devuelve reserva_id (no id) — mapeo centralizado
function mapReserva(r: any): Reserva {
  return { ...r, id: r.reserva_id ?? r.id } as Reserva;
}

// ── Home ─────────────────────────────────────────────────────────────────────

export async function obtenerReservasActivas(): Promise<Reserva[]> {
  const { data, error } = await supabase.rpc('rpc_mis_reservas');
  if (error) throw new Error(error.message);
  return ((data as any[]) ?? [])
    .map(mapReserva)
    .filter((r) => ['pendiente', 'confirmada', 'en_estadia'].includes(r.estado));
}

export async function contarNotificacionesSinLeer(): Promise<number> {
  const { data } = await supabase.rpc('rpc_mis_notificaciones');
  return ((data as any[]) ?? []).filter((n) => !n.leida).length;
}

export async function obtenerConfiguracionHotel(): Promise<ConfiguracionHotel | null> {
  const { data } = await supabase
    .from('configuracion_hotel')
    .select('*')
    .limit(1)
    .single();
  return (data as ConfiguracionHotel | null) ?? null;
}

// rpc_anuncios_vigentes con filtro p_solo_app para mostrar solo los de la app
export async function obtenerAnunciosVigentes(limite = 5) {
  try {
    const { data } = await supabase.rpc('rpc_anuncios_vigentes', {
      p_solo_web: false,
      p_solo_app: true,
    });
    return ((data ?? []) as any[])
      .map((a) => ({ ...a, id: a.anuncio_id ?? a.id }))
      .slice(0, limite);
  } catch {
    return [];
  }
}

// Promise.allSettled evita que un fallo aislado rompa todo el home
export async function obtenerDatosHome() {
  const [reservasR, sinLeerR, configR, anunciosR] = await Promise.allSettled([
    obtenerReservasActivas(),
    contarNotificacionesSinLeer(),
    obtenerConfiguracionHotel(),
    obtenerAnunciosVigentes(3),
  ]);
  return {
    reservas: reservasR.status === 'fulfilled' ? reservasR.value : [],
    sinLeer:  sinLeerR.status  === 'fulfilled' ? sinLeerR.value  : 0,
    config:   configR.status   === 'fulfilled' ? configR.value   : null,
    anuncios: anunciosR.status === 'fulfilled' ? anunciosR.value : [],
  };
}

// ── Reservas ─────────────────────────────────────────────────────────────────

export async function obtenerTodasMisReservas(): Promise<Reserva[]> {
  const { data, error } = await supabase.rpc('rpc_mis_reservas');
  if (error) throw new Error(error.message);
  return ((data as any[]) ?? []).map(mapReserva);
}

export async function obtenerReservaBasica(reservaId: string) {
  const { data, error } = await supabase
    .from('reservas')
    .select('id, codigo_reserva, total_estimado, estado, fecha_entrada, fecha_salida')
    .eq('id', reservaId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// rpc_detalle_reserva acepta p_reserva_id y devuelve campos completos incluyendo habitacion
export async function obtenerDetalleReserva(reservaId: string) {
  const { data, error } = await supabase.rpc('rpc_detalle_reserva', {
    p_reserva_id: reservaId,
  });
  if (error) throw new Error(error.message);

  const { data: pagos } = await supabase
    .from('pagos')
    .select('*, metodo_pago:metodos_pago(nombre)')
    .eq('reserva_id', reservaId)
    .order('fecha_pago', { ascending: false });

  const reserva = ((data as any[]) ?? [])[0] ?? null;
  return { reserva, pagos: pagos ?? [] };
}

export async function crearReserva(params: {
  habitacionId:    string;
  fechaEntrada:    string;
  fechaSalida:     string;
  cantidadAdultos: number;
  cantidadNinos:   number;
  observaciones?:  string;
}): Promise<{ reserva_id: string; codigo_reserva: string }> {
  const { data, error } = await supabase.rpc('rpc_crear_reserva_cliente', {
    p_habitacion_id:    params.habitacionId,
    p_fecha_entrada:    params.fechaEntrada,
    p_fecha_salida:     params.fechaSalida,
    p_cantidad_adultos: params.cantidadAdultos,
    p_cantidad_ninos:   params.cantidadNinos,
    p_observaciones:    params.observaciones ?? null,
    p_origen:           'movil',
  });
  if (error) throw new Error(error.message);
  const result = ((data as any[]) ?? [])[0];
  if (!result) throw new Error('No se pudo crear la reserva.');
  return { reserva_id: result.reserva_id, codigo_reserva: result.codigo_reserva };
}

export async function cancelarReserva(reservaId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_cancelar_reserva', {
    p_reserva_id: reservaId,
    p_motivo:     'Cancelado por el cliente desde la app',
  });
  if (error) throw new Error(error.message);
}

// ── Habitaciones ─────────────────────────────────────────────────────────────

export async function buscarHabitacionesDisponibles(params: {
  entrada: string;
  salida:  string;
}): Promise<HabitacionDisponible[]> {
  const { data, error } = await supabase.rpc('rpc_habitaciones_disponibles', {
    p_fecha_entrada: params.entrada,
    p_fecha_salida:  params.salida,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as HabitacionDisponible[];
}

// Imágenes de respaldo por tipo — mismas URLs que usa la web (InicioCliente.tsx)
export const IMAGEN_FALLBACK: Record<string, string> = {
  Suite:       'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
  Familiar:    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
  Matrimonial: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80',
  Doble:       'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80',
  Individual:  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80',
};
export const IMAGEN_DEFAULT = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80';

// rpc_get_portadas_habitaciones: misma fuente que usa la web (no tipos_habitacion.imagen_url, que está vacío)
export async function obtenerImagenesHabitaciones(
  habitacionIds: string[]
): Promise<Record<string, string>> {
  if (habitacionIds.length === 0) return {};
  const { data } = await supabase.rpc('rpc_get_portadas_habitaciones');
  const result: Record<string, string> = {};
  (data as { habitacion_id: string; url: string; tipo: string }[] ?? []).forEach((p) => {
    if (p.tipo === 'imagen' && p.url && !result[p.habitacion_id]) {
      result[p.habitacion_id] = p.url;
    }
  });
  return result;
}

// Obtiene servicios de habitación via tipo_habitacion_id
export async function obtenerServiciosHabitacion(habitacionId: string) {
  const { data: habRow } = await supabase
    .from('habitaciones')
    .select('tipo_habitacion_id')
    .eq('id', habitacionId)
    .single();
  if (!habRow?.tipo_habitacion_id) return [];

  const { data } = await supabase
    .from('tipo_habitacion_servicios')
    .select('incluido, precio, servicio:servicios(id, nombre, tipo)')
    .eq('tipo_habitacion_id', habRow.tipo_habitacion_id);

  return ((data ?? []) as any[]).map((s) => ({
    id:       s.servicio?.id      ?? '',
    nombre:   s.servicio?.nombre  ?? '',
    tipo:     s.servicio?.tipo    ?? '',
    precio:   s.precio            ?? 0,
    incluido: s.incluido          ?? false,
  }));
}

// Servicios del hotel disponibles para el cliente (gym, spa, etc.)
export async function obtenerServiciosHotel() {
  const { data } = await supabase
    .from('servicios')
    .select('id, nombre, descripcion, tipo, precio, incluido')
    .eq('activo', true)
    .in('tipo', ['hotel', 'adicional'])
    .order('nombre');
  return (data ?? []) as any[];
}

// ── Favoritos ─────────────────────────────────────────────────────────────────

export async function obtenerMisFavoritos() {
  const { data } = await supabase.rpc('rpc_get_mis_favoritos');
  return (data ?? []) as any[];
}

export async function verificarFavorito(
  _clienteId: string,
  habitacionId: string,
): Promise<boolean> {
  const { data } = await supabase.rpc('rpc_get_mis_favoritos');
  const favoritos = (data ?? []) as any[];
  return favoritos.some(
    (f) => f.habitacion_id === habitacionId || f.id === habitacionId
  );
}

// rpc_toggle_favorito solo necesita p_habitacion_id
export async function toggleFavorito(params: {
  habitacionId: string;
  clienteId?:   string;
  esFavorito?:  boolean;
}): Promise<boolean> {
  const { data, error } = await supabase.rpc('rpc_toggle_favorito', {
    p_habitacion_id: params.habitacionId,
  });
  if (error) throw new Error(error.message);
  const r = (data as any[])?.[0] ?? data;
  return r?.es_favorito ?? r?.favorito ?? !params.esFavorito;
}

// ── Pre Check-in ─────────────────────────────────────────────────────────────

export async function obtenerPreCheckin(reservaId: string) {
  const { data } = await supabase
    .from('pre_checkin')
    .select('*')
    .eq('reserva_id', reservaId)
    .maybeSingle();
  return data ?? null;
}

export async function guardarPreCheckin(params: {
  id?:                string;
  reservaId:          string;
  clienteId:          string;
  horaLlegada:        string | null;
  observaciones:      string | null;
  datosConfirmados:   boolean;
  documentosCargados: boolean;
}): Promise<void> {
  const payload = {
    reserva_id:            params.reservaId,
    cliente_id:            params.clienteId,
    estado:                'pendiente',
    datos_confirmados:     params.datosConfirmados,
    documentos_cargados:   params.documentosCargados,
    hora_estimada_llegada: params.horaLlegada,
    observaciones:         params.observaciones,
  };
  const { error } = params.id
    ? await supabase.from('pre_checkin').update(payload).eq('id', params.id)
    : await supabase.from('pre_checkin').insert(payload);
  if (error) throw new Error(error.message);
}

// ── Reseñas ───────────────────────────────────────────────────────────────────

export async function obtenerResena(reservaId: string) {
  const { data } = await supabase
    .from('resenas')
    .select('*')
    .eq('reserva_id', reservaId)
    .maybeSingle();
  return data ?? null;
}

// Crea con rpc_crear_resena; actualiza con update directo (no hay RPC de update)
export async function guardarResena(params: {
  id?:          string;
  reservaId:    string;
  clienteId:    string;
  calificacion: number;
  titulo?:      string | null;
  comentario?:  string | null;
  calLimpieza:  number;
  calAtencion:  number;
  calUbicacion: number;
  calPrecio:    number;
}): Promise<void> {
  if (params.id) {
    const { error } = await supabase.from('resenas').update({
      calificacion:  params.calificacion,
      titulo:        params.titulo     ?? null,
      comentario:    params.comentario ?? null,
      cal_limpieza:  params.calLimpieza,
      cal_atencion:  params.calAtencion,
      cal_ubicacion: params.calUbicacion,
      cal_precio:    params.calPrecio,
    }).eq('id', params.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.rpc('rpc_crear_resena', {
      p_reserva_id:    params.reservaId,
      p_calificacion:  params.calificacion,
      p_titulo:        params.titulo     ?? null,
      p_comentario:    params.comentario ?? null,
      p_cal_limpieza:  params.calLimpieza,
      p_cal_atencion:  params.calAtencion,
      p_cal_ubicacion: params.calUbicacion,
      p_cal_precio:    params.calPrecio,
      p_foto_url:      null,
    });
    if (error) throw new Error(error.message);
  }
}

export async function obtenerMisResenas(clienteId: string) {
  const { data } = await supabase.rpc('rpc_get_resenas_cliente', {
    p_cliente_id: clienteId,
  });
  return (data ?? []) as any[];
}

// ── Notificaciones ───────────────────────────────────────────────────────────

// rpc_mis_notificaciones puede devolver notificacion_id en lugar de id
function mapNotificacion(n: any): Notificacion {
  return { ...n, id: n.notificacion_id ?? n.id } as Notificacion;
}

export async function obtenerNotificaciones(): Promise<Notificacion[]> {
  const { data, error } = await supabase.rpc('rpc_mis_notificaciones');
  if (error) throw new Error(error.message);
  return ((data as any[]) ?? []).map(mapNotificacion);
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  await supabase.rpc('rpc_marcar_notificacion_leida', { p_notificacion_id: id });
}

export async function marcarTodasLeidas(): Promise<void> {
  const { data } = await supabase.rpc('rpc_mis_notificaciones');
  const ids = ((data as any[]) ?? [])
    .filter((n) => !n.leida)
    .map((n) => n.notificacion_id ?? n.id)
    .filter(Boolean);
  if (ids.length === 0) return;
  await supabase
    .from('notificaciones')
    .update({ leida: true, fecha_lectura: new Date().toISOString() })
    .in('id', ids);
}

// ── Perfil ────────────────────────────────────────────────────────────────────

// rpc_actualizar_mi_perfil acepta exactamente 4 parámetros
export async function actualizarPerfil(params: {
  nombre_completo: string;
  telefono:        string | null;
  ciudad:          string | null;
  pais:            string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('rpc_actualizar_mi_perfil', {
    p_nombre_completo: params.nombre_completo,
    p_telefono:        params.telefono,
    p_ciudad:          params.ciudad,
    p_pais:            params.pais,
  });
  if (error) throw new Error(error.message);
}

export async function actualizarFotoPerfil(fotoUrl: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_actualizar_foto_perfil', {
    p_foto_url: fotoUrl,
  });
  if (error) throw new Error(error.message);
}

// Sube una foto seleccionada en React Native → bucket hotel-assets → actualiza el perfil.
// Las políticas de Storage del proyecto autorizan exclusivamente la carpeta "avatars".
export async function subirYActualizarFoto(
  base64: string,
  userId: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const extensiones: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
  };
  const contentType = extensiones[mimeType] ? mimeType : 'image/jpeg';
  const extension = extensiones[contentType];
  const path = `avatars/${userId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('hotel-assets')
    .upload(path, decode(base64), { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from('hotel-assets').getPublicUrl(path);
  // El parámetro evita que React Native conserve en caché la foto anterior.
  const versionedUrl = `${publicUrl}?v=${Date.now()}`;
  await actualizarFotoPerfil(versionedUrl);
  return versionedUrl;
}

// ── Pago ──────────────────────────────────────────────────────────────────────

export async function obtenerMetodosPago() {
  const { data } = await supabase
    .from('metodos_pago')
    .select('*')
    .eq('activo', true);
  return (data ?? []) as any[];
}

// p_tipo (NO p_tipo_pago) y p_notas (NO p_observaciones)
export async function registrarPago(params: {
  reservaId:    string;
  metodoPagoId: string;
  monto:        number;
  tipo:         'anticipo' | 'pago_total';
  notas?:       string;
}): Promise<void> {
  const { error } = await supabase.rpc('rpc_registrar_pago', {
    p_reserva_id:     params.reservaId,
    p_metodo_pago_id: params.metodoPagoId,
    p_monto:          params.monto,
    p_tipo:           params.tipo,
    p_notas:          params.notas ?? 'Pago registrado desde app móvil',
    p_referencia:     null,
  });
  if (error) throw new Error(error.message);
}

// ── Buzón ─────────────────────────────────────────────────────────────────────

export async function enviarBuzon(params: {
  tipo:              string;
  asunto:            string;
  mensaje:           string;
  categoria?:        string;
  reservaId?:        string;
  nombreContacto?:   string;
  correoContacto?:   string;
  telefonoContacto?: string;
  anonimo?:          boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('rpc_enviar_buzon', {
    p_tipo:              params.tipo,
    p_asunto:            params.asunto,
    p_mensaje:           params.mensaje,
    p_categoria:         params.categoria         ?? null,
    p_reserva_id:        params.reservaId         ?? null,
    p_nombre_contacto:   params.nombreContacto    ?? null,
    p_correo_contacto:   params.correoContacto    ?? null,
    p_telefono_contacto: params.telefonoContacto  ?? null,
    p_anonimo:           params.anonimo           ?? false,
  });
  if (error) throw new Error(error.message);
}

// RLS bloquea INSERT directo en notificaciones para clientes — se usa buzón
export async function informarLlegada(params: {
  reservaId: string;
  latitud:   number;
  longitud:  number;
  mensaje:   string;
}): Promise<void> {
  // p_tipo debe coincidir con el CHECK del RPC (sugerencia|queja|consulta|otro)
  const { error } = await supabase.rpc('rpc_enviar_buzon', {
    p_tipo:       'consulta',
    p_asunto:     'Cliente informando llegada al hotel',
    p_mensaje:    `${params.mensaje} — Coordenadas: ${params.latitud.toFixed(5)}, ${params.longitud.toFixed(5)}`,
    p_categoria:  'llegada',
    p_reserva_id: params.reservaId,
    p_anonimo:    false,
  });
  if (error) throw new Error(error.message);
}

// ── Solicitudes de servicio (via rpc_crear_incidencia con origen cliente) ──────

export async function solicitarServicio(params: {
  titulo:        string;
  descripcion:   string;
  categoria:     string;
  habitacionId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('rpc_crear_incidencia', {
    p_titulo:        params.titulo,
    p_descripcion:   params.descripcion,
    p_categoria:     params.categoria,
    p_subcategoria:  null,
    p_prioridad:     'media',
    p_origen:        'cliente',
    p_area_afectada: null,
    p_habitacion_id: params.habitacionId ?? null,
    p_asignado_a:    null,
  });
  if (error) throw new Error(error.message);
}

export async function obtenerMisSolicitudes() {
  const { data } = await supabase.rpc('rpc_get_mis_incidencias');
  return (data ?? []) as any[];
}
