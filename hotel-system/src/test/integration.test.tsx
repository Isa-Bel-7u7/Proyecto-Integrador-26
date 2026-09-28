/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    perfil: {
      nombre_completo: 'Admin Hotel',
      correo: 'admin@hotel.com',
      rol: 'administrador',
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
  actualizarEstadoHabitacion: vi.fn(),
  getTiposHabitacion: vi.fn(),
  crearHabitacion: vi.fn(),
  getClientes: vi.fn(),
  getHabitacionesDisponibles: vi.fn(),
  getTareasHousekeeping: vi.fn(),
  actualizarHousekeeping: vi.fn(),
  crearTareaHousekeeping: vi.fn(),
  getPersonalActual: vi.fn(),
  getPagos: vi.fn(),
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
    habitacion_numero: '201',
    tipo_habitacion: 'Suite',
    piso: 2,
    estado: 'pendiente',
    prioridad: 'alta',
    personal_nombre: 'Ana García',
    fecha_asignacion: '2026-06-01T10:00:00',
    fecha_inicio: null,
    fecha_fin: null,
    observaciones: 'Limpieza post checkout',
  },
]

const pagosMock = [
  {
    pago_id: 'uuid-pago-001',
    reserva_codigo: 'RES-ABC12345',
    cliente_nombre: 'Juan Pérez',
    monto: 300,
    tipo_pago: 'parcial',
    estado: 'aprobado',
    metodo_nombre: 'Efectivo',
    fecha_pago: '2026-06-01T09:00:00',
    total_reserva: 600,
    saldo_pendiente: 300,
  },
]

// PI01 — PI03: Login
// Vinculado a RF02
describe('Login — pruebas de integración', () => {
  it('PI01 — renderiza campos de correo, contraseña y botón de sesión', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByPlaceholderText('correo@ejemplo.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('PI02 — el botón iniciar sesión está habilitado por defecto', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled()
  })

  it('PI03 — al escribir en el campo correo se actualiza el valor', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    const input = screen.getByPlaceholderText('correo@ejemplo.com')
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
    vi.mocked(api.getTareasHousekeeping).mockResolvedValue(tareasMock as never)
    vi.mocked(api.getHabitaciones).mockResolvedValue(habitacionesMock as never)
    vi.mocked(api.getPersonalActual).mockResolvedValue([] as never)
  })

  it('PI11 — renderiza la lista de tareas de housekeeping', async () => {
    render(<MemoryRouter><Housekeeping /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('201')).toBeInTheDocument()
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
    vi.mocked(api.getPagos).mockResolvedValue(pagosMock as never)
    vi.mocked(api.getMetodosPago).mockResolvedValue([] as never)
    vi.mocked(api.getReservasConSaldo).mockResolvedValue([] as never)
  })

it('PI14 — renderiza la lista de pagos con datos del mock', async () => {
    render(<MemoryRouter><Pagos /></MemoryRouter>)
    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes('300'))
      ).toBeInTheDocument()
    })
  })

  it('PI15 — el botón Registrar Pago está presente', async () => {
    render(<MemoryRouter><Pagos /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /registrar pago/i })).toBeInTheDocument()
    })
  })
})