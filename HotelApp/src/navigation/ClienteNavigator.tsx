// OCP: los tabs se definen en TAB_CONFIG (array de objetos).
// DRY: colores de la barra e iconos se leen de ThemeContext.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { ClienteTabParamList, ClienteStackParamList } from '../types';

// ── Tabs ─────────────────────────────────────────────────────
import HomeClienteScreen    from '../screens/cliente/HomeClienteScreen';
import BuscarScreen         from '../screens/cliente/BuscarScreen';
import MisReservasScreen    from '../screens/cliente/MisReservasScreen';
import NotificacionesScreen from '../screens/cliente/NotificacionesScreen';
import PerfilScreen         from '../screens/cliente/PerfilScreen';
import AjustesScreen        from '../screens/cliente/AjustesScreen';

// ── Stack ─────────────────────────────────────────────────────
import DetalleHabitacionScreen  from '../screens/cliente/DetalleHabitacionScreen';
import CrearReservaScreen       from '../screens/cliente/CrearReservaScreen';
import DetalleReservaScreen     from '../screens/cliente/DetalleReservaScreen';
import PagoScreen               from '../screens/cliente/PagoScreen';
import PreCheckinScreen         from '../screens/cliente/PreCheckinScreen';
import AvisosScreen             from '../screens/cliente/AvisosScreen';
import BuzonScreen              from '../screens/cliente/BuzonScreen';
import FavoritosScreen          from '../screens/cliente/FavoritosScreen';
import SolicitudServicioScreen  from '../screens/cliente/SolicitudServicioScreen';

const Tab   = createBottomTabNavigator<ClienteTabParamList>();
const Stack = createNativeStackNavigator<ClienteStackParamList>();

// OCP: agregar un tab = agregar un objeto aquí
const TAB_CONFIG: {
  name:        keyof ClienteTabParamList;
  label:       string;
  icon:        string;
  iconFocused: string;
  component:   React.ComponentType<any>;
}[] = [
  { name: 'HomeCliente',    label: 'Inicio',   icon: 'home-outline',          iconFocused: 'home',          component: HomeClienteScreen    },
  { name: 'Buscar',         label: 'Buscar',   icon: 'search-outline',        iconFocused: 'search',        component: BuscarScreen         },
  { name: 'MisReservas',    label: 'Reservas', icon: 'calendar-outline',      iconFocused: 'calendar',      component: MisReservasScreen    },
  { name: 'Notificaciones', label: 'Alertas',  icon: 'notifications-outline', iconFocused: 'notifications', component: NotificacionesScreen },
  { name: 'Perfil',         label: 'Perfil',   icon: 'person-outline',        iconFocused: 'person',        component: PerfilScreen         },
  { name: 'Ajustes',        label: 'Ajustes',  icon: 'settings-outline',      iconFocused: 'settings',      component: AjustesScreen        },
];

function ClienteTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TAB_CONFIG.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={(focused ? tab?.iconFocused : tab?.icon) as any ?? 'ellipse-outline'}
              size={size}
              color={focused ? colors.tabBar.active : colors.tabBar.inactive}
            />
          ),
          tabBarStyle: {
            backgroundColor: colors.tabBar.bg,
            borderTopColor:  colors.tabBar.border,
            height:          62,
            paddingBottom:   8,
          },
          tabBarActiveTintColor:   colors.tabBar.active,
          tabBarInactiveTintColor: colors.tabBar.inactive,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        };
      }}
    >
      {TAB_CONFIG.map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{ title: t.label }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function ClienteNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClienteTabs"         component={ClienteTabs}              />
      <Stack.Screen name="DetalleHabitacion"   component={DetalleHabitacionScreen}  />
      <Stack.Screen name="CrearReserva"        component={CrearReservaScreen}       />
      <Stack.Screen name="DetalleReserva"      component={DetalleReservaScreen}     />
      <Stack.Screen name="Pago"                component={PagoScreen}               />
      <Stack.Screen name="PreCheckin"          component={PreCheckinScreen}         />
      <Stack.Screen name="Avisos"              component={AvisosScreen}             />
      <Stack.Screen name="Buzon"               component={BuzonScreen}              />
      <Stack.Screen name="Favoritos"           component={FavoritosScreen}          />
      <Stack.Screen name="SolicitudServicio"   component={SolicitudServicioScreen}  />
    </Stack.Navigator>
  );
}
