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
  in: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  out: 'bg-rose-100 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20',
  correction: 'bg-slate-200 text-slate-700 ring-slate-500/20 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-500/20',
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
          className="input w-full flex-1 sm:w-auto"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | MovementType)}
          className="input sm:w-auto"
        >
          <option value="all">Alle mutaties</option>
          <option value="in">Alleen inboekingen</option>
          <option value="out">Alleen uitboekingen</option>
          <option value="correction">Alleen correcties</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Geen mutaties gevonden{query ? ` voor "${query}"` : ''}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Datum/tijd</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikelnr.</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Omschrijving</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bedrijf</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Magazijn</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Batch</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Aantal</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Door</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {filtered.map((m) => {
                const product = productById.get(m.productId);
                return (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDateTime(m.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${TYPE_STYLES[m.type]}`}>
                        {TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{product?.articleNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{product?.description ?? '—'}</td>
                    <td className="px-3 py-2">
                      {product && <CompanyBadge companyId={product.companyId} name={companyById.get(product.companyId)?.name ?? '—'} />}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{warehouseById.get(m.warehouseId)?.name ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{m.batchNumber}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${m.type === 'out' ? 'text-rose-700 dark:text-rose-400' : m.type === 'in' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {m.type === 'out' ? '−' : m.type === 'in' ? '+' : ''}
                      {m.quantity}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{m.createdByEmail ?? '—'}</td>
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
