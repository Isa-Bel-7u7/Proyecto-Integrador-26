import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppCard from '../../components/common/AppCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import type { AdminHabitacion, AdminIncidencia, AdminPagoResumen, AdminReserva, AdminResumen, AdminTareaHousekeeping } from '../../interfaces';
import {
  obtenerHabitacionesAdministrador,
  obtenerIncidenciasAdministrador,
  obtenerPersonalActivoAdministrador,
  obtenerReservasAdministrador,
  obtenerResumenAdministrador,
  obtenerResumenPagosAdministrador,
  obtenerTareasHousekeepingAdministrador,
} from '../../services/adminService';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

type Nivel = 'ok' | 'warning' | 'danger' | 'info';
type DashboardCard = {
  label: string;
  value: string | number;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  nivel: Nivel;
  onPress: () => void;
};

const hoyIso = () => new Date().toISOString().slice(0, 10);
const esHoy = (fecha?: string | null) => Boolean(fecha && fecha.slice(0, 10) === hoyIso());
const normalizar = (texto?: string | null) => (texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function AdminHomeScreen() {
  const { perfil } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [resumen, setResumen] = useState<AdminResumen | null>(null);
  const [pagos, setPagos] = useState<AdminPagoResumen | null>(null);
  const [reservas, setReservas] = useState<AdminReserva[]>([]);
  const [habitaciones, setHabitaciones] = useState<AdminHabitacion[]>([]);
  const [incidencias, setIncidencias] = useState<AdminIncidencia[]>([]);
  const [tareas, setTareas] = useState<AdminTareaHousekeeping[]>([]);
  const [personalActivo, setPersonalActivo] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setError('');
      const [r, p, rs, hs, is, ts, pa] = await Promise.all([
        obtenerResumenAdministrador(),
        obtenerResumenPagosAdministrador().catch(() => null),
        obtenerReservasAdministrador().catch(() => []),
        obtenerHabitacionesAdministrador().catch(() => []),
        obtenerIncidenciasAdministrador().catch(() => []),
        obtenerTareasHousekeepingAdministrador().catch(() => []),
        obtenerPersonalActivoAdministrador().catch(() => 0),
      ]);
      setResumen(r);
      setPagos(p);
      setReservas(rs);
      setHabitaciones(hs);
      setIncidencias(is);
      setTareas(ts);
      setPersonalActivo(pa);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar el dashboard administrativo.');
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const data = useMemo(() => {
    const totalHabitaciones = habitaciones.length;
    const contarEstado = (patrones: string[]) => habitaciones.filter((h) => {
      const estado = normalizar(h.estado);
      return patrones.some((p) => estado.includes(p));
    }).length;
    const ocupadas = contarEstado(['ocup']);
    const disponibles = contarEstado(['dispon']);
    const mantenimiento = contarEstado(['manten', 'bloque']);
    const enLimpieza = contarEstado(['limpieza', 'limpiando']);
    const tareasSucias = tareas.filter((t) => ['pendiente', 'asignada', 'en_proceso'].includes(normalizar(t.estado))).length;
    const sucias = contarEstado(['sucia', 'sucio']) || tareasSucias;
    const ocupacion = totalHabitaciones > 0 ? Math.round((ocupadas / totalHabitaciones) * 100) : 0;
    const llegadas = reservas.filter((r) => esHoy(r.fecha_entrada) && ['confirmada', 'pendiente'].includes(normalizar(r.estado))).length;
    const salidas = reservas.filter((r) => esHoy(r.fecha_salida) && ['en_estadia', 'hospedado', 'confirmada'].includes(normalizar(r.estado))).length;
    const criticas = incidencias.filter((i) => ['critica', 'alta', 'urgente'].includes(normalizar(i.prioridad)) && !['resuelta', 'cerrada'].includes(normalizar(i.estado))).length;
    const abiertas = incidencias.filter((i) => !['resuelta', 'cerrada'].includes(normalizar(i.estado))).length || resumen?.incidencias_abiertas || 0;
    const pagosPendientes = pagos?.pendientes ?? 0;

    return {
      totalHabitaciones,
      ocupadas,
      disponibles: disponibles || resumen?.habitaciones_disponibles || 0,
      mantenimiento,
      enLimpieza: enLimpieza || resumen?.habitaciones_limpieza || 0,
      sucias,
      ocupacion,
      llegadas,
      salidas,
      criticas,
      abiertas,
      pagosPendientes,
    };
  }, [habitaciones, incidencias, pagos?.pendientes, reservas, resumen, tareas]);

  if (cargando) return <LoadingScreen />;

  const colorNivel = (nivel: Nivel) => {
    if (nivel === 'danger') return colors.status.error;
    if (nivel === 'warning') return colors.status.warning;
    if (nivel === 'ok') return colors.status.success;
    return colors.status.info;
  };
  const fondoNivel = (nivel: Nivel) => {
    if (nivel === 'danger') return colors.status.errorBg;
    if (nivel === 'warning') return colors.status.warningBg;
    if (nivel === 'ok') return colors.status.successBg;
    return `${colors.status.info}18`;
  };

  const cards: DashboardCard[] = [
    {
      label: 'Ocupación',
      value: `${data.ocupacion}%`,
      detail: `${data.ocupadas}/${data.totalHabitaciones || 0} habitaciones ocupadas`,
      icon: 'analytics-outline',
      nivel: data.ocupacion >= 90 ? 'warning' : 'ok',
      onPress: () => navigation.navigate('AdminHabitaciones', { filtro: 'ocupada' }),
    },
    {
      label: 'Disponibles',
      value: data.disponibles,
      detail: 'Listas para vender',
      icon: 'bed-outline',
      nivel: data.disponibles <= 2 ? 'warning' : 'ok',
      onPress: () => navigation.navigate('AdminHabitaciones', { filtro: 'disponible' }),
    },
    {
      label: 'Ocupadas',
      value: data.ocupadas || resumen?.habitaciones_ocupadas || 0,
      detail: 'Huéspedes en estadía',
      icon: 'key-outline',
      nivel: 'info',
      onPress: () => navigation.navigate('AdminHabitaciones', { filtro: 'ocupada' }),
    },
    {
      label: 'Habitaciones sucias',
      value: data.sucias,
      detail: 'Requieren limpieza',
      icon: 'trash-outline',
      nivel: data.sucias > 0 ? 'warning' : 'ok',
      onPress: () => navigation.navigate('AdminHabitaciones', { filtro: 'limpieza' }),
    },
    {
      label: 'En limpieza',
      value: data.enLimpieza,
      detail: 'Housekeeping trabajando',
      icon: 'sparkles-outline',
      nivel: data.enLimpieza > 0 ? 'warning' : 'ok',
      onPress: () => navigation.navigate('AdminHabitaciones', { filtro: 'limpieza' }),
    },
    {
      label: 'Mantenimiento',
      value: data.mantenimiento,
      detail: 'Fuera de servicio',
      icon: 'construct-outline',
      nivel: data.mantenimiento > 0 ? 'danger' : 'ok',
      onPress: () => navigation.navigate('AdminHabitaciones', { filtro: 'mantenimiento' }),
    },
    {
      label: 'Llegadas hoy',
      value: data.llegadas,
      detail: 'Reservas para check-in',
      icon: 'log-in-outline',
      nivel: data.llegadas > 0 ? 'info' : 'ok',
      onPress: () => navigation.navigate('AdminOperaciones', { seccion: 'checkin' }),
    },
    {
      label: 'Salidas hoy',
      value: data.salidas,
      detail: 'Check-out programados',
      icon: 'log-out-outline',
      nivel: data.salidas > 0 ? 'info' : 'ok',
      onPress: () => navigation.navigate('AdminOperaciones', { seccion: 'checkout' }),
    },
    {
      label: 'Pagos pendientes',
      value: data.pagosPendientes,
      detail: 'Requieren revisión',
      icon: 'card-outline',
      nivel: data.pagosPendientes > 0 ? 'warning' : 'ok',
      onPress: () => navigation.navigate('AdminOperaciones', { seccion: 'pagos' }),
    },
    {
      label: 'Incidencias abiertas',
      value: data.abiertas,
      detail: `${data.criticas} críticas`,
      icon: 'warning-outline',
      nivel: data.criticas > 0 ? 'danger' : data.abiertas > 0 ? 'warning' : 'ok',
      onPress: () => navigation.navigate('AdminControl', { seccion: 'incidencias' }),
    },
    {
      label: 'Personal activo',
      value: personalActivo,
      detail: 'En turno ahora',
      icon: 'people-outline',
      nivel: personalActivo > 0 ? 'ok' : 'warning',
      onPress: () => navigation.navigate('AdminControl', { seccion: 'housekeeping' }),
    },
  ];

  const alertas = [
    data.criticas > 0 ? { texto: `${data.criticas} incidencia${data.criticas === 1 ? '' : 's'} crítica${data.criticas === 1 ? '' : 's'} abierta${data.criticas === 1 ? '' : 's'}.`, nivel: 'danger' as Nivel, icon: 'alert-circle-outline' as const, destino: () => navigation.navigate('AdminControl', { seccion: 'incidencias' }) } : null,
    data.mantenimiento > 0 ? { texto: `${data.mantenimiento} habitación${data.mantenimiento === 1 ? '' : 'es'} en mantenimiento.`, nivel: 'warning' as Nivel, icon: 'construct-outline' as const, destino: () => navigation.navigate('AdminHabitaciones', { filtro: 'mantenimiento' }) } : null,
    data.pagosPendientes > 0 ? { texto: `${data.pagosPendientes} pago${data.pagosPendientes === 1 ? '' : 's'} pendiente${data.pagosPendientes === 1 ? '' : 's'} por revisar.`, nivel: 'warning' as Nivel, icon: 'card-outline' as const, destino: () => navigation.navigate('AdminOperaciones', { seccion: 'pagos' }) } : null,
    data.sucias > 0 ? { texto: `${data.sucias} habitación${data.sucias === 1 ? '' : 'es'} requiere${data.sucias === 1 ? '' : 'n'} limpieza.`, nivel: 'warning' as Nivel, icon: 'sparkles-outline' as const, destino: () => navigation.navigate('AdminHabitaciones', { filtro: 'limpieza' }) } : null,
  ].filter(Boolean) as { texto: string; nivel: Nivel; icon: keyof typeof Ionicons.glyphMap; destino: () => void }[];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>DASHBOARD ADMIN</Text>
          <Text style={[styles.title, { color: colors.text.primary }]}>Hola, {perfil?.nombre_completo?.split(' ')[0] ?? 'Admin'}</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Estado del hotel en tiempo real</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.gold.primary}18` }]}>
          <Ionicons name="shield-checkmark" size={25} color={colors.gold.primary} />
        </View>
      </View>

      {error ? (
        <View style={[styles.error, { backgroundColor: colors.status.errorBg, borderColor: colors.status.error }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.status.error} />
          <Text style={{ color: colors.status.error, flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.occupancyPanel, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
        <View>
          <Text style={[styles.cardLabel, { color: colors.text.muted }]}>OCUPACIÓN ACTUAL</Text>
          <Text style={[styles.occupancyValue, { color: colors.text.primary }]}>{data.ocupacion}%</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{data.ocupadas} ocupadas · {data.disponibles} disponibles</Text>
        </View>
        <TouchableOpacity style={[styles.pillButton, { backgroundColor: `${colors.gold.primary}18` }]} onPress={() => navigation.navigate('AdminHabitaciones')}>
          <Text style={[styles.pillText, { color: colors.gold.primary }]}>Ver habitaciones</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.gold.primary} />
        </TouchableOpacity>
      </View>

      {alertas.length > 0 ? (
        <View style={styles.alertBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Alertas importantes</Text>
          {alertas.map((alerta) => {
            const color = colorNivel(alerta.nivel);
            return (
              <TouchableOpacity key={alerta.texto} style={[styles.alert, { backgroundColor: fondoNivel(alerta.nivel), borderColor: color }]} onPress={alerta.destino}>
                <Ionicons name={alerta.icon} size={19} color={color} />
                <Text style={[styles.alertText, { color }]}>{alerta.texto}</Text>
                <Ionicons name="chevron-forward" size={15} color={color} />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={[styles.alert, { backgroundColor: colors.status.successBg, borderColor: colors.status.success }]}>
          <Ionicons name="checkmark-circle-outline" size={19} color={colors.status.success} />
          <Text style={[styles.alertText, { color: colors.status.success }]}>Todo se ve estable por ahora.</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Resumen operativo</Text>
      <View style={styles.grid}>
        {cards.map((item) => {
          const color = colorNivel(item.nivel);
          return (
            <TouchableOpacity key={item.label} style={styles.cell} onPress={item.onPress} activeOpacity={0.86}>
              <AppCard style={{ ...styles.metricCard, borderTopColor: color, borderTopWidth: 3 }}>
                <View style={[styles.metricIcon, { backgroundColor: fondoNivel(item.nivel) }]}>
                  <Ionicons name={item.icon} size={19} color={color} />
                </View>
                <Text style={[styles.metricValue, { color: colors.text.primary }]}>{item.value}</Text>
                <Text style={[styles.metricLabel, { color: colors.text.primary }]} numberOfLines={1}>{item.label}</Text>
                <Text style={[styles.metricDetail, { color: colors.text.muted }]} numberOfLines={2}>{item.detail}</Text>
              </AppCard>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingTop: 54, paddingBottom: 34 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  eyebrow: { fontSize: Typography.xs, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  title: { fontSize: Typography.xxl, fontWeight: '700' },
  subtitle: { fontSize: Typography.sm, marginTop: 3 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 14 },
  occupancyPanel: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  occupancyValue: { fontSize: 40, fontWeight: '900', marginTop: 4 },
  pillButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: BorderRadius.full, paddingHorizontal: 11, paddingVertical: 8 },
  pillText: { fontSize: 11, fontWeight: '800' },
  alertBlock: { marginBottom: 4 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 9 },
  alertText: { flex: 1, fontSize: Typography.sm, fontWeight: '700' },
  sectionTitle: { fontSize: Typography.xs, fontWeight: '800', letterSpacing: 1.2, marginTop: 14, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '48%' },
  metricCard: { minHeight: 148 },
  metricIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 27, fontWeight: '900', marginTop: 11 },
  metricLabel: { fontSize: Typography.sm, fontWeight: '800', marginTop: 2 },
  metricDetail: { fontSize: 11, lineHeight: 15, marginTop: 5 },
  cardLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});
