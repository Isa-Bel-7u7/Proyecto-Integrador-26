import type { NuevaIncidenciaApp } from '../interfaces';
import { getIncidenciasActivas, insertIncidencia } from '../repositories/incidenciasRepository';

export const obtenerIncidenciasActivas = () => getIncidenciasActivas();

// Service: aplica la normalización de datos antes de delegar la persistencia.
export const crearIncidencia = (incidencia: NuevaIncidenciaApp) =>
  insertIncidencia({
    ...incidencia,
    titulo: incidencia.titulo.trim(),
    descripcion: incidencia.descripcion.trim(),
  });
