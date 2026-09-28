import type { EstadoHousekeeping } from './index';

// ISP: contratos específicos para los casos de uso del personal.
export interface TareaHousekeepingApp {
  housekeeping_id: string;
  habitacion_id: string;
  numero_habitacion: string;
  piso: number;
  estado: EstadoHousekeeping;
  prioridad: string;
  fecha_asignacion: string;
  observaciones?: string;
}

export interface IncidenciaActivaApp {
  incidencia_id: string;
  habitacion?: string;
  categoria: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  created_at: string;
}

export interface NuevaIncidenciaApp {
  reportadoPor: string;
  categoria: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
}
