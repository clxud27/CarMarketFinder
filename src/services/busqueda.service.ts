import type { Repuesto } from '../types';
import { Tienda, Categoria } from '../types';
import { saveSearch, getSearch } from './cache.service';

const ML_API_URL = 'https://api.mercadolibre.com/sites/MLC/search';

export const buscarRepuestos = async (
  pieza: string,
  modelo: string
): Promise<{ repuestos: Repuesto[]; fromCache: boolean }> => {
  console.log(`🔎 Buscando: ${pieza} ${modelo}`);

  try {
    const cached = getSearch({ pieza, modeloAuto: modelo });
    if (cached) {
      return { repuestos: cached.repuestos, fromCache: true };
    }

    const query = `${pieza} ${modelo}`;
    let resultados: Repuesto[] = [];

    // Proxy Seguro AllOrigins
    const targetUrl = `${ML_API_URL}?q=${encodeURIComponent(query)}&limit=20`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Error Proxy');
      
      const wrapper = await response.json();
      const data = JSON.parse(wrapper.contents);

      if (data.results) {
        resultados = data.results.map((item: any) => ({
          id: item.id,
          nombre: item.title,
          precio: item.price,
          imagen: item.thumbnail 
            ? item.thumbnail.replace('http://', 'https://') 
            : 'https://placehold.co/200x200?text=Sin+Imagen',
          descripcion: `Vendedor: ${item.seller?.nickname || 'MercadoLibre'}.`,
          url: item.permalink,
          tienda: Tienda.MercadoLibre,
          marca: 'Genérico',
          modelo: modelo,
          categoria: Categoria.Otros,
          fechaScraped: new Date(),
        }));
      }
    } catch (e) {
      console.error('Error ML', e);
    }

    // Google Shopping Fallback
    resultados.push({
      id: 'google-shopping',
      nombre: `Buscar "${pieza}" en Google Shopping`,
      precio: 0,
      descripcion: 'Comparar en Falabella, Sodimac, etc.',
      imagen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png',
      url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`,
      tienda: Tienda.Otros,
      marca: 'Google',
      modelo: modelo,
      categoria: Categoria.Otros,
      fechaScraped: new Date(),
    });

    // Siempre guardar la búsqueda, incluso si solo tiene el enlace de Google Shopping
    if (resultados.length > 0) {
      console.log('💾 Guardando búsqueda en historial...');
      saveSearch({ pieza, modeloAuto: modelo }, resultados);
      console.log('✅ Búsqueda guardada exitosamente en historial');
    } else {
      console.warn('⚠️ No se guardó en historial: sin resultados');
    }

    return { repuestos: resultados, fromCache: false };

  } catch (error: any) {
    return { repuestos: [], fromCache: false };
  }
};