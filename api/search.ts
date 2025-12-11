import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Función de espera para reintentos
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

    // CAMBIO: Usamos gemini-1.5-flash que es más estable y tiene mejor cuota gratuita
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    // --- LÓGICA DE REINTENTO MEJORADA ---
    let result = null;
    let intentos = 0;
    const maxIntentos = 3;
    let lastError = null;

    while (intentos < maxIntentos) {
      try {
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          // Si el modelo soporta búsqueda, la activamos. Si falla, el try/catch lo maneja.
          tools: [{ googleSearch: {} } as any], 
        });
        break; 
      } catch (error: any) {
        lastError = error;
        // Manejo de cuota excedida (429) o Servicio no disponible (503)
        if (error.message?.includes('429') || error.status === 429 || error.status === 503) {
          intentos++;
          console.warn(`⚠️ Intento ${intentos} fallido (${error.status || 'Error'}). Reintentando en 2s...`);
          await delay(2000); 
        } else {
          // Si es otro error (ej: API Key inválida), no tiene sentido reintentar
          console.error("❌ Error no recuperable:", error.message);
          throw error;
        }
      }
    }

    if (!result) {
      // Si llegamos aquí, es porque agotamos los intentos
      console.error("❌ Se agotaron los intentos de conexión con Gemini.");
      throw new Error(`Servicio ocupado o cuota excedida. Último error: ${lastError?.message}`);
    }

    const response = result.response;
    let text = response.text();
    console.log("🤖 Respuesta IA recibida");

    // Limpieza agresiva del JSON para evitar errores de parseo
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // A veces la IA añade texto antes o después del JSON, intentamos extraer solo el array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        text = jsonMatch[0];
    }

    let resultados = [];
    try {
        resultados = JSON.parse(text);
        
        if (!Array.isArray(resultados)) {
            // Si devuelve un solo objeto en lugar de array, lo envolvemos
            resultados = [resultados]; 
        }
        
        // Normalización de datos
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
                // Asegurar que el precio sea un número
                precio: typeof r.precio === 'string' ? parseInt(r.precio.replace(/\D/g, '')) || 0 : r.precio,
                // Asegurar imagen por defecto si falla
                imagen: r.imagen || "https://placehold.co/300x300?text=No+Image"
            };
        });

    } catch (e) {
        console.error("❌ Error parseando JSON de la IA:", text);
        return res.status(500).json({ error: 'La IA devolvió un formato inválido', raw: text });
    }

    console.log(`✅ IA encontró ${resultados.length} productos.`);

    return res.status(200).json({
      success: true,
      count: resultados.length,
      stores: { mercadolibre: 0, yapo: 0, ia: resultados.length },
      results: resultados
    });

  } catch (error: any) {
    console.error('❌ Error API Handler:', error);
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor',
      success: false 
    });
  }
}