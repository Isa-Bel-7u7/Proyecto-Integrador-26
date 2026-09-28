// ============================================================
// PRINCIPIO ISP (Interface Segregation Principle)
// Las interfaces están divididas por responsabilidad:
//   - RolUsuario: solo los roles del sistema
//   - NivelFidelidad: solo los niveles del programa de fidelidad
//   - PerfilUsuario: datos completos del perfil (usado donde se necesita todo)
//   - EstadoPerfil: subconjunto mínimo para verificar autorización
//
// Un componente que solo necesita saber el rol del usuario
// puede trabajar con EstadoPerfil sin recibir los 20+ campos
// de PerfilUsuario. Los clientes no dependen de interfaces
// que no usan.
//
// PRINCIPIO LSP (Liskov Substitution Principle)
// RolUsuario es una unión de tipos literales (discriminated union).
// Cualquier función que acepte RolUsuario puede recibir cualquiera
// de sus variantes y comportarse correctamente, sin comprobaciones
// adicionales de tipo en tiempo de ejecución.
// ============================================================

// LSP: unión discriminada — cada rol es intercambiable donde se espera RolUsuario
export type RolUsuario =
  | 'Cliente'
  | 'Administrador'
  | 'Recepcionista'
  | 'Housekeeping'
  | 'Caja'
  | 'Supervisor'
  | 'Seguridad'
  | 'Mantenimiento'
  | 'Cocinero' 
  | 'Mesero'
  | 'Lavandería'
  | 'Gerente'
  | 'Empleado'

// ISP: interfaz separada, solo para el sistema de fidelidad
export type NivelFidelidad = 'Visitante' | 'Bronce' | 'Plata' | 'Oro' | 'Platino' | 'Diamante'

// ISP: perfil completo — usado en contextos donde se necesitan todos los 
// datos del usuario
export interface PerfilUsuario {
  usuario_id: string
  auth_user_id: string
  nombre_completo: string
  correo: string
  telefono: string | null
  foto_url: string | null
  estado: string
  rol: RolUsuario
  cliente_id: string | null
  tipo_documento: string | null
  numero_documento: string | null
  nacionalidad: string | null
  fecha_nacimiento: string | null
  direccion: string | null
  ciudad: string | null
  pais: string | null
  nivel_fidelidad: NivelFidelidad | null
  total_reservas_completadas: number | null
  puntos_fidelidad: number | null
  total_gastado: number | null
}

// ISP: interfaz reducida — solo los campos necesarios para verificar permisos.
// ProtectedRoute y guardias de acceso usan esto sin necesitar el perfil completo.
export interface EstadoPerfil {
  usuario_id: string
  correo: string
  rol: RolUsuario
  tiene_perfil_cliente: boolean
  cliente_id: string | null
}
