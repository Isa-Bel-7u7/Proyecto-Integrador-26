import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AppButton from '../../components/common/AppButton';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import {
  ChecklistItem,
  TareaHousekeepingMovil,
  actualizarChecklist,
  completarTareaLimpieza,
  iniciarTareaLimpieza,
  obtenerChecklistTarea,
  obtenerMisTareasHousekeeping,
} from '../../services/housekeepingMobileService';

const ESTADOS: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#C9A84C' },
  en_progreso: { label: 'En proceso', color: '#60A5FA' },
  completada: { label: 'En revisión', color: '#A78BFA' },
  aprobada: { label: 'Aprobada', color: '#4ADE80' },
  rechazada: { label: 'Corrección', color: '#F87171' },
};
const PRIORIDAD: Record<string, string> = { baja: '#9696A0', media: '#60A5FA', alta: '#C9A84C', urgente: '#F87171' };

export default function HousekeepingTasksScreen() {
  const { colors } = useTheme();
  const { perfil } = useAuth();
  const navigation = useNavigation<any>();
  const [tareas, setTareas] = useState<TareaHousekeepingMovil[]>([]);
  const [seleccionada, setSeleccionada] = useState<TareaHousekeepingMovil | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [productos, setProductos] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(async () => {
    if (!perfil?.usuario_id) return;
    try { setTareas(await obtenerMisTareasHousekeeping(perfil.usuario_id)); }
    catch (e: any) { Alert.alert('No se pudieron cargar las tareas', e.message); }
    finally { setCargando(false); setRefreshing(false); }
  }, [perfil?.usuario_id]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const abrir = async (tarea: TareaHousekeepingMovil) => {
    setSeleccionada(tarea);
    setProductos('');
    setCargandoDetalle(true);
    try { setChecklist(await obtenerChecklistTarea(tarea.id)); }
    catch { setChecklist([]); }
    finally { setCargandoDetalle(false); }
  };

  const toggle = async (item: ChecklistItem) => {
    if (seleccionada?.estado !== 'en_progreso') return;
    const nuevo = !item.completado;
    setChecklist((prev) => prev.map((x) => x.id === item.id ? { ...x, completado: nuevo } : x));
    try { await actualizarChecklist(item, nuevo); }
    catch (e: any) {
      setChecklist((prev) => prev.map((x) => x.id === item.id ? { ...x, completado: !nuevo } : x));
      Alert.alert('No se pudo actualizar', e.message);
    }
  };

  const ejecutar = async (accion: () => Promise<void>, mensaje: string) => {
    setProcesando(true);
    try {
      await accion();
      await cargar();
      setSeleccionada(null);
      Alert.alert('Listo', mensaje);
    } catch (e: any) { Alert.alert('No se pudo completar la acción', e.message); }
    finally { setProcesando(false); }
  };

  if (cargando) return <LoadingScreen />;
  const completados = checklist.filter((i) => i.completado).length;
  const checklistListo = checklist.length === 0 || completados === checklist.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>OPERACIÓN</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>Mis tareas</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{tareas.length} asignadas</Text>
      </View>
      <FlatList
        data={tareas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}
        renderItem={({ item }) => {
          const estado = ESTADOS[item.estado] ?? { label: item.estado, color: colors.text.muted };
          const avance = item.checklist_total ? item.checklist_ok / item.checklist_total : 0;
          return (
            <TouchableOpacity
              style={[styles.task, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}
              onPress={() => void abrir(item)}
              activeOpacity={0.78}
            >
              <View style={styles.taskTop}>
                <View>
                  <Text style={[styles.room, { color: colors.text.primary }]}>Hab. {item.habitacion_numero}</Text>
                  <Text style={[styles.roomSub, { color: colors.text.muted }]}>Piso {item.piso} · {item.tipo_habitacion}</Text>
                </View>
                <View style={[styles.priority, { backgroundColor: `${PRIORIDAD[item.prioridad] ?? colors.text.muted}18` }]}>
                  <Text style={{ color: PRIORIDAD[item.prioridad] ?? colors.text.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{item.prioridad}</Text>
                </View>
              </View>
              <View style={styles.taskMeta}>
                <View style={[styles.state, { backgroundColor: `${estado.color}18` }]}>
                  <View style={[styles.dot, { backgroundColor: estado.color }]} />
                  <Text style={{ color: estado.color, fontSize: 11, fontWeight: '700' }}>{estado.label}</Text>
                </View>
                <Text style={[styles.code, { color: colors.text.muted }]}>{item.codigo}</Text>
              </View>
              {item.observaciones ? <Text style={[styles.observation, { color: colors.text.secondary }]} numberOfLines={2}>{item.observaciones}</Text> : null}
              {item.checklist_total > 0 && (
                <View>
                  <View style={styles.progressLabel}>
                    <Text style={{ color: colors.text.muted, fontSize: 10 }}>Checklist</Text>
                    <Text style={{ color: colors.gold.primary, fontSize: 10, fontWeight: '700' }}>{item.checklist_ok}/{item.checklist_total}</Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.bg.tertiary }]}>
                    <View style={[styles.progress, { width: `${avance * 100}%`, backgroundColor: avance === 1 ? colors.status.success : colors.gold.primary }]} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="checkmark-done-circle-outline" size={56} color={colors.gold.primary} /><Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Todo al día</Text><Text style={{ color: colors.text.secondary, textAlign: 'center' }}>No tienes tareas asignadas en este momento.</Text></View>}
      />

      <Modal visible={Boolean(seleccionada)} transparent animationType="slide" onRequestClose={() => setSeleccionada(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSeleccionada(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.bg.secondary, borderColor: colors.border.gold }]}>
            {seleccionada && (
              <>
                <View style={styles.sheetHeader}>
                  <View><Text style={[styles.sheetEyebrow, { color: colors.gold.primary }]}>{seleccionada.codigo}</Text><Text style={[styles.sheetTitle, { color: colors.text.primary }]}>Habitación {seleccionada.habitacion_numero}</Text></View>
                  <TouchableOpacity onPress={() => setSeleccionada(null)} style={[styles.close, { backgroundColor: colors.bg.tertiary }]}><Ionicons name="close" size={20} color={colors.text.secondary} /></TouchableOpacity>
                </View>
                <Text style={[styles.detail, { color: colors.text.secondary }]}>{seleccionada.tipo_habitacion} · Piso {seleccionada.piso} · Prioridad {seleccionada.prioridad}</Text>
                {seleccionada.observaciones ? <Text style={[styles.detailBox, { color: colors.text.secondary, backgroundColor: colors.bg.tertiary }]}>{seleccionada.observaciones}</Text> : null}

                <View style={styles.checkHeader}><Text style={[styles.checkTitle, { color: colors.text.primary }]}>Checklist</Text><Text style={{ color: colors.gold.primary, fontWeight: '700' }}>{completados}/{checklist.length}</Text></View>
                {cargandoDetalle ? <ActivityIndicator color={colors.gold.primary} /> : checklist.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.checkItem} onPress={() => void toggle(item)} disabled={seleccionada.estado !== 'en_progreso'}>
                    <View style={[styles.checkbox, { borderColor: item.completado ? colors.status.success : colors.border.primary, backgroundColor: item.completado ? colors.status.success : 'transparent' }]}>{item.completado && <Ionicons name="checkmark" size={15} color="#fff" />}</View>
                    <Text style={[styles.checkLabel, { color: item.completado ? colors.text.muted : colors.text.primary, textDecorationLine: item.completado ? 'line-through' : 'none' }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}

                {seleccionada.estado === 'pendiente' && <AppButton label="Iniciar limpieza" onPress={() => void ejecutar(() => iniciarTareaLimpieza(seleccionada.id), 'La limpieza fue iniciada.')} loading={procesando} fullWidth />}
                {seleccionada.estado === 'en_progreso' && (
                  <>
                    <TextInput style={[styles.input, { color: colors.text.primary, backgroundColor: colors.input.bg, borderColor: colors.input.border }]} value={productos} onChangeText={setProductos} placeholder="Productos utilizados u observaciones..." placeholderTextColor={colors.input.placeholder} multiline />
                    <AppButton label="Marcar como completada" onPress={() => void ejecutar(() => completarTareaLimpieza(seleccionada.id, productos), 'Supervisor notificado para revisión.')} loading={procesando} disabled={!checklistListo} fullWidth />
                    {!checklistListo && <Text style={[styles.help, { color: colors.text.muted }]}>Completa todo el checklist antes de finalizar.</Text>}
                  </>
                )}
                {['completada', 'aprobada'].includes(seleccionada.estado) && <View style={[styles.waiting, { backgroundColor: colors.status.successBg }]}><Ionicons name="shield-checkmark-outline" size={18} color={colors.status.success} /><Text style={{ color: colors.status.success, flex: 1 }}>{seleccionada.estado === 'aprobada' ? 'Tarea aprobada. Habitación disponible.' : 'Finalizada y enviada a revisión.'}</Text></View>}
                <AppButton
                  label="Reportar incidencia en esta habitación"
                  variant="danger"
                  fullWidth
                  style={{ marginTop: Spacing.sm }}
                  onPress={() => {
                    const tarea = seleccionada;
                    setSeleccionada(null);
                    navigation.navigate('IncidenciasHK', {
                      habitacionId: tarea.habitacion_id,
                      habitacionNumero: tarea.habitacion_numero,
                    });
                  }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: 52, paddingBottom: Spacing.md },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2 }, title: { fontSize: Typography.xxl, fontWeight: '800', marginTop: 4 }, subtitle: { fontSize: Typography.sm, marginTop: 3 },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 32, gap: Spacing.sm },
  task: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, gap: 12 },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between' }, room: { fontSize: Typography.lg, fontWeight: '800' }, roomSub: { fontSize: Typography.xs, marginTop: 3 },
  priority: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full }, taskMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: BorderRadius.full }, dot: { width: 6, height: 6, borderRadius: 3 }, code: { fontSize: 10 }, observation: { fontSize: Typography.xs, lineHeight: 18 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }, progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' }, progress: { height: '100%', borderRadius: 3 },
  empty: { alignItems: 'center', padding: 48, gap: 10 }, emptyTitle: { fontSize: Typography.xl, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sheetEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, sheetTitle: { fontSize: Typography.xl, fontWeight: '800', marginTop: 3 }, close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  detail: { fontSize: Typography.xs, marginTop: 8 }, detailBox: { padding: 11, borderRadius: BorderRadius.md, marginTop: 12, fontSize: Typography.xs }, checkHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: 8 }, checkTitle: { fontSize: Typography.md, fontWeight: '700' },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }, checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, checkLabel: { flex: 1, fontSize: Typography.sm },
  input: { minHeight: 70, borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, textAlignVertical: 'top', marginTop: Spacing.md, marginBottom: 10 }, help: { textAlign: 'center', fontSize: 10, marginTop: 6 }, waiting: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: BorderRadius.md, marginTop: Spacing.md },
});
