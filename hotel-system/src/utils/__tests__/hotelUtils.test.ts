import { describe, it, expect } from 'vitest'
import {
    validarFechas,
    calcularNoches,
    calcularTotal,
    calcularSaldo,
    generarCodigoReserva,
    validarCorreo,
    validarPassword,
    formatearPrecio,
    determinarEstadoPago,
} from '../hotelUtils'

// PU01 — PU02: Validación de fechas
// Vinculado a RF16: El sistema debe validar fechas
describe('validarFechas', () => {
  it('PU01 — retorna false si la fecha de salida es igual a la de entrada', () => {
    expect(validarFechas('2026-06-01', '2026-06-01')).toBe(false)
  })

  it('PU01 — retorna false si la fecha de salida es anterior a la de entrada', () => {
    expect(validarFechas('2026-06-10', '2026-06-05')).toBe(false)
  })

  it('PU02 — retorna true si la fecha de salida es posterior a la de entrada', () => {
    expect(validarFechas('2026-06-01', '2026-06-05')).toBe(true)
  })

  it('PU02 — retorna false si alguna fecha está vacía', () => {
    expect(validarFechas('', '2026-06-05')).toBe(false)
    expect(validarFechas('2026-06-01', '')).toBe(false)
  })
})

// PU03: Cálculo de noches
// Vinculado a RF30: El sistema debe calcular montos
describe('calcularNoches', () => {
  it('PU03 — calcula correctamente 3 noches', () => {
    expect(calcularNoches('2026-06-01', '2026-06-04')).toBe(3)
  })

  it('PU03 — calcula correctamente 1 noche', () => {
    expect(calcularNoches('2026-06-01', '2026-06-02')).toBe(1)
  })

  it('PU03 — retorna 0 si las fechas son iguales', () => {
    expect(calcularNoches('2026-06-01', '2026-06-01')).toBe(0)
  })

  it('PU03 — calcula correctamente 7 noches', () => {
    expect(calcularNoches('2026-06-01', '2026-06-08')).toBe(7)
  })
})

// PU04: Cálculo de total estimado
// Vinculado a RF30: El sistema debe calcular montos
describe('calcularTotal', () => {
  it('PU04 — calcula correctamente el total de la reserva', () => {
    expect(calcularTotal(3, 200)).toBe(600)
  })

  it('PU04 — retorna 0 si las noches son 0', () => {
    expect(calcularTotal(0, 200)).toBe(0)
  })

  it('PU04 — calcula correctamente con precio fraccionado', () => {
    expect(calcularTotal(2, 150.5)).toBe(301)
  })
})

// PU05 — PU07: Cálculo de saldo
// Vinculado a RF30, RF32: Control de saldos y pagos
describe('calcularSaldo', () => {
  it('PU05 — calcula saldo pendiente después de pago parcial', () => {
    expect(calcularSaldo(600, 200)).toBe(400)
  })

  it('PU06 — retorna 0 cuando el pago cubre el total exacto', () => {
    expect(calcularSaldo(600, 600)).toBe(0)
  })

  it('PU07 — retorna 0 cuando el pago supera el total', () => {
    expect(calcularSaldo(600, 700)).toBe(0)
  })

  it('PU05 — calcula saldo correctamente con monto decimal', () => {
    expect(calcularSaldo(301, 100)).toBe(201)
  })
})

// PU08 — PU09: Generación de código de reserva
// Vinculado a RF20: El sistema debe generar código único

describe('generarCodigoReserva', () => {
  it('PU08 — genera código con formato RES-XXXXXXXX', () => {
    const codigo = generarCodigoReserva()
    expect(codigo).toMatch(/^RES-[A-Z0-9]{8}$/)
  })

  it('PU08 — el código tiene exactamente 12 caracteres', () => {
    const codigo = generarCodigoReserva()
    expect(codigo.length).toBe(12)
  })

  it('PU09 — dos códigos generados son diferentes', () => {
    const codigo1 = generarCodigoReserva()
    const codigo2 = generarCodigoReserva()
    expect(codigo1).not.toBe(codigo2)
  })
})

// ════════════════════════════════════════════════════
// PU10 — PU11: Validación de correo electrónico
// Vinculado a RF01: El sistema debe validar datos de registro
// ════════════════════════════════════════════════════
describe('validarCorreo', () => {
  it('PU10 — retorna true para correo válido', () => {
    expect(validarCorreo('admin@hotel.com')).toBe(true)
  })

  it('PU10 — retorna true para correo con subdominios', () => {
    expect(validarCorreo('cliente@correo.com.bo')).toBe(true)
  })

  it('PU11 — retorna false para correo sin @', () => {
    expect(validarCorreo('adminhotel.com')).toBe(false)
  })

  it('PU11 — retorna false para correo sin dominio', () => {
    expect(validarCorreo('admin@')).toBe(false)
  })

  it('PU11 — retorna false para correo vacío', () => {
    expect(validarCorreo('')).toBe(false)
  })
})

// ════════════════════════════════════════════════════
// PU12 — PU13: Validación de contraseña
// Vinculado a RNF06: Contraseñas deben almacenarse cifradas
// ════════════════════════════════════════════════════
describe('validarPassword', () => {
  it('PU12 — retorna true para contraseña de 8 caracteres', () => {
    expect(validarPassword('Admin123')).toBe(true)
  })

  it('PU12 — retorna true para contraseña larga', () => {
    expect(validarPassword('MiContrasena2026!')).toBe(true)
  })

  it('PU13 — retorna false para contraseña de 7 caracteres', () => {
    expect(validarPassword('Admin12')).toBe(false)
  })

  it('PU13 — retorna false para contraseña vacía', () => {
    expect(validarPassword('')).toBe(false)
  })
})

// ════════════════════════════════════════════════════
// PU14: Formateo de precio
// Vinculado a RF29: El sistema debe mostrar montos claramente
// ════════════════════════════════════════════════════
describe('formatearPrecio', () => {
  it('PU14 — formatea precio entero correctamente', () => {
    expect(formatearPrecio(200)).toBe('Bs. 200.00')
  })

  it('PU14 — formatea precio decimal correctamente', () => {
    expect(formatearPrecio(150.5)).toBe('Bs. 150.50')
  })

  it('PU14 — formatea precio cero correctamente', () => {
    expect(formatearPrecio(0)).toBe('Bs. 0.00')
  })
})

// ════════════════════════════════════════════════════
// PU15: Estado de pago según saldo
// Vinculado a RF30, RF31, RF32: Control de estado de pago
// ════════════════════════════════════════════════════
describe('determinarEstadoPago', () => {
  it('PU15 — retorna pendiente si no se ha pagado nada', () => {
    expect(determinarEstadoPago(600, 0)).toBe('pendiente')
  })

  it('PU15 — retorna parcial si se pagó menos del total', () => {
    expect(determinarEstadoPago(600, 300)).toBe('parcial')
  })

  it('PU15 — retorna pagado si se cubrió el total exacto', () => {
    expect(determinarEstadoPago(600, 600)).toBe('pagado')
  })

  it('PU15 — retorna pagado si el pago supera el total', () => {
    expect(determinarEstadoPago(600, 700)).toBe('pagado')
  })
})