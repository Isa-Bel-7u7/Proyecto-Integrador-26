import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import DatePickerModal from '../../components/common/DatePickerModal';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import {
  AsistenciaHoy,
  PersonalHousekeeping,
  SolicitudPersonal,
  TurnoProgramado,
  obtenerMiAsistencia,
  obtenerMiProgramacion,
  obtenerMiRegistroPersonal,
  obtenerMisSolicitudes,
  registrarEntrada,
  registrarSalida,
  solicitarAusencia,
} from '../../services/housekeepingMobileService';

const isoHoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtHora = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDia = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' });

export default function HousekeepingJornadaScreen() {
  const { perfil } = useAuth();
  const { colors } = useTheme();
  const [personal, setPersonal] = useState<PersonalHousekeeping | null>(null);
  const [turnos, setTurnos] = useState<TurnoProgramado[]>([]);
  const [asistencia, setAsistencia] = useState<AsistenciaHoy | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [modal, setModal] = useState(false);
  const [tipo, setTipo] = useState('permiso');
  const [inicio, setInicio] = useState(isoHoy());
  const [fin, setFin] = useState(isoHoy());
  const [motivo, setMotivo] = useState('');
  const [picker, setPicker] = useState<'inicio' | 'fin' | null>(null);

  const cargar = useCallback(async () => {
    if (!perfil?.usuario_id) return;
    try {
      const p = await obtenerMiRegistroPersonal(perfil.usuario_id);
      const [prog, asist, solic] = await Promise.all([
        obtenerMiProgramacion(p.id), obtenerMiAsistencia(p.id), obtenerMisSolicitudes(p.id),
      ]);
      setPersonal(p); setTurnos(prog); setAsistencia(asist); setSolicitudes(solic);
    } catch (e: any) { Alert.alert('No se pudo cargar la jornada', e.message); }
    finally { setCargando(false); setRefreshing(false); }
  }, [perfil?.usuario_id]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const marcar = async (salida: boolean) => {
    if (!personal) return;
    setProcesando(true);
    try {
      await (salida ? registrarSalida(personal.id) : registrarEntrada(personal.id));
      await cargar();
      Alert.alert('Registro guardado', salida ? 'Tu salida fue registrada.' : 'Tu entrada fue registrada. Ya estás disponible para tareas.');
    } catch (e: any) { Alert.alert('No se pudo registrar', e.message); }
    finally { setProcesando(false); }
  };

  const enviarSolicitud = async () => {
    if (!personal || fin < inicio) { Alert.alert('Fechas inválidas', 'La fecha final debe ser igual o posterior a la inicial.'); return; }
    setProcesando(true);
    try {
      await solicitarAusencia({ personalId: personal.id, tipo, fechaInicio: inicio, fechaFin: fin, motivo });
      setModal(false); setMotivo(''); await cargar();
      Alert.alert('Solicitud enviada', 'Administración revisará tu solicitud.');
    } catch (e: any) { Alert.alert('No se pudo enviar', e.message); }
    finally { setProcesando(false); }
  };

  if (cargando) return <LoadingScreen />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}
    >
      <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>MI TRABAJO</Text>
      <Text style={[styles.title, { color: colors.text.primary }]}>Jornada</Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Turnos, asistencia y permisos</Text>

      <Text style={[styles.section, { color: colors.text.muted }]}>Asistencia de hoy</Text>
      <AppCard goldBorder>
        <View style={styles.attendanceTop}>
          <View style={[styles.attendanceIcon, { backgroundColor: asistencia?.hora_entrada ? colors.status.successBg : `${colors.gold.primary}18` }]}>
            <Ionicons name={asistencia?.hora_salida ? 'checkmark-done' : asistencia?.hora_entrada ? 'radio-button-on' : 'finger-print'} size={25} color={asistencia?.hora_entrada ? colors.status.success : colors.gold.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{asistencia?.hora_salida ? 'Jornada finalizada' : asistencia?.hora_entrada ? 'Jornada en curso' : 'Aún no marcaste entrada'}</Text>
            <Text style={[styles.cardSub, { color: colors.text.secondary }]}>Estado: {asistencia?.estado?.replace('_', ' ') ?? 'sin registro'}</Text>
          </View>
        </View>
        <View style={[styles.timeRow, { borderTopColor: colors.border.primary }]}>
          <View><Text style={[styles.timeLabel, { color: colors.text.muted }]}>Entrada</Text><Text style={[styles.timeValue, { color: colors.text.primary }]}>{fmtHora(asistencia?.hora_entrada ?? null)}</Text></View>
          <Ionicons name="arrow-forward" size={16} color={colors.text.muted} />
          <View><Text style={[styles.timeLabel, { color: colors.text.muted }]}>Salida</Text><Text style={[styles.timeValue, { color: colors.text.primary }]}>{fmtHora(asistencia?.hora_salida ?? null)}</Text></View>
        </View>
        {!asistencia?.hora_entrada && <AppButton label="Marcar entrada" onPress={() => void marcar(false)} loading={procesando} fullWidth />}
        {asistencia?.hora_entrada && !asistencia.hora_salida && <AppButton label="Marcar salida" onPress={() => void marcar(true)} loading={procesando} variant="ghost" fullWidth />}
      </AppCard>

      <Text style={[styles.section, { color: colors.text.muted }]}>Programación semanal</Text>
      {turnos.length ? turnos.map((t) => (
        <AppCard key={`${t.fecha}-${t.prog_id}`} style={styles.turnCard}>
          <View style={[styles.dayBox, { backgroundColor: `${colors.gold.primary}15` }]}><Text style={{ color: colors.gold.primary, fontWeight: '800', fontSize: 11 }}>{fmtDia(t.fecha).split(' ')[0].toUpperCase()}</Text><Text style={{ color: colors.text.primary, fontWeight: '800', fontSize: 18 }}>{new Date(`${t.fecha}T12:00`).getDate()}</Text></View>
          <View style={{ flex: 1 }}><Text style={[styles.turnTitle, { color: colors.text.primary }]}>{t.nombre}</Text><Text style={[styles.turnSub, { color: colors.text.secondary }]}>{t.hora_inicio.slice(0, 5)} - {t.hora_fin.slice(0, 5)} · {t.estado}</Text></View>
        </AppCard>
      )) : <AppCard><Text style={{ color: colors.text.secondary, textAlign: 'center' }}>No tienes turnos programados esta semana.</Text></AppCard>}

      <View style={styles.sectionHeader}><Text style={[styles.section, { color: colors.text.muted, marginTop: 0 }]}>Permisos y vacaciones</Text><TouchableOpacity onPress={() => setModal(true)}><Text style={{ color: colors.gold.primary, fontWeight: '700', fontSize: 12 }}>+ Solicitar</Text></TouchableOpacity></View>
      {solicitudes.slice(0, 4).map((s) => (
        <AppCard key={s.id} style={styles.requestCard}>
          <View style={[styles.requestIcon, { backgroundColor: `${colors.gold.primary}15` }]}><Ionicons name={s.tipo === 'vacaciones' ? 'sunny-outline' : 'document-text-outline'} size={20} color={colors.gold.primary} /></View>
          <View style={{ flex: 1 }}><Text style={[styles.turnTitle, { color: colors.text.primary, textTransform: 'capitalize' }]}>{s.tipo}</Text><Text style={[styles.turnSub, { color: colors.text.secondary }]}>{s.fecha_inicio} — {s.fecha_fin}</Text></View>
          <Text style={{ color: s.estado === 'aprobada' ? colors.status.success : s.estado === 'rechazada' ? colors.status.error : colors.status.warning, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{s.estado}</Text>
        </AppCard>
      ))}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => setModal(false)} /><View style={[styles.sheet, { backgroundColor: colors.bg.secondary, borderColor: colors.border.gold }]}>
          <View style={styles.modalHeader}><View><Text style={[styles.modalEyebrow, { color: colors.gold.primary }]}>NUEVA SOLICITUD</Text><Text style={[styles.modalTitle, { color: colors.text.primary }]}>Ausencia laboral</Text></View><TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={22} color={colors.text.secondary} /></TouchableOpacity></View>
          <Text style={[styles.label, { color: colors.text.muted }]}>Tipo</Text>
          <View style={styles.typeRow}>{['permiso', 'vacaciones', 'incapacidad', 'licencia'].map((x) => <TouchableOpacity key={x} onPress={() => setTipo(x)} style={[styles.type, { borderColor: tipo === x ? colors.gold.primary : colors.border.primary, backgroundColor: tipo === x ? `${colors.gold.primary}15` : colors.bg.tertiary }]}><Text style={{ color: tipo === x ? colors.gold.primary : colors.text.secondary, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{x}</Text></TouchableOpacity>)}</View>
          <View style={styles.dateRow}><TouchableOpacity style={[styles.dateButton, { borderColor: colors.border.primary }]} onPress={() => setPicker('inicio')}><Text style={[styles.label, { color: colors.text.muted }]}>Desde</Text><Text style={{ color: colors.text.primary, fontWeight: '700' }}>{inicio}</Text></TouchableOpacity><TouchableOpacity style={[styles.dateButton, { borderColor: colors.border.primary }]} onPress={() => setPicker('fin')}><Text style={[styles.label, { color: colors.text.muted }]}>Hasta</Text><Text style={{ color: colors.text.primary, fontWeight: '700' }}>{fin}</Text></TouchableOpacity></View>
          <TextInput value={motivo} onChangeText={setMotivo} multiline placeholder="Motivo de la solicitud..." placeholderTextColor={colors.input.placeholder} style={[styles.input, { backgroundColor: colors.input.bg, borderColor: colors.input.border, color: colors.text.primary }]} />
          <AppButton label="Enviar solicitud" onPress={() => void enviarSolicitud()} loading={procesando} fullWidth />
        </View></View>
      </Modal>
      <DatePickerModal visible={picker === 'inicio'} titulo="Fecha de inicio" valorActual={inicio} fechaMinima={isoHoy()} onSeleccionar={(v) => { setInicio(v); if (fin < v) setFin(v); }} onCerrar={() => setPicker(null)} />
      <DatePickerModal visible={picker === 'fin'} titulo="Fecha final" valorActual={fin} fechaMinima={inicio} onSeleccionar={setFin} onCerrar={() => setPicker(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingTop: 52, paddingBottom: 36, gap: Spacing.md }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2 }, title: { fontSize: Typography.xxl, fontWeight: '800' }, subtitle: { fontSize: Typography.sm, marginTop: -10 },
  section: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Spacing.sm }, attendanceTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, attendanceIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: Typography.md, fontWeight: '700' }, cardSub: { fontSize: Typography.xs, marginTop: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, marginVertical: Spacing.md, paddingTop: Spacing.md }, timeLabel: { fontSize: 10 }, timeValue: { fontSize: Typography.lg, fontWeight: '800', marginTop: 2 },
  turnCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }, dayBox: { width: 48, height: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' }, turnTitle: { fontSize: Typography.sm, fontWeight: '700' }, turnSub: { fontSize: Typography.xs, marginTop: 3 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm }, requestCard: { flexDirection: 'row', alignItems: 'center', gap: 10 }, requestIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }, modalEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 }, modalTitle: { fontSize: Typography.xl, fontWeight: '800', marginTop: 3 }, label: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }, typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: Spacing.md }, type: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 11, paddingVertical: 7 }, dateRow: { flexDirection: 'row', gap: 8, marginBottom: 10 }, dateButton: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, padding: 11 }, input: { minHeight: 82, borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, textAlignVertical: 'top', marginBottom: Spacing.md },
});
