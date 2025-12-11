import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Aumentamos el tiempo de espera entre reintentos para no saturar la API
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuración de CORS
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

    // CAMBIO CLAVE: Usamos la versión específica "001" de Flash-Lite.
    // Esta versión suele ser la más estable y económica en cuota.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });

    const prompt = `
      Actúa como un experto buscador de repuestos de autos en Chile.
      Necesito encontrar 5 opciones de compra reales y disponibles en internet para: "${pieza} ${modelo}".
      
      Busca en Google Shopping, MercadoLibre Chile, Yapo.cl o tiendas especializadas chilenas.
      Prioriza resultados con precio.

      IMPORTANTE: Devuélveme SOLO un arreglo JSON válido. No uses Markdown (sin \`\`\`json).
      Formato exacto del JSON:
      [
        {
          "id": "1",
          "nombre": "Título del producto",
          "precio": 10000,
          "tienda": "Nombre tienda (ej: MercadoLibre)",
          "url": "https://link-al-producto...",
          "imagen": "https://link-imagen...",
          "descripcion": "Breve descripción",
          "marca": "Marca del repuesto",
          "modelo": "${modelo}",
          "categoria": "Repuestos"
        }
      ]
    `;

    let result = null;
    let intentos = 0;
    const maxIntentos = 3;
    let lastError = null;

    while (intentos < maxIntentos) {
      try {
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} } as any], 
        });
        break; 
      } catch (error: any) {
        lastError = error;
        // Si es error de cuota (429), esperamos más tiempo (4 segundos)
        if (error.message?.includes('429') || error.status === 429 || error.status === 503) {
          intentos++;
          console.warn(`⚠️ Intento ${intentos} fallido (Cuota/Red). Esperando 4s...`);
          await delay(4000); 
        } else {
          console.error("❌ Error no recuperable:", error.message);
          throw error;
        }
      }
    }

    if (!result) {
      console.error("❌ Se agotaron los intentos de conexión con Gemini.");
      // Mensaje específico para el frontend
      return res.status(429).json({ 
        error: 'El servicio de IA está saturado momentáneamente. Por favor espera 1 minuto e intenta de nuevo.',
        success: false 
      });
    }

    const response = result.response;
    let text = response.text();
    console.log("🤖 Respuesta IA recibida");

    // Limpieza agresiva del JSON
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
    
    // Devolvemos el estado correcto al frontend
    const status = error.message?.includes('429') ? 429 : 500;
    const msg = status === 429 
      ? 'Cuota excedida. Espera un momento.' 
      : 'Error interno del servidor';

    return res.status(status).json({ error: msg, success: false });
  }
}