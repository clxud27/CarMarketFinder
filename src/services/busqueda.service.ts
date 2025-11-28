import { collection, query, where, getDocs, addDoc, Timestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { searchRepuestosApi } from './api.service';
import type { Repuesto } from '../types';

export const buscarRepuestos = async (
  pieza: string,
  modelo: string
): Promise<{ repuestos: Repuesto[]; fromCache: boolean }> => {
  const terminoBusqueda = `${pieza.toLowerCase().trim()}_${modelo.toLowerCase().trim()}`;
  console.log(`🔎 Iniciando búsqueda inteligente para: ${terminoBusqueda}`);

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
  try {
    const resultados = await searchRepuestosApi(pieza, modelo);

    // 🔴 CAMBIO CRÍTICO DE SEGURIDAD 🔴
    // Solo guardamos si encontramos MÁS de 1 resultado.
    // (Porque 1 resultado significa que solo encontró el link de Google y falló lo demás)
    const valeLaPenaGuardar = resultados.length > 1;

    if (valeLaPenaGuardar) {
      console.log(`💾 Guardando ${resultados.length} resultados válidos en DB...`);
      try {
        await addDoc(collection(db, 'historial_global_repuestos'), {
          termino_id: terminoBusqueda,
          pieza_buscada: pieza,
          modelo_buscado: modelo,
          resultados: resultados,
          fecha_actualizacion: Timestamp.now(),
          cantidad_resultados: resultados.length
        });
      } catch (saveError) {
        console.error('Error guardando en DB:', saveError);
      }
    } else {
      console.warn('⚠️ Pocos resultados (posible bloqueo), NO se guardará en historial.');
    }

    return { repuestos: resultados, fromCache: false };

  } catch (error) {
    console.error('❌ Error fatal:', error);
    return { repuestos: [], fromCache: false };
  }
};