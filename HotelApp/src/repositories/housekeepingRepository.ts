import type { EstadoHousekeeping, TareaHousekeepingApp } from '../interfaces';
import { supabaseClient } from '../lib/supabaseClient';

// SRP: las consultas y RPC de Housekeeping quedan aisladas de la interfaz visual.
export const getTareasHousekeeping = async (): Promise<TareaHousekeepingApp[]> => {
  const { data, error } = await supabaseClient.rpc('rpc_tareas_housekeeping');
  if (error) throw error;
  return (data ?? []) as TareaHousekeepingApp[];
};

export const updateEstadoHousekeeping = async (id: string, estado: EstadoHousekeeping) => {
  const { error } = await supabaseClient.rpc('rpc_actualizar_housekeeping', {
    p_housekeeping_id: id,
    p_estado: estado,
    p_observaciones: null,
  });
  if (error) throw error;
};
