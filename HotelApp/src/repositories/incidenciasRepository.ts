import type { IncidenciaActivaApp, NuevaIncidenciaApp } from '../interfaces';
import { supabaseClient } from '../lib/supabaseClient';

// DIP: las capas superiores dependen de este contrato de acceso, no de Supabase directamente.
export const getIncidenciasActivas = async (): Promise<IncidenciaActivaApp[]> => {
  const { data, error } = await supabaseClient.rpc('rpc_incidencias_activas');
  if (error) throw error;
  return (data ?? []) as IncidenciaActivaApp[];
};

export const insertIncidencia = async (incidencia: NuevaIncidenciaApp) => {
  const { error } = await supabaseClient.from('incidencias').insert({
    reportado_por: incidencia.reportadoPor,
    categoria: incidencia.categoria,
    titulo: incidencia.titulo,
    descripcion: incidencia.descripcion,
    prioridad: incidencia.prioridad,
    estado: 'nueva',
    origen: 'recepcion',
  });
  if (error) throw error;
};
