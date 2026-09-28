import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Única instancia de infraestructura de Supabase de la aplicación.
 * Los módulos de compatibilidad pueden reexportarla sin crear clientes nuevos.
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

