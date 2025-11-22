import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import type { Repuesto } from '../types';
import { Tienda } from '../types';

interface RepuestoCardProps {
  repuesto: Repuesto;
  index?: number;
}

const tiendaColors: Record<Tienda, string> = {
  [Tienda.MercadoLibre]: 'bg-yellow-100 text-yellow-800',
  [Tienda.Yapo]: 'bg-blue-100 text-blue-800',
  [Tienda.AutoPartners]: 'bg-green-100 text-green-800',
  [Tienda.Otros]: 'bg-gray-100 text-gray-800',
};

const formatPrecioCL = (precio: number): string => {
  return `$${precio.toLocaleString('es-CL')}`;
};

export const RepuestoCard: React.FC<RepuestoCardProps> = ({ repuesto, index = 0 }) => {
  const handleVerEnTienda = () => {
    window.open(repuesto.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: 'easeOut'
      }}
      whileHover={{ y: -5 }}
    >
      <Card className="hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
        <div className="w-full aspect-square overflow-hidden rounded-lg mb-4 bg-white border border-gray-100 p-4 flex items-center justify-center">
          <motion.img
            src={repuesto.imagen}
            alt={repuesto.nombre}
            className="w-full h-full object-contain"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/300?text=Sin+Imagen';
            }}
          />
        </div>

        <motion.div 
          className="mb-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + index * 0.1 }}
        >
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
              tiendaColors[repuesto.tienda]
            }`}
          >
            {repuesto.tienda}
          </span>
        </motion.div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {repuesto.nombre}
        </h3>

        <motion.p 
          className="text-2xl font-bold text-blue-600 mb-3"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 + index * 0.1 }}
        >
          {formatPrecioCL(repuesto.precio)}
        </motion.p>

        <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">
          {repuesto.descripcion}
        </p>

        <div className="text-xs text-gray-500 mb-4">
          <p>
            <span className="font-semibold">Marca:</span> {repuesto.marca}
          </p>
          <p>
            <span className="font-semibold">Modelo:</span> {repuesto.modelo}
          </p>
        </div>

        <motion.button
          onClick={handleVerEnTienda}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label={`Ver ${repuesto.nombre} en ${repuesto.tienda}`}
        >
          Ver en tienda
        </motion.button>
      </Card>
    </motion.div>
  );
};