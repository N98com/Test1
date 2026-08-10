import type { Company, Warehouse } from '../types';

export const COMPANIES: Company[] = [
  { id: 'ledinbouwspotsleds', name: 'Ledinbouwspotsleds' },
  { id: 'ecobright', name: 'Ecobright' },
];

export const WAREHOUSES: Warehouse[] = [
  {
    id: 'magazijn-1',
    number: 1,
    name: 'Magazijn 1',
    description: 'Werkplek, klein gedeelte opslag Ledinbouwspotsleds',
  },
  {
    id: 'magazijn-2',
    number: 2,
    name: 'Magazijn 2',
    description: 'Werkplek, klein gedeelte opslag Ecobright',
  },
  {
    id: 'magazijn-3',
    number: 3,
    name: 'Magazijn 3',
    description: 'Gemengde opslaglocatie Ledinbouwspots & Ecobright',
  },
  {
    id: 'magazijn-4',
    number: 4,
    name: 'Magazijn 4',
    description: 'Gemengde opslaglocatie Ledinbouwspots & Ecobright',
  },
];
