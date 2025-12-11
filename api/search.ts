import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    console.log(`🤖 IA Buscando: ${pieza} ${modelo}...`);

    // Usar el modelo que funcionaba antes
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
      Actúa como un experto buscador de repuestos de autos en Chile.
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
      ]
    `;

    let result = null;
    let intentos = 0;
    const maxIntentos = 2; // ✅ Reducido a 2 intentos para no saturar

    while (intentos < maxIntentos) {
      try {
        result = await model.generateContent(prompt);
        break; 
      } catch (error: any) {
        if (error.message?.includes('429') || error.status === 429 || error.status === 503) {
          intentos++;
          // ✅ DELAYS MUY LARGOS: 30s, 60s
          const delayTime = Math.pow(2, intentos) * 30000;
          console.warn(`⚠️ Intento ${intentos} fallido. Esperando ${delayTime/1000}s...`);
          await delay(delayTime);
        } else {
          console.error("❌ Error no recuperable:", error.message);
          throw error;
        }
      }
    }

    if (!result) {
      console.error("❌ Se agotaron los intentos de conexión con Gemini.");
      return res.status(429).json({ 
        error: 'El servicio de IA está saturado. Has excedido el límite de búsquedas. Por favor espera 5 minutos e intenta de nuevo.',
        success: false 
      });
    }

    const response = result.response;
    let text = response.text();
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
        return res.status(500).json({ error: 'Formato de respuesta inválido', raw: text });
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
    
    const status = error.message?.includes('429') ? 429 : 500;
    const msg = status === 429 
      ? 'Límite de búsquedas excedido. Espera 5 minutos.' 
      : error.message || 'Error interno del servidor';

    return res.status(status).json({ error: msg, success: false });
  }
}
