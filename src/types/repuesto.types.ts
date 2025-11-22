export const Categoria = {
  Motor: 'Motor',
  Frenos: 'Frenos',
  Suspension: 'Suspension',
  Electrico: 'Electrico',
  Carroceria: 'Carroceria',
  Transmision: 'Transmision',
  Interior: 'Interior',
  Otros: 'Otros',
} as const;

export type Categoria = typeof Categoria[keyof typeof Categoria];

export const Tienda = {
  MercadoLibre: 'MercadoLibre',
  Yapo: 'Yapo',
  AutoPartners: 'AutoPartners',
  Otros: 'Otros',
} as const;

export type Tienda = typeof Tienda[keyof typeof Tienda];

export interface Repuesto {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
  imagen: string;
  url: string;
  tienda: Tienda;
  marca: string;
  modelo: string;
  categoria: Categoria;
  fechaScraped: Date;
}

export interface BusquedaRepuesto {
  pieza: string;
  modeloAuto?: string;
  categoria?: Categoria;
}