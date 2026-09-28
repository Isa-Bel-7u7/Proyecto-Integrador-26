import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PersonalTabParamList } from '../types';
import { Text } from 'react-native';

// ---- Pantallas ----
import DashboardScreen from '../screens/personal/DashboardScreen';
import HousekeepingScreen from '../screens/personal/HousekeepingScreen';
import IncidenciasScreen from '../screens/personal/IncidenciasScreen';
import PerfilPersonalScreen from '../screens/personal/PerfilPersonalScreen';

const Tab = createBottomTabNavigator<PersonalTabParamList>();

function TabIcon({ nombre, focused }: { nombre: string; focused: boolean }) {
  const iconos: Record<string, string> = {
    Dashboard: '📊',
    Housekeeping: '🧹',
    Incidencias: '⚠️',
    Perfil: '👤',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {iconos[nombre] ?? '●'}
    </Text>
  );
}

export default function PersonalNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon nombre={route.name} focused={focused} />
        ),
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11 },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Panel' }} />
      <Tab.Screen name="Housekeeping" component={HousekeepingScreen} options={{ title: 'Limpieza' }} />
      <Tab.Screen name="Incidencias" component={IncidenciasScreen} options={{ title: 'Incidencias' }} />
      <Tab.Screen name="Perfil" component={PerfilPersonalScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}
