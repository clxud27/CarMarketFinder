import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Tienda } from '../types';

interface FilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
  onSort: (sort: SortOption) => void;
  totalResults: number;
  filteredResults: number;
}

export interface FilterOptions {
  precioMin: number;
  precioMax: number;
  tiendas: Tienda[];
}

export type SortOption = 'precio_asc' | 'precio_desc' | 'relevante';

export const FilterBar: React.FC<FilterBarProps> = ({
  onFilterChange,
  onSort,
  totalResults,
  filteredResults,
}) => {
  const [precioMin, setPrecioMin] = useState<string>('');
  const [precioMax, setPrecioMax] = useState<string>('');
  const [tiendasSeleccionadas, setTiendasSeleccionadas] = useState<Tienda[]>(
    Object.values(Tienda)
  );
  const [sortOption, setSortOption] = useState<SortOption>('relevante');

  const handleTiendaToggle = (tienda: Tienda) => {
    const newTiendas = tiendasSeleccionadas.includes(tienda)
      ? tiendasSeleccionadas.filter((t) => t !== tienda)
      : [...tiendasSeleccionadas, tienda];

    setTiendasSeleccionadas(newTiendas);
    onFilterChange({
      precioMin: Number(precioMin) || 0,
      precioMax: Number(precioMax) || Infinity,
      tiendas: newTiendas,
    });
  };

  const handlePrecioChange = () => {
    onFilterChange({
      precioMin: Number(precioMin) || 0,
      precioMax: Number(precioMax) || Infinity,
      tiendas: tiendasSeleccionadas,
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as SortOption;
    setSortOption(newSort);
    onSort(newSort);
  };

  const handleLimpiarFiltros = () => {
    setPrecioMin('');
    setPrecioMax('');
    setTiendasSeleccionadas(Object.values(Tienda));
    setSortOption('relevante');
    onFilterChange({
      precioMin: 0,
      precioMax: Infinity,
      tiendas: Object.values(Tienda),
    });
    onSort('relevante');
  };

  return (
    <Card className="mb-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Filtros y Ordenamiento
          </h3>
          <span className="text-sm text-gray-600">
            Mostrando {filteredResults} de {totalResults} resultados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rango de Precio
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={precioMin}
                onChange={(e) => setPrecioMin(e.target.value)}
                onBlur={handlePrecioChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={precioMax}
                onChange={(e) => setPrecioMax(e.target.value)}
                onBlur={handlePrecioChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiendas
            </label>
            <div className="flex flex-wrap gap-3">
              {Object.values(Tienda).map((tienda) => (
                <label
                  key={tienda}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={tiendasSeleccionadas.includes(tienda)}
                    onChange={() => handleTiendaToggle(tienda)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{tienda}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordenar por
            </label>
            <select
              value={sortOption}
              onChange={handleSortChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="relevante">Más Relevante</option>
              <option value="precio_asc">Precio: Menor a Mayor</option>
              <option value="precio_desc">Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleLimpiarFiltros}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </Card>
  );
};