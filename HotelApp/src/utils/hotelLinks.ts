import { Alert, Linking, NativeModules } from 'react-native';

export const HOTEL_NAME = 'Grand Hotel';
export const HOTEL_ADDRESS = 'Plaza 25 de Mayo, Sucre, Bolivia';

const HOTEL_MAPS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=-19.044285,-65.263590';

function hostDeExpo(): string | null {
  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  return scriptUrl?.match(/^https?:\/\/([^/:]+)/i)?.[1] ?? null;
}

export function obtenerUrlHotel(sitioWeb?: string | null): string {
  const limpia = sitioWeb?.trim() || 'http://localhost:5173/';
  const completa = /^https?:\/\//i.test(limpia) ? limpia : `https://${limpia}`;
  const host = hostDeExpo();

  // En Expo Go, localhost apunta al teléfono. Se reemplaza por el host de Metro (la PC).
  return host
    ? completa.replace(/:\/\/(localhost|127\.0\.0\.1)(?=[:/])/i, `://${host}`)
    : completa;
}

async function abrirUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No se pudo abrir', 'No encontramos una aplicación compatible para abrir este enlace.');
  }
}

export const abrirMapaHotel = () => abrirUrl(HOTEL_MAPS_URL);
export const abrirSitioHotel = (sitioWeb?: string | null) => abrirUrl(obtenerUrlHotel(sitioWeb));
