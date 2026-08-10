import { useMemo, useState, type FormEvent } from 'react';
import type { Company, Product, StockEntry, Warehouse } from '../types';
import { Field } from './Field';
import { ProductPicker } from './ProductPicker';

interface Props {
  products: Product[];
  stock: StockEntry[];
  companies: Company[];
  warehouses: Warehouse[];
  onRemoveStock: (entryId: string, quantity: number) => void;
}

export function StockOutForm({ products, stock, companies, warehouses, onRemoveStock }: Props) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [boxes, setBoxes] = useState('');
  const [looseUnits, setLooseUnits] = useState('');
  const [message, setMessage] = useState<string | null>(null);

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
  const looseNum = Number(looseUnits) || 0;
  const totalQuantity = boxesNum * unitsPerBox + looseNum;

  function resetFields() {
    setBoxes('');
    setLooseUnits('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!selectedEntry) {
      setMessage('Selecteer eerst een artikel en een magazijn/batch-regel.');
      return;
    }
    if (totalQuantity <= 0) {
      setMessage('Vul een aantal dozen en/of losse stuks in.');
      return;
    }
    if (totalQuantity > selectedEntry.quantity) {
      setMessage(`Er liggen maar ${selectedEntry.quantity} stuks in deze batch, je kunt niet meer uitboeken.`);
      return;
    }

    onRemoveStock(selectedEntry.id, totalQuantity);
    const warehouseName = warehouses.find((w) => w.id === selectedEntry.warehouseId)?.name ?? '';
    setMessage(`${totalQuantity} stuks van ${selectedProduct?.articleNumber} (batch ${selectedEntry.batchNumber}) uitgeboekt uit ${warehouseName}.`);
    resetFields();
    setSelectedEntryId('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
          <p className="text-xs font-medium text-slate-500">Kies de batch om uit te boeken</p>
          {availableEntries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
              Geen voorraad geregistreerd voor dit artikel.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {availableEntries.map((entry) => {
                const warehouseName = warehouses.find((w) => w.id === entry.warehouseId)?.name ?? '';
                const isSelected = selectedEntryId === entry.id;
                return (
                  <button
                    type="button"
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 ${isSelected ? 'bg-slate-100' : ''}`}
                  >
                    <span>
                      <span className="font-medium text-slate-900">{warehouseName}</span>
                      <span className="ml-2 font-mono text-xs text-slate-500">{entry.batchNumber}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">{entry.quantity} st.</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedEntry && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Uitboeken</h3>
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
            <Field label="Losse stuks">
              <input
                type="number"
                min={0}
                value={looseUnits}
                onChange={(e) => setLooseUnits(e.target.value)}
                className="input"
                placeholder="0"
              />
            </Field>
            <Field label="Stuks per doos (indicatie)">
              <input value={unitsPerBox || ''} disabled className="input bg-slate-100 text-slate-500" />
            </Field>
            <Field label="Totaal uit te boeken">
              <input value={totalQuantity} disabled className="input bg-slate-100 font-semibold text-slate-900" />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Nog beschikbaar in deze batch: <span className="font-medium text-slate-700">{selectedEntry.quantity} stuks</span>
          </p>
        </div>
      )}

      {message && (
        <p className={`rounded-md px-3 py-2 text-sm ${message.startsWith('Selecteer') || message.startsWith('Vul') || message.startsWith('Er liggen') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={!selectedEntry}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Voorraad uitboeken
      </button>
    </form>
  );
}
