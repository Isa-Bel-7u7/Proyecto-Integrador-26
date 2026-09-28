// SRP: pantalla para que el cliente solicite servicios del hotel.
// DIP: usa obtenerServiciosHotel() y solicitarServicio() de clienteService.
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { obtenerServiciosHotel, solicitarServicio } from '../../services/clienteService';
import ScreenHeader from '../../components/common/ScreenHeader';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography, ThemeColors } from '../../utils/theme';

// OCP: mapear tipos a iconos sin tocar el renderizado
const TIPO_ICONO: Record<string, string> = {
  hotel:       'business-outline',
  adicional:   'add-circle-outline',
  gym:         'barbell-outline',
  spa:         'flower-outline',
  restaurante: 'restaurant-outline',
  piscina:     'water-outline',
  lavanderia:  'shirt-outline',
  transporte:  'car-outline',
};

function obtenerIcono(tipo: string, nombre: string): string {
  const nombreLower = nombre.toLowerCase();
  if (nombreLower.includes('gym') || nombreLower.includes('gimnasio')) return 'barbell-outline';
  if (nombreLower.includes('spa') || nombreLower.includes('masaje'))   return 'flower-outline';
  if (nombreLower.includes('piscina'))    return 'water-outline';
  if (nombreLower.includes('lavandería') || nombreLower.includes('lavanderia')) return 'shirt-outline';
  if (nombreLower.includes('transport'))  return 'car-outline';
  if (nombreLower.includes('restaur'))    return 'restaurant-outline';
  return TIPO_ICONO[tipo] ?? 'star-outline';
}

export default function SolicitudServicioScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [servicios, setServicios]     = useState<any[]>([]);
  const [servicioSel, setServicioSel] = useState<any | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando]       = useState(false);
  const [cargando, setCargando]       = useState(true);

  useEffect(() => { void cargarServicios(); }, []);

  const cargarServicios = async () => {
    try {
      const data = await obtenerServiciosHotel();
      setServicios(data);
    } catch (e) {
      console.error('SolicitudServicio:', e);
    } finally {
      setCargando(false);
    }
  };

  const handleEnviar = async () => {
    if (!servicioSel) {
      Alert.alert('Servicio requerido', 'Selecciona un servicio para continuar.');
      return;
    }
    setEnviando(true);
    try {
      await solicitarServicio({
        titulo:      `Solicitud de servicio: ${servicioSel.nombre}`,
        descripcion: descripcion.trim() || `El cliente solicitó el servicio: ${servicioSel.nombre}`,
        categoria:   servicioSel.tipo ?? 'hotel',
      });
      Alert.alert(
        'Solicitud enviada',
        'El personal del hotel recibirá tu solicitud y te notificará a la brevedad.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Solicitar servicio" mostrarBack />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <AppCard goldBorder style={s.infoCard}>
          <View style={s.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.gold.primary} />
            <Text style={[s.infoTexto, { color: colors.text.secondary }]}>
              Al enviar tu solicitud, el personal del hotel la recibirá y te confirmará
              la disponibilidad mediante una notificación en la app.
            </Text>
          </View>
        </AppCard>

        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Selecciona el servicio</Text>

        {servicios.length === 0 ? (
          <AppCard style={s.sinServicios}>
            <Ionicons name="apps-outline" size={40} color={colors.text.muted} />
            <Text style={[s.sinServiciosTitulo, { color: colors.text.primary }]}>
              Sin servicios disponibles
            </Text>
            <Text style={[s.sinServiciosTexto, { color: colors.text.secondary }]}>
              No hay servicios configurados en este momento.
            </Text>
          </AppCard>
        ) : (
          <AppCard>
            {servicios.map((srv, i) => {
              const sel   = servicioSel?.id === srv.id;
              const icono = obtenerIcono(srv.tipo, srv.nombre);
              return (
                <View key={srv.id}>
                  <TouchableOpacity
                    onPress={() => setServicioSel(sel ? null : srv)}
                    style={[
                      s.servicioRow,
                      sel && { backgroundColor: `${colors.gold.primary}10` },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      s.iconBox,
                      { backgroundColor: sel ? `${colors.gold.primary}18` : colors.bg.tertiary },
                    ]}>
                      <Ionicons
                        name={icono as any}
                        size={20}
                        color={sel ? colors.gold.primary : colors.text.muted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        s.servicioNombre,
                        { color: sel ? colors.gold.primary : colors.text.primary },
                      ]}>
                        {srv.nombre}
                      </Text>
                      {srv.descripcion ? (
                        <Text style={[s.servicioDesc, { color: colors.text.secondary }]} numberOfLines={1}>
                          {srv.descripcion}
                        </Text>
                      ) : null}
                      {!srv.incluido && srv.precio > 0 ? (
                        <Text style={[s.servicioPrecio, { color: colors.gold.primary }]}>
                          Bs. {Number(srv.precio).toFixed(2)}
                        </Text>
                      ) : srv.incluido ? (
                        <Text style={[s.servicioIncluido, { color: colors.status.success }]}>
                          Incluido
                        </Text>
                      ) : null}
                    </View>
                    <View style={[
                      s.radioOuter,
                      { borderColor: sel ? colors.gold.primary : colors.border.light },
                    ]}>
                      {sel && (
                        <View style={[s.radioInner, { backgroundColor: colors.gold.primary }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                  {i < servicios.length - 1 && (
                    <View style={[s.divider, { backgroundColor: colors.border.primary }]} />
                  )}
                </View>
              );
            })}
          </AppCard>
        )}

        {/* ── Detalles adicionales ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>
          Detalles adicionales (opcional)
        </Text>
        <AppCard>
          <TextInput
            style={[s.textarea, {
              color:           colors.text.primary,
              borderColor:     colors.input.border,
              backgroundColor: colors.input.bg,
            }]}
            placeholder="Hora preferida, indicaciones especiales, etc."
            placeholderTextColor={colors.input.placeholder}
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
            maxLength={300}
            textAlignVertical="top"
          />
        </AppCard>

        <AppButton
          label="Enviar solicitud"
          onPress={handleEnviar}
          loading={enviando}
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  content:          { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  seccionTitulo:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  infoCard:         { gap: Spacing.sm },
  infoRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  infoTexto:        { flex: 1, fontSize: Typography.sm, lineHeight: 20 },
  sinServicios:     { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  sinServiciosTitulo: { fontSize: Typography.lg, fontWeight: '700' },
  sinServiciosTexto:  { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  servicioRow:      {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  iconBox:          {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  servicioNombre:   { fontSize: Typography.md, fontWeight: '600' },
  servicioDesc:     { fontSize: Typography.xs, marginTop: 2 },
  servicioPrecio:   { fontSize: Typography.xs, fontWeight: '700', marginTop: 2 },
  servicioIncluido: { fontSize: Typography.xs, fontWeight: '700', marginTop: 2 },
  radioOuter:       {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  radioInner:       { width: 10, height: 10, borderRadius: 5 },
  divider:          { height: 1, marginHorizontal: Spacing.md },
  textarea:         {
    borderWidth: 1, borderRadius: BorderRadius.md,
    padding: 12, fontSize: Typography.sm, minHeight: 80,
  },
});
