import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getAllCachedSearches, clearCache } from '../services';
import type { CacheData } from '../services';

interface CachedSearch {
  pieza: string;
  modelo: string;
  timestamp: Date;
  totalResultados: number;
}

export const Historial: React.FC = () => {
  const navigate = useNavigate();
  const [busquedas, setBusquedas] = useState<CachedSearch[]>([]);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = () => {
    const cached: CacheData[] = getAllCachedSearches();
    
    const historial: CachedSearch[] = cached.slice(0, 10).map((cache) => ({
      pieza: cache.busqueda.pieza,
      modelo: cache.busqueda.modeloAuto || '',
      timestamp: new Date(cache.timestamp),
      totalResultados: cache.repuestos.length,
    }));

    setBusquedas(historial);
  };

  const handleBuscarDeNuevo = (pieza: string, modelo: string) => {
    navigate('/', { 
      state: { 
        pieza, 
        modelo,
        autoSearch: true 
      } 
    });
  };

  const handleLimpiarTodo = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
      clearCache();
      setBusquedas([]);
    }
  };

  const formatearFecha = (fecha: Date): string => {
    const ahora = new Date();
    const diff = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    if (horas < 24) return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    if (dias < 7) return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
    
    return fecha.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📜 Historial de Búsquedas
            </h1>
            <p className="text-gray-600">
              Tus últimas 10 búsquedas guardadas
            </p>
          </div>
          
          {busquedas.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleLimpiarTodo}
              className="hover:bg-red-50 hover:text-red-600 hover:border-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Limpiar Todo
            </Button>
          )}
        </div>

        {busquedas.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No hay búsquedas en el historial
            </h2>
            <p className="text-gray-500 mb-6">
              Realiza una búsqueda para que aparezca aquí
            </p>
            <Button onClick={() => navigate('/')}>
              Ir a Buscar
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {busquedas.map((busqueda, index) => (
              <Card 
                key={index}
                className="hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🔧</span>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {busqueda.pieza}
                      </h3>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        <span><strong>Modelo:</strong> {busqueda.modelo}</span>
                      </p>
                      
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span><strong>Resultados:</strong> {busqueda.totalResultados} repuestos</span>
                      </p>
                      
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{formatearFecha(busqueda.timestamp)}</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <Button
                      onClick={() => handleBuscarDeNuevo(busqueda.pieza, busqueda.modelo)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Buscar de nuevo
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};