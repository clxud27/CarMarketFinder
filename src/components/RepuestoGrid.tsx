import React from 'react';
import { motion } from 'framer-motion';
import type { Repuesto } from '../types';
import { RepuestoCard } from './RepuestoCard';

interface RepuestoGridProps {
  repuestos: Repuesto[];
  isLoading: boolean;
}

const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="w-full aspect-square bg-gray-200 rounded-lg mb-4" />
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
    <div className="h-6 bg-gray-200 rounded w-full mb-2" />
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-3" />
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
    </div>
    <div className="h-10 bg-gray-200 rounded w-full" />
  </div>
);

const Loading: React.FC = () => (
  <>
    {[...Array(6)].map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </>
);

const EmptyState: React.FC = () => (
  <motion.div 
    className="col-span-full flex flex-col items-center justify-center py-16"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
  >
    <motion.svg
      className="w-24 h-24 text-gray-400 mb-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      initial={{ rotate: -10 }}
      animate={{ rotate: 0 }}
      transition={{ duration: 0.5 }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </motion.svg>
    <p className="text-xl text-gray-600 font-medium mb-2">
      No se encontraron repuestos
    </p>
    <p className="text-gray-500">
      Intenta con otros términos de búsqueda
    </p>
  </motion.div>
);

export const RepuestoGrid: React.FC<RepuestoGridProps> = React.memo(({
  repuestos,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Loading />
      </div>
    );
  }

  if (repuestos.length === 0) {
    return (
      <div className="grid grid-cols-1">
        <EmptyState />
      </div>
    );
  }

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {repuestos.map((repuesto, index) => (
        <RepuestoCard key={repuesto.id} repuesto={repuesto} index={index} />
      ))}
    </motion.div>
  );
});

RepuestoGrid.displayName = 'RepuestoGrid';