import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SearchParams {
  pieza: string;
  modelo: string;
}

interface Repuesto {
  id: string;
  nombre: string;
  precio: number;
  imagen: string;
  descripcion: string;
  url: string;
  tienda: string;
  marca: string;
  modelo: string;
  categoria: string;
  fechaScraped: Date;
}

/**
 * Busca en MercadoLibre Chile
 */
const searchMercadoLibre = async (pieza: string, modelo: string): Promise<Repuesto[]> => {
  try {
    const query = `${pieza} ${modelo}`;
    const apiUrl = `https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=30`;

    console.log('🔍 MercadoLibre: Buscando desde servidor...');

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CarMarketFinder/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`MercadoLibre API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log('⚠️ MercadoLibre: Sin resultados');
      return [];
    }

    console.log(`✅ MercadoLibre: ${data.results.length} productos encontrados`);

    return data.results.map((item: any) => ({
      id: `ml-${item.id}`,
      nombre: item.title,
      precio: item.price,
      imagen: item.thumbnail?.replace('http://', 'https://') || 'https://placehold.co/200x200?text=Sin+Imagen',
      descripcion: `Vendedor: ${item.seller?.nickname || 'MercadoLibre'}`,
      url: item.permalink,
      tienda: 'MercadoLibre',
      marca: 'Genérico',
      modelo: modelo,
      categoria: 'Otros',
      fechaScraped: new Date(),
    }));
  } catch (error: any) {
    console.error('❌ Error en MercadoLibre:', error.message);
    return [];
  }
};

/**
 * Busca en Yapo.cl (usando MercadoLibre API con categoría de vehículos)
 */
const searchYapo = async (pieza: string, modelo: string): Promise<Repuesto[]> => {
  try {
    const query = `${pieza} ${modelo} auto`;
    const apiUrl = `https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=20&category=MLC1743`;

    console.log('🔍 Yapo: Buscando...');

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CarMarketFinder/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Yapo API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log('⚠️ Yapo: Sin resultados');
      return [];
    }

    console.log(`✅ Yapo: ${data.results.length} productos encontrados`);

    return data.results.slice(0, 15).map((item: any) => ({
      id: `yapo-${item.id}`,
      nombre: item.title,
      precio: item.price,
      imagen: item.thumbnail?.replace('http://', 'https://') || 'https://placehold.co/200x200?text=Yapo',
      descripcion: `${item.seller?.nickname || 'Vendedor particular'}`,
      url: item.permalink,
      tienda: 'Yapo',
      marca: 'Genérico',
      modelo: modelo,
      categoria: 'Otros',
      fechaScraped: new Date(),
    }));
  } catch (error: any) {
    console.error('❌ Error en Yapo:', error.message);
    return [];
  }
};

/**
 * Función principal de búsqueda multi-tienda
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS para permitir peticiones desde cualquier origen
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Accept');

  // Manejar preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Obtener parámetros de la petición
    let pieza: string;
    let modelo: string;

    if (req.method === 'POST') {
      const body = req.body as SearchParams;
      pieza = body.pieza;
      modelo = body.modelo;
    } else {
      // GET request
      pieza = req.query.pieza as string;
      modelo = req.query.modelo as string;
    }

    // Validar parámetros
    if (!pieza || !modelo) {
      return res.status(400).json({
        error: 'Faltan parámetros requeridos: pieza y modelo',
        success: false,
      });
    }

    console.log(`🔎 API: Buscando "${pieza} ${modelo}"...`);

    // Buscar en todas las tiendas en paralelo
    const [mercadoLibreResults, yapoResults] = await Promise.all([
      searchMercadoLibre(pieza, modelo),
      searchYapo(pieza, modelo),
    ]);

    // Combinar resultados
    const allResults = [
      ...mercadoLibreResults,
      ...yapoResults,
    ];

    // Agregar Google Shopping como fallback
    const query = `${pieza} ${modelo}`;
    allResults.push({
      id: 'google-shopping',
      nombre: `Buscar "${pieza}" en Google Shopping`,
      precio: 0,
      descripcion: 'Comparar en más tiendas',
      imagen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png',
      url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`,
      tienda: 'Otros',
      marca: 'Google',
      modelo: modelo,
      categoria: 'Otros',
      fechaScraped: new Date(),
    });

    console.log(`✅ API: ${allResults.length} productos encontrados en total`);

    // Retornar resultados
    return res.status(200).json({
      success: true,
      count: allResults.length,
      stores: {
        mercadolibre: mercadoLibreResults.length,
        yapo: yapoResults.length,
      },
      results: allResults,
    });

  } catch (error: any) {
    console.error('❌ Error en API:', error);
    return res.status(500).json({
      error: error.message || 'Error interno del servidor',
      success: false,
    });
  }
}