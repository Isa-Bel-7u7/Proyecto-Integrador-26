import { supabase } from './supabase';

export interface PersonalHousekeeping {
  id: string;
  usuario_id: string;
  codigo_empleado: string;
  cargo: string;
  turno: string | null;
  estado: string;
  area: string | null;
  fecha_contratacion: string | null;
}

export interface TareaHousekeepingMovil {
  id: string;
  codigo: string;
  habitacion_id: string;
  habitacion_numero: string;
  piso: number;
  tipo_habitacion: string;
  hab_estado: string;
  personal_id: string | null;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente' | string;
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'aprobada' | 'rechazada' | string;
  fecha_programada: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  observaciones: string | null;
  checklist_total: number;
  checklist_ok: number;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  label: string;
  completado: boolean;
  notas: string | null;
}

export interface TurnoProgramado {
  prog_id: string;
  turno_id: string;
  nombre: string;
  tipo: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  fecha: string;
}

export interface AsistenciaHoy {
  id: string;
  personal_id: string;
  estado: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  horas_trabajadas: number | null;
  turno_nombre: string | null;
}

export interface SolicitudPersonal {
  id: string;
  personal_id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
  estado: string;
  dias: number;
  created_at: string;
}

export interface IncidenciaHousekeeping {
  id: string;
  codigo?: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
  estado: string;
  created_at: string;
  habitacion_numero?: string;
}

const lunesDe = (fecha: Date) => {
  const d = new Date(fecha);
  d.setHours(12, 0, 0, 0);
  const dia = d.getDay();
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function obtenerMiRegistroPersonal(usuarioId: string): Promise<PersonalHousekeeping> {
  const { data, error } = await supabase
    .from('personal')
    .select('id, usuario_id, codigo_empleado, cargo, turno, estado, area, fecha_contratacion')
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No se encontró el registro laboral asociado a tu cuenta.');
  return data as PersonalHousekeeping;
}

export async function obtenerMisTareasHousekeeping(usuarioId: string): Promise<TareaHousekeepingMovil[]> {
  // El RPC SECURITY DEFINER es la fuente principal y resuelve la identidad
  // autenticada sin depender de las politicas RLS de la tabla `personal`.
  const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_get_mis_tareas_housekeeping');
  const tareasRpc = Array.isArray(rpcData)
    ? (rpcData as TareaHousekeepingMovil[])
    : [];

  if (!rpcError && tareasRpc.length > 0) return tareasRpc;

  // Respaldo para instalaciones donde el RPC aun no haya sido actualizado.
  let personal: PersonalHousekeeping;
  try {
    personal = await obtenerMiRegistroPersonal(usuarioId);
  } catch (errorDirecto) {
    if (!rpcError) return tareasRpc;
    throw new Error(rpcError.message || (errorDirecto as Error).message);
  }
  const { data, error } = await supabase
    .from('tareas_limpieza')
    .select(`
      id, codigo, habitacion_id, personal_id, prioridad, estado,
      fecha_programada, hora_inicio, hora_fin, observaciones, created_at,
      habitacion:habitaciones!inner(
        numero, piso, estado,
        tipo:tipos_habitacion(nombre)
      ),
      checklist:checklist_limpieza(completado)
    `)
    .eq('personal_id', personal.id)
    .neq('estado', 'aprobada')
    .order('created_at', { ascending: false });
  const mapearTareas = (filas: any[]): TareaHousekeepingMovil[] => filas.map((t) => {
    const habitacion = Array.isArray(t.habitacion) ? t.habitacion[0] : t.habitacion;
    const tipo = Array.isArray(habitacion?.tipo) ? habitacion.tipo[0] : habitacion?.tipo;
    const checklist = (t.checklist as { completado: boolean | null }[] | null) ?? [];
    return {
      id: t.id,
      codigo: t.codigo,
      habitacion_id: t.habitacion_id,
      habitacion_numero: habitacion?.numero ?? '—',
      piso: habitacion?.piso ?? 0,
      tipo_habitacion: tipo?.nombre ?? 'Habitación',
      hab_estado: habitacion?.estado ?? '',
      personal_id: t.personal_id,
      prioridad: t.prioridad,
      estado: t.estado,
      fecha_programada: t.fecha_programada,
      hora_inicio: t.hora_inicio,
      hora_fin: t.hora_fin,
      observaciones: t.observaciones,
      checklist_total: checklist.length,
      checklist_ok: checklist.filter((item) => item.completado === true).length,
      created_at: t.created_at,
    } as TareaHousekeepingMovil;
  });

  if (!error && data?.length) return mapearTareas(data as any[]);

  // Fallback seguro al RPC propio. Al corregir su relación usuarios.auth_user_id
  // → personal.usuario_id, funcionará incluso cuando RLS oculte la tabla directa.
  if (!rpcError) return tareasRpc;
  throw new Error(error?.message ?? rpcError.message);
}

export async function obtenerChecklistTarea(tareaId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase.rpc('rpc_get_checklist_tarea', { p_tarea_id: tareaId });
  if (error) throw new Error(error.message);
  return ((data as ChecklistItem[]) ?? []);
}

export async function actualizarChecklist(item: ChecklistItem, completado: boolean): Promise<void> {
  const { error } = await supabase.rpc('rpc_actualizar_checklist_item', {
    p_item_id: item.id,
    p_completado: completado,
    p_notas: item.notas,
  });
  if (error) throw new Error(error.message);
}

export async function iniciarTareaLimpieza(tareaId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_iniciar_limpieza', { p_tarea_id: tareaId });
  if (error) throw new Error(error.message);
}

export async function completarTareaLimpieza(tareaId: string, productos?: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_completar_limpieza', {
    p_tarea_id: tareaId,
    p_productos: productos?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function obtenerMiProgramacion(personalId: string): Promise<TurnoProgramado[]> {
  const inicio = lunesDe(new Date());
  const { data, error } = await supabase.rpc('rpc_get_programacion_semanal', { p_fecha_inicio: inicio });
  if (error) throw new Error(error.message);
  const empleado = ((data as any[]) ?? []).find((e) => e.personal_id === personalId);
  if (!empleado?.turnos) return [];
  return Object.entries(empleado.turnos)
    .filter(([, turno]) => Boolean(turno))
    .map(([fecha, turno]) => ({ ...(turno as Omit<TurnoProgramado, 'fecha'>), fecha }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function obtenerMiAsistencia(personalId: string): Promise<AsistenciaHoy | null> {
  const { data, error } = await supabase.rpc('rpc_get_asistencia_hoy');
  if (error) throw new Error(error.message);
  return ((data as AsistenciaHoy[]) ?? []).find((a) => a.personal_id === personalId) ?? null;
}

export async function registrarEntrada(personalId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_registrar_entrada', { p_personal_id: personalId });
  if (error) throw new Error(error.message);
}

export async function registrarSalida(personalId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_registrar_salida', { p_personal_id: personalId });
  if (error) throw new Error(error.message);
}

export async function obtenerMisSolicitudes(personalId: string): Promise<SolicitudPersonal[]> {
  const { data, error } = await supabase.rpc('rpc_get_solicitudes_vacacion');
  if (error) throw new Error(error.message);
  return ((data as SolicitudPersonal[]) ?? []).filter((s) => s.personal_id === personalId);
}

export async function solicitarAusencia(params: {
  personalId: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  motivo?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('rpc_solicitar_vacacion', {
    p_personal_id: params.personalId,
    p_tipo: params.tipo,
    p_fecha_inicio: params.fechaInicio,
    p_fecha_fin: params.fechaFin,
    p_motivo: params.motivo?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function obtenerMisIncidenciasHousekeeping(): Promise<IncidenciaHousekeeping[]> {
  const { data, error } = await supabase.rpc('rpc_get_mis_incidencias');
  if (error) throw new Error(error.message);
  return ((data as any[]) ?? []).map((i) => ({
    ...i,
    id: i.incidencia_id ?? i.id,
    descripcion: i.descripcion ?? '',
  })) as IncidenciaHousekeeping[];
}

export async function reportarIncidenciaHousekeeping(params: {
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
  habitacionId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('rpc_crear_incidencia', {
    p_titulo: params.titulo.trim(),
    p_descripcion: params.descripcion.trim(),
    p_categoria: params.categoria,
    p_subcategoria: null,
    p_prioridad: params.prioridad,
    p_origen: 'housekeeping',
    p_area_afectada: 'Housekeeping',
    p_habitacion_id: params.habitacionId || null,
    p_asignado_a: null,
  });
  if (error) throw new Error(error.message);
}
