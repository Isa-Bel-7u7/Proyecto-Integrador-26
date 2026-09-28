import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { ResumenAdmin } from '../interfaces';
import { obtenerResumenAdmin } from '../services/dashboardService';

// SRP: concentra estado y ciclo de carga; la Screen queda enfocada en presentación.
export const useDashboard = () => {
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarResumen = async () => {
    try {
      setResumen(await obtenerResumenAdmin());
    } catch (error) {
      console.error('Error cargando resumen:', error);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { void cargarResumen(); }, []));

  const onRefresh = () => {
    setRefreshing(true);
    void cargarResumen();
  };

  return { resumen, cargando, refreshing, onRefresh };
};
