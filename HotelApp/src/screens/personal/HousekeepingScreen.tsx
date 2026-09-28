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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { EstadoHousekeeping, TareaHousekeepingApp } from '../../interfaces';
import {
  actualizarEstadoHousekeeping,
  obtenerEstadosSiguientes,
  obtenerTareasHousekeeping,
} from '../../services/housekeepingService';

const ESTADOS: EstadoHousekeeping[] = ['pendiente', 'en_proceso', 'terminado', 'verificado', 'rechazado'];

export default function HousekeepingScreen() {
  const [tareas, setTareas] = useState<TareaHousekeepingApp[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actualizando, setActualizando] = useState<string | null>(null);

  const cargarTareas = async () => {
    try {
      setTareas(await obtenerTareasHousekeeping());
    } catch (e) {
      console.error('Error cargando tareas:', e);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarTareas();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarTareas();
  };

  const handleCambiarEstado = (tarea: TareaHousekeepingApp) => {
    // La regla de negocio se consulta al service; aquí solo se construye la interacción visual.
    const opciones = obtenerEstadosSiguientes(tarea.estado);
    if (opciones.length === 0) {
      Alert.alert('Info', 'Esta tarea ya está en su estado final.');
      return;
    }

    const etiquetas: Record<EstadoHousekeeping, string> = {
      pendiente: 'Pendiente',
      en_proceso: 'En proceso',
      terminado: 'Terminado',
      verificado: 'Verificado ✓',
      rechazado: 'Rechazado',
    };

    Alert.alert(
      `Habitación #${tarea.numero_habitacion}`,
      'Cambiar estado a:',
      [
        ...opciones.map((estado) => ({
          text: etiquetas[estado],
          onPress: () => actualizarEstado(tarea.housekeeping_id, estado),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ]
    );
  };

  const actualizarEstado = async (id: string, nuevoEstado: EstadoHousekeeping) => {
    setActualizando(id);
    try {
      await actualizarEstadoHousekeeping(id, nuevoEstado);
      await cargarTareas();
      Alert.alert('✅ Estado actualizado', `La tarea cambió a: ${nuevoEstado}`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar.');
    } finally {
      setActualizando(null);
    }
  };

  const colorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      pendiente: '#f59e0b',
      en_proceso: '#3b82f6',
      terminado: '#8b5cf6',
      verificado: '#22c55e',
      rechazado: '#ef4444',
    };
    return colores[estado] ?? '#64748b';
  };

  const colorPrioridad = (prioridad: string) => {
    const colores: Record<string, string> = {
      urgente: '#ef4444',
      alta: '#f97316',
      normal: '#64748b',
      baja: '#22c55e',
    };
    return colores[prioridad] ?? '#64748b';
  };

  const renderTarea = ({ item }: { item: TareaHousekeepingApp }) => (
    <TouchableOpacity
      style={styles.tareaCard}
      onPress={() => handleCambiarEstado(item)}
    >
      <View style={styles.tareaHeader}>
        <View style={styles.habitacionInfo}>
          <Text style={styles.habitacionNum}>🛏️ Hab. #{item.numero_habitacion}</Text>
          <Text style={styles.pisoText}>Piso {item.piso}</Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.prioridadBadge, { backgroundColor: colorPrioridad(item.prioridad) }]}>
            <Text style={styles.badgeText}>{item.prioridad}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.estadoBadge, { backgroundColor: colorEstado(item.estado) }]}>
        <Text style={styles.estadoText}>
          {item.estado === 'pendiente' ? '⏳ Pendiente' :
           item.estado === 'en_proceso' ? '🔄 En proceso' :
           item.estado === 'terminado' ? '🏁 Terminado' :
           item.estado === 'verificado' ? '✅ Verificado' : '❌ Rechazado'}
        </Text>
      </View>

      {item.observaciones && (
        <Text style={styles.observaciones} numberOfLines={2}>
          📝 {item.observaciones}
        </Text>
      )}

      <Text style={styles.fecha}>
        Asignado: {new Date(item.fecha_asignacion).toLocaleDateString()}
      </Text>

      {actualizando === item.housekeeping_id && (
        <ActivityIndicator size="small" color="#f59e0b" style={styles.loader} />
      )}

      {item.estado !== 'verificado' && (
        <Text style={styles.tapHint}>Toca para cambiar estado →</Text>
      )}
    </TouchableOpacity>
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
        <Text style={styles.titulo}>🧹 Housekeeping</Text>
        <Text style={styles.subtitulo}>{tareas.length} tarea{tareas.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={tareas}
        keyExtractor={(item) => item.housekeeping_id}
        renderItem={renderTarea}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>✨</Text>
            <Text style={styles.vacioTitulo}>Sin tareas pendientes</Text>
            <Text style={styles.vacioTexto}>No hay tareas de limpieza asignadas.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 56, paddingBottom: 12 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#f1f5f9' },
  subtitulo: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  lista: { paddingHorizontal: 20, paddingBottom: 32 },
  tareaCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  tareaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  habitacionInfo: {},
  habitacionNum: { fontSize: 17, fontWeight: 'bold', color: '#f1f5f9' },
  pisoText: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6 },
  prioridadBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  estadoBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  estadoText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  observaciones: { color: '#94a3b8', fontSize: 13, marginBottom: 8, lineHeight: 18 },
  fecha: { color: '#475569', fontSize: 12, marginBottom: 6 },
  loader: { marginTop: 8 },
  tapHint: { color: '#334155', fontSize: 12, textAlign: 'right', marginTop: 4 },
  vacio: { alignItems: 'center', paddingTop: 80, padding: 32 },
  vacioEmoji: { fontSize: 48, marginBottom: 16 },
  vacioTitulo: { fontSize: 20, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 8 },
  vacioTexto: { color: '#94a3b8', textAlign: 'center', fontSize: 15 },
});
