// ============================================================
// CONTRATOS TYPESCRIPT - SISTEMA HOTELERO
// ============================================================

export type { IncidenciaActivaApp, NuevaIncidenciaApp, TareaHousekeepingApp } from './personal';
export type {
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
  AdminReservaDetalleHab,
  AdminReservaDetallePago,
  AdminResumen,
  AdminSolicitudPermiso,
  AdminTareaHousekeeping,
} from './admin';

// ---- ROLES Y USUARIOS ----

export type RolNombre =
  | 'Cliente'
  | 'Administrador'
  | 'Recepcionista'
  | 'Housekeeping'
  | 'Caja'
  | 'Supervisor';

export interface Rol {
  id: string;
  nombre: RolNombre;
  descripcion?: string;
  activo: boolean;
  created_at: string;
}

export interface Usuario {
  id: string;
  auth_user_id?: string;
  rol_id: string;
  nombre_completo: string;
  correo: string;
  telefono?: string;
  foto_url?: string;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  ultimo_acceso?: string;
  created_at: string;
  updated_at: string;
  rol?: Rol;
}

// ---- CLIENTE ----

export type TipoDocumento = 'CI' | 'DNI' | 'PASAPORTE' | 'NIT' | 'OTRO';

export type NivelFidelidad = 'Visitante' | 'Bronce' | 'Plata' | 'Oro' | 'Platino' | 'Diamante';

export interface Cliente {
  id: string;
  usuario_id: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nacionalidad?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  observaciones?: string;
  total_reservas_completadas?: number;
  total_gastado?: number;
  nivel_fidelidad?: NivelFidelidad;
  puntos_fidelidad?: number;
  created_at: string;
  updated_at: string;
  usuario?: Usuario;
}

// ---- PERSONAL ----

export type CargoPersonal =
  | 'Administrador'
  | 'Recepcionista'
  | 'Housekeeping'
  | 'Caja'
  | 'Supervisor';

export type TurnoPersonal = 'mañana' | 'tarde' | 'noche' | 'rotativo';

export interface Personal {
  id: string;
  usuario_id: string;
  codigo_empleado: string;
  cargo: CargoPersonal;
  turno?: TurnoPersonal;
  fecha_contratacion?: string;
  salario?: number;
  estado: 'activo' | 'inactivo';
  observaciones?: string;
  created_at: string;
  updated_at: string;
  usuario?: Usuario;
}

// ---- HABITACIONES ----

export type EstadoHabitacion =
  | 'disponible'
  | 'ocupada'
  | 'reservada'
  | 'limpieza'
  | 'mantenimiento'
  | 'bloqueada'
  | 'fuera_servicio';

export interface TipoHabitacion {
  id: string;
  nombre: string;
  descripcion?: string;
  capacidad_adultos: number;
  capacidad_ninos: number;
  numero_camas: number;
  tipo_cama?: string;
  metros_cuadrados?: number;
  imagen_url?: string;
  activo: boolean;
  precio_base?: number;
  created_at: string;
  updated_at: string;
  servicios?: Servicio[];
  tarifas?: Tarifa[];
}

export interface Habitacion {
  id: string;
  tipo_habitacion_id: string;
  numero: string;
  piso: number;
  descripcion?: string;
  estado: EstadoHabitacion;
  disponible_online: boolean;
  amenidades?: string[];
  observaciones?: string;
  created_at: string;
  updated_at: string;
  tipo_habitacion?: TipoHabitacion;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: 'hotel' | 'habitacion' | 'adicional';
  precio: number;
  incluido: boolean;
  activo: boolean;
}

export interface Tarifa {
  id: string;
  tipo_habitacion_id: string;
  nombre: string;
  descripcion?: string;
  precio_noche: number;
  moneda: string;
  fecha_inicio: string;
  fecha_fin?: string;
  aplica_fin_semana: boolean;
  activa: boolean;
}

// ---- RESERVAS ----

export type EstadoReserva =
  | 'pendiente'
  | 'confirmada'
  | 'en_estadia'
  | 'finalizada'
  | 'cancelada'
  | 'no_show';

export type OrigenReserva = 'web' | 'movil' | 'recepcion' | 'telefono' | 'otro';

export interface Reserva {
  id: string;
  codigo_reserva: string;
  cliente_id: string;
  fecha_entrada: string;
  fecha_salida: string;
  cantidad_adultos: number;
  cantidad_ninos: number;
  estado: EstadoReserva;
  origen: OrigenReserva;
  total_estimado: number;
  observaciones?: string;
  creado_por?: string;
  cancelado_por?: string;
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  detalle?: DetalleReserva[];
  pagos?: Pago[];
}

export interface DetalleReserva {
  id: string;
  reserva_id: string;
  habitacion_id: string;
  tarifa_id?: string;
  precio_noche: number;
  noches: number;
  subtotal: number;
  estado: 'reservada' | 'ocupada' | 'liberada' | 'cancelada';
  created_at: string;
  updated_at: string;
  habitacion?: Habitacion;
  tarifa?: Tarifa;
}

export interface HuespedesReserva {
  id: string;
  reserva_id: string;
  cliente_id?: string;
  nombre_completo: string;
  tipo_documento?: TipoDocumento;
  numero_documento?: string;
  nacionalidad?: string;
  fecha_nacimiento?: string;
  telefono?: string;
  correo?: string;
  es_titular: boolean;
  created_at: string;
}

// ---- PAGOS ----

export type TipoPago = 'anticipo' | 'pago_total' | 'saldo' | 'cargo_extra' | 'reembolso';
export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'anulado';

export interface MetodoPago {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface Pago {
  id: string;
  reserva_id: string;
  metodo_pago_id: string;
  registrado_por?: string;
  monto: number;
  moneda: string;
  tipo_pago: TipoPago;
  estado: EstadoPago;
  referencia?: string;
  fecha_pago: string;
  observaciones?: string;
  created_at: string;
  metodo_pago?: MetodoPago;
}

// ---- CHECKIN / CHECKOUT ----

export interface Checkin {
  id: string;
  reserva_id: string;
  cliente_id: string;
  recepcionista_id?: string;
  fecha_checkin: string;
  estado: 'realizado' | 'anulado';
  observaciones?: string;
  created_at: string;
}

export interface Checkout {
  id: string;
  reserva_id: string;
  checkin_id?: string;
  cajero_id?: string;
  fecha_checkout: string;
  total_final: number;
  cargos_extra: number;
  descuento: number;
  estado: 'realizado' | 'anulado';
  observaciones?: string;
  created_at: string;
}

// ---- HOUSEKEEPING ----

export type EstadoHousekeeping =
  | 'pendiente'
  | 'en_proceso'
  | 'terminado'
  | 'verificado'
  | 'rechazado';

export type PrioridadHousekeeping = 'baja' | 'normal' | 'alta' | 'urgente';

export interface Housekeeping {
  id: string;
  habitacion_id: string;
  asignado_a?: string;
  supervisor_id?: string;
  estado: EstadoHousekeeping;
  prioridad: PrioridadHousekeeping;
  fecha_asignacion: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  habitacion?: Habitacion;
}

// ---- INCIDENCIAS ----

export type CategoriaIncidencia =
  | 'habitaciones'
  | 'mantenimiento'
  | 'limpieza'
  | 'recepcion'
  | 'restaurante'
  | 'otro';

export type EstadoIncidencia =
  | 'nueva'
  | 'asignada'
  | 'en_proceso'
  | 'pendiente'
  | 'resuelta'
  | 'cerrada';

export type PrioridadIncidencia = 'baja' | 'media' | 'alta' | 'critica';

export interface Incidencia {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string;
  categoria: string;
  subcategoria?: string;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  origen: 'cliente' | 'recepcion' | 'housekeeping' | 'mantenimiento' | 'sistema';
  area_afectada?: string;
  habitacion_id?: string;
  cliente_id?: string;
  reportado_por: string;
  asignado_a?: string;
  fecha_atencion?: string;
  fecha_resolucion?: string;
  solucion?: string;
  observaciones_finales?: string;
  created_at: string;
  updated_at: string;
  habitacion?: Habitacion;
}

// ---- NOTIFICACIONES ----

export type TipoNotificacion =
  | 'sistema'
  | 'reserva'
  | 'pago'
  | 'checkin'
  | 'checkout'
  | 'housekeeping'
  | 'incidencia';

export interface Notificacion {
  id: string;
  usuario_id?: string;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
  canal: 'app' | 'web' | 'email' | 'sms' | 'push';
  leida: boolean;
  fecha_lectura?: string;
  referencia_tipo?: string;
  referencia_id?: string;
  created_at: string;
}

// ---- PRE CHECKIN ----

export interface PreCheckin {
  id: string;
  reserva_id: string;
  cliente_id: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  datos_confirmados: boolean;
  documentos_cargados: boolean;
  hora_estimada_llegada?: string;
  observaciones?: string;
  fecha_envio: string;
  fecha_revision?: string;
}

// ---- RESEÑAS ----

export interface Resena {
  id: string;
  reserva_id: string;
  cliente_id: string;
  calificacion: number;
  titulo?: string;
  comentario?: string;
  cal_limpieza?: number;
  cal_atencion?: number;
  cal_ubicacion?: number;
  cal_precio?: number;
  visible: boolean;
  foto_url?: string;
  created_at: string;
}

// ---- FAVORITOS ----

export interface Favorito {
  id: string;
  cliente_id: string;
  habitacion_id: string;
  created_at: string;
}

// ---- ANUNCIOS ----

export interface Anuncio {
  id: string;
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  tipo: 'evento' | 'promocion' | 'informativo' | 'novedad' | 'otro';
  imagen_url?: string;
  url_accion?: string;
  texto_boton?: string;
  visible_web: boolean;
  visible_app: boolean;
  solo_clientes: boolean;
  fecha_inicio: string;
  fecha_fin?: string;
  orden: number;
  activo: boolean;
  created_at: string;
}

// ---- CONFIGURACIÓN HOTEL ----

export interface ConfiguracionHotel {
  id: string;
  nombre_hotel: string;
  nit?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  telefono?: string;
  correo?: string;
  sitio_web?: string;
  logo_url?: string;
  moneda_principal: string;
  hora_checkin: string;
  hora_checkout: string;
  politica_cancelacion?: string;
  activo: boolean;
}

// ---- RESPUESTAS RPC ----

// Coincide con los campos reales de rpc_habitaciones_disponibles
export interface HabitacionDisponible {
  habitacion_id: string;
  id: string;
  numero: string;
  piso: number;
  nombre_tipo: string;
  descripcion?: string;
  capacidad_adultos: number;
  numero_camas: number;
  tipo_cama?: string;
  precio: number;
  servicios?: string;
  imagen_url?: string;
  // campos opcionales para compatibilidad
  capacidad_ninos?: number;
  moneda?: string;
  amenidades?: string[];
}

export interface MiPerfil {
  usuario_id: string;
  auth_user_id: string;
  nombre_completo: string;
  correo: string;
  telefono?: string;
  foto_url?: string;
  estado: string;
  rol: RolNombre;
  cliente_id?: string;
  tipo_documento?: string;
  numero_documento?: string;
  nacionalidad?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  // Campos de fidelidad
  nivel_fidelidad?: NivelFidelidad;
  puntos_fidelidad?: number;
  total_reservas_completadas?: number;
  total_gastado?: number;
}

export interface ResumenAdmin {
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

// ---- NAVEGACIÓN ----

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type ClienteTabParamList = {
  HomeCliente: undefined;
  Buscar: undefined;
  MisReservas: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
  Ajustes: undefined;
};

export type ClienteStackParamList = {
  ClienteTabs: undefined;
  DetalleHabitacion: {
    habitacionId: string;
    fechaEntrada: string;
    fechaSalida: string;
    adultos?: number;
    ninos?: number;
  };
  CrearReserva: {
    habitacionId: string;
    fechaEntrada: string;
    fechaSalida: string;
    adultos: number;
    ninos: number;
  };
  DetalleReserva: { reservaId: string };
  Pago: { reservaId: string };
  PreCheckin: { reservaId: string };
  Avisos: undefined;
  Buzon: undefined;
  Favoritos: undefined;
  SolicitudServicio: undefined;
};

export type PersonalTabParamList = {
  Dashboard: undefined;
  Housekeeping: undefined;
  Incidencias: undefined;
  Perfil: undefined;
};
