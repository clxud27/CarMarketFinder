import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    const maxIntentos = 3; // Aumentado de 2 a 3

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
          }
        } else {
          console.error("❌ Error no recuperable:", error.message);
          throw error;
        }
      }
    }

    if (!result) {
      return res.status(503).json({ // Cambiado de 429 a 503
        error: 'OpenAI temporalmente no disponible. Por favor espera 2-3 minutos antes de intentar nuevamente.',
        success: false,
        retryAfter: 180 // segundos
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
      console.error("❌ Error parseando JSON:", text);
      return res.status(500).json({ error: 'Formato inválido', raw: text });
    }

    console.log(`✅ IA encontró ${resultados.length} productos.`);

    return res.status(200).json({
      success: true,
      count: resultados.length,
      stores: { mercadolibre: 0, yapo: 0, ia: resultados.length },
      results: resultados
    });

  } catch (error: any) {
    console.error('❌ Error API Handler:', error.message);

    const status = error.status === 429 ? 429 : 500;
    const msg = status === 429
      ? 'Límite excedido. Espera un momento.'
      : error.message || 'Error interno';

    return res.status(status).json({ error: msg, success: false });
  }
}
