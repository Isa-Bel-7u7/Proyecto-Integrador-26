import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { MiPerfil, RolNombre } from '../types';
import { Session } from '@supabase/supabase-js';

// ============================================================
// TIPOS DEL CONTEXTO
// ============================================================

interface AuthContextType {
  session: Session | null;
  perfil: MiPerfil | null;
  rol: RolNombre | null;
  cargando: boolean;
  cargandoPerfil: boolean;
  esCliente: boolean;
  esPersonal: boolean;
  signIn: (correo: string, password: string) => Promise<{ error: string | null }>;
  signUp: (correo: string, password: string, nombre: string, telefono?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  recargarPerfil: () => Promise<void>;
}

// ============================================================
// CONTEXTO
// ============================================================

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  const rol = perfil?.rol ?? null;
  const esCliente = rol === 'Cliente';
  const esPersonal = rol !== null && rol !== 'Cliente';

  // ---- Cargar perfil desde RPC ----
  const cargarPerfil = async () => {
    try {
      setCargandoPerfil(true);
      const { data, error } = await supabase.rpc('rpc_mi_perfil');
      if (error) {
        console.error('Error cargando perfil:', error.message);
        setPerfil(null);
        return;
      }
      if (data && data.length > 0) {
        setPerfil(data[0] as MiPerfil);
      } else {
        setPerfil(null);
      }
    } catch (e) {
      console.error('Error inesperado cargando perfil:', e);
      setPerfil(null);
    } finally {
      setCargandoPerfil(false);
    }
  };

  // ---- Recargar perfil manualmente ----
  const recargarPerfil = async () => {
    await cargarPerfil();
  };

  // ---- Escuchar cambios de sesión ----
  useEffect(() => {
    let activo = true;

    const limpiarEstadoLocal = () => {
      if (!activo) return;
      setSession(null);
      setPerfil(null);
      setCargandoPerfil(false);
    };

    const iniciar = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!activo) return;

        if (error) {
          // No revoca otras sesiones: limpia exclusivamente este dispositivo.
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
          limpiarEstadoLocal();
          return;
        }

        setSession(data.session);
        if (data.session) await cargarPerfil();
        else setPerfil(null);
      } catch {
        // Una sesión local corrupta nunca debe bloquear la pantalla de login.
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        limpiarEstadoLocal();
      } finally {
        if (activo) setCargando(false);
      }
    };

    void iniciar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => {
        if (!activo) return;
        setSession(nuevaSession);
        if (nuevaSession) {
          // Evita ejecutar otra llamada Supabase dentro del callback de auth.
          setTimeout(() => { if (activo) void cargarPerfil(); }, 0);
        } else {
          setPerfil(null);
          setCargandoPerfil(false);
        }
        setCargando(false);
      }
    );

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  // ---- Sign In ----
  const signIn = async (
    correo: string,
    password: string
  ): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: correo.trim().toLowerCase(),
        password,
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? 'Error al iniciar sesión' };
    }
  };

  // ---- Sign Up ----
  const signUp = async (
    correo: string,
    password: string,
    nombre: string,
    telefono?: string
  ): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email: correo.trim().toLowerCase(),
        password,
        options: {
          data: {
            nombre_completo: nombre.trim(),
            telefono: telefono?.trim() ?? null,
          },
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? 'Error al registrarse' };
    }
  };

  // ---- Sign Out ----
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      // Garantiza salida local incluso si el token remoto ya no existe.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setPerfil(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        perfil,
        rol,
        cargando,
        cargandoPerfil,
        esCliente,
        esPersonal,
        signIn,
        signUp,
        signOut,
        recargarPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
