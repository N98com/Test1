import { useMemo, useState } from 'react';
import type { Company, Product } from '../types';
import { CompanyBadge } from './CompanyBadge';
import { BarcodePreview, type BarcodeItem } from './BarcodePreview';

interface Props {
  products: Product[];
  companies: Company[];
}

export function Barcodes({ products, companies }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [previewItems, setPreviewItems] = useState<BarcodeItem[] | null>(null);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...products]
      .filter((p) => {
        if (!q) return true;
        return p.articleNumber.toLowerCase().includes(q) || p.ean.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      })
      .sort((a, b) => a.articleNumber.localeCompare(b.articleNumber));
  }, [products, query]);

  const selectedCount = Object.keys(selected).length;
  const totalBarcodes = Object.values(selected).reduce((sum, n) => sum + n, 0);

  function toggle(product: Product) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[product.id] !== undefined) {
        delete next[product.id];
      } else {
        next[product.id] = 1;
      }
      return next;
    });
  }

  function setCopies(productId: string, copies: number) {
    setSelected((prev) => ({ ...prev, [productId]: Math.max(1, copies) }));
  }

  function handleGenerate() {
    const items: BarcodeItem[] = [];
    for (const product of products) {
      const copies = selected[product.id];
      if (!copies) continue;
      for (let i = 0; i < copies; i += 1) {
        items.push({ key: `${product.id}-${i}`, product });
      }
    }
    setPreviewItems(items);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Selecteer artikelen (alfabetisch gesorteerd) en genereer werkende barcodes op basis van de EAN-code, voor de
        Zebra-labelprinter (150 × 100&nbsp;mm).
      </p>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {selectedCount} artikel{selectedCount === 1 ? '' : 'en'} geselecteerd · {totalBarcodes} barcode{totalBarcodes === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={totalBarcodes === 0}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Barcodes genereren
        </button>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Zoek op artikelnummer, EAN of omschrijving..."
        className="input"
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikelnr.</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Omschrijving</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">EAN</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bedrijf</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Aantal barcodes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {sorted.map((product) => {
              const isSelected = selected[product.id] !== undefined;
              return (
                <tr
                  key={product.id}
                  className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${isSelected ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
                  onClick={() => toggle(product)}
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(product)} className="h-4 w-4" />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{product.articleNumber}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{product.description}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{product.ean}</td>
                  <td className="px-3 py-2">
                    <CompanyBadge companyId={product.companyId} name={companies.find((c) => c.id === product.companyId)?.name ?? '—'} />
                  </td>
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min={1}
                      value={selected[product.id] ?? ''}
                      disabled={!isSelected}
                      onChange={(e) => setCopies(product.id, Number(e.target.value) || 1)}
                      className="input w-20 text-right disabled:opacity-40"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Geen artikelen gevonden.
        </p>
      )}

      {previewItems && <BarcodePreview items={previewItems} onClose={() => setPreviewItems(null)} />}
    </div>
  );
}
