import React from 'react';
import { motion } from 'framer-motion';
import type { Repuesto } from '../types';
import { Tienda } from '../types';

interface ResultadosListaProps {
  repuestos: Repuesto[];
  busquedaTitle: string;
}

const tiendaStyles: Record<Tienda, { bg: string; text: string; border: string; icon: string }> = {
  [Tienda.MercadoLibre]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '🤝' },
  [Tienda.Yapo]: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', icon: 'Yz' },
  [Tienda.AutoPartners]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: 'AP' },
  [Tienda.Otros]: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', icon: '🌐' },
};

const formatPrecio = (precio: number) => {
  return precio > 0 ? `$${precio.toLocaleString('es-CL')}` : 'Consultar';
};

export const ResultadosLista: React.FC<ResultadosListaProps> = ({ repuestos }) => {
  const handleVerOferta = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Agrupar por tienda y calcular estadísticas
  const estadisticas = React.useMemo(() => {
    const tiendasMap = new Map<Tienda, number>();
    let precioMin = Infinity;
    let precioMax = 0;

    repuestos.forEach(r => {
      tiendasMap.set(r.tienda, (tiendasMap.get(r.tienda) || 0) + 1);
      if (r.precio > 0) {
        precioMin = Math.min(precioMin, r.precio);
        precioMax = Math.max(precioMax, r.precio);
      }
    });

    return {
      tiendas: Array.from(tiendasMap.entries()).map(([tienda, cantidad]) => ({ tienda, cantidad })),
      precioMin: precioMin === Infinity ? 0 : precioMin,
      precioMax,
      totalResultados: repuestos.length,
    };
  }, [repuestos]);

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto pb-12">
      {/* Resumen de resultados */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          📋 {estadisticas.totalResultados} Resultados encontrados
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tiendas disponibles */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              🏪 Páginas encontradas:
            </h4>
            <div className="flex flex-wrap gap-2">
              {estadisticas.tiendas.map(({ tienda, cantidad }) => (
                <span
                  key={tienda}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${tiendaStyles[tienda].bg} ${tiendaStyles[tienda].text} ${tiendaStyles[tienda].border}`}
                >
                  {tiendaStyles[tienda].icon} {tienda} ({cantidad})
                </span>
              ))}
            </div>
          </div>

          {/* Rango de precios */}
          {estadisticas.precioMax > 0 && (
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                💰 Rango de precios:
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Precio mínimo</p>
                  <p className="text-lg font-bold text-green-600">{formatPrecio(estadisticas.precioMin)}</p>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Precio máximo</p>
                  <p className="text-lg font-bold text-blue-600">{formatPrecio(estadisticas.precioMax)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de productos */}
      <div className="mt-2">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 px-2">
          Todas las opciones disponibles:
        </h4>
      </div>

      {repuestos.map((producto, index) => (
        <motion.div 
          key={producto.id || index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row gap-6 hover:shadow-lg hover:border-blue-300 transition-all duration-300 group"
        >
          {/* Imagen */}
          <div className="w-full sm:w-48 h-48 flex-shrink-0 bg-white rounded-lg border border-gray-100 p-2 flex items-center justify-center overflow-hidden relative">
            <img 
              src={producto.imagen} 
              alt={producto.nombre}
              className="w-full h-full object-contain mix-blend-multiply hover:scale-110 transition-transform duration-500"
              onError={(e) => e.currentTarget.src = 'https://placehold.co/200x200?text=Sin+Foto'}
            />
          </div>

          {/* Detalles */}
          <div className="flex-grow flex flex-col justify-center min-w-0">
            <div className="mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${tiendaStyles[producto.tienda].bg} ${tiendaStyles[producto.tienda].text} ${tiendaStyles[producto.tienda].border}`}>
                {tiendaStyles[producto.tienda].icon} {producto.tienda}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
              {producto.nombre}
            </h2>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{producto.descripcion}</p>
          </div>

          {/* Precio */}
          <div className="w-full sm:w-40 flex flex-col justify-center items-end gap-1 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6">
            <div className="text-2xl font-extrabold text-gray-900 mb-4">{formatPrecio(producto.precio)}</div>
            <button
              onClick={() => handleVerOferta(producto.url)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              Ver Tienda
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};