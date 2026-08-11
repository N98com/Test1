import { useMemo, useState, type FormEvent } from 'react';
import type { Company, Product, Warehouse } from '../types';
import { MONTHS, currentMonthAbbrev, currentYearShort, formatBatch } from '../lib/batch';
import { Field } from './Field';
import { ProductPicker } from './ProductPicker';

interface Props {
  products: Product[];
  companies: Company[];
  warehouses: Warehouse[];
  canCreateProduct: boolean;
  onAddProduct: (input: Omit<Product, 'id' | 'createdAt'>) => Promise<{ product: Product | null; error: string | null }>;
  onAddStock: (productId: string, warehouseId: string, batchNumber: string, quantity: number) => Promise<string | null>;
}

type Feedback = { text: string; type: 'error' | 'success' };

export function StockForm({ products, companies, warehouses, canCreateProduct, onAddProduct, onAddStock }: Props) {
  const [mode, setMode] = useState<'new' | 'existing'>(canCreateProduct ? 'new' : 'existing');

  const [articleNumber, setArticleNumber] = useState('');
  const [description, setDescription] = useState('');
  const [ean, setEan] = useState('');
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? '');
  const [unitsPerBox, setUnitsPerBox] = useState('1');

  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [month, setMonth] = useState<string>(currentMonthAbbrev());
  const [year, setYear] = useState<string>(currentYearShort());
  const [boxes, setBoxes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const effectiveMode = canCreateProduct ? mode : 'existing';

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const effectiveUnitsPerBox = effectiveMode === 'existing' ? (selectedProduct?.unitsPerBox ?? 1) : Number(unitsPerBox) || 0;
  const boxesNum = Number(boxes) || 0;
  const totalQuantity = boxesNum * effectiveUnitsPerBox;
  const batchNumber = formatBatch(month, year);

  function resetStockFields() {
    setBoxes('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!warehouseId) {
      setFeedback({ text: 'Kies een magazijn.', type: 'error' });
      return;
    }
    if (totalQuantity <= 0) {
      setFeedback({ text: 'Vul een aantal volle dozen in.', type: 'error' });
      return;
    }

    let productId = selectedProductId;
    let label = '';

    setSubmitting(true);

    if (effectiveMode === 'new') {
      if (!articleNumber.trim() || !description.trim() || !ean.trim() || !companyId) {
        setFeedback({ text: 'Vul artikelnummer, omschrijving, EAN en bedrijf in.', type: 'error' });
        setSubmitting(false);
        return;
      }
      const { product, error } = await onAddProduct({
        articleNumber: articleNumber.trim(),
        description: description.trim(),
        ean: ean.trim(),
        companyId,
        unitsPerBox: Number(unitsPerBox) || 1,
      });
      if (error || !product) {
        setFeedback({ text: error ?? 'Aanmaken van artikel is mislukt.', type: 'error' });
        setSubmitting(false);
        return;
      }
      productId = product.id;
      label = product.articleNumber;

      setArticleNumber('');
      setDescription('');
      setEan('');
      setUnitsPerBox('1');
    } else {
      if (!selectedProduct) {
        setFeedback({ text: 'Selecteer een bestaand artikel.', type: 'error' });
        setSubmitting(false);
        return;
      }
      label = selectedProduct.articleNumber;
    }

    const stockError = await onAddStock(productId, warehouseId, batchNumber, totalQuantity);
    setSubmitting(false);

    if (stockError) {
      setFeedback({ text: stockError, type: 'error' });
      return;
    }

    resetStockFields();
    setFeedback({
      text: `${totalQuantity} stuks van ${label} (batch ${batchNumber}) toegevoegd aan ${warehouses.find((w) => w.id === warehouseId)?.name}.`,
      type: 'success',
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {canCreateProduct && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === 'new' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            Nieuw artikel
          </button>
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === 'existing' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            Bestaand artikel (nieuwe batch)
          </button>
        </div>
      )}

      {effectiveMode === 'new' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Artikelnummer">
            <input
              value={articleNumber}
              onChange={(e) => setArticleNumber(e.target.value)}
              className="input"
              placeholder="bv. LED-SP-2700-01"
              required
            />
          </Field>
          <Field label="EAN-code">
            <input
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              className="input"
              placeholder="bv. 8710000000000"
              required
            />
          </Field>
          <Field label="Korte omschrijving" full>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="bv. Inbouwspot rond wit 2700K"
              required
            />
          </Field>
          <Field label="Bedrijf">
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="input" required>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Aantal per volle doos">
            <input
              type="number"
              min={1}
              value={unitsPerBox}
              onChange={(e) => setUnitsPerBox(e.target.value)}
              className="input"
              required
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <ProductPicker
            products={products}
            companies={companies}
            selectedProductId={selectedProductId}
            onSelect={setSelectedProductId}
          />
          {selectedProduct && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Geselecteerd: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedProduct.articleNumber}</span> · {selectedProduct.unitsPerBox} stuks/doos
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Inboeken</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <Field label="Batchnummer">
            <input value={batchNumber} disabled className="input" />
          </Field>
          <Field label="Aantal volle dozen">
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
            <input value={effectiveUnitsPerBox || ''} disabled className="input" />
          </Field>
          <Field label="Totaal aantal stuks">
            <input value={totalQuantity} disabled className="input font-semibold text-slate-900! dark:text-slate-100!" />
          </Field>
        </div>
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
        {submitting ? 'Bezig...' : 'Voorraad inboeken'}
      </button>
    </form>
  );
}
