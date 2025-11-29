import type { VercelRequest, VercelResponse } from '@vercel/node';
// 1. IMPORTAMOS 'DynamicRetrievalMode' PARA CORREGIR EL ERROR DE TIPOS
import { GoogleGenerativeAI, DynamicRetrievalMode } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface SearchParams { pieza: string; modelo: string; }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { pieza, modelo } = req.method === 'POST' ? req.body : req.query;

    if (!pieza || !modelo) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    console.log(`🤖 IA Buscando: ${pieza} ${modelo}...`);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Actúa como un buscador de repuestos de autos para Chile.
      Tu misión es usar Google Search para encontrar 5 opciones reales de compra para: "${pieza} ${modelo}".
      
      Busca en sitios chilenos como MercadoLibre.cl, Autoplanet, Indra, o repuesteras locales.
      
      IMPORTANTE: Devuélveme SOLO un arreglo JSON (sin texto extra, sin markdown).
      Formato exacto de cada objeto en el arreglo:
      {
        "id": "generar-id-unico",
        "nombre": "Título exacto del producto encontrado",
        "precio": 12345 (solo el número en pesos chilenos, estimado si no es exacto),
        "tienda": "Nombre de la tienda (ej: MercadoLibre)",
        "url": "Link directo al producto (o al buscador de la tienda si no hay directo)",
        "imagen": "Link a una imagen del producto (o usa 'https://placehold.co/200x200?text=Repuesto' si no encuentras)",
        "descripcion": "Breve descripción",
        "marca": "Marca del repuesto",
        "modelo": "${modelo}",
        "categoria": "Repuestos",
        "fechaScraped": "${new Date().toISOString()}"
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [
        {
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              // 2. USAMOS EL ENUM EN LUGAR DEL TEXTO PLANO
              mode: DynamicRetrievalMode.MODE_DYNAMIC,
              dynamicThreshold: 0.7,
            },
          },
        },
      ],
    });

    const response = result.response;
    const text = response.text();

    console.log("🤖 Respuesta cruda de IA:", text.substring(0, 100) + "...");

    const jsonString = text.replace(/```json|```/g, "").trim();
    
    let resultados = [];
    try {
        resultados = JSON.parse(jsonString);
    } catch (e) {
        console.error("Error parseando JSON de IA:", e);
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
    console.error('❌ Error IA:', error);
    return res.status(500).json({ 
      error: error.message || 'Error generando búsqueda con IA',
      success: false 
    });
  }
}