// SRP: pantalla exclusiva para mostrar anuncios vigentes del hotel.
// DIP: usa obtenerAnunciosVigentes() de clienteService.
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { obtenerAnunciosVigentes } from '../../services/clienteService';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography, ThemeColors } from '../../utils/theme';
import type { ClienteStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<ClienteStackParamList>;

// OCP: agregar tipos no requiere cambiar el renderizado
const TIPO_COLOR: Record<string, string> = {
  evento:      '#7c3aed',
  promocion:   '#059669',
  informativo: '#2563eb',
  novedad:     '#d97706',
  otro:        '#6b7280',
};

export default function AvisosScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [anuncios, setAnuncios]     = useState<any[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await obtenerAnunciosVigentes(20);
      setAnuncios(data);
    } catch (e) {
      console.error('AvisosScreen:', e);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const onRefresh = () => { setRefreshing(true); void cargar(); };

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Avisos y novedades" mostrarBack />
      <FlatList
        data={anuncios}
        keyExtractor={(a) => String(a.id ?? a.anuncio_id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.primary}
          />
        }
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <AppCard goldBorder style={s.buzonCard}>
            <View style={s.buzonRow}>
              <View style={[s.buzonIconBox, { backgroundColor: `${colors.gold.primary}18` }]}>
                <Ionicons name="mail-outline" size={24} color={colors.gold.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.buzonTitulo, { color: colors.text.primary }]}>
                  Buzón de contacto
                </Text>
                <Text style={[s.buzonSubtitulo, { color: colors.text.secondary }]}>
                  Envía sugerencias, comentarios o reporta un inconveniente
                </Text>
              </View>
            </View>
            <AppButton
              label="Ir al buzón"
              onPress={() => navigation.navigate('Buzon')}
              variant="secondary"
              fullWidth
            />
          </AppCard>
        }
        ListEmptyComponent={
          <View style={s.vacio}>
            <Ionicons name="megaphone-outline" size={56} color={colors.text.muted} />
            <Text style={[s.vacioTitulo, { color: colors.text.primary }]}>
              Sin avisos activos
            </Text>
            <Text style={[s.vacioTexto, { color: colors.text.secondary }]}>
              No hay anuncios vigentes en este momento.
            </Text>
          </View>
        }
        renderItem={({ item: a }) => {
          const color = TIPO_COLOR[a.tipo] ?? TIPO_COLOR.otro;
          return (
            <AppCard style={s.card} noPadding>
              {a.imagen_url ? (
                <Image source={{ uri: a.imagen_url }} style={s.imagen} />
              ) : (
                <View style={[s.imagenPlaceholder, { backgroundColor: `${color}12` }]}>
                  <Ionicons name="megaphone-outline" size={32} color={color} />
                </View>
              )}
              <View style={s.cardBody}>
                <View style={[s.tipoBadge, { backgroundColor: `${color}12` }]}>
                  <Text style={[s.tipoText, { color }]}>
                    {(a.tipo ?? 'AVISO').toUpperCase()}
                  </Text>
                </View>
                <Text style={[s.titulo, { color: colors.text.primary }]} numberOfLines={2}>
                  {a.titulo}
                </Text>
                {a.subtitulo ? (
                  <Text style={[s.subtitulo, { color: colors.text.secondary }]} numberOfLines={3}>
                    {a.subtitulo}
                  </Text>
                ) : null}
                {a.descripcion ? (
                  <Text style={[s.descripcion, { color: colors.text.secondary }]} numberOfLines={4}>
                    {a.descripcion}
                  </Text>
                ) : null}
                {a.fecha_fin ? (
                  <View style={s.fechaRow}>
                    <Ionicons name="time-outline" size={12} color={colors.text.muted} />
                    <Text style={[s.fechaText, { color: colors.text.muted }]}>
                      Hasta {a.fecha_fin}
                    </Text>
                  </View>
                ) : null}
              </View>
            </AppCard>
          );
        }}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  content:         { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  buzonCard:       { gap: Spacing.md },
  buzonRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  buzonIconBox:    { width: 48, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  buzonTitulo:     { fontSize: Typography.md, fontWeight: '700' },
  buzonSubtitulo:  { fontSize: Typography.sm, marginTop: 2, lineHeight: 18 },
  card:            { overflow: 'hidden' },
  imagen:          { width: '100%', height: 160, resizeMode: 'cover' },
  imagenPlaceholder: { height: 100, justifyContent: 'center', alignItems: 'center' },
  cardBody:        { padding: Spacing.md, gap: Spacing.sm },
  tipoBadge:       { alignSelf: 'flex-start', borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  tipoText:        { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  titulo:          { fontSize: Typography.lg, fontWeight: '700', lineHeight: 24 },
  subtitulo:       { fontSize: Typography.sm, lineHeight: 20 },
  descripcion:     { fontSize: Typography.sm, lineHeight: 20 },
  fechaRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fechaText:       { fontSize: Typography.xs },
  vacio:           { alignItems: 'center', paddingTop: 60, gap: Spacing.md, paddingHorizontal: Spacing.lg },
  vacioTitulo:     { fontSize: Typography.lg, fontWeight: '700' },
  vacioTexto:      { textAlign: 'center', fontSize: Typography.sm, lineHeight: 21 },
});
