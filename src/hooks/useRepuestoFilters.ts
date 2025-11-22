import { useMemo } from 'react';
import type { Repuesto } from '../types';
import type { FilterOptions, SortOption } from '../components/FilterBar';

interface UseRepuestoFiltersProps {
  repuestos: Repuesto[];
  filters: FilterOptions;
  sort: SortOption;
}

export const useRepuestoFilters = ({
  repuestos,
  filters,
  sort,
}: UseRepuestoFiltersProps): Repuesto[] => {
  return useMemo(() => {
    let filtered = [...repuestos];

    filtered = filtered.filter((repuesto) => {
      const precio = repuesto.precio;
      const { precioMin, precioMax } = filters;
      return precio >= precioMin && precio <= precioMax;
    });

    if (filters.tiendas.length > 0) {
      filtered = filtered.filter((repuesto) =>
        filters.tiendas.includes(repuesto.tienda)
      );
    }

    switch (sort) {
      case 'precio_asc':
        filtered.sort((a, b) => a.precio - b.precio);
        break;
      case 'precio_desc':
        filtered.sort((a, b) => b.precio - a.precio);
        break;
      case 'relevante':
      default:
        break;
    }

    return filtered;
  }, [repuestos, filters, sort]);
};