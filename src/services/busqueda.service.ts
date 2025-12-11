import { collection, query, where, getDocs, addDoc, Timestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { searchRepuestosApi } from './api.service';
import type { Repuesto } from '../types';

// ✅ Control de rate limiting en el frontend
let lastSearchTime = 0;
const COOLDOWN_MS = 15000; // 15 segundos entre búsquedas

export const buscarRepuestos = async (
  pieza: string,
  modelo: string
): Promise<{ repuestos: Repuesto[]; fromCache: boolean }> => {
  const terminoBusqueda = `${pieza.toLowerCase().trim()}_${modelo.toLowerCase().trim()}`;
  console.log(`🔎 Iniciando búsqueda inteligente para: ${terminoBusqueda}`);

  // ✅ RATE LIMITING: Verificar cooldown
  const now = Date.now();
  const timeSinceLastSearch = now - lastSearchTime;
  
  if (timeSinceLastSearch < COOLDOWN_MS) {
    const waitTime = Math.ceil((COOLDOWN_MS - timeSinceLastSearch) / 1000);
    throw new Error(`Por favor espera ${waitTime} segundos antes de buscar de nuevo para evitar saturar la API.`);
  }

  try {
    // 1. BUSCAR EN FIREBASE (CACHE)
    const busquedasRef = collection(db, 'historial_global_repuestos');
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);

    const q = query(
      busquedasRef, 
      where('termino_id', '==', terminoBusqueda),
      where('fecha_actualizacion', '>', fechaLimite),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log('⚡ ¡Encontrado en Base de Datos!');
      const data = querySnapshot.docs[0].data();
      return { repuestos: data.resultados as Repuesto[], fromCache: true };
    }
  } catch (error) {
    console.warn('⚠️ Continuando con búsqueda en vivo...', error);
  }

  // 2. BUSCAR EN API
  console.log('🌐 Escaneando MercadoLibre...');
  
  // ✅ Actualizar timestamp de última búsqueda ANTES de llamar a la API
  lastSearchTime = Date.now();
  
  try {
    const resultados = await searchRepuestosApi(pieza, modelo);

    const valeLaPenaGuardar = resultados.length > 1;

    if (valeLaPenaGuardar) {
      console.log(`💾 Guardando ${resultados.length} resultados válidos en DB...`);
      
      addDoc(collection(db, 'historial_global_repuestos'), {
        termino_id: terminoBusqueda,
        pieza_buscada: pieza,
        modelo_buscado: modelo,
        resultados: resultados,
        fecha_actualizacion: Timestamp.now(),
        cantidad_resultados: resultados.length
      })
      .then(() => console.log('✅ Guardado exitoso en background'))
      .catch((err) => console.error('❌ Error guardando en background:', err));
      
    } else {
      console.warn('⚠️ Pocos resultados, NO se guardará en historial.');
    }

    return { repuestos: resultados, fromCache: false };

  } catch (error) {
    console.error('❌ Error fatal:', error);
    // ✅ Si falla, resetear el timestamp para permitir reintento inmediato
    lastSearchTime = 0;
    throw error;
  }
};
