import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Categoria } from '../types';

interface SearchBarProps {
  onSearch: (pieza: string, modelo: string, categoria?: string) => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = React.memo(({ onSearch, isLoading }) => {
  const [pieza, setPieza] = useState('');
  const [modelo, setModelo] = useState('');
  const [categoria, setCategoria] = useState<string>('');
  const [errors, setErrors] = useState({ pieza: '', modelo: '' });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = { pieza: '', modelo: '' };
    let isValid = true;

    if (!pieza.trim()) {
      newErrors.pieza = 'Por favor ingresa el nombre de la pieza';
      isValid = false;
    }

    if (!modelo.trim()) {
      newErrors.modelo = 'Por favor ingresa el modelo del auto';
      isValid = false;
    }

    setErrors(newErrors);

    if (isValid) {
      onSearch(pieza.trim(), modelo.trim(), categoria || undefined);
    }
  }, [pieza, modelo, categoria, onSearch]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Pieza"
              placeholder="Ej: Alternador, Batería, Frenos"
              value={pieza}
              onChange={(e) => setPieza(e.target.value)}
              error={errors.pieza}
              disabled={isLoading}
              aria-label="Nombre de la pieza"
            />

            <Input
              label="Modelo del Auto"
              placeholder="Ej: Toyota Corolla 2015"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              error={errors.modelo}
              disabled={isLoading}
              aria-label="Modelo del automóvil"
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría (opcional)
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                aria-label="Categoría del repuesto"
              >
                <option value="">Todas las categorías</option>
                {Object.values(Categoria).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <Button type="submit" isLoading={isLoading} aria-label="Buscar repuestos">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Buscar
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
});

SearchBar.displayName = 'SearchBar';