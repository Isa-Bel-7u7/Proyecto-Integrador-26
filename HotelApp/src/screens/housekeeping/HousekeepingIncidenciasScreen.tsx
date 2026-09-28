import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import AppButton from '../../components/common/AppButton';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import {
  IncidenciaHousekeeping,
  obtenerMisIncidenciasHousekeeping,
  reportarIncidenciaHousekeeping,
} from '../../services/housekeepingMobileService';

const CATEGORIAS = [
  { value: 'mantenimiento', label: 'Daño', icon: 'construct-outline' },
  { value: 'limpieza', label: 'Limpieza', icon: 'sparkles-outline' },
  { value: 'suministros', label: 'Insumos', icon: 'cube-outline' },
  { value: 'objeto_olvidado', label: 'Objeto', icon: 'bag-handle-outline' },
  { value: 'otro', label: 'Otro', icon: 'ellipsis-horizontal-outline' },
];
const PRIORIDADES = ['baja', 'media', 'alta', 'critica'];

export default function HousekeepingIncidenciasScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<IncidenciaHousekeeping[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [creando, setCreando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('mantenimiento');
  const [prioridad, setPrioridad] = useState('media');
  const [habitacionId, setHabitacionId] = useState('');
  const [habitacionNumero, setHabitacionNumero] = useState('');

  const cargar = useCallback(async () => {
    try { setItems(await obtenerMisIncidenciasHousekeeping()); }
    catch (e: any) { Alert.alert('No se pudieron cargar tus incidencias', e.message); }
    finally { setCargando(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    void cargar();
    if (route.params?.habitacionId) {
      setHabitacionId(route.params.habitacionId);
      setHabitacionNumero(route.params.habitacionNumero ?? '');
      setTitulo(route.params.habitacionNumero ? `Incidencia en habitación ${route.params.habitacionNumero}` : 'Incidencia en habitación');
      setModal(true);
      navigation.setParams({ habitacionId: undefined, habitacionNumero: undefined });
    }
  }, [cargar, route.params?.habitacionId]));

  const crear = async () => {
    if (!titulo.trim() || !descripcion.trim()) { Alert.alert('Faltan datos', 'Escribe un título y una descripción.'); return; }
    setCreando(true);
    try {
      await reportarIncidenciaHousekeeping({ titulo, descripcion, categoria, prioridad, habitacionId: habitacionId.trim() || undefined });
      setModal(false); setTitulo(''); setDescripcion(''); setHabitacionId(''); setHabitacionNumero(''); await cargar();
      Alert.alert('Incidencia reportada', 'Administración ya puede visualizar el reporte.');
    } catch (e: any) { Alert.alert('No se pudo reportar', e.message); }
    finally { setCreando(false); }
  };

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={styles.header}>
        <View><Text style={[styles.eyebrow, { color: colors.gold.primary }]}>REPORTES</Text><Text style={[styles.title, { color: colors.text.primary }]}>Incidencias</Text><Text style={[styles.subtitle, { color: colors.text.secondary }]}>{items.length} reportadas por ti</Text></View>
        <TouchableOpacity style={[styles.add, { backgroundColor: colors.gold.primary }]} onPress={() => setModal(true)}><Ionicons name="add" size={22} color={colors.text.inverse} /></TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}
        renderItem={({ item }) => {
          const cat = CATEGORIAS.find((x) => x.value === item.categoria) ?? CATEGORIAS[4];
          const statusColor = ['resuelta', 'cerrada'].includes(item.estado) ? colors.status.success : item.estado === 'en_proceso' ? colors.status.info : colors.status.warning;
          return <View style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
            <View style={styles.cardTop}><View style={[styles.icon, { backgroundColor: `${colors.gold.primary}15` }]}><Ionicons name={cat.icon as any} size={21} color={colors.gold.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.text.primary }]}>{item.titulo}</Text><Text style={[styles.code, { color: colors.text.muted }]}>{item.codigo ?? cat.label}</Text></View><View style={[styles.status, { backgroundColor: `${statusColor}15` }]}><Text style={{ color: statusColor, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>{item.estado}</Text></View></View>
            <Text style={[styles.description, { color: colors.text.secondary }]} numberOfLines={3}>{item.descripcion}</Text>
            <View style={styles.footer}><Text style={{ color: colors.text.muted, fontSize: 10 }}>{new Date(item.created_at).toLocaleDateString('es-BO')}</Text><Text style={{ color: item.prioridad === 'critica' ? colors.status.error : colors.gold.primary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{item.prioridad}</Text></View>
          </View>;
        }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="shield-checkmark-outline" size={56} color={colors.gold.primary} /><Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Sin incidencias</Text><Text style={{ color: colors.text.secondary, textAlign: 'center' }}>Puedes reportar daños, objetos olvidados o falta de insumos.</Text></View>}
      />

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}><View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => setModal(false)} /><View style={[styles.sheet, { backgroundColor: colors.bg.secondary, borderColor: colors.border.gold }]}>
        <View style={styles.modalHeader}><View><Text style={[styles.modalEyebrow, { color: colors.gold.primary }]}>HOUSEKEEPING</Text><Text style={[styles.modalTitle, { color: colors.text.primary }]}>Reportar incidencia</Text></View><TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={22} color={colors.text.secondary} /></TouchableOpacity></View>
        {habitacionId ? <View style={[styles.linkedRoom, { backgroundColor: `${colors.gold.primary}12`, borderColor: colors.border.gold }]}><Ionicons name="bed-outline" size={18} color={colors.gold.primary} /><Text style={{ color: colors.gold.primary, fontWeight: '700' }}>Habitación {habitacionNumero || 'vinculada'}</Text></View> : null}
        <TextInput value={titulo} onChangeText={setTitulo} placeholder="Título del problema" placeholderTextColor={colors.input.placeholder} style={[styles.input, { color: colors.text.primary, backgroundColor: colors.input.bg, borderColor: colors.input.border }]} />
        <TextInput value={descripcion} onChangeText={setDescripcion} placeholder="Describe qué encontraste y dónde..." placeholderTextColor={colors.input.placeholder} multiline style={[styles.textarea, { color: colors.text.primary, backgroundColor: colors.input.bg, borderColor: colors.input.border }]} />
        <Text style={[styles.label, { color: colors.text.muted }]}>Categoría</Text><View style={styles.options}>{CATEGORIAS.map((x) => <TouchableOpacity key={x.value} onPress={() => setCategoria(x.value)} style={[styles.option, { borderColor: categoria === x.value ? colors.gold.primary : colors.border.primary, backgroundColor: categoria === x.value ? `${colors.gold.primary}12` : colors.bg.tertiary }]}><Ionicons name={x.icon as any} size={17} color={categoria === x.value ? colors.gold.primary : colors.text.muted} /><Text style={{ color: categoria === x.value ? colors.gold.primary : colors.text.secondary, fontSize: 10, fontWeight: '700' }}>{x.label}</Text></TouchableOpacity>)}</View>
        <Text style={[styles.label, { color: colors.text.muted }]}>Prioridad</Text><View style={styles.priorityRow}>{PRIORIDADES.map((x) => <TouchableOpacity key={x} onPress={() => setPrioridad(x)} style={[styles.priority, { borderColor: prioridad === x ? colors.gold.primary : colors.border.primary }]}><Text style={{ color: prioridad === x ? colors.gold.primary : colors.text.secondary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{x}</Text></TouchableOpacity>)}</View>
        <AppButton label="Enviar reporte" onPress={() => void crear()} loading={creando} fullWidth />
      </View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 52, paddingBottom: Spacing.md }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2 }, title: { fontSize: Typography.xxl, fontWeight: '800', marginTop: 3 }, subtitle: { fontSize: Typography.sm, marginTop: 3 }, add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 32, gap: Spacing.sm }, card: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: Typography.sm, fontWeight: '700' }, code: { fontSize: 10, marginTop: 3 }, status: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: BorderRadius.full }, description: { fontSize: Typography.xs, lineHeight: 18, marginTop: 12 }, footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, empty: { alignItems: 'center', padding: 48, gap: 10 }, emptyTitle: { fontSize: Typography.xl, fontWeight: '800' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' }, sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }, modalEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 }, modalTitle: { fontSize: Typography.xl, fontWeight: '800', marginTop: 3 }, linkedRoom: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: BorderRadius.md, padding: 10, marginBottom: 10 }, input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 10 }, textarea: { minHeight: 82, borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, textAlignVertical: 'top', marginBottom: 12 }, label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }, option: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 9, paddingVertical: 7 }, priorityRow: { flexDirection: 'row', gap: 6, marginBottom: 12 }, priority: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 9 },
});
