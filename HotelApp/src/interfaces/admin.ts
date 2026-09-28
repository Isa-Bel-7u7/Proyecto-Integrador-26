export interface AdminResumen {
  total_reservas: number;
  reservas_pendientes: number;
  reservas_confirmadas: number;
  reservas_en_estadia: number;
  habitaciones_disponibles: number;
  habitaciones_ocupadas: number;
  habitaciones_limpieza: number;
  incidencias_abiertas: number;
  pagos_aprobados: number;
}

export interface AdminReserva {
  reserva_id?: string;
  id?: string;
  codigo_reserva: string;
  cliente_nombre?: string;
  habitacion_id?: string | null;
  habitacion_numero?: string | null;
  fecha_entrada: string;
  fecha_salida: string;
  estado: string;
  total_estimado?: number;
  total_pagado?: number;
  saldo_pendiente?: number;
  observaciones?: string | null;
  motivo_cancelacion?: string | null;
}

export interface AdminClienteBusqueda {
  id: string;
  usuario_id: string;
  tipo_documento: string | null;
  numero_documento: string | null;
  nombre_completo: string;
  correo: string;
  telefono: string | null;
}

export interface AdminHabitacionDisponible {
  habitacion_id?: string;
  id?: string;
  numero: string;
  piso: number;
  nombre_tipo?: string;
  tipo_habitacion?: string;
  precio?: number;
  precio_base?: number;
}

export interface AdminReservaDetalleHab {
  numero: string;
  piso: number | null;
  tipo: string;
  precio_noche: number;
  noches: number;
  subtotal: number;
}

export interface AdminReservaDetallePago {
  id: string;
  monto: number;
  estado: string;
  tipo_pago: string;
  fecha_pago: string | null;
  metodo: string;
}

export interface AdminReservaDetalle {
  id: string;
  codigo_reserva: string;
  estado: string;
  fecha_entrada: string;
  fecha_salida: string;
  cantidad_adultos: number;
  cantidad_ninos: number;
  total_estimado: number;
  total_pagado: number;
  origen: string;
  observaciones: string | null;
  motivo_cancelacion: string | null;
  created_at: string;
  cliente: {
    id: string;
    nombre_completo: string;
    correo: string;
    telefono: string | null;
    tipo_documento: string | null;
    numero_documento: string | null;
    nivel_fidelidad: string | null;
  };
  habitaciones: AdminReservaDetalleHab[];
  pagos: AdminReservaDetallePago[];
}

export interface AdminHabitacion {
  id: string;
  numero: string;
  piso: number;
  estado: string;
  descripcion?: string | null;
  motivo_mantenimiento?: string | null;
  disponible_online?: boolean;
  tipos_habitacion?: { nombre?: string } | null;
}

export interface AdminIncidencia {
  id: string;
  codigo?: string;
  titulo: string;
  descripcion?: string | null;
  categoria: string;
  prioridad: string;
  estado: string;
  asignado_a?: string | null;
  habitacion_id?: string | null;
  habitacion_num?: string | null;
  created_at: string;
}

export interface AdminTareaHousekeeping {
  id: string;
  codigo: string;
  habitacion_id?: string | null;
  habitacion_numero: string;
  personal_id?: string | null;
  personal_nombre?: string | null;
  prioridad: string;
  estado: string;
  tipo_tarea?: string | null;
  observaciones?: string | null;
  checklist_total?: number;
  checklist_ok?: number;
}

export interface AdminPersonalDisponible {
  id: string;
  nombre: string;
  nombre_completo?: string;
  cargo?: string | null;
  estado?: string | null;
}

export interface AdminAuditoria {
  id: string;
  usuario_nombre?: string | null;
  accion: string;
  modulo: string;
  descripcion: string;
  criticidad: string;
  created_at: string;
}

export interface AdminPagoResumen {
  hoy_total: number;
  mes_total: number;
  pagos_hoy: number;
  pendientes: number;
}

export interface AdminEmpleadoDetalle {
  id: string;
  usuario_id?: string | null;
  nombre: string;
  email?: string | null;
  rol?: string | null;
  cargo?: string | null;
  area?: string | null;
  estado?: string | null;
  documento?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  fecha_contratacion?: string | null;
  turno_hoy?: string | null;
  asistencia_hoy?: string | null;
  hora_entrada?: string | null;
}

export interface AdminPersonalTiempoReal {
  personal_id: string;
  nombre: string;
  cargo?: string | null;
  area?: string | null;
  hora_entrada?: string | null;
  horas_acumuladas?: number | null;
  turno?: string | null;
  estado_asistencia?: string | null;
  tareas_pendientes?: number | null;
}

export interface AdminSolicitudPermiso {
  id: string;
  personal_id: string;
  nombre: string;
  cargo?: string | null;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo?: string | null;
  estado: string;
  dias?: number | null;
  created_at: string;
}

export interface AdminClienteItem {
  id: string;
  usuario_id?: string | null;
  nombre_completo: string;
  correo?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
  estado?: string | null;
  tipo_documento?: string | null;
  numero_documento?: string | null;
  nacionalidad?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  nivel_fidelidad?: string | null;
  puntos_fidelidad?: number | null;
  total_reservas_completadas?: number | null;
  total_gastado?: number | null;
  created_at?: string | null;
}

export interface AdminMensajeBuzon {
  id: string;
  tipo: string;
  categoria?: string | null;
  asunto: string;
  mensaje: string;
  estado: string;
  prioridad?: string | null;
  anonimo?: boolean | null;
  nombre_contacto?: string | null;
  correo_contacto?: string | null;
  respuesta?: string | null;
  fecha_respuesta?: string | null;
  created_at: string;
  usuarios?: { nombre_completo?: string | null; correo?: string | null } | null;
}

export interface AdminAnuncio {
  id: string;
  titulo: string;
  subtitulo?: string | null;
  descripcion?: string | null;
  tipo: string;
  visible_web?: boolean | null;
  visible_app?: boolean | null;
  solo_clientes?: boolean | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
  activo: boolean;
  orden?: number | null;
  created_at?: string | null;
}

export interface AdminNotificacionItem {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  canal?: string | null;
  leida?: boolean | null;
  prioridad?: string | null;
  referencia_tipo?: string | null;
  referencia_id?: string | null;
  created_at: string;
}
