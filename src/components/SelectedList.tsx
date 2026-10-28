import type { Product } from '../types';

interface Props {
  // Al gesorteerd in de gewenste volgorde.
  products: Product[];
  copies: Record<string, number>;
  // Bijv. "stickers" of "barcodes", voor de toegankelijke labels.
  itemLabel: string;
  onSetCopies: (productId: string, copies: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}

// Overzicht van de geselecteerde artikelen met aantal per artikel, gedeeld door
// Stickers en Barcode generator.
export function SelectedList({ products, copies, itemLabel, onSetCopies, onRemove, onClear }: Props) {
  if (products.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Geselecteerd</h3>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          Alles wissen
        </button>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {products.map((product) => (
          <li key={product.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{product.articleNumber}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{product.description}</p>
            </div>
            <input
              type="number"
              min={1}
              value={copies[product.id]}
              onChange={(e) => onSetCopies(product.id, Number(e.target.value) || 1)}
              className="input w-20 shrink-0 text-right"
              aria-label={`Aantal ${itemLabel} voor ${product.articleNumber}`}
            />
            <button
              type="button"
              onClick={() => onRemove(product.id)}
              aria-label={`${product.articleNumber} uit selectie halen`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
