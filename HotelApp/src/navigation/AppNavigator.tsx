import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import ClienteNavigator from './ClienteNavigator';
import PersonalNavigator from './PersonalNavigator';
import HousekeepingNavigator from './HousekeepingNavigator';
import AdminNavigator from './AdminNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, perfil, cargando, cargandoPerfil, esCliente, esPersonal } = useAuth();

  if (cargando || (session && cargandoPerfil && !perfil)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : esCliente ? (
          <Stack.Screen name="Cliente" component={ClienteNavigator} />
        ) : perfil?.rol === 'Administrador' ? (
          <Stack.Screen name="Administrador" component={AdminNavigator} />
        ) : perfil?.rol === 'Housekeeping' ? (
          <Stack.Screen name="HousekeepingPersonal" component={HousekeepingNavigator} />
        ) : esPersonal ? (
          <Stack.Screen name="Personal" component={PersonalNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
