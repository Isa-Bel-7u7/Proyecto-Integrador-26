import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppCard from '../../components/common/AppCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import {
  AsistenciaHoy,
  TareaHousekeepingMovil,
  TurnoProgramado,
  obtenerMiAsistencia,
  obtenerMiProgramacion,
  obtenerMiRegistroPersonal,
  obtenerMisTareasHousekeeping,
} from '../../services/housekeepingMobileService';

export default function HousekeepingHomeScreen() {
  const { perfil } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [tareas, setTareas] = useState<TareaHousekeepingMovil[]>([]);
  const [turnos, setTurnos] = useState<TurnoProgramado[]>([]);
  const [asistencia, setAsistencia] = useState<AsistenciaHoy | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (!perfil?.usuario_id) return;
    try {
      setError('');
      const [personal, misTareas] = await Promise.all([
        obtenerMiRegistroPersonal(perfil.usuario_id),
        obtenerMisTareasHousekeeping(perfil.usuario_id),
      ]);
      const [programacion, asistenciaHoy] = await Promise.all([
        obtenerMiProgramacion(personal.id),
        obtenerMiAsistencia(personal.id),
      ]);
      setTareas(misTareas);
      setTurnos(programacion);
      setAsistencia(asistenciaHoy);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar tu jornada.');
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [perfil?.usuario_id]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  if (cargando) return <LoadingScreen />;

  const activas = tareas.filter((t) => ['pendiente', 'en_progreso', 'rechazada'].includes(t.estado));
  const enProceso = tareas.filter((t) => t.estado === 'en_progreso').length;
  const completadas = tareas.filter((t) => ['completada', 'aprobada'].includes(t.estado)).length;
  const hoy = new Date().toISOString().slice(0, 10);
  const turnoHoy = turnos.find((t) => t.fecha === hoy);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>HOUSEKEEPING</Text>
          <Text style={[styles.title, { color: colors.text.primary }]}>Hola, {perfil?.nombre_completo?.split(' ')[0]}</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Tu operación de hoy</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.gold.primary}18` }]}>
          <Ionicons name="sparkles" size={24} color={colors.gold.primary} />
        </View>
      </View>

      {error ? (
        <View style={[styles.error, { backgroundColor: colors.status.errorBg, borderColor: colors.status.error }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.status.error} />
          <Text style={{ color: colors.status.error, flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.stats}>
        {[
          { label: 'Pendientes', value: activas.length, color: colors.gold.primary, icon: 'list-outline' },
          { label: 'En proceso', value: enProceso, color: colors.status.info, icon: 'sync-outline' },
          { label: 'Terminadas', value: completadas, color: colors.status.success, icon: 'checkmark-circle-outline' },
        ].map((s) => (
          <AppCard key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={18} color={s.color} />
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.text.muted }]}>{s.label}</Text>
          </AppCard>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Jornada actual</Text>
      <AppCard goldBorder>
        <View style={styles.jornadaRow}>
          <View style={[styles.roundIcon, { backgroundColor: `${colors.gold.primary}18` }]}>
            <Ionicons name="time-outline" size={22} color={colors.gold.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{turnoHoy?.nombre ?? 'Sin turno programado'}</Text>
            <Text style={[styles.cardSub, { color: colors.text.secondary }]}>
              {turnoHoy ? `${turnoHoy.hora_inicio.slice(0, 5)} - ${turnoHoy.hora_fin.slice(0, 5)}` : 'Consulta tu programación semanal'}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: asistencia?.hora_entrada ? colors.status.successBg : colors.bg.tertiary }]}>
            <Text style={{ color: asistencia?.hora_entrada ? colors.status.success : colors.text.muted, fontSize: 10, fontWeight: '800' }}>
              {asistencia?.hora_salida ? 'FINALIZADA' : asistencia?.hora_entrada ? 'EN TURNO' : 'SIN MARCAR'}
            </Text>
          </View>
        </View>
      </AppCard>

      <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Accesos rápidos</Text>
      <View style={styles.actions}>
        {[
          { label: 'Mis tareas', detail: `${activas.length} activas`, icon: 'sparkles-outline', screen: 'TareasHK' },
          { label: 'Mi jornada', detail: 'Turnos y asistencia', icon: 'calendar-outline', screen: 'JornadaHK' },
          { label: 'Reportar', detail: 'Nueva incidencia', icon: 'warning-outline', screen: 'IncidenciasHK' },
          { label: 'Mi perfil', detail: 'Datos laborales', icon: 'person-outline', screen: 'PerfilHK' },
        ].map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.action, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}
            onPress={() => navigation.navigate(a.screen)}
            activeOpacity={0.78}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${colors.gold.primary}15` }]}>
              <Ionicons name={a.icon as any} size={21} color={colors.gold.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text.primary }]}>{a.label}</Text>
            <Text style={[styles.actionSub, { color: colors.text.muted }]}>{a.detail}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingTop: 54, paddingBottom: 34, gap: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { fontSize: Typography.xxl, fontWeight: '800', marginTop: 4 },
  subtitle: { fontSize: Typography.sm, marginTop: 3 },
  headerIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: BorderRadius.md },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  statValue: { fontSize: Typography.xl, fontWeight: '800' },
  statLabel: { fontSize: 9, textAlign: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Spacing.sm },
  jornadaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  roundIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: Typography.md, fontWeight: '700' },
  cardSub: { fontSize: Typography.xs, marginTop: 3 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: BorderRadius.full },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  action: { width: '48.5%', borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md },
  actionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  actionTitle: { fontSize: Typography.sm, fontWeight: '700' },
  actionSub: { fontSize: 10, marginTop: 3 },
});
