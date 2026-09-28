// ============================================================
// PRINCIPIO DIP (Dependency Inversion Principle)
// Los componentes de la aplicación NO dependen directamente
// de Supabase para obtener el perfil del usuario. En cambio,
// dependen de la ABSTRACCIÓN AuthContextType (interfaz con
// perfil, cargando, cerrarSesion, recargarPerfil).
// Si el proveedor de autenticación cambiara, los consumidores
// (PersonalLayout, ProtectedRoute, Dashboard, etc.) no cambiarían.
//
// PRINCIPIO ISP (Interface Segregation Principle)
// AuthContextType expone SOLO lo que los consumidores necesitan:
//   - perfil: datos del usuario autenticado
//   - cargando: estado de inicialización
//   - cerrarSesion / recargarPerfil: acciones
// No expone la sesión de Supabase, el subscription ni internals.
//
// PRINCIPIO SRP (Single Responsibility Principle)
// Este contexto tiene una sola responsabilidad: gestionar el
// estado de autenticación global. No maneja UI ni lógica de negocio.
// ============================================================
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../services/supabase'
import type { PerfilUsuario } from '../types'

// ISP: interfaz mínima que expone el contexto a los consumidores
interface AuthContextType {
  perfil: PerfilUsuario | null
  cargando: boolean
  cerrarSesion: () => Promise<void>
  recargarPerfil: () => Promise<void>
}

// DIP: los componentes dependen de esta abstracción, no de supabase.auth directamente
const AuthContext = createContext<AuthContextType>({
  perfil: null,
  cargando: true,
  cerrarSesion: async () => {},
  recargarPerfil: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [cargando, setCargando] = useState(true)

  // SRP: función dedicada exclusivamente a cargar el perfil desde la BD
  const cargarPerfil = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_mi_perfil')
      if (error || !data || data.length === 0) {
        setPerfil(null)
      } else {
        setPerfil(data[0] as PerfilUsuario)
      }
    } catch {
      setPerfil(null)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    // Verifica sesión activa al montar el proveedor
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        cargarPerfil()
      } else {
        setCargando(false)
      }
    })

    // Escucha cambios de sesión en tiempo real (login / logout desde otra pestaña)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          cargarPerfil()
          if (event === 'SIGNED_IN') {
            // Registra auditoría de acceso sin bloquear el flujo principal
            void supabase.rpc('rpc_registrar_auditoria', {
              p_accion: 'acceso', p_modulo: 'sistema',
              p_descripcion: 'Inicio de sesión', p_criticidad: 'baja',
            })
          }
        } else {
          if (event === 'SIGNED_OUT') {
            void supabase.rpc('rpc_registrar_auditoria', {
              p_accion: 'cierre_sesion', p_modulo: 'sistema',
              p_descripcion: 'Cierre de sesión', p_criticidad: 'baja',
            })
          }
          setPerfil(null)
          setCargando(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const recargarPerfil = async () => {
    await cargarPerfil()
  }

  return (
    // DIP: proveemos la abstracción AuthContextType; los consumidores
    // llaman a useAuth() sin conocer los detalles de implementación
    <AuthContext.Provider value={{ perfil, cargando, cerrarSesion, recargarPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
