import { getResumenAdmin } from '../repositories/dashboardRepository';

// Capa de aplicación: desacopla el caso de uso de Dashboard de su repository.
export const obtenerResumenAdmin = () => getResumenAdmin();
