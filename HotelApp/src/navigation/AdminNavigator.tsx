import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminOperationsScreen from '../screens/admin/AdminOperationsScreen';
import AdminRoomsScreen from '../screens/admin/AdminRoomsScreen';
import AdminControlScreen from '../screens/admin/AdminControlScreen';
import AdminManagementScreen from '../screens/admin/AdminManagementScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';

export type AdminTabParamList = {
  AdminInicio: undefined;
  AdminOperaciones: { seccion?: 'reservas' | 'checkin' | 'checkout' | 'pagos' } | undefined;
  AdminHabitaciones: { filtro?: string } | undefined;
  AdminControl: { seccion?: 'incidencias' | 'housekeeping' | 'auditoria' } | undefined;
  AdminGestion: undefined;
  AdminPerfil: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();
const ICONS: Record<keyof AdminTabParamList, { normal: any; active: any }> = {
  AdminInicio: { normal: 'grid-outline', active: 'grid' },
  AdminOperaciones: { normal: 'calendar-outline', active: 'calendar' },
  AdminHabitaciones: { normal: 'bed-outline', active: 'bed' },
  AdminControl: { normal: 'shield-checkmark-outline', active: 'shield-checkmark' },
  AdminGestion: { normal: 'briefcase-outline', active: 'briefcase' },
  AdminPerfil: { normal: 'person-circle-outline', active: 'person-circle' },
};

export default function AdminNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? ICONS[route.name].active : ICONS[route.name].normal} size={21} color={color} />,
      tabBarStyle: { backgroundColor: colors.tabBar.bg, borderTopColor: colors.tabBar.border, height: 66, paddingTop: 7, paddingBottom: 8 },
      tabBarActiveTintColor: colors.tabBar.active,
      tabBarInactiveTintColor: colors.tabBar.inactive,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
    })}>
      <Tab.Screen name="AdminInicio" component={AdminHomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="AdminOperaciones" component={AdminOperationsScreen} options={{ title: 'Operación' }} />
      <Tab.Screen name="AdminHabitaciones" component={AdminRoomsScreen} options={{ title: 'Habitaciones' }} />
      <Tab.Screen name="AdminControl" component={AdminControlScreen} options={{ title: 'Control' }} />
      <Tab.Screen name="AdminGestion" component={AdminManagementScreen} options={{ title: 'Gestión' }} />
      <Tab.Screen name="AdminPerfil" component={AdminProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}
