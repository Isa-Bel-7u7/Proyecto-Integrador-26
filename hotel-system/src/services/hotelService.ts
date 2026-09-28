/**
 * Capa de aplicación del sistema hotelero.
 *
 * Por ahora delega sin transformar datos para preservar exactamente las reglas
 * existentes. Este punto estable permite introducir reglas de negocio de forma
 * incremental sin volver a acoplar la UI a Supabase.
 */
export * from '../repositories/hotelRepository'

