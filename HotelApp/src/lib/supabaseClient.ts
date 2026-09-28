import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * CLEAN ARCHITECTURE - Infraestructura:
 * única instancia de Supabase para evitar configuración duplicada (DRY).
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // La versión anterior de la app dejó un refresh token revocado en Expo Go.
    // Una clave versionada evita recuperar esa sesión corrupta sin tocar datos remotos.
    storageKey: 'grand-hotel-mobile-auth-v2',
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
