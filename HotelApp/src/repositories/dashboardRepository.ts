import type { ResumenAdmin } from '../interfaces';
import { supabaseClient } from '../lib/supabaseClient';

// SRP: este repository es el único responsable del acceso a datos del Dashboard.
export const getResumenAdmin = async (): Promise<ResumenAdmin | null> => {
  const { data, error } = await supabaseClient.rpc('rpc_resumen_admin');
  if (error) throw error;
  return data?.[0] ?? null;
};
