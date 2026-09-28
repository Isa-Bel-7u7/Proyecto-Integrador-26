import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import { PersonalHousekeeping, obtenerMiRegistroPersonal } from '../../services/housekeepingMobileService';
import { subirYActualizarFoto } from '../../services/clienteService';

export default function HousekeepingProfileScreen() {
  const { perfil, recargarPerfil, signOut } = useAuth();
  const { colors } = useTheme();
  const [personal, setPersonal] = useState<PersonalHousekeeping | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async () => {
    if (!perfil?.usuario_id) return;
    try { setPersonal(await obtenerMiRegistroPersonal(perfil.usuario_id)); }
    catch (e: any) { Alert.alert('No se pudieron cargar tus datos laborales', e.message); }
    finally { setCargando(false); setRefreshing(false); }
  }, [perfil?.usuario_id]);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const cambiarFoto = async () => {
    if (!perfil || subiendo) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { Alert.alert('Permiso necesario', 'Permite el acceso a tus fotos para actualizar el perfil.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
    if (result.canceled || !result.assets[0].base64) return;
    setSubiendo(true);
    try {
      const foto = result.assets[0];
      await subirYActualizarFoto(foto.base64!, perfil.usuario_id, foto.mimeType ?? 'image/jpeg');
      await recargarPerfil();
      Alert.alert('Foto actualizada', 'Tu nueva foto ya está disponible.');
    } catch (e: any) { Alert.alert('No se pudo actualizar la foto', e.message); }
    finally { setSubiendo(false); }
  };

  if (cargando) return <LoadingScreen />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg.primary }} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}>
      <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>MI CUENTA</Text><Text style={[styles.title, { color: colors.text.primary }]}>Perfil</Text>
      <AppCard goldBorder style={styles.profileCard}>
        <TouchableOpacity onPress={() => void cambiarFoto()} style={styles.avatarWrap} disabled={subiendo}>
          <View style={[styles.avatar, { backgroundColor: colors.bg.tertiary }]}>{perfil?.foto_url ? <Image source={{ uri: perfil.foto_url }} style={styles.image} /> : <Text style={[styles.initial, { color: colors.gold.primary }]}>{perfil?.nombre_completo?.[0]?.toUpperCase() ?? 'H'}</Text>}{subiendo && <View style={styles.loading}><ActivityIndicator color="#fff" /></View>}</View>
          <View style={[styles.camera, { backgroundColor: colors.gold.primary }]}><Ionicons name="camera" size={15} color="#fff" /></View>
        </TouchableOpacity>
        <Text style={[styles.name, { color: colors.text.primary }]}>{perfil?.nombre_completo}</Text>
        <Text style={[styles.email, { color: colors.text.secondary }]}>{perfil?.correo}</Text>
        <View style={[styles.role, { backgroundColor: `${colors.gold.primary}18` }]}><Ionicons name="sparkles-outline" size={14} color={colors.gold.primary} /><Text style={{ color: colors.gold.primary, fontSize: 11, fontWeight: '800' }}>HOUSEKEEPING</Text></View>
      </AppCard>

      <Text style={[styles.section, { color: colors.text.muted }]}>Información laboral</Text>
      <AppCard>
        {[
          { icon: 'id-card-outline', label: 'Código', value: personal?.codigo_empleado },
          { icon: 'briefcase-outline', label: 'Cargo', value: personal?.cargo },
          { icon: 'business-outline', label: 'Área', value: personal?.area ?? 'Housekeeping' },
          { icon: 'time-outline', label: 'Turno base', value: personal?.turno ?? 'Según programación' },
          { icon: 'call-outline', label: 'Teléfono', value: perfil?.telefono ?? '—' },
          { icon: 'shield-checkmark-outline', label: 'Estado', value: personal?.estado ?? perfil?.estado },
        ].map((row, i, arr) => <View key={row.label}><View style={styles.infoRow}><Ionicons name={row.icon as any} size={17} color={colors.gold.primary} /><Text style={[styles.infoLabel, { color: colors.text.secondary }]}>{row.label}</Text><Text style={[styles.infoValue, { color: colors.text.primary }]} numberOfLines={1}>{row.value}</Text></View>{i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />}</View>)}
      </AppCard>

      <AppButton label="Cerrar sesión" onPress={() => void signOut()} variant="danger" fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingTop: 52, paddingBottom: 36, gap: Spacing.md }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2 }, title: { fontSize: Typography.xxl, fontWeight: '800', marginTop: -10 }, profileCard: { alignItems: 'center', paddingVertical: Spacing.lg }, avatarWrap: { position: 'relative' }, avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: '100%', height: '100%' }, initial: { fontSize: 34, fontWeight: '800' }, loading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }, camera: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }, name: { fontSize: Typography.xl, fontWeight: '800', marginTop: Spacing.md }, email: { fontSize: Typography.sm, marginTop: 4 }, role: { flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 }, section: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Spacing.sm }, infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, infoLabel: { width: 78, fontSize: Typography.xs }, infoValue: { flex: 1, textAlign: 'right', fontSize: Typography.sm, fontWeight: '600' }, divider: { height: 1, marginVertical: 12 },
});
