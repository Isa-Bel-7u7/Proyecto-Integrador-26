/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    perfil: {
      nombre_completo: 'Admin Hotel',
      correo: 'admin@hotel.com',
      rol: 'Administrador',
      usuario_id: 'uuid-admin-001',
    },
    cerrarSesion: vi.fn(),
    cargando: false,
  }),
}))

vi.mock('../services/api', () => ({
  getReservas: vi.fn(),
  confirmarReserva: vi.fn(),
  cancelarReserva: vi.fn(),
  getHabitaciones: vi.fn(),
  getPortadasHabitaciones: vi.fn(),
  actualizarEstadoHabitacion: vi.fn(),
  getTiposHabitacion: vi.fn(),
  crearHabitacion: vi.fn(),
  getClientes: vi.fn(),
  getHabitacionesDisponibles: vi.fn(),
  getTareasHousekeeping: vi.fn(),
  actualizarHousekeeping: vi.fn(),
  crearTareaHousekeeping: vi.fn(),
  getPersonalActual: vi.fn(),
  getResumenPagos: vi.fn(),
  getReservasConPagos: vi.fn(),
  getHistorialPagos: vi.fn(),
  getMetodosPago: vi.fn(),
  registrarPago: vi.fn(),
  getReservasConSaldo: vi.fn(),
  getIncidencias: vi.fn(),
  crearIncidencia: vi.fn(),
  actualizarIncidencia: vi.fn(),
  getReportesResumen: vi.fn(),
  getMisReservas: vi.fn(),
  getMisNotificaciones: vi.fn(),
  marcarNotificacionLeida: vi.fn(),
  getResumenAdmin: vi.fn(),
}))

vi.mock('../repositories/rpcRepository', () => ({
  executeRpc: vi.fn(),
}))

vi.mock('../services/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({ data: [], error: null })),
        eq: vi.fn(() => ({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ data: [], error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

import * as api from '../services/api'
import { executeRpc } from '../repositories/rpcRepository'
import Login from '../pages/auth/Login'
import Reservas from '../pages/personal/Reservas'
import Habitaciones from '../pages/personal/Habitaciones'
import Housekeeping from '../pages/personal/Housekeeping'
import Pagos from '../pages/personal/Pagos'

const reservasMock = [
  {
    reserva_id: 'uuid-res-001',
    codigo_reserva: 'RES-ABC12345',
    cliente_nombre: 'Juan Pérez',
    cliente_correo: 'juan@correo.com',
    fecha_entrada: '2026-06-10',
    fecha_salida: '2026-06-13',
    estado: 'confirmada',
    origen: 'web',
    total_estimado: 600,
    cantidad_habitaciones: 1,
  },
  {
    reserva_id: 'uuid-res-002',
    codigo_reserva: 'RES-XYZ67890',
    cliente_nombre: 'María López',
    cliente_correo: 'maria@correo.com',
    fecha_entrada: '2026-06-15',
    fecha_salida: '2026-06-17',
    estado: 'pendiente',
    origen: 'recepcion',
    total_estimado: 400,
    cantidad_habitaciones: 1,
  },
]

const habitacionesMock = [
  {
    id: 'uuid-hab-001',
    numero: '101',
    piso: 1,
    estado: 'disponible',
    descripcion: 'Habitación individual piso 1',
    disponible_online: true,
    observaciones: '',
    tipo_habitacion_id: 'uuid-tipo-001',
    tipos_habitacion: {
      id: 'uuid-tipo-001',
      nombre: 'Individual',
      capacidad_adultos: 1,
      capacidad_ninos: 0,
      numero_camas: 1,
      tipo_cama: 'simple',
      precio_base: 150,
    },
  },
  {
    id: 'uuid-hab-002',
    numero: '201',
    piso: 2,
    estado: 'ocupada',
    descripcion: 'Suite piso 2',
    disponible_online: true,
    observaciones: '',
    tipo_habitacion_id: 'uuid-tipo-002',
    tipos_habitacion: {
      id: 'uuid-tipo-002',
      nombre: 'Suite',
      capacidad_adultos: 2,
      capacidad_ninos: 1,
      numero_camas: 1,
      tipo_cama: 'king',
      precio_base: 450,
    },
  },
]

const tareasMock = [
  {
    id: 'uuid-task-001',
    codigo: 'HK-001',
    habitacion_id: 'uuid-hab-002',
    habitacion_numero: '201',
    tipo_habitacion: 'Suite',
    piso: 2,
    hab_estado: 'limpieza',
    estado: 'pendiente',
    prioridad: 'alta',
    personal_id: 'uuid-personal-001',
    personal_nombre: 'Ana García',
    personal_cargo: 'Housekeeping',
    fecha_programada: '2026-06-01',
    hora_inicio: null,
    hora_fin: null,
    observaciones: 'Limpieza post checkout',
    obs_inspector: null,
    checklist_total: 4,
    checklist_ok: 1,
    created_at: '2026-06-01T10:00:00',
  },
]

const reservasPagoMock = [
  {
    reserva_id: 'uuid-res-001',
    codigo_reserva: 'RES-ABC12345',
    cliente_nombre: 'Juan Pérez',
    fecha_entrada: '2026-06-10',
    fecha_salida: '2026-06-13',
    estado_reserva: 'confirmada',
    total_estimado: 600,
    habitacion_numero: '101',
    tipo_habitacion: 'Individual',
    total_pagado: 300,
    saldo_pendiente: 300,
    ultimo_pago: '2026-06-01T09:00:00',
    estado_pago: 'parcial',
  },
]

// PI01 — PI03: Login
// Vinculado a RF02
describe('Login — pruebas de integración', () => {
  it('PI01 — renderiza campos de correo, contraseña y botón de sesión', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByPlaceholderText('empleado@hotel.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('PI02 — el botón iniciar sesión está habilitado por defecto', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled()
  })

  it('PI03 — al escribir en el campo correo se actualiza el valor', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    const input = screen.getByPlaceholderText('empleado@hotel.com')
    fireEvent.change(input, { target: { value: 'admin@hotel.com' } })
    expect(input).toHaveValue('admin@hotel.com')
  })
})

// PI04 — PI08: Reservas
// Vinculado a RF19, RF22

describe('Reservas — pruebas de integración', () => {
  beforeEach(() => {
    vi.mocked(api.getReservas).mockResolvedValue(reservasMock as never)
    vi.mocked(api.getClientes).mockResolvedValue([] as never)
    vi.mocked(api.getHabitacionesDisponibles).mockResolvedValue([] as never)
  })

  it('PI04 — renderiza el toolbar con botón de nueva reserva', async () => {
    render(<MemoryRouter><Reservas /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nueva reserva/i })).toBeInTheDocument()
    })
  })

  it('PI05 — muestra los datos de reservas en la tabla', async () => {
    render(<MemoryRouter><Reservas /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('RES-ABC12345')).toBeInTheDocument()
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })
  })

  it('PI06 — el filtro Pendientes muestra solo reservas pendientes', async () => {
    render(<MemoryRouter><Reservas /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('RES-ABC12345')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /pendientes/i }))
    await waitFor(() => {
      expect(screen.queryByText('RES-ABC12345')).not.toBeInTheDocument()
      expect(screen.getByText('RES-XYZ67890')).toBeInTheDocument()
    })
  })

  it('PI07 — el botón Nueva Reserva abre el modal', async () => {
    render(<MemoryRouter><Reservas /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nueva reserva/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }))
    await waitFor(() => {
      expect(screen.getByText(/registro desde recepción/i)).toBeInTheDocument()
    })
  })

it('PI08 — el modal tiene campos de cliente y fechas', async () => {
    render(<MemoryRouter><Reservas /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nueva reserva/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }))
    await waitFor(() => {
      expect(screen.getByText(/registro desde recepción/i)).toBeInTheDocument()
      expect(screen.getByText(/fecha entrada/i)).toBeInTheDocument()
      expect(screen.getByText(/fecha salida/i)).toBeInTheDocument()
      expect(screen.getByText(/adultos/i)).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════
// PI09 — PI10: Habitaciones
// Vinculado a RF12, RF14
// ════════════════════════════════════════════════════
describe('Habitaciones — pruebas de integración', () => {
  beforeEach(() => {
    vi.mocked(api.getHabitaciones).mockResolvedValue(habitacionesMock as never)
    vi.mocked(api.getTiposHabitacion).mockResolvedValue([] as never)
    vi.mocked(api.getPortadasHabitaciones).mockResolvedValue([] as never)
  })

  it('PI09 — renderiza tarjetas con número de habitación', async () => {
    render(<MemoryRouter><Habitaciones /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
      expect(screen.getByText('201')).toBeInTheDocument()
    })
  })

  it('PI10 — el botón Nueva Habitación está presente', async () => {
    render(<MemoryRouter><Habitaciones /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nueva habitación/i })).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════
// PI11 — PI13: Housekeeping
// Vinculado a RF41, RF42
// ════════════════════════════════════════════════════
describe('Housekeeping — pruebas de integración', () => {
  beforeEach(() => {
    vi.mocked(api.getHabitaciones).mockResolvedValue(habitacionesMock as never)
    vi.mocked(executeRpc).mockImplementation(async (fn) => {
      if (fn === 'rpc_get_tareas_housekeeping') return tareasMock
      if (fn === 'rpc_get_resumen_housekeeping') return [{
        total_habitaciones: 2, disponibles: 1, ocupadas: 0,
        limpieza: 1, mantenimiento: 0, pendientes: 1,
        en_progreso: 0, completadas: 0, aprobadas_hoy: 0,
        rechazadas: 0, retrasadas: 0,
      }]
      return []
    })
  })

  it('PI11 — renderiza la lista de tareas de housekeeping', async () => {
    render(<MemoryRouter><Housekeeping /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Hab. 201')).toBeInTheDocument()
    })
  })

  it('PI12 — muestra la prioridad de cada tarea', async () => {
    render(<MemoryRouter><Housekeeping /></MemoryRouter>)
    await waitFor(() => {
      const elementos = screen.getAllByText(/alta/i)
      expect(elementos.length).toBeGreaterThan(0)
    })
  })

  it('PI13 — el botón Nueva Tarea está presente', async () => {
    render(<MemoryRouter><Housekeeping /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nueva tarea/i })).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════
// PI14 — PI15: Pagos
// Vinculado a RF29, RF30
// ════════════════════════════════════════════════════
describe('Pagos — pruebas de integración', () => {
  beforeEach(() => {
    vi.mocked(api.getResumenPagos).mockResolvedValue({
      hoy_total: 300, mes_total: 300, pagos_hoy: 1, pendientes: 1,
    } as never)
    vi.mocked(api.getReservasConPagos).mockResolvedValue(reservasPagoMock as never)
    vi.mocked(api.getMetodosPago).mockResolvedValue([
      { id: 'uuid-metodo-001', nombre: 'Efectivo' },
    ] as never)
    vi.mocked(api.getHistorialPagos).mockResolvedValue([] as never)
  })

it('PI14 — renderiza la lista de pagos con datos del mock', async () => {
    render(<MemoryRouter><Pagos /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('RES-ABC12345')).toBeInTheDocument()
      expect(screen.getAllByText('Bs. 300').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('PI15 — el botón Registrar Pago está presente', async () => {
    render(<MemoryRouter><Pagos /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('RES-ABC12345')).toBeInTheDocument())
    fireEvent.click(screen.getByText('RES-ABC12345'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /registrar bs/i })).toBeInTheDocument()
    })
  })
})
