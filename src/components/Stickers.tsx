import { useMemo, useState } from 'react';
import type { Company, Product, StickerPrint, StickerPrintItem } from '../types';
import { Field } from './Field';
import { CompanyBadge } from './CompanyBadge';
import { MONTHS, currentMonthAbbrev, currentYearShort, formatBatch } from '../lib/batch';
import { StickerPreview, type StickerItem } from './StickerPreview';
import { StickerHistoryView } from './StickerHistoryView';
import type { RecordPrintInput } from '../useStickerPrints';
import { openPrintWindow } from '../lib/printWindow';

interface Props {
  products: Product[];
  companies: Company[];
  isAdmin: boolean;
  onRecordPrint: (input: RecordPrintInput) => Promise<string | null>;
  prints: StickerPrint[];
  printsLoading: boolean;
}

export function Stickers({ products, companies, isAdmin, onRecordPrint, prints, printsLoading }: Props) {
  const [view, setView] = useState<'generate' | 'history'>('generate');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [month, setMonth] = useState(currentMonthAbbrev());
  const [year, setYear] = useState(currentYearShort());
  const [includeBarcode, setIncludeBarcode] = useState(false);
  const [previewItems, setPreviewItems] = useState<StickerItem[] | null>(null);
  const [previewWindow, setPreviewWindow] = useState<Window | null>(null);
  const [printLogItems, setPrintLogItems] = useState<StickerPrintItem[]>([]);
  const [printError, setPrintError] = useState<string | null>(null);

  const batchNumber = formatBatch(month, year);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...products]
      .filter((p) => {
        if (!q) return true;
        return p.articleNumber.toLowerCase().includes(q) || p.ean.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [products, query]);

  const selectedCount = Object.keys(selected).length;
  const totalStickers = Object.values(selected).reduce((sum, n) => sum + n, 0);

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
    // Moet synchroon in de click-handler gebeuren, anders blokkeren pop-upblokkers dit.
    const popup = openPrintWindow('Stickers');
    if (!popup) {
      setPrintError('Kon geen nieuw tabblad openen. Sta pop-ups toe voor deze site en probeer opnieuw.');
      return;
    }

    const items: StickerItem[] = [];
    const logItems: StickerPrintItem[] = [];
    for (const product of products) {
      const copies = selected[product.id];
      if (!copies) continue;
      for (let i = 0; i < copies; i += 1) {
        items.push({ key: `${product.id}-${i}`, product });
      }
      logItems.push({
        articleNumber: product.articleNumber,
        description: product.description,
        ean: product.ean,
        companyId: product.companyId,
        unitsPerBox: product.unitsPerBox,
        copies,
      });
    }
    setPreviewItems(items);
    setPreviewWindow(popup);
    setPrintLogItems(logItems);
    setPrintError(null);
  }

  async function handlePrint() {
    const error = await onRecordPrint({ batchNumber, includeBarcode, items: printLogItems });
    if (error) setPrintError(`Printen is gelukt, maar het loggen in Historie is mislukt: ${error}`);
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="inline-flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setView('generate')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === 'generate'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            Genereren
          </button>
          <button
            type="button"
            onClick={() => setView('history')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === 'history'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            Historie
          </button>
        </div>
      )}

      {view === 'history' ? (
        <StickerHistoryView prints={prints} loading={printsLoading} onRecordPrint={onRecordPrint} />
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selecteer artikelen (nieuwste bovenaan) en genereer stickers voor de Zebra-labelprinter
            (150 × 100&nbsp;mm).
          </p>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {selectedCount} artikel{selectedCount === 1 ? '' : 'en'} geselecteerd · {totalStickers} sticker{totalStickers === 1 ? '' : 's'}
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={totalStickers === 0}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              Stickers genereren
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Batch voor deze print</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Maand">
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="input">
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Jaar">
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="input"
                  placeholder="26"
                  maxLength={2}
                />
              </Field>
              <Field label="Batchnummer">
                <input value={batchNumber} disabled className="input" />
              </Field>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeBarcode}
                onChange={(e) => setIncludeBarcode(e.target.checked)}
                className="h-4 w-4"
              />
              Barcode toevoegen op de sticker (naast de batch)
            </label>
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
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bedrijf</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Stuks/doos</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Aantal stickers</th>
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
                      <td className="px-3 py-2">
                        <CompanyBadge companyId={product.companyId} name={companies.find((c) => c.id === product.companyId)?.name ?? '—'} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{product.unitsPerBox}</td>
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

          {printError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{printError}</p>
          )}

          {previewItems && previewWindow && (
            <StickerPreview
              items={previewItems}
              batchNumber={batchNumber}
              includeBarcode={includeBarcode}
              popup={previewWindow}
              onClose={() => {
                setPreviewItems(null);
                setPreviewWindow(null);
              }}
              onPrint={handlePrint}
            />
          )}
        </>
      )}
    </div>
  );
}
