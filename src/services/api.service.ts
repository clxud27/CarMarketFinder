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
  retryAfter?: number;
}

/**
 * Busca repuestos usando la API de Vercel Functions con reintentos automáticos
 */
export const searchRepuestosApi = async (
  pieza: string,
  modelo: string
): Promise<Repuesto[]> => {
  const maxReintentos = 2; // Reducido de 3 a 2
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
        
        // Si es error 429 o 503 (servicio saturado), esperamos más tiempo
        if (response.status === 429 || response.status === 503) {
          intento++;
          if (intento < maxReintentos) {
            // Esperamos el tiempo sugerido por el servidor o 60 segundos
            const retryAfter = errorData.retryAfter || 60;
            const delayTime = retryAfter * 1000;
            console.warn(`⏳ Servicio saturado. Esperando ${retryAfter}s antes de reintentar...`);
            await new Promise(resolve => setTimeout(resolve, delayTime));
            continue;
          } else {
            // Último intento fallido, mensaje claro al usuario
            throw new Error(
              errorData.error || 
              'El servicio está temporalmente saturado. Por favor espera 2-3 minutos e intenta nuevamente.'
            );
          }
        }
        
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
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
      console.error('❌ Error llamando a la API:', error);
      
      // Si ya agotamos los reintentos o es un error no recuperable, lanzamos
      if (intento >= maxReintentos - 1 || !error.message.includes('saturado')) {
        throw error;
      }
      
      intento++;
    }
  }

  throw new Error('No se pudo completar la búsqueda después de varios intentos');
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
