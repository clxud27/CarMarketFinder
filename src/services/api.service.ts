import type { Repuesto } from '../types';

/**
 * URL base de la API
 */
const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
};

interface ApiSearchResponse {
  success: boolean;
  count: number;
  stores?: {
    mercadolibre: number;
    yapo: number;
  };
  results: Repuesto[];
  error?: string;
}

/**
 * Busca repuestos usando la API de Vercel Functions con reintentos automáticos
 */
export const searchRepuestosApi = async (
  pieza: string,
  modelo: string
): Promise<Repuesto[]> => {
  const maxReintentos = 3;
  let intento = 0;

  while (intento < maxReintentos) {
    try {
      const apiUrl = `${getApiUrl()}/api/search`;

      console.log(`🌐 Llamando a API: ${apiUrl} (intento ${intento + 1}/${maxReintentos})`);
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
        
        // Si es error 429 (rate limit), reintentamos con backoff exponencial
        if (response.status === 429) {
          intento++;
          if (intento < maxReintentos) {
            const delayTime = Math.pow(2, intento) * 3000; // 6s, 12s, 24s
            console.warn(`⏳ Rate limit alcanzado. Reintentando en ${delayTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delayTime));
            continue; // Vuelve al inicio del bucle
          }
        }
        
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data: ApiSearchResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en la API');
      }

      console.log(`✅ API respondió con ${data.count} resultados`);
      
      if (data.stores) {
        console.log(`📊 Estadísticas: MercadoLibre=${data.stores.mercadolibre}, Yapo=${data.stores.yapo}`);
      } else {
        console.log('📊 Estadísticas no disponibles en esta respuesta (pero sí hay resultados)');
      }

      return data.results;

    } catch (error: any) {
      // Si ya agotamos los reintentos, lanzamos el error
      if (intento >= maxReintentos - 1) {
        console.error('❌ Error llamando a la API:', error);
        throw error;
      }
      intento++;
    }
  }

  throw new Error('Se agotaron los reintentos');
};

export const searchRepuestosApiGet = async (
  pieza: string,
  modelo: string
): Promise<Repuesto[]> => {
  try {
    const apiUrl = `${getApiUrl()}/api/search?pieza=${encodeURIComponent(pieza)}&modelo=${encodeURIComponent(modelo)}`;

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

    return data.results;

  } catch (error: any) {
    console.error('❌ Error llamando a la API (GET):', error);
    throw error;
  }
};
