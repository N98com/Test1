import { useState, type FormEvent } from 'react';
import type { Product, StockEntry, Warehouse } from '../types';

interface Row {
  key: string;
  productId: string;
  entryId: string;
  boxes: string;
  looseUnits: string;
}

interface Props {
  products: Product[];
  stock: StockEntry[];
  warehouses: Warehouse[];
  onRemoveStock: (entryId: string, quantity: number) => Promise<string | null>;
}

type Feedback = { text: string; type: 'error' | 'success' };

function newRow(): Row {
  return { key: Math.random().toString(36).slice(2), productId: '', entryId: '', boxes: '', looseUnits: '' };
}

export function BulkOutakeForm({ products, stock, warehouses, onRemoveStock }: Props) {
  const [rows, setRows] = useState<Row[]>([newRow(), newRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function entriesFor(productId: string) {
    return stock.filter((s) => s.productId === productId && s.quantity > 0);
  }

  function quantityFor(row: Row): number {
    const product = products.find((p) => p.id === row.productId);
    const unitsPerBox = product?.unitsPerBox ?? 0;
    return (Number(row.boxes) || 0) * unitsPerBox + (Number(row.looseUnits) || 0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const activeRows = rows.filter((r) => r.productId && r.entryId && quantityFor(r) > 0);
    if (activeRows.length === 0) {
      setFeedback({ text: 'Vul minstens één regel met artikel, batch en aantal in.', type: 'error' });
      return;
    }

    for (const row of activeRows) {
      const entry = stock.find((s) => s.id === row.entryId);
      const requested = quantityFor(row);
      if (!entry) continue;
      if (requested > entry.quantity) {
        const product = products.find((p) => p.id === row.productId);
        setFeedback({
          text: `${product?.articleNumber ?? 'Een artikel'}: je probeert ${requested} stuks uit te boeken, maar er liggen maar ${entry.quantity}. Pas de regel aan en probeer opnieuw.`,
          type: 'error',
        });
        return;
      }
    }

    setSubmitting(true);
    for (const row of activeRows) {
      const error = await onRemoveStock(row.entryId, quantityFor(row));
      if (error) {
        setSubmitting(false);
        setFeedback({ text: error, type: 'error' });
        return;
      }
    }
    setSubmitting(false);

    setFeedback({ text: `${activeRows.length} regel(s) uitgeboekt.`, type: 'success' });
    setRows([newRow(), newRow()]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
        Gebruik dit voor meerdere artikelen tegelijk, bijvoorbeeld bij het inpakken van een order met
        meerdere aangebroken dozen.
      </p>

      <div className="space-y-2">
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[720px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikel</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Magazijn / batch</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Dozen</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Los</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Totaal</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {rows.map((row) => {
                const entries = entriesFor(row.productId);
                const selectedEntry = entries.find((e) => e.id === row.entryId);
                return (
                  <tr key={row.key}>
                    <td className="px-3 py-2">
                      <select
                        value={row.productId}
                        onChange={(e) => updateRow(row.key, { productId: e.target.value, entryId: '' })}
                        className="input"
                      >
                        <option value="">Kies artikel...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.articleNumber} — {p.description}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.entryId}
                        onChange={(e) => updateRow(row.key, { entryId: e.target.value })}
                        className="input"
                        disabled={!row.productId}
                      >
                        <option value="">Kies batch...</option>
                        {entries.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {warehouses.find((w) => w.id === entry.warehouseId)?.name} — {entry.batchNumber} ({entry.quantity} st.)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.boxes}
                        onChange={(e) => updateRow(row.key, { boxes: e.target.value })}
                        className="input text-right"
                        placeholder="0"
                        disabled={!row.entryId}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.looseUnits}
                        onChange={(e) => updateRow(row.key, { looseUnits: e.target.value })}
                        className="input text-right"
                        placeholder="0"
                        disabled={!row.entryId}
                      />
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${selectedEntry && quantityFor(row) > selectedEntry.quantity ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {quantityFor(row)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        disabled={rows.length <= 1}
                        className="text-xs font-medium text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Verwijder
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          + Regel toevoegen
        </button>
      </div>

      {feedback && (
        <p className={`rounded-md px-3 py-2 text-sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'}`}>
          {feedback.text}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        {submitting ? 'Bezig...' : 'Bulk uitboeken'}
      </button>
    </form>
  );
}
