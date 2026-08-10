import { useMemo, useState } from 'react';
import type { Company, Movement, MovementType, Product, Warehouse } from '../types';
import { CompanyBadge } from './CompanyBadge';

interface Props {
  movements: Movement[];
  products: Product[];
  companies: Company[];
  warehouses: Warehouse[];
}

const TYPE_LABELS: Record<MovementType, string> = {
  in: 'In',
  out: 'Uit',
  correction: 'Correctie',
};

const TYPE_STYLES: Record<MovementType, string> = {
  in: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  out: 'bg-rose-100 text-rose-800 ring-rose-600/20',
  correction: 'bg-slate-200 text-slate-700 ring-slate-500/20',
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryView({ movements, products, companies, warehouses }: Props) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const warehouseById = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movements.filter((m) => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (!q) return true;
      const product = productById.get(m.productId);
      if (!product) return false;
      return (
        product.articleNumber.toLowerCase().includes(q) ||
        product.ean.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q)
      );
    });
  }, [movements, query, typeFilter, productById]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op artikelnummer, EAN of omschrijving..."
          className="w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | MovementType)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="all">Alle mutaties</option>
          <option value="in">Alleen inboekingen</option>
          <option value="out">Alleen uitboekingen</option>
          <option value="correction">Alleen correcties</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Geen mutaties gevonden{query ? ` voor "${query}"` : ''}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Datum/tijd</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Artikelnr.</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Omschrijving</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Bedrijf</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Magazijn</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Batch</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Aantal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((m) => {
                const product = productById.get(m.productId);
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatDateTime(m.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${TYPE_STYLES[m.type]}`}>
                        {TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">{product?.articleNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{product?.description ?? '—'}</td>
                    <td className="px-3 py-2">
                      {product && <CompanyBadge companyId={product.companyId} name={companyById.get(product.companyId)?.name ?? '—'} />}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{warehouseById.get(m.warehouseId)?.name ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{m.batchNumber}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${m.type === 'out' ? 'text-rose-700' : m.type === 'in' ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {m.type === 'out' ? '−' : m.type === 'in' ? '+' : ''}
                      {m.quantity}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
