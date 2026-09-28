import type { EstadoHousekeeping } from '../interfaces';
import { getTareasHousekeeping, updateEstadoHousekeeping } from '../repositories/housekeepingRepository';

export const obtenerTareasHousekeeping = () => getTareasHousekeeping();
export const actualizarEstadoHousekeeping = (id: string, estado: EstadoHousekeeping) =>
  updateEstadoHousekeeping(id, estado);

const transicionesEstado: Record<EstadoHousekeeping, EstadoHousekeeping[]> = {
  pendiente: ['en_proceso'],
  en_proceso: ['terminado'],
  terminado: ['verificado', 'rechazado'],
  verificado: [],
  rechazado: ['pendiente'],
};

// SRP/OCP: la regla de transición vive en el servicio y puede ampliarse sin modificar la pantalla.
export const obtenerEstadosSiguientes = (estado: EstadoHousekeeping) =>
  transicionesEstado[estado];
