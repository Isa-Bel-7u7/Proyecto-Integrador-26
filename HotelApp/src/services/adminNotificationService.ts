import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type AdminPushPrioridad = 'baja' | 'media' | 'alta' | 'critica';

type NotificationsModule = typeof import('expo-notifications');

// A partir de Expo SDK 53, appOwnership fue eliminado.
// La forma correcta de detectar Expo Go es con executionEnvironment.
const esExpoGo = () =>
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo'; // fallback para SDKs anteriores

const cargarNotifications = async (): Promise<NotificationsModule | null> => {
  if (esExpoGo()) return null;
  return await import('expo-notifications');
};

export async function configurarNotificacionesAdmin(): Promise<{ granted: boolean; token?: string | null; skipped?: boolean }> {
  const Notifications = await cargarNotifications();
  if (!Notifications) return { granted: false, token: null, skipped: true };

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  let permisos = await Notifications.getPermissionsAsync();
  if (!permisos.granted) {
    permisos = await Notifications.requestPermissionsAsync({
      android: {},
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  }

  if (Platform.OS === 'android') {
    await Promise.all([
      Notifications.setNotificationChannelAsync('baja', {
        name: 'Admin baja',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0],
        enableVibrate: false,
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      }),
      Notifications.setNotificationChannelAsync('media', {
        name: 'Admin media',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        enableVibrate: true,
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      }),
      Notifications.setNotificationChannelAsync('alta', {
        name: 'Admin alta',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 350, 180, 350],
        enableVibrate: true,
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      }),
      Notifications.setNotificationChannelAsync('critica', {
        name: 'Admin crítica',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 220, 500, 220, 500],
        enableVibrate: true,
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      }),
    ]);
  }

  return { granted: permisos.granted, token: null };
}

export async function mostrarNotificacionLocalAdmin(params: {
  titulo: string;
  mensaje: string;
  prioridad?: AdminPushPrioridad;
  modulo?: string;
  referenciaId?: string | null;
}): Promise<void> {
  const Notifications = await cargarNotifications();
  if (!Notifications) return;

  const prioridad = params.prioridad ?? 'media';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.titulo,
      body: params.mensaje,
      sound: true,
      priority: prioridad === 'critica' || prioridad === 'alta'
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.DEFAULT,
      data: {
        prioridad,
        modulo: params.modulo,
        referenciaId: params.referenciaId ?? null,
      },
    },
    trigger: null,
  });
}
