import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Función auxiliar para generar URLs de búsqueda reales
const generarUrlBusqueda = (tienda: string, pieza: string, modelo: string) => {
  const query = `${pieza} ${modelo}`.trim();
  const queryEncoded = encodeURIComponent(query);
  const queryDashed = query.replace(/\s+/g, '-').toLowerCase();

  switch (tienda) {
    case 'MercadoLibre':
      // MercadoLibre usa formato con guiones para mejores resultados
      return `https://listado.mercadolibre.cl/${queryDashed}#D[A:${queryEncoded}]`;
    case 'Yapo':
      return `https://www.yapo.cl/chile?q=${queryEncoded}`;
    case 'AutoPartners':
      // Búsqueda genérica en el sitio o Google si no tienen buscador GET estándar
      return `https://www.google.com/search?q=site:autopartners.cl+${queryEncoded}`;
    default:
      // Búsqueda en Google Shopping o General como fallback seguro
      return `https://www.google.com/search?tbm=shop&q=${queryEncoded}`;
  }
};

// 🆕 SISTEMA DE FALLBACK - Resultados mockeados realistas
const generarResultadosMock = (pieza: string, modelo: string) => {
  const piezaNormalizada = pieza.toLowerCase();
  
  // Base de precios según tipo de pieza
  const preciosBase: Record<string, number> = {
    'bomba de agua': 35000,
    'filtro': 15000,
    'aceite': 25000,
    'pastillas': 45000,
    'disco': 55000,
    'bateria': 85000,
    'bujia': 12000,
    'correa': 28000,
    'amortiguador': 65000,
    'sensor': 38000,
  };

  // Detectar precio base
  let precioBase = 30000;
  for (const [key, precio] of Object.entries(preciosBase)) {
    if (piezaNormalizada.includes(key)) {
      precioBase = precio;
      break;
    }
  }

  const tiendas = ['MercadoLibre', 'MercadoLibre', 'Yapo', 'AutoPartners', 'MercadoLibre'];
  const marcas = ['Original', 'Compatible', 'Genérico', 'Premium', 'OEM'];
  
  return Array.from({ length: 5 }, (_, i) => {
    const variacion = (Math.random() - 0.5) * 0.4;
    const precio = Math.round(precioBase * (1 + variacion) / 1000) * 1000;
    const tienda = tiendas[i];
    
    return {
      id: `mock-${Date.now()}-${i}`,
      nombre: `${pieza} para ${modelo} - ${marcas[i]}`,
      precio: precio,
      tienda: tienda,
      // 🟢 CORRECCIÓN: Usamos la función generadora de URLs reales
      url: generarUrlBusqueda(tienda, pieza, modelo),
      imagen: `https://placehold.co/300x300/e0e0e0/666?text=${encodeURIComponent(pieza.substring(0, 20))}`,
      descripcion: `${pieza} compatible con ${modelo}. Producto de calidad ${marcas[i].toLowerCase()}. (Resultado referencial)`,
      marca: marcas[i],
      modelo: modelo,
      categoria: 'Repuestos',
      fechaScraped: new Date(),
    };
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { pieza, modelo } = req.method === 'POST' ? req.body : req.query;

    if (!pieza || !modelo) {
      return res.status(400).json({ error: 'Faltan datos: pieza o modelo' });
    }

    console.log(`🤖 IA (OpenAI) Buscando: ${pieza} ${modelo}...`);

    const prompt = `Actúa como un experto buscador de repuestos de autos en Chile.
Genera 5 opciones de repuestos para: "${pieza} ${modelo}".
Los precios deben ser coherentes con el mercado chileno.

IMPORTANTE: Devuélveme SOLO un arreglo JSON válido.
Formato exacto:
[
  {
    "id": "1",
    "nombre": "Título descriptivo del producto",
    "precio": 35000,
    "tienda": "MercadoLibre", 
    "descripcion": "Breve descripción técnica",
    "marca": "Marca del repuesto",
    "modelo": "${modelo}",
    "categoria": "Repuestos"
  }
]
NOTA: No inventes URLs, las generaré yo programáticamente.`;

    let result = null;
    let intentos = 0;
    const maxIntentos = 3;
    let usarFallback = false;

    while (intentos < maxIntentos) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        });

        result = completion.choices[0].message.content;
        break;
      } catch (error: any) {
        if (error.status === 429 || error.code === 'rate_limit_exceeded') {
          intentos++;
          const delayTime = Math.pow(3, intentos) * 5000;
          console.warn(`⚠️ OpenAI rate limit. Intento ${intentos}/${maxIntentos}.`);
          
          if (intentos < maxIntentos) {
            await delay(delayTime);
          } else {
            usarFallback = true;
          }
        } else {
          console.error("❌ Error no recuperable:", error.message);
          usarFallback = true;
          break;
        }
      }
    }

    if (!result || usarFallback) {
      console.warn('⚠️ Usando resultados de respaldo...');
      const resultadosMock = generarResultadosMock(pieza, modelo);
      
      return res.status(200).json({
        success: true,
        count: resultadosMock.length,
        stores: { mercadolibre: 0, yapo: 0, ia: resultadosMock.length },
        results: resultadosMock,
        fallback: true,
        message: 'Resultados aproximados (Búsqueda IA no disponible).'
      });
    }

    let text = result;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) text = jsonMatch[0];

    let resultados = [];
    try {
      resultados = JSON.parse(text);
      if (!Array.isArray(resultados)) resultados = [resultados];

      resultados = resultados.map((r: any, i: number) => {
        const tiendaOriginal = r.tienda || "Tienda Web";
        let tiendaValida = "Otros";
        const tLower = tiendaOriginal.toLowerCase();
        
        if (tLower.includes("mercado")) tiendaValida = "MercadoLibre";
        else if (tLower.includes("yapo")) tiendaValida = "Yapo";
        else if (tLower.includes("autopartners")) tiendaValida = "AutoPartners";

        // 🟢 CORRECCIÓN: Sobrescribimos la URL inventada con una URL de búsqueda real
        const urlReal = generarUrlBusqueda(tiendaValida, pieza, modelo);

        return {
          ...r,
          id: r.id || `ia-${Date.now()}-${i}`,
          fechaScraped: new Date(),
          tienda: tiendaValida,
          url: urlReal, // Usamos la URL generada programáticamente
          precio: typeof r.precio === 'string' ? parseInt(r.precio.replace(/\D/g, '')) || 0 : r.precio,
          imagen: r.imagen || "https://placehold.co/300x300?text=Repuesto"
        };
      });

    } catch (e) {
      console.error("❌ Error parseando JSON. Usando fallback...");
      const resultadosMock = generarResultadosMock(pieza, modelo);
      return res.status(200).json({
        success: true,
        results: resultadosMock,
        fallback: true,
      });
    }

    return res.status(200).json({
      success: true,
      count: resultados.length,
      stores: { mercadolibre: 0, yapo: 0, ia: resultados.length },
      results: resultados,
      fallback: false,
    });

  } catch (error: any) {
    console.error('❌ Error API Handler:', error.message);
    const { pieza, modelo } = req.method === 'POST' ? req.body : req.query;
    if (pieza && modelo) {
      const resultadosMock = generarResultadosMock(pieza, modelo);
      return res.status(200).json({
        success: true,
        results: resultadosMock,
        fallback: true
      });
    }
    return res.status(500).json({ error: error.message, success: false });
  }
}