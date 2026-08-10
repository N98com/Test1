import { Fragment, useMemo, useState } from 'react';
import type { Product, StockEntry, Company, Warehouse } from '../types';
import { CompanyBadge } from './CompanyBadge';

interface Props {
  products: Product[];
  stock: StockEntry[];
  companies: Company[];
  warehouses: Warehouse[];
}

export function SearchView({ products, stock, companies, warehouses }: Props) {
  const [query, setQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => companyFilter === 'all' || p.companyId === companyFilter)
      .filter((p) => {
        if (!q) return true;
        return p.articleNumber.toLowerCase().includes(q) || p.ean.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      })
      .sort((a, b) => a.articleNumber.localeCompare(b.articleNumber));
  }, [products, query, companyFilter]);

  function stockForProduct(productId: string) {
    return stock.filter((s) => s.productId === productId);
  }

  function warehouseTotal(productId: string, warehouseId: string) {
    return stock
      .filter((s) => s.productId === productId && s.warehouseId === warehouseId)
      .reduce((sum, s) => sum + s.quantity, 0);
  }

  function grandTotal(productId: string) {
    return stockForProduct(productId).reduce((sum, s) => sum + s.quantity, 0);
  }

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
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="input sm:w-auto"
        >
          <option value="all">Alle bedrijven</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Geen artikelen gevonden{query ? ` voor "${query}"` : ''}.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikelnr.</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Omschrijving</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">EAN</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bedrijf</th>
              {warehouses.map((w) => (
                <th key={w.id} className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">M{w.number}</th>
              ))}
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Totaal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {filtered.map((p) => {
              const isOpen = expanded === p.id;
              const entries = stockForProduct(p.id);
              return (
                <Fragment key={p.id}>
                  <tr
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                  >
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{p.articleNumber}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{p.description}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{p.ean}</td>
                    <td className="px-3 py-2">
                      <CompanyBadge companyId={p.companyId} name={companyById.get(p.companyId)?.name ?? '—'} />
                    </td>
                    {warehouses.map((w) => {
                      const qty = warehouseTotal(p.id, w.id);
                      return (
                        <td key={w.id} className={`px-3 py-2 text-right tabular-nums ${qty > 0 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-300 dark:text-slate-700'}`}>
                          {qty}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">{grandTotal(p.id)}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${p.id}-detail`} className="bg-slate-50 dark:bg-slate-800/60">
                      <td colSpan={5 + warehouses.length} className="px-3 py-3">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {warehouses.map((w) => {
                            const batches = entries.filter((e) => e.warehouseId === w.id);
                            return (
                              <div key={w.id} className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                                <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{w.name}</p>
                                {batches.length === 0 ? (
                                  <p className="text-xs text-slate-300 dark:text-slate-600">Geen voorraad</p>
                                ) : (
                                  <ul className="space-y-0.5">
                                    {batches.map((b) => (
                                      <li key={b.id} className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                                        <span className="font-mono">{b.batchNumber}</span>
                                        <span className="tabular-nums">{b.quantity} st.</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          Doosinhoud: <span className="font-medium text-slate-700 dark:text-slate-300">{p.unitsPerBox} stuks/doos</span>
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
