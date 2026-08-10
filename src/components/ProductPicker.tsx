import { useMemo, useState } from 'react';
import type { Company, Product } from '../types';
import { CompanyBadge } from './CompanyBadge';

interface Props {
  products: Product[];
  companies: Company[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
}

export function ProductPicker({ products, companies, selectedProductId, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => p.articleNumber.toLowerCase().includes(q) || p.ean.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, query]);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Zoek artikel op artikelnummer, EAN of omschrijving</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSelect('');
          }}
          className="input"
          placeholder="Typ om te zoeken..."
        />
      </label>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
        {matching.length === 0 && <p className="p-3 text-sm text-slate-400">Geen artikelen gevonden.</p>}
        {matching.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 ${selectedProductId === p.id ? 'bg-slate-100' : ''}`}
          >
            <span className="flex flex-col">
              <span className="font-medium text-slate-900">{p.articleNumber} — {p.description}</span>
              <span className="font-mono text-xs text-slate-400">{p.ean}</span>
            </span>
            <CompanyBadge companyId={p.companyId} name={companies.find((c) => c.id === p.companyId)?.name ?? ''} />
          </button>
        ))}
      </div>
    </div>
  );
}
