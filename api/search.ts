import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 🆕 SISTEMA DE FALLBACK - Resultados mockeados realistas
const generarResultadosMock = (pieza: string, modelo: string) => {
  const piezaNormalizada = pieza.toLowerCase();
  const modeloNormalizada = modelo.toLowerCase();
  
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

  // Detectar tipo de pieza
  let precioBase = 30000; // Precio por defecto
  for (const [key, precio] of Object.entries(preciosBase)) {
    if (piezaNormalizada.includes(key)) {
      precioBase = precio;
      break;
    }
  }

  const tiendas = ['MercadoLibre', 'MercadoLibre', 'Yapo', 'AutoPartners', 'MercadoLibre'];
  const marcas = ['Original', 'Compatible', 'Genérico', 'Premium', 'OEM'];
  
  return Array.from({ length: 5 }, (_, i) => {
    const variacion = (Math.random() - 0.5) * 0.4; // ±20% variación
    const precio = Math.round(precioBase * (1 + variacion) / 1000) * 1000;
    const tienda = tiendas[i];
    
    return {
      id: `mock-${Date.now()}-${i}`,
      nombre: `${pieza} para ${modelo} - ${marcas[i]}`,
      precio: precio,
      tienda: tienda,
      url: tienda === 'MercadoLibre' 
        ? `https://www.mercadolibre.cl/p/CHL${Math.floor(Math.random() * 999999)}`
        : tienda === 'Yapo'
        ? `https://www.yapo.cl/region_metropolitana/repuestos_${Math.random().toString(36).substring(7)}.htm`
        : `https://www.autopartners.cl/producto/${Math.random().toString(36).substring(7)}`,
      imagen: `https://placehold.co/300x300/e0e0e0/666?text=${encodeURIComponent(pieza.substring(0, 20))}`,
      descripcion: `${pieza} compatible con ${modelo}. Producto de calidad ${marcas[i].toLowerCase()}.`,
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
Genera 5 opciones REALISTAS de compra para: "${pieza} ${modelo}".

Inventa resultados basados en tiendas reales chilenas como MercadoLibre Chile, Yapo.cl, AutoPartners.
Los precios deben ser coherentes con el mercado chileno (entre $10.000 y $150.000 CLP).

IMPORTANTE: Devuélveme SOLO un arreglo JSON válido. No uses Markdown.
Formato exacto:
[
  {
    "id": "1",
    "nombre": "Título del producto realista",
    "precio": 35000,
    "tienda": "MercadoLibre",
    "url": "https://www.mercadolibre.cl/producto-ejemplo",
    "imagen": "https://placehold.co/300x300?text=Repuesto",
    "descripcion": "Breve descripción técnica",
    "marca": "Compatible",
    "modelo": "${modelo}",
    "categoria": "Repuestos"
  }
]`;

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
          // Delays más largos: 15s, 45s, 90s
          const delayTime = Math.pow(3, intentos) * 5000;
          console.warn(`⚠️ OpenAI rate limit. Intento ${intentos}/${maxIntentos}. Esperando ${delayTime/1000}s...`);
          
          if (intentos < maxIntentos) {
            await delay(delayTime);
          } else {
            // Último intento fallido, activar fallback
            usarFallback = true;
          }
        } else {
          console.error("❌ Error no recuperable:", error.message);
          // En caso de error no recuperable, también usar fallback
          usarFallback = true;
          break;
        }
      }
    }

    // 🆕 ACTIVAR FALLBACK si OpenAI falló
    if (!result || usarFallback) {
      console.warn('⚠️ OpenAI no disponible. Usando resultados de respaldo...');
      const resultadosMock = generarResultadosMock(pieza, modelo);
      
      return res.status(200).json({
        success: true,
        count: resultadosMock.length,
        stores: { mercadolibre: 0, yapo: 0, ia: resultadosMock.length },
        results: resultadosMock,
        fallback: true, // Indicador de que son resultados de respaldo
        message: 'Resultados aproximados. El servicio de IA está temporalmente saturado.'
      });
    }

    let text = result;
    console.log("🤖 Respuesta IA recibida");

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
        if (tLower.includes("mercado") || tLower.includes("mercadolibre")) tiendaValida = "MercadoLibre";
        else if (tLower.includes("yapo")) tiendaValida = "Yapo";
        else if (tLower.includes("autopartners")) tiendaValida = "AutoPartners";

        return {
          ...r,
          id: r.id || `ia-${Date.now()}-${i}`,
          fechaScraped: new Date(),
          tienda: tiendaValida,
          precio: typeof r.precio === 'string' ? parseInt(r.precio.replace(/\D/g, '')) || 0 : r.precio,
          imagen: r.imagen || "https://placehold.co/300x300?text=No+Image"
        };
      });

    } catch (e) {
      console.error("❌ Error parseando JSON. Usando fallback...");
      const resultadosMock = generarResultadosMock(pieza, modelo);
      
      return res.status(200).json({
        success: true,
        count: resultadosMock.length,
        stores: { mercadolibre: 0, yapo: 0, ia: resultadosMock.length },
        results: resultadosMock,
        fallback: true,
      });
    }

    console.log(`✅ IA encontró ${resultados.length} productos.`);

    return res.status(200).json({
      success: true,
      count: resultados.length,
      stores: { mercadolibre: 0, yapo: 0, ia: resultados.length },
      results: resultados,
      fallback: false,
    });

  } catch (error: any) {
    console.error('❌ Error API Handler:', error.message);

    // En caso de error fatal, devolver resultados de respaldo
    const { pieza, modelo } = req.method === 'POST' ? req.body : req.query;
    if (pieza && modelo) {
      const resultadosMock = generarResultadosMock(pieza, modelo);
      return res.status(200).json({
        success: true,
        count: resultadosMock.length,
        stores: { mercadolibre: 0, yapo: 0, ia: resultadosMock.length },
        results: resultadosMock,
        fallback: true,
        message: 'Servicio temporalmente limitado. Mostrando resultados aproximados.'
      });
    }

    return res.status(500).json({ 
      error: error.message || 'Error interno', 
      success: false 
    });
  }
}
