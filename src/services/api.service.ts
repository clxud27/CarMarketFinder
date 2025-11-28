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
  stores?: { // El interrogante '?' lo hace opcional para que no falle si falta
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
    
    // 🛡️ CORRECCIÓN DE SEGURIDAD:
    // Verificamos que 'data.stores' exista antes de intentar leer sus propiedades.
    // Esto evita el error "Cannot read properties of undefined".
    if (data.stores) {
      console.log(`📊 Estadísticas: MercadoLibre=${data.stores.mercadolibre}, Yapo=${data.stores.yapo}`);
    } else {
      console.log('📊 Estadísticas no disponibles en esta respuesta (pero sí hay resultados)');
    }

    return data.results;

  } catch (error: any) {
    console.error('❌ Error llamando a la API:', error);
    throw error; // Re-lanzamos el error para que lo maneje el componente visual
  }
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