// ============================================================
// PRINCIPIO DIP: App.tsx no conoce el sistema de tema concreto.
// Depende solo de ThemeProvider (abstracción), que internamente
// gestiona AsyncStorage y la paleta. Los componentes consumen
// useTheme() sin saber cómo se persiste la preferencia.
//
// PRINCIPIO SRP: este archivo solo configura los providers
// y renderiza el navegador raíz. Nada más.
// ============================================================
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { configurarNotificacionesAdmin } from './src/services/adminNotificationService';
import StyledAlertProvider from './src/components/common/StyledAlertProvider';

// Supabase elimina por sí mismo las sesiones cuyo refresh token fue revocado.
// En desarrollo lo registra como console.error y Expo muestra una pantalla roja,
// aunque la recuperación sea correcta. Se ignora solamente ese mensaje conocido.
LogBox.ignoreLogs([
  'Invalid Refresh Token',
  'Refresh Token Not Found',
  'AuthApiError: Invalid Refresh Token',
  'Invalid Refresh Token: Refresh Token Not Found',
]);

// SRP: componente interno que lee el tema para StatusBar
function Root() {
  const { isDark } = useTheme();
  useEffect(() => {
    void configurarNotificacionesAdmin();
  }, []);
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* DIP: ThemeProvider envuelve AuthProvider para que los contextos
          sean independientes — el tema no depende de la autenticación */}
      <ThemeProvider>
        <AuthProvider>
          <StyledAlertProvider>
            <Root />
          </StyledAlertProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
