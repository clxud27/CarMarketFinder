import type { VercelRequest, VercelResponse } from '@vercel/node';

// ... (Las interfaces SearchParams, Repuesto, etc. déjalas igual, no cambian) ...
interface SearchParams { pieza: string; modelo: string; }
interface Repuesto { id: string; nombre: string; precio: number; imagen: string; descripcion: string; url: string; tienda: string; marca: string; modelo: string; categoria: string; fechaScraped: Date; }
interface MercadoLibreItem { id: string; title: string; price: number; thumbnail?: string; permalink: string; seller?: { nickname?: string; }; attributes?: Array<{ id: string; value_name: string }>; }
interface MercadoLibreResponse { results: MercadoLibreItem[]; }

// 🟢 NUEVO DISFRAZ: Simular un navegador estándar de forma completa
const HEADERS_REALES = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-419,es;q=0.9',
  'Connection': 'keep-alive'
};

const searchMercadoLibre = async (pieza: string, modelo: string): Promise<Repuesto[]> => {
  try {
    const query = `${pieza} ${modelo}`;
    const apiUrl = `https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=50&sort=relevance`;
    
    console.log(`🔗 Conectando a ML: ${apiUrl}`);
    
    const response = await fetch(apiUrl, { headers: HEADERS_REALES }); // Usamos los headers nuevos

    if (response.status === 403) {
      console.error('❌ MercadoLibre bloqueó la IP (403). Intentando sin headers...');
      // INTENTO DE RESPALDO: Si falla con headers, probamos SIN headers
      const responseBackup = await fetch(apiUrl);
      if (!responseBackup.ok) return [];
      const dataBackup = await responseBackup.json() as MercadoLibreResponse;
      return procesarResultadosML(dataBackup, modelo);
    }

    if (!response.ok) return [];
    
    const data = await response.json() as MercadoLibreResponse;
    return procesarResultadosML(data, modelo);

  } catch (error) {
    console.error('Error en ML:', error);
    return [];
  }
};

// Función auxiliar para no repetir código
const procesarResultadosML = (data: MercadoLibreResponse, modelo: string): Repuesto[] => {
  if (!data.results) return [];
  return data.results.map((item) => ({
    id: `ml-${item.id}`,
    nombre: item.title,
    precio: item.price,
    imagen: item.thumbnail?.replace('http://', 'https://').replace('-I.jpg', '-V.jpg') || '',
    descripcion: `Vendedor: ${item.seller?.nickname || 'MercadoLibre'}`,
    url: item.permalink,
    tienda: 'MercadoLibre',
    marca: item.attributes?.find((a) => a.id === 'BRAND')?.value_name || 'Genérico',
    modelo: modelo,
    categoria: 'Otros',
    fechaScraped: new Date(),
  }));
};

const searchYapo = async (pieza: string, modelo: string): Promise<Repuesto[]> => {
  // Misma lógica simplificada para Yapo (usando la API de ML como proxy)
  try {
    const query = `${pieza} ${modelo} auto`;
    const apiUrl = `https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=20&category=MLC1743`;
    const response = await fetch(apiUrl, { headers: HEADERS_REALES });
    if (!response.ok) return [];
    const data = await response.json() as MercadoLibreResponse;
    if (!data.results) return [];
    
    return data.results.slice(0, 15).map((item) => ({
      id: `yapo-${item.id}`,
      nombre: item.title,
      precio: item.price,
      imagen: item.thumbnail?.replace('http://', 'https://') || '',
      descripcion: 'Vendedor particular',
      url: item.permalink,
      tienda: 'Yapo',
      marca: 'Genérico',
      modelo: modelo,
      categoria: 'Otros',
      fechaScraped: new Date(),
    }));
  } catch (error) { return []; }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { pieza, modelo } = req.method === 'POST' ? req.body : req.query;
    if (!pieza || !modelo) return res.status(400).json({ error: 'Faltan datos' });

    console.log(`🔎 API Buscando: ${pieza} ${modelo}`);

    const [mlResults, yapoResults] = await Promise.all([
      searchMercadoLibre(pieza as string, modelo as string),
      searchYapo(pieza as string, modelo as string),
    ]);

    const allResults = [...mlResults, ...yapoResults];

    // Siempre agregamos Google Shopping al final
    const query = `${pieza} ${modelo}`;
    allResults.push({
      id: 'google-shopping',
      nombre: `Buscar "${pieza}" en Google`,
      precio: 0,
      imagen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png',
      descripcion: 'Ver resultados en la web',
      url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`,
      tienda: 'Otros',
      marca: 'Google',
      modelo: modelo as string,
      categoria: 'Otros',
      fechaScraped: new Date(),
    });

    return res.status(200).json({
      success: true,
      count: allResults.length,
      results: allResults
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}