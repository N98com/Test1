import type { Company, Warehouse } from '../types';

export const COMPANIES: Company[] = [
  { id: 'lisl', name: 'LISL' },
  { id: 'eb', name: 'EB' },
];

export const WAREHOUSES: Warehouse[] = [
  {
    id: 'magazijn-1',
    number: 1,
    name: 'Magazijn 1',
    description: 'Werkplek, klein gedeelte opslag LISL',
  },
  {
    id: 'magazijn-2',
    number: 2,
    name: 'Magazijn 2',
    description: 'Werkplek, klein gedeelte opslag EB',
  },
  {
    id: 'magazijn-3',
    number: 3,
    name: 'Magazijn 3',
    description: 'Gemengde opslaglocatie LISL & EB',
  },
  {
    id: 'magazijn-4',
    number: 4,
    name: 'Magazijn 4',
    description: 'Gemengde opslaglocatie LISL & EB',
  },
];
