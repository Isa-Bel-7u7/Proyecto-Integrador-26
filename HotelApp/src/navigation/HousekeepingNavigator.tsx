import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import HousekeepingHomeScreen from '../screens/housekeeping/HousekeepingHomeScreen';
import HousekeepingTasksScreen from '../screens/housekeeping/HousekeepingTasksScreen';
import HousekeepingJornadaScreen from '../screens/housekeeping/HousekeepingJornadaScreen';
import HousekeepingIncidenciasScreen from '../screens/housekeeping/HousekeepingIncidenciasScreen';
import HousekeepingProfileScreen from '../screens/housekeeping/HousekeepingProfileScreen';

export type HousekeepingTabParamList = {
  InicioHK: undefined;
  TareasHK: undefined;
  JornadaHK: undefined;
  IncidenciasHK: { habitacionId?: string; habitacionNumero?: string } | undefined;
  PerfilHK: undefined;
};

const Tab = createBottomTabNavigator<HousekeepingTabParamList>();

const ICONS: Record<keyof HousekeepingTabParamList, { normal: any; active: any }> = {
  InicioHK: { normal: 'home-outline', active: 'home' },
  TareasHK: { normal: 'sparkles-outline', active: 'sparkles' },
  JornadaHK: { normal: 'time-outline', active: 'time' },
  IncidenciasHK: { normal: 'warning-outline', active: 'warning' },
  PerfilHK: { normal: 'person-outline', active: 'person' },
};

export default function HousekeepingNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <Ionicons name={focused ? ICONS[route.name].active : ICONS[route.name].normal} size={21} color={color} />
        ),
        tabBarStyle: {
          backgroundColor: colors.tabBar.bg,
          borderTopColor: colors.tabBar.border,
          height: 66,
          paddingTop: 7,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.tabBar.active,
        tabBarInactiveTintColor: colors.tabBar.inactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="InicioHK" component={HousekeepingHomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="TareasHK" component={HousekeepingTasksScreen} options={{ title: 'Tareas' }} />
      <Tab.Screen name="JornadaHK" component={HousekeepingJornadaScreen} options={{ title: 'Jornada' }} />
      <Tab.Screen name="IncidenciasHK" component={HousekeepingIncidenciasScreen} options={{ title: 'Incidencias' }} />
      <Tab.Screen name="PerfilHK" component={HousekeepingProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}
