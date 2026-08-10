import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { Company, Product, Warehouse } from '../types';
import { MONTHS, currentMonthAbbrev, currentYearShort, formatBatch } from '../lib/batch';
import { CompanyBadge } from './CompanyBadge';

interface Props {
  products: Product[];
  companies: Company[];
  warehouses: Warehouse[];
  onAddProduct: (input: Omit<Product, 'id' | 'createdAt'>) => Product;
  onAddStock: (productId: string, warehouseId: string, batchNumber: string, quantity: number) => void;
}

export function StockForm({ products, companies, warehouses, onAddProduct, onAddStock }: Props) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');

  const [articleNumber, setArticleNumber] = useState('');
  const [description, setDescription] = useState('');
  const [ean, setEan] = useState('');
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? '');
  const [unitsPerBox, setUnitsPerBox] = useState('1');

  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [month, setMonth] = useState<string>(currentMonthAbbrev());
  const [year, setYear] = useState<string>(currentYearShort());
  const [boxes, setBoxes] = useState('');
  const [looseUnits, setLooseUnits] = useState('');

  const [message, setMessage] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const matchingProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => p.articleNumber.toLowerCase().includes(q) || p.ean.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, productQuery]);

  const effectiveUnitsPerBox = mode === 'existing' ? (selectedProduct?.unitsPerBox ?? 1) : Number(unitsPerBox) || 0;
  const boxesNum = Number(boxes) || 0;
  const looseNum = Number(looseUnits) || 0;
  const totalQuantity = boxesNum * effectiveUnitsPerBox + looseNum;
  const batchNumber = formatBatch(month, year);

  function resetStockFields() {
    setBoxes('');
    setLooseUnits('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!warehouseId) {
      setMessage('Kies een magazijn.');
      return;
    }
    if (totalQuantity <= 0) {
      setMessage('Vul een aantal dozen en/of losse stuks in.');
      return;
    }

    let productId = selectedProductId;
    let label = '';

    if (mode === 'new') {
      if (!articleNumber.trim() || !description.trim() || !ean.trim() || !companyId) {
        setMessage('Vul artikelnummer, omschrijving, EAN en bedrijf in.');
        return;
      }
      const product = onAddProduct({
        articleNumber: articleNumber.trim(),
        description: description.trim(),
        ean: ean.trim(),
        companyId,
        unitsPerBox: Number(unitsPerBox) || 1,
      });
      productId = product.id;
      label = product.articleNumber;

      setArticleNumber('');
      setDescription('');
      setEan('');
      setUnitsPerBox('1');
    } else {
      if (!selectedProduct) {
        setMessage('Selecteer een bestaand artikel.');
        return;
      }
      label = selectedProduct.articleNumber;
    }

    onAddStock(productId, warehouseId, batchNumber, totalQuantity);
    resetStockFields();
    setMessage(`${totalQuantity} stuks van ${label} (batch ${batchNumber}) toegevoegd aan ${warehouses.find((w) => w.id === warehouseId)?.name}.`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('new')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === 'new' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Nieuw artikel
        </button>
        <button
          type="button"
          onClick={() => setMode('existing')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === 'existing' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Bestaand artikel (nieuwe batch)
        </button>
      </div>

      {mode === 'new' ? (
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
          <Field label="Zoek artikel op artikelnummer, EAN of omschrijving">
            <input
              value={productQuery}
              onChange={(e) => {
                setProductQuery(e.target.value);
                setSelectedProductId('');
              }}
              className="input"
              placeholder="Typ om te zoeken..."
            />
          </Field>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
            {matchingProducts.length === 0 && (
              <p className="p-3 text-sm text-slate-400">Geen artikelen gevonden.</p>
            )}
            {matchingProducts.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 ${selectedProductId === p.id ? 'bg-slate-100' : ''}`}
              >
                <span className="flex flex-col">
                  <span className="font-medium text-slate-900">{p.articleNumber} — {p.description}</span>
                  <span className="font-mono text-xs text-slate-400">{p.ean}</span>
                </span>
                <CompanyBadge companyId={p.companyId} name={companies.find((c) => c.id === p.companyId)?.name ?? ''} />
              </button>
            ))}
          </div>
          {selectedProduct && (
            <p className="text-xs text-slate-500">
              Geselecteerd: <span className="font-medium text-slate-700">{selectedProduct.articleNumber}</span> · {selectedProduct.unitsPerBox} stuks/doos
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Inboeken</h3>
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
            <input value={batchNumber} disabled className="input bg-slate-100 text-slate-500" />
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
          <Field label="Losse stuks (buiten dozen)">
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
            <input value={effectiveUnitsPerBox || ''} disabled className="input bg-slate-100 text-slate-500" />
          </Field>
          <Field label="Totaal aantal stuks">
            <input value={totalQuantity} disabled className="input bg-slate-100 font-semibold text-slate-900" />
          </Field>
        </div>
      </div>

      {message && (
        <p className={`rounded-md px-3 py-2 text-sm ${message.startsWith('Vul') || message.startsWith('Kies') || message.startsWith('Selecteer') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </p>
      )}

      <button type="submit" className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
        Voorraad inboeken
      </button>
    </form>
  );
}

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
