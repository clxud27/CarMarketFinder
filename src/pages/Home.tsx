import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { SearchBar } from '../components/SearchBar';
import { ResultadosLista } from '../components/ResultadosLista';
import type { FilterOptions, SortOption } from '../components/FilterBar';
import { FilterBar } from '../components/FilterBar';
import { Navbar } from '../components/layout/Navbar';
import type { Repuesto, BusquedaRepuesto } from '../types';
import { Tienda, Categoria } from '../types';
import { useRepuestoFilters } from '../hooks';
import { buscarRepuestos } from '../services';

export const Home: React.FC = () => {
  const location = useLocation();
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busquedaActual, setBusquedaActual] = useState<BusquedaRepuesto | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    precioMin: 0,
    precioMax: Infinity,
    tiendas: Object.values(Tienda),
  });
  const [sortOption, setSortOption] = useState<SortOption>('relevante');

  const repuestosFiltrados = useRepuestoFilters({
    repuestos, filters, sort: sortOption,
  });

  useEffect(() => {
    const state = location.state as any;
    if (state?.autoSearch && state?.pieza && state?.modelo) {
      handleSearch(state.pieza, state.modelo);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSearch = useCallback(async (pieza: string, modelo: string, categoria?: string) => {
    setIsLoading(true);
    setBusquedaActual({ pieza, modeloAuto: modelo, categoria: categoria as Categoria | undefined });

    try {
      const resultado = await buscarRepuestos(pieza, modelo);
      setRepuestos(resultado.repuestos);

      if (resultado.fromCache) {
        toast.success('Cargado desde historial', { icon: '⚡' });
      } else {
        // Contar tiendas únicas
        const tiendasUnicas = new Set(resultado.repuestos.map(r => r.tienda)).size;
        toast.success(
          `${resultado.repuestos.length} opciones en ${tiendasUnicas} ${tiendasUnicas === 1 ? 'tienda' : 'tiendas'}`,
          { icon: '✅', duration: 4000 }
        );
        toast.success('Guardado en historial', { icon: '💾', duration: 2000 });
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Error al buscar');
      setRepuestos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Toaster position="top-right" />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        <div className={`transition-all duration-500 ${busquedaActual ? 'mb-8' : 'my-20 max-w-3xl mx-auto text-center'}`}>
          {!busquedaActual && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                Cotiza tus <span className="text-blue-600">Repuestos</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10">Compara precios de MercadoLibre y más en segundos.</p>
            </motion.div>
          )}
          <div className={`${busquedaActual ? '' : 'shadow-xl rounded-2xl'}`}>
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 animate-pulse">Buscando las mejores ofertas...</p>
          </div>
        )}

        {!isLoading && busquedaActual && repuestos.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-6">
               <FilterBar onFilterChange={setFilters} onSort={setSortOption} totalResults={repuestos.length} filteredResults={repuestosFiltrados.length} />
            </div>
            <ResultadosLista repuestos={repuestosFiltrados} busquedaTitle={`${busquedaActual.pieza} para ${busquedaActual.modeloAuto}`} />
          </motion.div>
        )}

        {!isLoading && busquedaActual && repuestos.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">No encontramos resultados</h3>
          </div>
        )}
      </main>
    </div>
  );
};