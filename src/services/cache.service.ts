import type { BusquedaRepuesto, Repuesto } from '../types';

const CACHE_PREFIX = 'repuestos_cache_';
const CACHE_TTL = 60 * 60 * 1000;

export interface CacheData {
  repuestos: Repuesto[];
  timestamp: string;
  busqueda: BusquedaRepuesto;
}

export const generateSearchKey = (pieza: string, modelo: string): string => {
  const normalized = `${pieza.toLowerCase().trim()}_${modelo.toLowerCase().trim()}`;
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${CACHE_PREFIX}${Math.abs(hash)}`;
};

export const saveSearch = (
  busqueda: BusquedaRepuesto,
  repuestos: Repuesto[]
): void => {
  try {
    if (!busqueda.pieza || !busqueda.modeloAuto) {
      console.warn('Búsqueda inválida, no se puede guardar en cache');
      return;
    }

    const key = generateSearchKey(busqueda.pieza, busqueda.modeloAuto);
    const data: CacheData = {
      repuestos,
      timestamp: new Date().toISOString(),
      busqueda,
    };

    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Búsqueda guardada en cache: ${key}`);
  } catch (error) {
    console.error('Error al guardar en cache:', error);
  }
};

export const getSearch = (
  busqueda: BusquedaRepuesto
): { repuestos: Repuesto[]; timestamp: Date } | null => {
  try {
    if (!busqueda.pieza || !busqueda.modeloAuto) {
      return null;
    }

    const key = generateSearchKey(busqueda.pieza, busqueda.modeloAuto);
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const data: CacheData = JSON.parse(cached);
    const timestamp = new Date(data.timestamp);
    const now = new Date();

    if (now.getTime() - timestamp.getTime() > CACHE_TTL) {
      console.log('Cache expirado, eliminando...');
      localStorage.removeItem(key);
      return null;
    }

    console.log('Búsqueda encontrada en cache');
    return {
      repuestos: data.repuestos,
      timestamp,
    };
  } catch (error) {
    console.error('Error al obtener del cache:', error);
    return null;
  }
};

export const clearCache = (): void => {
  try {
    const keys = getCacheKeys();
    keys.forEach((key) => {
      localStorage.removeItem(key);
    });
    console.log(`Cache limpiado: ${keys.length} búsquedas eliminadas`);
  } catch (error) {
    console.error('Error al limpiar cache:', error);
  }
};

export const getCacheKeys = (): string[] => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keys.push(key);
      }
    }
    return keys;
  } catch (error) {
    console.error('Error al obtener claves del cache:', error);
    return [];
  }
};

export const getAllCachedSearches = (): CacheData[] => {
  try {
    const keys = getCacheKeys();
    const searches: CacheData[] = [];

    keys.forEach((key) => {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const data: CacheData = JSON.parse(cached);
          searches.push(data);
        } catch (error) {
          console.error(`Error al parsear cache ${key}:`, error);
        }
      }
    });

    return searches.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  } catch (error) {
    console.error('Error al obtener búsquedas del cache:', error);
    return [];
  }
};