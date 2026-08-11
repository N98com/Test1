import { useMemo, useState, type FormEvent } from 'react';
import type { Company, Product, StockEntry, Warehouse } from '../types';
import { Field } from './Field';
import { ProductPicker } from './ProductPicker';

interface Props {
  products: Product[];
  stock: StockEntry[];
  companies: Company[];
  warehouses: Warehouse[];
  onRemoveStock: (entryId: string, quantity: number) => Promise<string | null>;
}

type Feedback = { text: string; type: 'error' | 'success' };

export function StockOutForm({ products, stock, companies, warehouses, onRemoveStock }: Props) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [boxes, setBoxes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const availableEntries = useMemo(
    () => stock.filter((s) => s.productId === selectedProductId && s.quantity > 0),
    [stock, selectedProductId],
  );

  const selectedEntry = useMemo(
    () => availableEntries.find((e) => e.id === selectedEntryId) ?? null,
    [availableEntries, selectedEntryId],
  );

  const unitsPerBox = selectedProduct?.unitsPerBox ?? 1;
  const boxesNum = Number(boxes) || 0;
  const totalQuantity = boxesNum * unitsPerBox;

  function resetFields() {
    setBoxes('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!selectedEntry) {
      setFeedback({ text: 'Selecteer eerst een artikel en een magazijn/batch-regel.', type: 'error' });
      return;
    }
    if (totalQuantity <= 0) {
      setFeedback({ text: 'Vul een aantal aangebroken dozen in.', type: 'error' });
      return;
    }
    if (totalQuantity > selectedEntry.quantity) {
      setFeedback({ text: `Er liggen maar ${selectedEntry.quantity} stuks in deze batch, je kunt niet meer uitboeken.`, type: 'error' });
      return;
    }

    setSubmitting(true);
    const error = await onRemoveStock(selectedEntry.id, totalQuantity);
    setSubmitting(false);

    if (error) {
      setFeedback({ text: error, type: 'error' });
      return;
    }

    const warehouseName = warehouses.find((w) => w.id === selectedEntry.warehouseId)?.name ?? '';
    setFeedback({
      text: `${totalQuantity} stuks van ${selectedProduct?.articleNumber} (batch ${selectedEntry.batchNumber}) uitgeboekt uit ${warehouseName}.`,
      type: 'success',
    });
    resetFields();
    setSelectedEntryId('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
        Gebruik dit als een volle doos wordt aangebroken en ingepakt. Dit systeem houdt alleen volle
        dozen bij — de uitgeboekte stuks verdwijnen uit de voorraad en hoeven verder niet bijgehouden
        te worden.
      </p>

      <ProductPicker
        products={products}
        companies={companies}
        selectedProductId={selectedProductId}
        onSelect={(id) => {
          setSelectedProductId(id);
          setSelectedEntryId('');
        }}
      />

      {selectedProduct && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Kies de batch om uit te boeken</p>
          {availableEntries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Geen voorraad geregistreerd voor dit artikel.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              {availableEntries.map((entry) => {
                const warehouseName = warehouses.find((w) => w.id === entry.warehouseId)?.name ?? '';
                const isSelected = selectedEntryId === entry.id;
                return (
                  <button
                    type="button"
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${isSelected ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                  >
                    <span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{warehouseName}</span>
                      <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400">{entry.batchNumber}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{entry.quantity} st.</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedEntry && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Uitboeken</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Aantal aangebroken dozen">
              <input
                type="number"
                min={0}
                value={boxes}
                onChange={(e) => setBoxes(e.target.value)}
                className="input"
                placeholder="0"
              />
            </Field>
            <Field label="Stuks per doos (indicatie)">
              <input value={unitsPerBox || ''} disabled className="input" />
            </Field>
            <Field label="Totaal uit te boeken">
              <input value={totalQuantity} disabled className="input font-semibold text-slate-900! dark:text-slate-100!" />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Nog beschikbaar in deze batch: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedEntry.quantity} stuks</span>
          </p>
        </div>
      )}

      {feedback && (
        <p className={`rounded-md px-3 py-2 text-sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'}`}>
          {feedback.text}
        </p>
      )}

      <button
        type="submit"
        disabled={!selectedEntry || submitting}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        {submitting ? 'Bezig...' : 'Voorraad uitboeken'}
      </button>
    </form>
  );
}
