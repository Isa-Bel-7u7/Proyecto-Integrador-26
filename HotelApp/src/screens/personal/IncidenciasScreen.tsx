import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import type { IncidenciaActivaApp } from '../../interfaces';
import { crearIncidencia, obtenerIncidenciasActivas } from '../../services/incidenciasService';

// Prioridades válidas en tabla incidencias del DB
const PRIORIDADES: Array<{ valor: string; label: string }> = [
  { valor: 'baja', label: 'Baja' },
  { valor: 'media', label: 'Media' },
  { valor: 'alta', label: 'Alta' },
  { valor: 'critica', label: 'Crítica' },
];

// Categorías para incidencias
const CATEGORIAS = [
  { valor: 'habitaciones', label: 'Habitaciones', emoji: '🛏️' },
  { valor: 'mantenimiento', label: 'Mantenimiento', emoji: '🔧' },
  { valor: 'limpieza', label: 'Limpieza', emoji: '🧹' },
  { valor: 'recepcion', label: 'Recepción', emoji: '🏨' },
  { valor: 'restaurante', label: 'Restaurante', emoji: '🍽️' },
  { valor: 'otro', label: 'Otro', emoji: '❓' },
];

export default function IncidenciasScreen() {
  const { perfil } = useAuth();
  const [incidencias, setIncidencias] = useState<IncidenciaActivaApp[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('habitaciones');
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'critica'>('media');
  const [creando, setCreando] = useState(false);

  const cargarIncidencias = async () => {
    try {
      setIncidencias(await obtenerIncidenciasActivas());
    } catch (e) {
      console.error('Error cargando incidencias:', e);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarIncidencias();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarIncidencias();
  };

  const handleCrearIncidencia = async () => {
    if (!titulo.trim() || !descripcion.trim()) {
      Alert.alert('Campos requeridos', 'El título y descripción son obligatorios.');
      return;
    }
    if (!perfil?.usuario_id) {
      Alert.alert('Error', 'No se pudo identificar tu usuario.');
      return;
    }

    setCreando(true);
    try {
      // La Screen entrega datos al service; el repository se encarga de Supabase.
      await crearIncidencia({
        reportadoPor: perfil.usuario_id,
        categoria,
        titulo,
        descripcion,
        prioridad,
      });

      setModalVisible(false);
      setTitulo('');
      setDescripcion('');
      setCategoria('habitaciones');
      setPrioridad('media');
      await cargarIncidencias();
      Alert.alert('✅ Incidencia creada', 'La incidencia fue reportada exitosamente.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear la incidencia.');
    } finally {
      setCreando(false);
    }
  };

  const colorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      nueva: '#ef4444',
      asignada: '#f97316',
      en_proceso: '#3b82f6',
      pendiente: '#f59e0b',
      resuelta: '#22c55e',
      cerrada: '#64748b',
    };
    return colores[estado] ?? '#64748b';
  };

  const etiquetaEstado = (estado: string) => {
    const etiquetas: Record<string, string> = {
      nueva: 'Nueva',
      asignada: 'Asignada',
      en_proceso: 'En proceso',
      pendiente: 'Pendiente',
      resuelta: 'Resuelta',
      cerrada: 'Cerrada',
    };
    return etiquetas[estado] ?? estado;
  };

  const colorPrioridad = (p: string) => {
    const colores: Record<string, string> = {
      critica: '#ef4444',
      alta: '#f97316',
      media: '#f59e0b',
      baja: '#22c55e',
    };
    return colores[p] ?? '#64748b';
  };

  const getCategoriaEmoji = (cat: string) => {
    return CATEGORIAS.find((c) => c.valor === cat)?.emoji ?? '⚠️';
  };

  const renderIncidencia = ({ item }: { item: IncidenciaActivaApp }) => (
    <View style={styles.incidenciaCard}>
      <View style={styles.incidenciaHeader}>
        <View style={styles.incidenciaLeft}>
          <Text style={styles.tipoEmoji}>{getCategoriaEmoji(item.categoria)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.incidenciaTitulo} numberOfLines={1}>{item.titulo}</Text>
            {item.habitacion && (
              <Text style={styles.habitacionText}>Hab. #{item.habitacion}</Text>
            )}
          </View>
        </View>
        <View style={styles.incidenciaBadges}>
          <View style={[styles.prioridadBadge, { backgroundColor: colorPrioridad(item.prioridad) }]}>
            <Text style={styles.badgeText}>{item.prioridad}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.incidenciaDesc} numberOfLines={2}>{item.descripcion}</Text>

      <View style={styles.incidenciaFooter}>
        <View style={[styles.estadoBadge, { backgroundColor: colorEstado(item.estado) }]}>
          <Text style={styles.estadoText}>{etiquetaEstado(item.estado)}</Text>
        </View>
        <Text style={styles.fechaText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.titulo}>⚠️ Incidencias</Text>
          <Text style={styles.subtitulo}>{incidencias.length} activa{incidencias.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.btnNueva} onPress={() => setModalVisible(true)}>
          <Text style={styles.btnNuevaText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={incidencias}
        keyExtractor={(item) => item.incidencia_id}
        renderItem={renderIncidencia}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>✅</Text>
            <Text style={styles.vacioTitulo}>Sin incidencias activas</Text>
            <Text style={styles.vacioTexto}>No hay incidencias abiertas o en proceso.</Text>
          </View>
        }
      />

      {/* Modal nueva incidencia */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo}>Nueva incidencia</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCerrar}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Describe brevemente el problema"
                placeholderTextColor="#475569"
                maxLength={150}
              />

              <Text style={styles.label}>Descripción *</Text>
              <TextInput
                style={styles.textArea}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Detalla el problema..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              <Text style={styles.label}>Categoría</Text>
              <View style={styles.opcionesGrid}>
                {CATEGORIAS.map((cat) => (
                  <TouchableOpacity
                    key={cat.valor}
                    style={[styles.opcionBtn, categoria === cat.valor && styles.opcionActivo]}
                    onPress={() => setCategoria(cat.valor)}
                  >
                    <Text style={styles.opcionEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.opcionText, categoria === cat.valor && styles.opcionTextActivo]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Prioridad</Text>
              <View style={styles.prioridadRow}>
                {PRIORIDADES.map((p) => (
                  <TouchableOpacity
                    key={p.valor}
                    style={[
                      styles.prioridadBtn,
                      prioridad === p.valor && { backgroundColor: colorPrioridad(p.valor) },
                    ]}
                    onPress={() => setPrioridad(p.valor as any)}
                  >
                    <Text style={[styles.prioridadText, prioridad === p.valor && styles.prioridadTextActivo]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.btnCrear, creando && styles.btnDisabled]}
                onPress={handleCrearIncidencia}
                disabled={creando}
              >
                {creando ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.btnCrearText}>Reportar incidencia</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 20, paddingTop: 56, paddingBottom: 12 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#f1f5f9' },
  subtitulo: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  btnNueva: { backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  btnNuevaText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  lista: { paddingHorizontal: 20, paddingBottom: 32 },
  incidenciaCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12 },
  incidenciaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  incidenciaLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  tipoEmoji: { fontSize: 24 },
  incidenciaTitulo: { fontSize: 15, fontWeight: 'bold', color: '#f1f5f9' },
  habitacionText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  incidenciaBadges: { gap: 4 },
  prioridadBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  incidenciaDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  incidenciaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estadoBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  fechaText: { color: '#475569', fontSize: 12 },
  vacio: { alignItems: 'center', paddingTop: 80, padding: 32 },
  vacioEmoji: { fontSize: 48, marginBottom: 16 },
  vacioTitulo: { fontSize: 20, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 8 },
  vacioTexto: { color: '#94a3b8', textAlign: 'center', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
  modalCerrar: { color: '#64748b', fontSize: 20 },
  label: { color: '#64748b', fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#f1f5f9', fontSize: 14, marginBottom: 12 },
  textArea: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#f1f5f9', fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  opcionesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  opcionBtn: { backgroundColor: '#0f172a', borderRadius: 8, padding: 8, alignItems: 'center', width: '30%', borderWidth: 1, borderColor: '#334155' },
  opcionActivo: { borderColor: '#f59e0b', backgroundColor: '#1c1708' },
  opcionEmoji: { fontSize: 18, marginBottom: 2 },
  opcionText: { color: '#64748b', fontSize: 11, textTransform: 'capitalize', textAlign: 'center' },
  opcionTextActivo: { color: '#f59e0b' },
  prioridadRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  prioridadBtn: { flex: 1, backgroundColor: '#0f172a', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  prioridadText: { color: '#64748b', fontSize: 12 },
  prioridadTextActivo: { color: '#fff', fontWeight: 'bold' },
  btnCrear: { backgroundColor: '#f59e0b', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnCrearText: { color: '#0f172a', fontSize: 15, fontWeight: 'bold' },
});
