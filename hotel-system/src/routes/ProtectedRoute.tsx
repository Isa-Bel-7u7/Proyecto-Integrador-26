// ============================================================
// PRINCIPIO KISS (Keep It Simple, Stupid)
// Este componente hace UNA sola cosa de manera simple y legible:
// proteger rutas verificando autenticación y rol. 30 líneas,
// tres casos (cargando / sin perfil / sin rol), sin lógica extra.
//
// PRINCIPIO SRP (Single Responsibility Principle)
// Responsabilidad única: decidir si el usuario puede acceder
// a una ruta. No renderiza contenido propio, no llama a la BD,
// no gestiona formularios.
//
// PRINCIPIO DIP (Dependency Inversion Principle)
// Depende de la abstracción useAuth() (AuthContextType), no de
// supabase.auth directamente. El componente no sabe cómo se
// implementa la autenticación internamente.
// ============================================================
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { RolUsuario } from '../types'

interface Props {
  children: React.ReactNode
  rolesPermitidos?: RolUsuario[]  // ISP: solo el subconjunto de roles que necesita esta ruta
}

// KISS: tres casos simples, sin lógica compleja
const ProtectedRoute = ({ children, rolesPermitidos }: Props) => {
  // DIP: consume la abstracción del contexto, no Supabase directamente
  const { perfil, cargando } = useAuth()

  // Caso 1: esperando verificación de sesión
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  // Caso 2: no autenticado → redirige al login
  if (!perfil) {
    return <Navigate to="/login" replace />
  }

  // Caso 3: autenticado pero sin el rol requerido → acceso denegado
  if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) {
    return <Navigate to="/no-autorizado" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
