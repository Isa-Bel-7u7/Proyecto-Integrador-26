import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'
import ChatbotWidget from '../components/ChatbotWidget'

// Auth
import Login from '../pages/auth/Login'
import Registro from '../pages/auth/Registro'
import RecuperarContrasenia from '../pages/auth/RecuperarContrasenia'

// Public
import LandingPage from '../pages/public/LandingPage'
import HabitacionesPublico from '../pages/public/HabitacionesPublico'

// Cliente
import InicioCliente from '../pages/cliente/InicioCliente'
import ReservarHabitacion from '../pages/cliente/ReservarHabitacion'
import FacturaCliente from '../pages/cliente/FacturaCliente'

// Personal
import Dashboard    from '../pages/personal/Dashboard'
import Reservas     from '../pages/personal/Reservas'
import Habitaciones from '../pages/personal/Habitaciones'
import Checkin      from '../pages/personal/Checkin'
import Checkout     from '../pages/personal/Checkout'
import Housekeeping from '../pages/personal/Housekeeping'
import Pagos        from '../pages/personal/Pagos'
import Incidencias  from '../pages/personal/Incidencias'
import Anuncios     from '../pages/personal/Anuncios'
import Buzon        from '../pages/personal/Buzon'
import Turnos       from '../pages/personal/Turnos'
import Reportes     from '../pages/personal/Reportes'
import Auditoria    from '../pages/personal/Auditoria'
import Resenas      from '../pages/personal/Resenas'
import Clientes     from '../pages/personal/Clientes'

// General
import NoAutorizado from '../pages/NoAutorizado'

const ROLES_PERSONAL = ['Administrador', 'Recepcionista', 'Housekeeping', 'Caja', 'Supervisor', 'Seguridad', 'Mantenimiento', 'Cocinero', 'Mesero', 'Lavandería', 'Gerente', 'Empleado'] as const

const AppRoutes = () => {
  const { perfil, cargando } = useAuth()

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0c0e' }}>
        <p style={{ color: 'rgba(240,236,228,0.3)', fontFamily: 'Montserrat, sans-serif', fontSize: '0.82rem', letterSpacing: '0.08em' }}>Cargando...</p>
      </div>
    )
  }

  const rutaInicial = () => {
    if (!perfil) return '/'
    if (perfil.rol === 'Cliente') return '/cliente/inicio'
    return '/personal/dashboard'
  }

  return (
    <BrowserRouter>
      <ChatbotWidget />
      <Routes>
        {/* Redirige / según estado de sesión */}
        <Route path="/" element={
          perfil
            ? <Navigate to={rutaInicial()} replace />
            : <LandingPage />
        } />

        {/* Páginas públicas — sin autenticación */}
        <Route path="/habitaciones"          element={<HabitacionesPublico />} />

        {/* Auth */}
        <Route path="/login"                 element={<Login />} />
        <Route path="/registro"              element={<Registro />} />
        <Route path="/recuperar-contrasenia" element={<RecuperarContrasenia />} />

        {/* Login de cliente (alias a /registro para flujo desde habitaciones) */}
        <Route path="/cliente/login"         element={<Registro />} />

        <Route path="/no-autorizado"         element={<NoAutorizado />} />

        {/* ─── CLIENTE ─────────────────────────────────── */}
        <Route path="/cliente/inicio" element={
          <ProtectedRoute rolesPermitidos={['Cliente']}>
            <InicioCliente />
          </ProtectedRoute>
        } />
        <Route path="/cliente/reservar" element={
          <ProtectedRoute rolesPermitidos={['Cliente']}>
            <ReservarHabitacion />
          </ProtectedRoute>
        } />
        <Route path="/cliente/factura/:reservaId" element={
          <ProtectedRoute rolesPermitidos={['Cliente']}>
            <FacturaCliente />
          </ProtectedRoute>
        } />

        {/* ─── PERSONAL ────────────────────────────────── */}
        <Route path="/personal/dashboard" element={
          <ProtectedRoute rolesPermitidos={[...ROLES_PERSONAL]}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/personal/reservas" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Recepcionista','Supervisor']}>
            <Reservas />
          </ProtectedRoute>
        } />
        <Route path="/personal/habitaciones" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Recepcionista','Supervisor']}>
            <Habitaciones />
          </ProtectedRoute>
        } />
        <Route path="/personal/checkin" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Recepcionista','Supervisor']}>
            <Checkin />
          </ProtectedRoute>
        } />
        <Route path="/personal/checkout" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Recepcionista','Caja','Supervisor']}>
            <Checkout />
          </ProtectedRoute>
        } />
        <Route path="/personal/housekeeping" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Housekeeping','Supervisor']}>
            <Housekeeping />
          </ProtectedRoute>
        } />
        <Route path="/personal/pagos" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Caja','Recepcionista','Supervisor']}>
            <Pagos />
          </ProtectedRoute>
        } />
        <Route path="/personal/incidencias" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Recepcionista','Supervisor','Housekeeping']}>
            <Incidencias />
          </ProtectedRoute>
        } />
        <Route path="/personal/anuncios" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Supervisor','Recepcionista']}>
            <Anuncios />
          </ProtectedRoute>
        } />
        <Route path="/personal/buzon" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Supervisor','Recepcionista']}>
            <Buzon />
          </ProtectedRoute>
        } />
        <Route path="/personal/turnos" element={
          <ProtectedRoute rolesPermitidos={[...ROLES_PERSONAL]}>
            <Turnos />
          </ProtectedRoute>
        } />
        <Route path="/personal/reportes" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Supervisor']}>
            <Reportes />
          </ProtectedRoute>
        } />
        <Route path="/personal/auditoria" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Supervisor']}>
            <Auditoria />
          </ProtectedRoute>
        } />
        <Route path="/personal/resenas" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Supervisor']}>
            <Resenas />
          </ProtectedRoute>
        } />
        <Route path="/personal/clientes" element={
          <ProtectedRoute rolesPermitidos={['Administrador','Supervisor']}>
            <Clientes />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={rutaInicial()} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
