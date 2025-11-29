import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Función de espera para reintentos
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface SearchParams { pieza: string; modelo: string; }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { pieza, modelo } = req.method === 'POST' ? req.body : req.query;

    if (!pieza || !modelo) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    console.log(`🤖 IA Buscando (Modelo Lite): ${pieza} ${modelo}...`);

    // 1. Usamos el modelo 2.0 Flash Lite (Rápido y con mayor cuota gratuita)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `
      Actúa como un buscador de repuestos de autos para Chile.
      Busca en Google Shopping 5 opciones reales de compra para: "${pieza} ${modelo}".
      
      IMPORTANTE: Devuélveme SOLO un arreglo JSON válido.
      Formato exacto:
      [
        {
          "id": "1",
          "nombre": "Título del producto",
          "precio": 10000,
          "tienda": "Nombre tienda",
          "url": "https://link...",
          "imagen": "https://imagen...",
          "descripcion": "Descripción breve",
          "marca": "Marca",
          "modelo": "${modelo}",
          "categoria": "Repuestos"
        }
      ]
    `;

    // --- LÓGICA DE REINTENTO (RETRY) ---
    let result = null;
    let intentos = 0;
    const maxIntentos = 3;

    while (intentos < maxIntentos) {
      try {
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [
            {
              // @ts-ignore: Usamos 'as any' para evitar conflictos de tipos con versiones antiguas del SDK
              googleSearch: {} 
            } as any, 
          ],
        });
        break; // Éxito, salimos del bucle
      } catch (error: any) {
        // Manejo de cuota excedida (429)
        if (error.message?.includes('429') || error.status === 429) {
          intentos++;
          console.warn(`⚠️ Cuota excedida (429). Reintentando en 3s... (Intento ${intentos}/${maxIntentos})`);
          await delay(3000); 
        } else {
          throw error; // Otro error, fallamos
        }
      }
    }

    if (!result) {
      throw new Error("La IA no pudo completar la búsqueda en este momento.");
    }

    const response = result.response;
    const text = response.text();
    console.log("🤖 Respuesta IA recibida");

    // Limpieza y parseo del JSON
    const jsonString = text.replace(/```json|```/g, "").trim();
    
    let resultados = [];
    try {
        resultados = JSON.parse(jsonString);
        if (!Array.isArray(resultados)) resultados = [];
        
        // Normalización de datos para el Frontend
        resultados = resultados.map((r: any, i: number) => {
            const tiendaOriginal = r.tienda || "Tienda Web";
            
            // Clasificación de tiendas para los filtros
            let tiendaValida = "Otros";
            const tLower = tiendaOriginal.toLowerCase();
            if (tLower.includes("mercado")) tiendaValida = "MercadoLibre";
            else if (tLower.includes("yapo")) tiendaValida = "Yapo";
            else if (tLower.includes("autopartners")) tiendaValida = "AutoPartners";
            
            return {
                ...r,
                id: r.id || `ia-${Date.now()}-${i}`,
                fechaScraped: new Date(),
                tienda: tiendaValida,
                descripcion: `[Vendedor: ${tiendaOriginal}] ${r.descripcion || ''}`,
                precio: typeof r.precio === 'string' ? parseInt(r.precio.replace(/\D/g, '')) || 0 : r.precio
            };
        });

    } catch (e) {
        console.error("Error procesando JSON de IA", e);
        resultados = [];
    }

    console.log(`✅ IA encontró ${resultados.length} productos.`);

    return res.status(200).json({
      success: true,
      count: resultados.length,
      stores: { mercadolibre: 0, yapo: 0, ia: resultados.length },
      results: resultados
    });

  } catch (error: any) {
    console.error('❌ Error IA Final:', error.message);
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor',
      success: false 
    });
  }
}