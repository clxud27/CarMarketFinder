import type { Repuesto } from '../types';
import { saveSearch, getSearch } from './cache.service';
import { searchRepuestosApi } from './api.service';

export const buscarRepuestos = async (
  pieza: string,
  modelo: string
): Promise<{ repuestos: Repuesto[]; fromCache: boolean }> => {
  console.log(`🔎 Buscando: ${pieza} ${modelo}`);

  try {
    const cached = getSearch({ pieza, modeloAuto: modelo });
    if (cached) {
      console.log('⚡ Resultados desde caché');
      return { repuestos: cached.repuestos, fromCache: true };
    }

    console.log('🌐 Buscando en múltiples tiendas vía API...');
    const resultados = await searchRepuestosApi(pieza, modelo);

    if (resultados.length > 0) {
      console.log('💾 Guardando búsqueda en historial...');
      saveSearch({ pieza, modeloAuto: modelo }, resultados);
      console.log(`✅ Guardados ${resultados.length} resultados`);
    } else {
      console.warn('⚠️ No se encontraron resultados');
    }

    return { repuestos: resultados, fromCache: false };

  } catch (error: any) {
    console.error('❌ Error en búsqueda:', error);
    return { repuestos: [], fromCache: false };
  }
};