// SRP: pantalla de pre check-in para una reserva específica.
// DIP: usa obtenerPreCheckin() y guardarPreCheckin() de clienteService.
// DRY: colores desde useTheme(), makeStyles.
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { obtenerPreCheckin, guardarPreCheckin } from '../../services/clienteService';
import ScreenHeader from '../../components/common/ScreenHeader';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography, ThemeColors } from '../../utils/theme';
import type { ClienteStackParamList, PreCheckin } from '../../types';

type RouteProps = RouteProp<ClienteStackParamList, 'PreCheckin'>;
type NavProp   = NativeStackNavigationProp<ClienteStackParamList>;

// OCP: agregar estados no requiere modificar el renderizado
const ESTADO_COLOR: Record<string, string> = {
  pendiente: '#f59e0b',
  aprobado:  '#22c55e',
  rechazado: '#ef4444',
};

const ESTADO_ICONO: Record<string, string> = {
  pendiente: 'time-outline',
  aprobado:  'checkmark-circle-outline',
  rechazado: 'close-circle-outline',
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente de revisión',
  aprobado:  'Aprobado',
  rechazado: 'Rechazado',
};

export default function PreCheckinScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteProps>();
  const { reservaId } = route.params;
  const { perfil } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [preCheckin, setPreCheckin]           = useState<PreCheckin | null>(null);
  const [horaLlegada, setHoraLlegada]         = useState('14:00');
  const [observaciones, setObservaciones]     = useState('');
  const [datosConfirmados, setDatosConf]      = useState(false);
  const [documentosCargados, setDocsCargados] = useState(false);
  const [cargando, setCargando]               = useState(true);
  const [enviando, setEnviando]               = useState(false);

  useEffect(() => { void cargar(); }, []);

  const cargar = async () => {
    try {
      const data = await obtenerPreCheckin(reservaId);
      if (data) {
        setPreCheckin(data);
        setHoraLlegada(data.hora_estimada_llegada ?? '14:00');
        setObservaciones(data.observaciones ?? '');
        setDatosConf(data.datos_confirmados ?? false);
        setDocsCargados(data.documentos_cargados ?? false);
      }
    } catch (e) {
      console.error('PreCheckin cargar:', e);
    } finally {
      setCargando(false);
    }
  };

  const handleEnviar = async () => {
    if (!datosConfirmados) {
      Alert.alert('Datos requeridos', 'Debes confirmar que tus datos son correctos.');
      return;
    }
    if (!perfil?.cliente_id) {
      Alert.alert('Perfil incompleto', 'Completa tu perfil antes de hacer el pre check-in.');
      return;
    }
    setEnviando(true);
    try {
      await guardarPreCheckin({
        id:                 preCheckin?.id,
        reservaId,
        clienteId:          perfil.cliente_id,
        horaLlegada:        horaLlegada.trim() || null,
        observaciones:      observaciones.trim() || null,
        datosConfirmados,
        documentosCargados,
      });
      Alert.alert(
        'Pre check-in enviado',
        'Tu pre check-in fue enviado y será revisado por el hotel.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el pre check-in.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Pre Check-in" mostrarBack />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Estado actual si ya existe ── */}
        {preCheckin && (
          <>
            <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Estado actual</Text>
            <View style={[
              s.estadoCard,
              {
                backgroundColor: colors.bg.secondary,
                borderLeftColor: ESTADO_COLOR[preCheckin.estado] ?? colors.border.primary,
              },
            ]}>
              <View style={s.estadoFila}>
                <Ionicons
                  name={(ESTADO_ICONO[preCheckin.estado] ?? 'help-circle-outline') as any}
                  size={20}
                  color={ESTADO_COLOR[preCheckin.estado] ?? colors.text.muted}
                />
                <Text style={[
                  s.estadoLabel,
                  { color: ESTADO_COLOR[preCheckin.estado] ?? colors.text.primary },
                ]}>
                  {ESTADO_LABEL[preCheckin.estado] ?? preCheckin.estado}
                </Text>
              </View>
              {preCheckin.estado === 'aprobado' && (
                <Text style={[s.aprobadoText, { color: colors.status.success }]}>
                  Tu pre check-in fue aprobado. Puedes llegar directamente al hotel.
                </Text>
              )}
            </View>
          </>
        )}

        {/* ── Datos del huésped ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>
          Datos del huésped titular
        </Text>
        <AppCard>
          {[
            { label: 'Nombre', valor: perfil?.nombre_completo ?? '—' },
            { label: 'Correo', valor: perfil?.correo ?? '—' },
          ].map((f, i) => (
            <View key={f.label}>
              <View style={s.fila}>
                <Text style={[s.filaLabel, { color: colors.text.secondary }]}>{f.label}</Text>
                <Text
                  style={[s.filaValor, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {f.valor}
                </Text>
              </View>
              {i === 0 && (
                <View style={[s.divider, { backgroundColor: colors.border.primary }]} />
              )}
            </View>
          ))}
        </AppCard>

        {/* ── Hora estimada ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>
          Hora estimada de llegada
        </Text>
        <AppCard>
          <View style={s.inputRow}>
            <Ionicons name="time-outline" size={18} color={colors.gold.primary} />
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: colors.input.bg,
                  borderColor:     colors.input.border,
                  color:           colors.text.primary,
                },
              ]}
              value={horaLlegada}
              onChangeText={setHoraLlegada}
              placeholder="HH:MM (ej: 15:30)"
              placeholderTextColor={colors.input.placeholder}
            />
          </View>
          <Text style={[s.hint, { color: colors.text.muted }]}>
            El check-in estándar es a las 14:00
          </Text>
        </AppCard>

        {/* ── Confirmaciones ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Confirmaciones</Text>
        <AppCard>
          {[
            {
              key: 'datos',
              label: 'Confirmo que mis datos personales son correctos',
              value: datosConfirmados,
              setter: setDatosConf,
            },
            {
              key: 'docs',
              label: 'He cargado los documentos requeridos (pasaporte/CI)',
              value: documentosCargados,
              setter: setDocsCargados,
            },
          ].map((item, i) => (
            <View key={item.key}>
              <TouchableOpacity
                style={s.checkRow}
                onPress={() => item.setter(!item.value)}
                activeOpacity={0.8}
              >
                <View style={[
                  s.checkbox,
                  {
                    backgroundColor: item.value ? colors.gold.primary : 'transparent',
                    borderColor:     item.value ? colors.gold.primary : colors.border.light,
                  },
                ]}>
                  {item.value && (
                    <Ionicons name="checkmark" size={14} color={colors.bg.primary} />
                  )}
                </View>
                <Text style={[s.checkLabel, { color: colors.text.secondary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
              {i === 0 && (
                <View style={[s.divider, { backgroundColor: colors.border.primary }]} />
              )}
            </View>
          ))}
        </AppCard>

        {/* ── Observaciones ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>
          Observaciones (opcional)
        </Text>
        <AppCard>
          <TextInput
            style={[
              s.textArea,
              {
                backgroundColor: colors.input.bg,
                borderColor:     colors.input.border,
                color:           colors.text.primary,
              },
            ]}
            placeholder="Necesidades especiales, solicitudes, etc."
            placeholderTextColor={colors.input.placeholder}
            value={observaciones}
            onChangeText={setObservaciones}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
        </AppCard>

        {/* ── Enviar (solo si no está aprobado) ── */}
        {preCheckin?.estado !== 'aprobado' && (
          <AppButton
            label={preCheckin ? 'Actualizar pre check-in' : 'Enviar pre check-in'}
            onPress={handleEnviar}
            loading={enviando}
            fullWidth
          />
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  seccionTitulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  estadoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
  },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  estadoLabel: { fontSize: Typography.md, fontWeight: '700' },
  aprobadoText: { fontSize: Typography.sm, marginTop: Spacing.sm, lineHeight: 18 },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  filaLabel: { fontSize: Typography.sm },
  filaValor: { fontSize: Typography.sm, fontWeight: '600', flex: 1, textAlign: 'right' },
  divider: { height: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: Typography.md,
  },
  hint: { fontSize: Typography.xs },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkLabel: { flex: 1, fontSize: Typography.sm, lineHeight: 20 },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: Typography.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
