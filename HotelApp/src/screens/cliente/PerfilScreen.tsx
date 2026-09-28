// ============================================================
// PRINCIPIO SRP: pantalla de perfil — gestiona SOLO la edición
// y visualización del perfil del cliente autenticado.
//
// PRINCIPIO DIP: usa actualizarPerfil() de clienteService
// en lugar de llamar a supabase directamente.
//
// PRINCIPIO DRY: reutiliza AppInput, AppButton, AppCard, ScreenHeader.
// Los colores por nivel de fidelidad se leen de NIVEL_CONFIG (theme).
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  actualizarPerfil,
  subirYActualizarFoto,
} from '../../services/clienteService';

import AppCard from '../../components/common/AppCard';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ScreenHeader from '../../components/common/ScreenHeader';

import {
  BorderRadius,
  Spacing,
  Typography,
  NIVEL_CONFIG,
} from '../../utils/theme';

import {
  PAIS_DATA,
  getCiudadesPais,
  getPaisData,
  separarTelefono,
  soloDigitos,
  soloLetrasNombre,
  normalizarTexto,
} from '../../utils/countryData';

function NivelBadge({ nivel }: { nivel: string }) {
  const cfg = NIVEL_CONFIG[nivel] ?? NIVEL_CONFIG['Visitante'];

  return (
    <View
      style={[
        styles.nivelBadge,
        {
          borderColor: cfg.color,
          backgroundColor: `${cfg.color}18`,
        },
      ]}
    >
      <View style={[styles.nivelSymbol, { backgroundColor: cfg.color }]}>
        <Text style={styles.nivelSymbolText}>{cfg.symbol}</Text>
      </View>

      <Text style={[styles.nivelLabel, { color: cfg.color }]}>
        {nivel}
      </Text>
    </View>
  );
}

// COMPONENTE QUE FALTABA
function OptionChips({
  colors,
  items,
  selected,
  onSelect,
}: {
  colors: any;
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
}) {
  if (!items.length) return null;

  return (
    <View style={styles.chipsWrap}>
      {items.map((item) => {
        const activo =
          normalizarTexto(item) === normalizarTexto(selected);

        return (
          <TouchableOpacity
            key={item}
            onPress={() => onSelect(item)}
            activeOpacity={0.8}
            style={[
              styles.chip,
              {
                borderColor: activo
                  ? colors.gold.primary
                  : colors.border.primary,
                backgroundColor: activo
                  ? `${colors.gold.primary}18`
                  : colors.bg.secondary,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: activo
                    ? colors.gold.primary
                    : colors.text.secondary,
                },
              ]}
              numberOfLines={1}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function PerfilScreen() {
  const { perfil, recargarPerfil, signOut } = useAuth();
  const { colors } = useTheme();

  const telefonoInicial = separarTelefono(perfil?.telefono);

  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [fotoSubiendo, setFotoSubiendo] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const [form, setForm] = useState({
    nombre_completo: perfil?.nombre_completo ?? '',
    codigoTelefono: telefonoInicial.codigo,
    telefono: telefonoInicial.numero,
    ciudad: perfil?.ciudad ?? '',
    pais: perfil?.pais || 'Bolivia',
  });

  const [errores, setErrores] = useState<Partial<typeof form>>({});

  const campo = (key: keyof typeof form) => (val: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: val,
    }));

  const paisActual = useMemo(
    () => getPaisData(form.pais) ?? PAIS_DATA[0],
    [form.pais],
  );

  const paisesSugeridos = useMemo(() => {
    const filtrados = PAIS_DATA.filter((p) =>
      normalizarTexto(p.pais).includes(normalizarTexto(form.pais)),
    );

    return (filtrados.length ? filtrados : PAIS_DATA).slice(0, 8);
  }, [form.pais]);

  const ciudadesPais = useMemo(
    () => getCiudadesPais(form.pais),
    [form.pais],
  );

  const ciudadesSugeridas = useMemo(() => {
    const filtradas = ciudadesPais.filter((c) =>
      normalizarTexto(c).includes(normalizarTexto(form.ciudad)),
    );

    return (filtradas.length ? filtradas : ciudadesPais).slice(0, 8);
  }, [ciudadesPais, form.ciudad]);

  const seleccionarPais = (pais: string) => {
    const data = getPaisData(pais);

    setForm((prev) => ({
      ...prev,
      pais,
      ciudad: '',
      codigoTelefono: data?.codigo ?? prev.codigoTelefono,
      telefono: soloDigitos(prev.telefono).slice(
        0,
        data?.codigo === '+591' ? 8 : 15,
      ),
    }));
  };

  const validar = (): boolean => {
    const err: Partial<typeof form> = {};

    const nombre = form.nombre_completo.trim();
    const telefono = soloDigitos(form.telefono);
    const esBolivia = form.codigoTelefono === '+591';

    if (!nombre) {
      err.nombre_completo = 'Requerido';
    } else if (/\d/.test(nombre)) {
      err.nombre_completo = 'No debe contener números';
    } else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{3,80}$/.test(nombre)) {
      err.nombre_completo = 'Solo letras y espacios';
    }

    if (!form.pais.trim()) {
      err.pais = 'Selecciona país';
    } else if (!getPaisData(form.pais)) {
      err.pais = 'Selecciona un país válido';
    }

    if (!form.ciudad.trim()) {
      err.ciudad = 'Selecciona ciudad';
    } else if (/\d/.test(form.ciudad)) {
      err.ciudad = 'No debe contener números';
    } else if (
      ciudadesPais.length &&
      !ciudadesPais.some(
        (c) => normalizarTexto(c) === normalizarTexto(form.ciudad),
      )
    ) {
      err.ciudad = 'Selecciona una ciudad válida';
    }

    if (!telefono) {
      err.telefono = 'Requerido';
    } else if (esBolivia && ![7, 8].includes(telefono.length)) {
      err.telefono = 'Bolivia requiere 7 u 8 dígitos';
    } else if (!esBolivia && (telefono.length < 5 || telefono.length > 15)) {
      err.telefono = 'Número inválido';
    }

    setErrores(err);
    return Object.keys(err).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;

    setGuardando(true);

    try {
      await actualizarPerfil({
        nombre_completo: form.nombre_completo.trim(),
        telefono: `${form.codigoTelefono} ${soloDigitos(form.telefono)}`.trim(),
        ciudad: form.ciudad || null,
        pais: form.pais || null,
      });

      await recargarPerfil();

      setEditando(false);

      Alert.alert('Guardado', 'Perfil actualizado correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => {
    const telefonoActual = separarTelefono(perfil?.telefono);

    setForm({
      nombre_completo: perfil?.nombre_completo ?? '',
      codigoTelefono: telefonoActual.codigo,
      telefono: telefonoActual.numero,
      ciudad: perfil?.ciudad ?? '',
      pais: perfil?.pais || 'Bolivia',
    });

    setErrores({});
    setEditando(false);
  };

  const cambiarFoto = async () => {
    if (!perfil || fotoSubiendo) return;

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      Alert.alert(
        'Permiso necesario',
        'Permite el acceso a tus fotos para elegir una imagen de perfil.',
      );
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (resultado.canceled) return;

    const foto = resultado.assets[0];

    if (!foto.base64) {
      Alert.alert('Error', 'No se pudo leer la imagen seleccionada.');
      return;
    }

    setFotoSubiendo(true);

    try {
      await subirYActualizarFoto(
        foto.base64,
        perfil.usuario_id,
        foto.mimeType ?? 'image/jpeg',
      );

      await recargarPerfil();

      Alert.alert(
        'Foto actualizada',
        'Tu nueva foto de perfil se guardó correctamente.',
      );
    } catch (e: any) {
      Alert.alert(
        'No se pudo actualizar la foto',
        e.message ?? 'Intenta nuevamente.',
      );
    } finally {
      setFotoSubiendo(false);
    }
  };

  const confirmarCerrarSesion = () =>
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          setCerrandoSesion(true);
          try {
            await signOut();
          } finally {
            setCerrandoSesion(false);
          }
        },
      },
    ]);

  if (!perfil) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Mi Perfil" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar y nombre */}
        <AppCard goldBorder style={styles.avatarCard}>
          <TouchableOpacity
            onPress={cambiarFoto}
            disabled={fotoSubiendo}
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto de perfil"
            style={styles.avatarButton}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.bg.tertiary },
              ]}
            >
              {perfil.foto_url ? (
                <Image
                  source={{ uri: perfil.foto_url }}
                  style={styles.avatarImagen}
                />
              ) : (
                <Text
                  style={[
                    styles.avatarInicial,
                    { color: colors.gold.primary },
                  ]}
                >
                  {perfil.nombre_completo?.[0]?.toUpperCase() ?? 'H'}
                </Text>
              )}

              {fotoSubiendo && (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </View>

            <View
              style={[
                styles.camaraBadge,
                { backgroundColor: colors.gold.primary },
              ]}
            >
              <Ionicons name="camera" size={15} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text
            style={[
              styles.cambiarFotoText,
              { color: colors.gold.primary },
            ]}
          >
            Cambiar foto
          </Text>

          <Text
            style={[
              styles.nombreCompleto,
              { color: colors.text.primary },
            ]}
          >
            {perfil.nombre_completo}
          </Text>

          <Text
            style={[
              styles.correoText,
              { color: colors.text.secondary },
            ]}
          >
            {perfil.correo}
          </Text>

          {perfil.nivel_fidelidad && (
            <NivelBadge nivel={perfil.nivel_fidelidad} />
          )}
        </AppCard>

        {/* Estadísticas */}
        <View style={styles.statsRow}>
          {[
            {
              label: 'Reservas',
              valor: String(perfil.total_reservas_completadas ?? 0),
              icon: 'calendar-outline',
            },
            {
              label: 'Puntos',
              valor: String(perfil.puntos_fidelidad ?? 0),
              icon: 'star-outline',
            },
            {
              label: 'Total gast.',
              valor: `Bs ${Number(perfil.total_gastado ?? 0).toFixed(0)}`,
              icon: 'wallet-outline',
            },
          ].map((s) => (
            <AppCard key={s.label} style={styles.statCard}>
              <Ionicons
                name={s.icon as any}
                size={18}
                color={colors.gold.primary}
              />

              <Text
                style={[
                  styles.statValor,
                  { color: colors.text.primary },
                ]}
              >
                {s.valor}
              </Text>

              <Text
                style={[
                  styles.statLabel,
                  { color: colors.text.muted },
                ]}
              >
                {s.label}
              </Text>
            </AppCard>
          ))}
        </View>

        {/* Información personal */}
        <View style={styles.seccionHeader}>
          <Text
            style={[
              styles.seccionTitulo,
              { color: colors.text.muted },
            ]}
          >
            Información personal
          </Text>

          {!editando && (
            <TouchableOpacity
              onPress={() => setEditando(true)}
              style={[
                styles.editarBtn,
                { borderColor: colors.gold.primary },
              ]}
            >
              <Ionicons
                name="pencil-outline"
                size={14}
                color={colors.gold.primary}
              />

              <Text
                style={[
                  styles.editarLabel,
                  { color: colors.gold.primary },
                ]}
              >
                Editar
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <AppCard>
          <AppInput
            label="Nombre completo"
            value={form.nombre_completo}
            onChangeText={(v) =>
              campo('nombre_completo')(soloLetrasNombre(v))
            }
            editable={editando}
            error={errores.nombre_completo}
          />

          <AppInput
            label="País"
            value={form.pais}
            onChangeText={(v) => {
              const limpio = soloLetrasNombre(v);
              const exacto = getPaisData(limpio);

              setForm((prev) => ({
                ...prev,
                pais: limpio,
                ciudad: exacto ? '' : prev.ciudad,
                codigoTelefono: exacto?.codigo ?? prev.codigoTelefono,
              }));
            }}
            editable={editando}
            error={errores.pais}
          />

          {editando ? (
            <OptionChips
              colors={colors}
              items={paisesSugeridos.map((p) => p.pais)}
              selected={form.pais}
              onSelect={seleccionarPais}
            />
          ) : null}

          <AppInput
            label="Ciudad"
            value={form.ciudad}
            onChangeText={(v) => campo('ciudad')(soloLetrasNombre(v))}
            editable={editando}
            error={errores.ciudad}
          />

          {editando ? (
            <OptionChips
              colors={colors}
              items={ciudadesSugeridas}
              selected={form.ciudad}
              onSelect={campo('ciudad')}
            />
          ) : null}

          <View style={styles.phoneRow}>
            <View style={{ flex: 0.78 }}>
              <AppInput
                label="Código"
                value={form.codigoTelefono}
                onChangeText={(v) =>
                  campo('codigoTelefono')(
                    `+${soloDigitos(v).slice(0, 4)}`,
                  )
                }
                keyboardType="phone-pad"
                editable={editando}
              />
            </View>

            <View style={{ flex: 1.6 }}>
              <AppInput
                label="Teléfono"
                value={form.telefono}
                onChangeText={(v) =>
                  campo('telefono')(
                    soloDigitos(v).slice(
                      0,
                      form.codigoTelefono === '+591' ? 8 : 15,
                    ),
                  )
                }
                keyboardType="phone-pad"
                editable={editando}
                error={errores.telefono}
              />
            </View>
          </View>

          {editando ? (
            <OptionChips
              colors={colors}
              items={[
                paisActual,
                ...PAIS_DATA.filter(
                  (p) => p.pais !== paisActual.pais,
                ).slice(0, 5),
              ].map((p) => `${p.codigo} · ${p.pais}`)}
              selected={`${form.codigoTelefono} · ${form.pais}`}
              onSelect={(item) => {
                const codigo = item.split(' · ')[0];

                const pais =
                  PAIS_DATA.find((p) => p.codigo === codigo)?.pais ??
                  form.pais;

                setForm((prev) => ({
                  ...prev,
                  codigoTelefono: codigo,
                  pais,
                  ciudad: '',
                }));
              }}
            />
          ) : null}
        </AppCard>

        {/* Cuenta */}
        <Text
          style={[
            styles.seccionTitulo,
            { color: colors.text.muted },
          ]}
        >
          Cuenta
        </Text>

        <AppCard>
          {[
            {
              icon: 'mail-outline',
              label: 'Correo',
              valor: perfil.correo,
            },
            {
              icon: 'shield-checkmark-outline',
              label: 'Rol',
              valor: perfil.rol,
            },
          ].map((fila, i) => (
            <View key={fila.label}>
              <View style={styles.cuentaRow}>
                <Ionicons
                  name={fila.icon as any}
                  size={15}
                  color={colors.text.muted}
                />

                <Text
                  style={[
                    styles.cuentaKey,
                    { color: colors.text.secondary },
                  ]}
                >
                  {fila.label}
                </Text>

                <Text
                  style={[
                    styles.cuentaVal,
                    { color: colors.text.primary },
                  ]}
                  numberOfLines={1}
                >
                  {fila.valor}
                </Text>
              </View>

              {i === 0 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border.primary },
                  ]}
                />
              )}
            </View>
          ))}
        </AppCard>

        {/* Botones */}
        {editando ? (
          <View style={styles.editAcciones}>
            <AppButton
              label="Cancelar"
              onPress={cancelar}
              variant="ghost"
              style={{ flex: 1 }}
            />

            <AppButton
              label="Guardar"
              onPress={guardar}
              loading={guardando}
              style={{ flex: 2 }}
            />
          </View>
        ) : (
          <AppButton
            label="Cerrar sesión"
            onPress={confirmarCerrarSesion}
            variant="danger"
            loading={cerrandoSesion}
            fullWidth
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.md,
  },

  avatarCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  avatarButton: {
    position: 'relative',
    marginBottom: 6,
  },

  avatarCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  avatarImagen: {
    width: '100%',
    height: '100%',
  },

  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  camaraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  avatarInicial: {
    fontSize: 30,
    fontWeight: '800',
  },

  cambiarFotoText: {
    fontSize: Typography.sm,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },

  nombreCompleto: {
    fontSize: Typography.xl,
    fontWeight: '700',
    textAlign: 'center',
  },

  correoText: {
    fontSize: Typography.sm,
    marginTop: 4,
    textAlign: 'center',
  },

  nivelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: Spacing.md,
  },

  nivelSymbol: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  nivelSymbolText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },

  nivelLabel: {
    fontSize: Typography.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },

  statValor: {
    fontSize: Typography.md,
    fontWeight: '700',
  },

  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },

  seccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  seccionTitulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  editarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
  },

  editarLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: '100%',
  },

  chipText: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },

  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },

  cuentaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  cuentaKey: {
    fontSize: Typography.sm,
    width: 65,
  },

  cuentaVal: {
    flex: 1,
    fontSize: Typography.sm,
    fontWeight: '600',
    textAlign: 'right',
  },

  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },

  editAcciones: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});