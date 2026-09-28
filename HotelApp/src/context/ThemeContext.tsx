// ============================================================
// PRINCIPIO SRP: este contexto tiene una sola responsabilidad
// — gestionar el modo de tema (oscuro/claro) de la app.
//
// PRINCIPIO DIP: los componentes dependen de useTheme()
// (abstracción), no de AsyncStorage ni de la paleta directamente.
//
// PRINCIPIO ISP: ThemeContextType expone solo lo que los
// consumidores necesitan: los colores actuales y el toggle.
// ============================================================
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, ThemeColors, ThemeMode } from '../utils/theme';

const STORAGE_KEY = '@hotel_theme_mode';

// ISP: interfaz mínima para consumidores del tema
interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

// DIP: los componentes dependen de esta abstracción
const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: palettes.dark,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  // Carga el tema guardado al iniciar
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setMode(saved);
    });
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    // DRY: un solo punto de escritura a AsyncStorage para el tema
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{
      mode,
      colors: palettes[mode],
      isDark: mode === 'dark',
      toggleTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// SRP: hook dedicado exclusivamente a consumir el contexto de tema
export const useTheme = () => useContext(ThemeContext);
