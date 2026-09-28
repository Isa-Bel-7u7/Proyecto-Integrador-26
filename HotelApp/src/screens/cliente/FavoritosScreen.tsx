// SRP: pantalla exclusiva para gestionar habitaciones favoritas del cliente.
// DIP: usa obtenerMisFavoritos() y obtenerImagenesHabitaciones() de clienteService.
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, RefreshControl, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  obtenerMisFavoritos,
  obtenerImagenesHabitaciones,
  toggleFavorito,
  IMAGEN_FALLBACK,
  IMAGEN_DEFAULT,
} from '../../services/clienteService';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography, ThemeColors } from '../../utils/theme';
import type { ClienteStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<ClienteStackParamList>;

function formatearFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function FavoritosScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [favoritos, setFavoritos]   = useState<any[]>([]);
  const [imagenes, setImagenes]     = useState<Record<string, string>>({});
  const [cargando, setCargando]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await obtenerMisFavoritos();
      setFavoritos(data);
      const ids = data.map((f: any) => f.habitacion_id ?? f.id).filter(Boolean);
      if (ids.length > 0) {
        const imgs = await obtenerImagenesHabitaciones(ids);
        setImagenes(imgs);
      }
    } catch (e) {
      console.error('FavoritosScreen:', e);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const onRefresh = () => { setRefreshing(true); void cargar(); };

  const handleQuitarFavorito = (f: any) => {
    const habId = f.habitacion_id ?? f.id;
    Alert.alert(
      'Quitar de favoritos',
      '¿Deseas quitar esta habitación de tus favoritos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await toggleFavorito({ habitacionId: habId });
              setFavoritos((prev) => prev.filter((x) => (x.habitacion_id ?? x.id) !== habId));
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'No se pudo quitar el favorito.');
            }
          },
        },
      ],
    );
  };

  const irADetalle = (f: any) => {
    const habId = f.habitacion_id ?? f.id;
    const hoy = new Date();
    const man = new Date(); man.setDate(hoy.getDate() + 1);
    navigation.navigate('DetalleHabitacion', {
      habitacionId: habId,
      fechaEntrada: formatearFecha(hoy),
      fechaSalida:  formatearFecha(man),
      adultos: 1,
      ninos:   0,
    });
  };

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Mis favoritos" mostrarBack />
      <FlatList
        data={favoritos}
        keyExtractor={(f) => String(f.id ?? f.habitacion_id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.primary}
          />
        }
        contentContainerStyle={s.content}
        ListEmptyComponent={
          <View style={s.vacio}>
            <Ionicons name="heart-outline" size={56} color={colors.text.muted} />
            <Text style={[s.vacioTitulo, { color: colors.text.primary }]}>Sin favoritos</Text>
            <Text style={[s.vacioTexto, { color: colors.text.secondary }]}>
              Guarda habitaciones que te gusten para verlas aquí fácilmente.
            </Text>
            <AppButton
              label="Buscar habitaciones"
              onPress={() => navigation.navigate('ClienteTabs', { screen: 'Buscar' } as any)}
              variant="secondary"
            />
          </View>
        }
        renderItem={({ item: f }) => {
          const habId    = f.habitacion_id ?? f.id;
          const tipoNombre = f.nombre_tipo ?? f.tipo_habitacion ?? '';
          const imagen   = imagenes[habId]
            ?? IMAGEN_FALLBACK[tipoNombre]
            ?? IMAGEN_DEFAULT;
          return (
            <TouchableOpacity onPress={() => irADetalle(f)} activeOpacity={0.9}>
              <AppCard noPadding style={s.card}>
                <Image source={{ uri: imagen }} style={s.imagen} />
                <View style={s.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.nombreHab, { color: colors.text.primary }]} numberOfLines={1}>
                      {f.nombre_tipo ?? f.tipo_habitacion ?? f.habitacion ?? 'Habitación'}
                    </Text>
                    {f.numero ? (
                      <Text style={[s.numHab, { color: colors.text.muted }]}>#{f.numero}</Text>
                    ) : null}
                    {f.precio ? (
                      <Text style={[s.precio, { color: colors.gold.primary }]}>
                        Bs. {Number(f.precio).toFixed(2)} / noche
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleQuitarFavorito(f)}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="heart" size={22} color={colors.status.error} />
                  </TouchableOpacity>
                </View>
              </AppCard>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  content:          { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  card:             { overflow: 'hidden' },
  imagen:           { width: '100%', height: 140, resizeMode: 'cover' },
  imagenPlaceholder:{ height: 100, justifyContent: 'center', alignItems: 'center' },
  infoRow:          { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  nombreHab:        { fontSize: Typography.md, fontWeight: '700' },
  numHab:           { fontSize: Typography.xs, marginTop: 2 },
  precio:           { fontSize: Typography.sm, fontWeight: '700', marginTop: 4 },
  vacio:            { alignItems: 'center', paddingTop: 60, gap: Spacing.md, paddingHorizontal: Spacing.lg },
  vacioTitulo:      { fontSize: Typography.lg, fontWeight: '700' },
  vacioTexto:       { textAlign: 'center', fontSize: Typography.sm, lineHeight: 21 },
});
