import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../hooks/useDashboard';

export default function DashboardScreen() {
  const { perfil, signOut } = useAuth();
  // Clean Architecture: la Screen consume un hook y no accede directamente a Supabase.
  const { resumen, cargando, refreshing, onRefresh } = useDashboard();

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saludo}>Panel de Control 📊</Text>
          <Text style={styles.subSaludo}>
            {perfil?.nombre_completo} — {perfil?.rol}
          </Text>
        </View>
      </View>

      {/* Tarjetas de reservas */}
      <Text style={styles.seccionTitulo}>Reservas</Text>
      <View style={styles.grid}>
        <View style={[styles.statCard, { borderTopColor: '#f59e0b' }]}>
          <Text style={styles.statNumero}>{resumen?.total_reservas ?? 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#f59e0b' }]}>
          <Text style={styles.statNumero}>{resumen?.reservas_pendientes ?? 0}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#22c55e' }]}>
          <Text style={styles.statNumero}>{resumen?.reservas_confirmadas ?? 0}</Text>
          <Text style={styles.statLabel}>Confirmadas</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#3b82f6' }]}>
          <Text style={styles.statNumero}>{resumen?.reservas_en_estadia ?? 0}</Text>
          <Text style={styles.statLabel}>En estadía</Text>
        </View>
      </View>

      {/* Tarjetas de habitaciones */}
      <Text style={styles.seccionTitulo}>Habitaciones</Text>
      <View style={styles.grid}>
        <View style={[styles.statCard, { borderTopColor: '#22c55e' }]}>
          <Text style={styles.statNumero}>{resumen?.habitaciones_disponibles ?? 0}</Text>
          <Text style={styles.statLabel}>Disponibles</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#3b82f6' }]}>
          <Text style={styles.statNumero}>{resumen?.habitaciones_ocupadas ?? 0}</Text>
          <Text style={styles.statLabel}>Ocupadas</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#f59e0b' }]}>
          <Text style={styles.statNumero}>{resumen?.habitaciones_limpieza ?? 0}</Text>
          <Text style={styles.statLabel}>Limpieza</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#ef4444' }]}>
          <Text style={styles.statNumero}>{resumen?.incidencias_abiertas ?? 0}</Text>
          <Text style={styles.statLabel}>Incidencias</Text>
        </View>
      </View>

      {/* Ingresos */}
      <View style={styles.ingresosCard}>
        <Text style={styles.ingresosTitulo}>💰 Pagos aprobados</Text>
        <Text style={styles.ingresosValor}>
          {(resumen?.pagos_aprobados ?? 0).toFixed(2)} BOB
        </Text>
      </View>

      {/* Info empleado */}
      <View style={styles.empleadoCard}>
        <Text style={styles.empleadoTitulo}>👤 Mi información</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Cargo:</Text>
          <Text style={styles.infoValor}>{perfil?.rol}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Correo:</Text>
          <Text style={styles.infoValor}>{perfil?.correo}</Text>
        </View>
        {perfil?.telefono && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teléfono:</Text>
            <Text style={styles.infoValor}>{perfil.telefono}</Text>
          </View>
        )}
      </View>

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.btnLogout} onPress={signOut}>
        <Text style={styles.btnLogoutText}>🚪 Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { marginBottom: 24 },
  saludo: { fontSize: 22, fontWeight: 'bold', color: '#f1f5f9' },
  subSaludo: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  seccionTitulo: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderTopWidth: 3,
    alignItems: 'center',
  },
  statNumero: { fontSize: 32, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  ingresosCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  ingresosTitulo: { fontSize: 15, fontWeight: 'bold', color: '#f1f5f9' },
  ingresosValor: { fontSize: 20, fontWeight: 'bold', color: '#22c55e' },
  empleadoCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 20 },
  empleadoTitulo: { fontSize: 15, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValor: { color: '#f1f5f9', fontSize: 14, fontWeight: '500' },
  btnLogout: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnLogoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
