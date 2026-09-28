/// <reference types="vitest/globals" />
import React from 'react'

export const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  MemoryRouter: ({ children }: { children: React.ReactNode }) => children,
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

export const mockPerfil = {
  nombre_completo: 'Admin Hotel',
  correo: 'admin@hotel.com',
  rol: 'administrador',
  usuario_id: 'uuid-admin-001',
}

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    perfil: mockPerfil,
    cerrarSesion: vi.fn(),
    cargando: false,
  }),
}))

vi.mock('../../services/api', () => ({
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

vi.mock('../../services/supabase', () => ({
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