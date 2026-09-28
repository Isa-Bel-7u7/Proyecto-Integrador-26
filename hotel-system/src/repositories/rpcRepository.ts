// ============================================================
// PRINCIPIO DRY (Don't Repeat Yourself)
// Sin este módulo, cada llamada a un RPC de Supabase repetiría:
//   const { data, error } = await supabase.rpc(fn, params)
//   if (error) throw new Error(error.message)
// Esta función centraliza ese patrón una sola vez.
//
// PRINCIPIO DIP (Dependency Inversion Principle)
// Los módulos de alto nivel (Dashboard, Auditoria, Reservas)
// dependen de executeRpc (abstracción), no de supabase.rpc()
// directamente (detalle de implementación). Si se cambia el
// proveedor de backend, solo cambia este archivo.
//
// PRINCIPIO SRP (Single Responsibility Principle)
// Una sola responsabilidad: ejecutar RPCs y propagar errores.
// No transforma datos, no aplica reglas de negocio.
// ============================================================
import { supabase } from '../services/supabase'

// DRY + DIP: punto único de acceso a los Stored Procedures de la base de datos
/** Ejecuta RPCs sin imponer reglas de negocio ni transformar su respuesta. */
export const executeRpc = async (fn: string, params: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc(fn, params)
  if (error) throw new Error(error.message)
  return data
}
