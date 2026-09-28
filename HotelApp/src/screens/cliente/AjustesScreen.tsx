// ============================================================
// PRINCIPIO SRP: pantalla de ajustes — responsabilidad única:
// presentar y persistir preferencias de la aplicación (tema).
//
// PRINCIPIO DIP: el toggle de tema delega a ThemeContext
// (abstracción), no manipula AsyncStorage directamente.
//
// PRINCIPIO DRY: los items del menú de ajustes están en un
// array (SECCIONES_CONFIG) — el render es genérico.
// ============================================================
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ScreenHeader from '../../components/common/ScreenHeader';
import AppCard from '../../components/common/AppCard';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

const VERSION_APP = '1.0.0';

// OCP: agregar un item = agregar un objeto aquí
type AjusteItem =
  | { tipo: 'toggle'; icono: string; label: string; sub?: string; valor: boolean; onToggle: () => void }
  | { tipo: 'link';   icono: string; label: string; sub?: string; onPress: () => void }
  | { tipo: 'info';   icono: string; label: string; valor: string };

function ItemToggle({ item, colors }: { item: Extract<AjusteItem, { tipo: 'toggle' }>; colors: any }) {
  return (
    <View style={styles.itemRow}>
      <View style={[styles.itemIconBox, { backgroundColor: colors.bg.tertiary }]}>
        <Ionicons name={item.icono as any} size={18} color={colors.gold.primary} />
      </View>
      <View style={styles.itemTexto}>
        <Text style={[styles.itemLabel, { color: colors.text.primary }]}>{item.label}</Text>
        {item.sub && <Text style={[styles.itemSub, { color: colors.text.muted }]}>{item.sub}</Text>}
      </View>
      <Switch
        value={item.valor}
        onValueChange={item.onToggle}
        trackColor={{ false: colors.border.light, true: colors.gold.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

function ItemLink({ item, colors }: { item: Extract<AjusteItem, { tipo: 'link' }>; colors: any }) {
  return (
    <TouchableOpacity style={styles.itemRow} onPress={item.onPress} activeOpacity={0.7}>
      <View style={[styles.itemIconBox, { backgroundColor: colors.bg.tertiary }]}>
        <Ionicons name={item.icono as any} size={18} color={colors.gold.primary} />
      </View>
      <View style={styles.itemTexto}>
        <Text style={[styles.itemLabel, { color: colors.text.primary }]}>{item.label}</Text>
        {item.sub && <Text style={[styles.itemSub, { color: colors.text.muted }]}>{item.sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
    </TouchableOpacity>
  );
}

function ItemInfo({ item, colors }: { item: Extract<AjusteItem, { tipo: 'info' }>; colors: any }) {
  return (
    <View style={styles.itemRow}>
      <View style={[styles.itemIconBox, { backgroundColor: colors.bg.tertiary }]}>
        <Ionicons name={item.icono as any} size={18} color={colors.text.muted} />
      </View>
      <View style={styles.itemTexto}>
        <Text style={[styles.itemLabel, { color: colors.text.secondary }]}>{item.label}</Text>
      </View>
      <Text style={[styles.itemValor, { color: colors.text.muted }]}>{item.valor}</Text>
    </View>
  );
}

export default function AjustesScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { perfil, signOut } = useAuth();

  const [cerrandoSesion, setCerrandoSesion] = React.useState(false);

  const confirmarCerrarSesion = () =>
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive',
        onPress: async () => {
          setCerrandoSesion(true);
          try { await signOut(); } finally { setCerrandoSesion(false); }
        },
      },
    ]);

  // DRY: estructura declarativa de secciones
  const secciones: { titulo: string; items: AjusteItem[] }[] = [
    {
      titulo: 'Apariencia',
      items: [
        {
          tipo: 'toggle',
          icono: isDark ? 'moon-outline' : 'sunny-outline',
          label: 'Modo oscuro',
          sub: isDark ? 'Activado' : 'Desactivado',
          valor: isDark,
          onToggle: toggleTheme,
        },
      ],
    },
    {
      titulo: 'Soporte',
      items: [
        {
          tipo: 'link',
          icono: 'help-circle-outline',
          label: 'Centro de ayuda',
          sub: 'Preguntas frecuentes',
          onPress: () => Alert.alert('Ayuda', 'Para soporte contacta a recepción del hotel.'),
        },
        {
          tipo: 'link',
          icono: 'document-text-outline',
          label: 'Términos y condiciones',
          onPress: () => Alert.alert('Términos', 'Los términos están disponibles en el sitio web.'),
        },
        {
          tipo: 'link',
          icono: 'shield-outline',
          label: 'Política de privacidad',
          onPress: () => Alert.alert('Privacidad', 'La política está disponible en el sitio web.'),
        },
      ],
    },
    {
      titulo: 'Aplicación',
      items: [
        { tipo: 'info', icono: 'code-slash-outline', label: 'Versión',     valor: VERSION_APP },
        { tipo: 'info', icono: 'server-outline',     label: 'Plataforma',  valor: 'Expo 54'   },
      ],
    },
    {
      titulo: 'Sesión',
      items: [
        {
          tipo: 'link',
          icono: 'log-out-outline',
          label: cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar sesión',
          onPress: confirmarCerrarSesion,
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Ajustes" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Resumen de cuenta ─────────────────────────── */}
        <View style={[styles.cuentaCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.gold }]}>
          <View style={[styles.cuentaAvatar, { backgroundColor: colors.bg.tertiary }]}>
            <Text style={[styles.cuentaInicial, { color: colors.gold.primary }]}>
              {perfil?.nombre_completo?.[0]?.toUpperCase() ?? 'H'}
            </Text>
          </View>
          <View>
            <Text style={[styles.cuentaNombre, { color: colors.text.primary }]}>
              {perfil?.nombre_completo ?? 'Huésped'}
            </Text>
            <Text style={[styles.cuentaCorreo, { color: colors.text.secondary }]}>
              {perfil?.correo ?? ''}
            </Text>
          </View>
        </View>

        {/* ── Secciones ─────────────────────────────────── */}
        {secciones.map((sec, si) => (
          <View key={sec.titulo}>
            <Text style={[styles.seccionTitulo, { color: colors.text.muted }]}>{sec.titulo}</Text>
            <AppCard noPadding>
              {sec.items.map((item, ii) => (
                <View key={item.label}>
                  {item.tipo === 'toggle' && <ItemToggle item={item} colors={colors} />}
                  {item.tipo === 'link'   && <ItemLink   item={item} colors={colors} />}
                  {item.tipo === 'info'   && <ItemInfo   item={item} colors={colors} />}
                  {ii < sec.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />
                  )}
                </View>
              ))}
            </AppCard>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 40, gap: Spacing.md },
  cuentaCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1 },
  cuentaAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  cuentaInicial: { fontSize: 20, fontWeight: '800' },
  cuentaNombre: { fontSize: Typography.md, fontWeight: '700' },
  cuentaCorreo: { fontSize: Typography.xs, marginTop: 2 },
  seccionTitulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  itemIconBox: { width: 34, height: 34, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  itemTexto: { flex: 1 },
  itemLabel: { fontSize: Typography.md, fontWeight: '500' },
  itemSub: { fontSize: Typography.xs, marginTop: 2 },
  itemValor: { fontSize: Typography.sm },
  divider: { height: 1, marginHorizontal: Spacing.md },
});
