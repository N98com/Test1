import { useMemo, useState } from 'react';
import type { Company, Product, StockEntry, Warehouse } from '../types';
import { CompanyBadge } from './CompanyBadge';

interface Props {
  products: Product[];
  stock: StockEntry[];
  companies: Company[];
  warehouses: Warehouse[];
  onDeleteStock: (id: string) => void;
}

export function WarehouseView({ products, stock, companies, warehouses, onDeleteStock }: Props) {
  const [activeId, setActiveId] = useState(warehouses[0]?.id ?? '');
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

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
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeId === w.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {w.name}
          </button>
        ))}
      </div>

      {activeWarehouse && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">{activeWarehouse.name}</p>
          <p className="text-xs text-slate-500">{activeWarehouse.description}</p>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Geen voorraad geregistreerd in dit magazijn.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Artikelnr.</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Omschrijving</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Bedrijf</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Batch</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Aantal</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {entries.map(({ entry, product }) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">{product!.articleNumber}</td>
                  <td className="px-3 py-2 text-slate-700">{product!.description}</td>
                  <td className="px-3 py-2">
                    <CompanyBadge companyId={product!.companyId} name={companyById.get(product!.companyId)?.name ?? '—'} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{entry.batchNumber}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{entry.quantity}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onDeleteStock(entry.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                      title="Verwijder deze batchregel"
                    >
                      Verwijder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Totaal in {activeWarehouse?.name}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-900">{total}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
