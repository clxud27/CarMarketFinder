import type { Repuesto } from '../types';

/**
 * URL base de la API
 * En desarrollo: usa localhost
 * En producción: usa tu dominio de Vercel
 */
const getApiUrl = (): string => {
  // Si está en producción (Vercel), usa la URL del dominio actual
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  // En desarrollo, usa la API de Vercel en producción o localhost
  // Por ahora retornamos la URL actual para que funcione tanto local como en Vercel
  return typeof window !== 'undefined' ? window.location.origin : '';
};

interface ApiSearchResponse {
  success: boolean;
  count: number;
  stores: {
    mercadolibre: number;
    yapo: number;
  };
  results: Repuesto[];
  error?: string;
}

/**
 * Busca repuestos usando la API de Vercel Functions
 */
export const searchRepuestosApi = async (
  pieza: string,
  modelo: string
): Promise<Repuesto[]> => {
  try {
    const apiUrl = `${getApiUrl()}/api/search`;

    console.log(`🌐 Llamando a API: ${apiUrl}`);
    console.log(`📦 Parámetros: pieza="${pieza}", modelo="${modelo}"`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pieza, modelo }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data: ApiSearchResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error desconocido en la API');
    }

    console.log(`✅ API respondió con ${data.count} resultados`);
    console.log(`📊 Estadísticas: MercadoLibre=${data.stores.mercadolibre}, Yapo=${data.stores.yapo}`);

    return data.results;

  } catch (error: any) {
    console.error('❌ Error llamando a la API:', error);
    throw error;
  }
};

/**
 * Versión alternativa usando GET (para compatibilidad con algunas apps)
 */
export const searchRepuestosApiGet = async (
  pieza: string,
  modelo: string
): Promise<Repuesto[]> => {
  try {
    const apiUrl = `${getApiUrl()}/api/search?pieza=${encodeURIComponent(pieza)}&modelo=${encodeURIComponent(modelo)}`;

    console.log(`🌐 Llamando a API (GET): ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data: ApiSearchResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error desconocido en la API');
    }

    console.log(`✅ API respondió con ${data.count} resultados`);

    return data.results;

  } catch (error: any) {
    console.error('❌ Error llamando a la API (GET):', error);
    throw error;
  }
};