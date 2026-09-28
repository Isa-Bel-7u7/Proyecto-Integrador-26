// SRP: formulario exclusivo para que el cliente envíe mensajes al hotel.
// DIP: usa enviarBuzon() de clienteService — nunca accede a supabase directamente.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Alert, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { enviarBuzon } from '../../services/clienteService';
import ScreenHeader from '../../components/common/ScreenHeader';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import { BorderRadius, Spacing, Typography, ThemeColors } from '../../utils/theme';

// OCP: agregar tipos de mensaje = agregar un objeto al array
const TIPOS = [
  { id: 'sugerencia', label: 'Sugerencia',  icono: 'bulb-outline'         },
  { id: 'queja',      label: 'Queja',       icono: 'warning-outline'      },
  { id: 'consulta',   label: 'Consulta',    icono: 'help-circle-outline'  },
  { id: 'otro',       label: 'Otro',        icono: 'chatbox-outline'      },
] as const;

export default function BuzonScreen() {
  const navigation = useNavigation();
  const { perfil } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [tipo, setTipo]         = useState<string>('consulta');
  const [asunto, setAsunto]     = useState('');
  const [mensaje, setMensaje]   = useState('');
  const [anonimo, setAnonimo]   = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async () => {
    if (!asunto.trim()) { Alert.alert('Campo requerido', 'Ingresa un asunto.'); return; }
    if (!mensaje.trim()) { Alert.alert('Campo requerido', 'Escribe tu mensaje.'); return; }
    setEnviando(true);
    try {
      await enviarBuzon({
        tipo,
        asunto:            asunto.trim(),
        mensaje:           mensaje.trim(),
        categoria:         tipo,
        nombreContacto:    anonimo ? undefined : perfil?.nombre_completo ?? undefined,
        correoContacto:    anonimo ? undefined : perfil?.correo          ?? undefined,
        telefonoContacto:  anonimo ? undefined : perfil?.telefono        ?? undefined,
        anonimo,
      });
      Alert.alert(
        'Mensaje enviado',
        'Tu mensaje fue recibido. El equipo del hotel lo revisará a la brevedad.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Buzón de contacto" mostrarBack />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Tipo de mensaje ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Tipo de mensaje</Text>
        <View style={s.tiposGrid}>
          {TIPOS.map((t) => {
            const sel = tipo === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTipo(t.id)}
                style={[
                  s.tipoCard,
                  {
                    backgroundColor: sel ? `${colors.gold.primary}12` : colors.bg.secondary,
                    borderColor:     sel ? colors.gold.primary : colors.border.primary,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icono as any}
                  size={22}
                  color={sel ? colors.gold.primary : colors.text.muted}
                />
                <Text style={[s.tipoLabel, { color: sel ? colors.gold.primary : colors.text.secondary }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Asunto ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Asunto</Text>
        <AppCard>
          <TextInput
            style={[s.input, {
              color:           colors.text.primary,
              borderColor:     colors.input.border,
              backgroundColor: colors.input.bg,
            }]}
            placeholder="Resume en una línea tu mensaje"
            placeholderTextColor={colors.input.placeholder}
            value={asunto}
            onChangeText={setAsunto}
            maxLength={120}
          />
        </AppCard>

        {/* ── Mensaje ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Mensaje</Text>
        <AppCard>
          <TextInput
            style={[s.textarea, {
              color:           colors.text.primary,
              borderColor:     colors.input.border,
              backgroundColor: colors.input.bg,
            }]}
            placeholder="Escribe tu mensaje con todos los detalles necesarios..."
            placeholderTextColor={colors.input.placeholder}
            value={mensaje}
            onChangeText={setMensaje}
            multiline
            numberOfLines={5}
            maxLength={800}
            textAlignVertical="top"
          />
          <Text style={[s.contador, { color: colors.text.muted }]}>{mensaje.length}/800</Text>
        </AppCard>

        {/* ── Anonimato ── */}
        <TouchableOpacity
          onPress={() => setAnonimo(!anonimo)}
          style={[s.anonimoRow, {
            backgroundColor: colors.bg.secondary,
            borderColor:     colors.border.primary,
          }]}
          activeOpacity={0.8}
        >
          <View style={[
            s.checkbox,
            {
              backgroundColor: anonimo ? colors.gold.primary : 'transparent',
              borderColor:     anonimo ? colors.gold.primary : colors.border.light,
            },
          ]}>
            {anonimo && <Ionicons name="checkmark" size={14} color={colors.bg.primary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.anonimoLabel, { color: colors.text.primary }]}>
              Enviar de forma anónima
            </Text>
            <Text style={[s.anonimoDesc, { color: colors.text.secondary }]}>
              No se incluirá tu nombre ni datos de contacto
            </Text>
          </View>
        </TouchableOpacity>

        <AppButton
          label="Enviar mensaje"
          onPress={handleEnviar}
          loading={enviando}
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  content:       { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  seccionTitulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  tiposGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tipoCard:      {
    width: '47.5%', borderRadius: BorderRadius.lg, borderWidth: 1,
    padding: Spacing.md, alignItems: 'center', gap: Spacing.sm,
  },
  tipoLabel:     { fontSize: Typography.sm, fontWeight: '600' },
  input:         { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, fontSize: Typography.sm },
  textarea:      {
    borderWidth: 1, borderRadius: BorderRadius.md, padding: 12,
    fontSize: Typography.sm, minHeight: 120,
  },
  contador:      { fontSize: Typography.xs, textAlign: 'right', marginTop: Spacing.xs },
  anonimoRow:    {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  checkbox:      {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  anonimoLabel:  { fontSize: Typography.sm, fontWeight: '600' },
  anonimoDesc:   { fontSize: Typography.xs, marginTop: 2, lineHeight: 16 },
});
