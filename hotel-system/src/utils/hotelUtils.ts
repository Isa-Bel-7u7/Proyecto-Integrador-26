// ============================================================
// PRINCIPIO DRY (Don't Repeat Yourself)
// Todas las operaciones de cálculo y validación del dominio
// hotelero están centralizadas en este único módulo. Ninguna
// página calcula noches, formatea precios o valida fechas
// por su cuenta: todas importan desde aquí.
//
// PRINCIPIO SRP (Single Responsibility Principle)
// Este módulo tiene UNA sola razón para cambiar: las reglas
// de negocio puras del hotel (fechas, precios, validaciones).
// ============================================================

// ── Validación de fechas ──────────────────────────────
// SRP: responsabilidad única → validar que salida sea posterior a entrada
export const validarFechas = (entrada: string, salida: string): boolean => {
  if (!entrada || !salida) return false
  return new Date(salida) > new Date(entrada)
}

// ── Cálculo de noches ─────────────────────────────────
// DRY: fórmula definida una sola vez, reutilizada en Reservas, LandingPage, etc.
export const calcularNoches = (entrada: string, salida: string): number => {
  const diff = new Date(salida).getTime() - new Date(entrada).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

// ── Cálculo de total ──────────────────────────────────
export const calcularTotal = (noches: number, precioPorNoche: number): number => {
  return noches * precioPorNoche
}

// ── Cálculo de saldo ──────────────────────────────────
export const calcularSaldo = (total: number, pagado: number): number => {
  const saldo = total - pagado
  return saldo < 0 ? 0 : saldo
}

// ── Generador de código de reserva ────────────────────
// SRP: responsabilidad única → generar un código único alfanumérico
export const generarCodigoReserva = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let codigo = 'RES-'
  for (let i = 0; i < 8; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return codigo
}

// ── Validación de correo ──────────────────────────────
export const validarCorreo = (correo: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(correo)
}

// ── Validación de contraseña ──────────────────────────
export const validarPassword = (password: string): boolean => {
  return password.length >= 8
}

// ── Formateo de precio ────────────────────────────────
// DRY: el formato "Bs. X.XX" se define una sola vez aquí.
// Evita que cada componente formatee el precio de distinta manera.
export const formatearPrecio = (monto: number): string => {
  return `Bs. ${monto.toFixed(2)}`
}

// ── Estado de pago según saldo ────────────────────────
// SRP: decide el estado del pago según la lógica de negocio.
// Los componentes de UI solo consultan este resultado; no calculan el estado ellos mismos.
export const determinarEstadoPago = (
  total: number,
  pagado: number
): 'pendiente' | 'parcial' | 'pagado' => {
  if (pagado <= 0) return 'pendiente'
  if (pagado >= total) return 'pagado'
  return 'parcial'
}
