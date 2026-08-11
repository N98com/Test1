import { useMemo, useState } from 'react';
import type { Company, Product, StockEntry, Warehouse } from '../types';
import { CompanyBadge } from './CompanyBadge';

interface Props {
  products: Product[];
  stock: StockEntry[];
  companies: Company[];
  warehouses: Warehouse[];
  onDeleteStock: (id: string) => Promise<string | null>;
}

export function WarehouseView({ products, stock, companies, warehouses, onDeleteStock }: Props) {
  const [activeId, setActiveId] = useState(warehouses[0]?.id ?? '');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  async function handleDelete(id: string) {
    setError(null);
    setDeletingId(id);
    const err = await onDeleteStock(id);
    setDeletingId(null);
    if (err) setError(err);
  }

  const activeWarehouse = warehouses.find((w) => w.id === activeId);
  const entries = stock
    .filter((s) => s.warehouseId === activeId)
    .map((s) => ({ entry: s, product: productById.get(s.productId) }))
    .filter((row) => row.product)
    .sort((a, b) => a.product!.articleNumber.localeCompare(b.product!.articleNumber));

  const total = entries.reduce((sum, row) => sum + row.entry.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {warehouses.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveId(w.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeId === w.id
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {w.name}
          </button>
        ))}
      </div>

      {activeWarehouse && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{activeWarehouse.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{activeWarehouse.description}</p>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}</p>
      )}

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Geen voorraad geregistreerd in dit magazijn.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikelnr.</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Omschrijving</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bedrijf</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Batch</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Aantal</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {entries.map(({ entry, product }) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{product!.articleNumber}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{product!.description}</td>
                  <td className="px-3 py-2">
                    <CompanyBadge companyId={product!.companyId} name={companyById.get(product!.companyId)?.name ?? '—'} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{entry.batchNumber}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{entry.quantity}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="text-xs font-medium text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                      title="Verwijder deze batchregel"
                    >
                      {deletingId === entry.id ? '...' : 'Verwijder'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Totaal in {activeWarehouse?.name}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">{total}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
