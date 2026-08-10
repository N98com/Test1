import { useState, type FormEvent } from 'react';
import type { Product, Warehouse } from '../types';
import { Field } from './Field';
import { MONTHS, currentMonthAbbrev, currentYearShort, formatBatch } from '../lib/batch';

interface Row {
  key: string;
  productId: string;
  boxes: string;
  looseUnits: string;
}

interface Props {
  products: Product[];
  warehouses: Warehouse[];
  onAddStock: (productId: string, warehouseId: string, batchNumber: string, quantity: number) => void;
}

function newRow(): Row {
  return { key: Math.random().toString(36).slice(2), productId: '', boxes: '', looseUnits: '' };
}

export function BulkIntakeForm({ products, warehouses, onAddStock }: Props) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [month, setMonth] = useState(currentMonthAbbrev());
  const [year, setYear] = useState(currentYearShort());
  const [rows, setRows] = useState<Row[]>([newRow(), newRow()]);
  const [message, setMessage] = useState<string | null>(null);

  const batchNumber = formatBatch(month, year);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function quantityFor(row: Row): number {
    const product = products.find((p) => p.id === row.productId);
    const unitsPerBox = product?.unitsPerBox ?? 0;
    return (Number(row.boxes) || 0) * unitsPerBox + (Number(row.looseUnits) || 0);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!warehouseId) {
      setMessage('Kies een magazijn.');
      return;
    }

    const validRows = rows.filter((r) => r.productId && quantityFor(r) > 0);
    if (validRows.length === 0) {
      setMessage('Vul minstens één regel met artikel en aantal in.');
      return;
    }

    for (const row of validRows) {
      onAddStock(row.productId, warehouseId, batchNumber, quantityFor(row));
    }

    setMessage(`${validRows.length} regel(s) ingeboekt in ${warehouses.find((w) => w.id === warehouseId)?.name} (batch ${batchNumber}).`);
    setRows([newRow(), newRow()]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Voor alle regels</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Magazijn">
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input" required>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Batch (maand)">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="input">
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Batch (jaar)">
            <input
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="input"
              placeholder="26"
              maxLength={2}
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Batchnummer: <span className="font-mono">{batchNumber}</span></p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Artikelen</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[600px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikel</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Volle dozen</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Losse stuks</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Totaal</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-2">
                    <select
                      value={row.productId}
                      onChange={(e) => updateRow(row.key, { productId: e.target.value })}
                      className="input"
                    >
                      <option value="">Kies artikel...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.articleNumber} — {p.description}</option>
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
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{quantityFor(row)}</td>
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
              ))}
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

      {message && (
        <p className={`rounded-md px-3 py-2 text-sm ${message.startsWith('Vul') || message.startsWith('Kies') ? 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'}`}>
          {message}
        </p>
      )}

      <button type="submit" className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
        Bulk inboeken
      </button>
    </form>
  );
}
