import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    console.log(`🤖 IA Buscando (Modelo 2.0): ${pieza} ${modelo}...`);

    // 1. USAMOS EL MODELO 2.0 (El único que tu cuenta detectó correctamente)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
      Actúa como un buscador de repuestos de autos para Chile.
      Busca en Google Shopping 5 opciones reales de compra para: "${pieza} ${modelo}".
      
      IMPORTANTE: Devuélveme SOLO un arreglo JSON.
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
          "categoria": "Repuestos",
          "tiendaTipo": "Repuesto"
        }
      ]
    `;

    // 2. CONFIGURACIÓN CORRECTA PARA GEMINI 2.0
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [
        {
          // @ts-ignore: Ignoramos el error de tipo porque la librería aún no actualiza la definición para 2.0
          googleSearch: {} 
        },
      ],
    });

    const response = result.response;
    const text = response.text();
    console.log("🤖 Respuesta IA:", text.substring(0, 50) + "...");

    const jsonString = text.replace(/```json|```/g, "").trim();
    let resultados = [];
    try {
        resultados = JSON.parse(jsonString);
        // Aseguramos que sea un array
        if (!Array.isArray(resultados)) resultados = [];
        
        // Añadimos fecha y ID si faltan
        resultados = resultados.map((r: any, i: number) => ({
            ...r,
            id: r.id || `ia-${Date.now()}-${i}`,
            fechaScraped: new Date(),
            tienda: r.tienda || "Tienda Web"
        }));

    } catch (e) {
        console.error("Error JSON IA", e);
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
    console.error('❌ Error IA:', error.message);
    
    // Si es error de cuota (429), devolvemos un mensaje amigable
    if (error.message?.includes('429') || error.message?.includes('Quota')) {
        return res.status(429).json({ 
            error: 'La IA está saturada (demasiadas búsquedas). Espera 1 minuto y reintenta.',
            success: false 
        });
    }

    return res.status(500).json({ 
      error: error.message || 'Error interno',
      success: false 
    });
  }
}