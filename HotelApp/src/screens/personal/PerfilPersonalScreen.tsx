import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function PerfilPersonalScreen() {
  const { perfil, signOut } = useAuth();

  const emojiRol = (rol: string) => {
    const emojis: Record<string, string> = {
      Administrador: '👑',
      Recepcionista: '🏨',
      Housekeeping: '🧹',
      Caja: '💳',
      Supervisor: '📋',
    };
    return emojis[rol] ?? '👤';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{emojiRol(perfil?.rol ?? '')}</Text>
        </View>
        <Text style={styles.nombre}>{perfil?.nombre_completo}</Text>
        <View style={styles.rolBadge}>
          <Text style={styles.rolText}>{perfil?.rol}</Text>
        </View>
        <Text style={styles.correo}>{perfil?.correo}</Text>
      </View>

      {/* Datos */}
      <View style={styles.card}>
        <Text style={styles.cardTitulo}>👤 Información de cuenta</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nombre:</Text>
          <Text style={styles.infoValor}>{perfil?.nombre_completo ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Correo:</Text>
          <Text style={styles.infoValor}>{perfil?.correo ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Teléfono:</Text>
          <Text style={styles.infoValor}>{perfil?.telefono ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Rol:</Text>
          <Text style={styles.infoValor}>{perfil?.rol ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado:</Text>
          <View style={styles.estadoBadge}>
            <Text style={styles.estadoText}>{perfil?.estado ?? 'activo'}</Text>
          </View>
        </View>
      </View>

      {/* Info del sistema */}
      <View style={styles.card}>
        <Text style={styles.cardTitulo}>ℹ️ Sistema</Text>
        <Text style={styles.sistemaText}>
          Sistema Integral de Gestión Hotelera
        </Text>
        <Text style={styles.versionText}>Versión 1.0.0</Text>
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
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  avatarEmoji: { fontSize: 40 },
  nombre: { fontSize: 22, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 6 },
  rolBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 6,
  },
  rolText: { color: '#0f172a', fontSize: 13, fontWeight: 'bold' },
  correo: { color: '#64748b', fontSize: 14 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitulo: { fontSize: 15, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValor: { color: '#f1f5f9', fontSize: 14, fontWeight: '500' },
  estadoBadge: { backgroundColor: '#22c55e', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  estadoText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  sistemaText: { color: '#f1f5f9', fontSize: 14, marginBottom: 4 },
  versionText: { color: '#64748b', fontSize: 13 },
  btnLogout: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnLogoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});