import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useShrinkToFit } from '../useShrinkToFit';
import { abbreviateForSticker } from '../lib/stickerText';
import { BarcodeSvg } from './BarcodeSvg';
import type { Product } from '../types';

export interface BarcodeItem {
  key: string;
  product: Product;
}

interface Props {
  items: BarcodeItem[];
  onClose: () => void;
}

function BarcodeLabel({ product }: { product: Product }) {
  const shortDescription = abbreviateForSticker(product.description, product);
  const { containerRef, scale } = useShrinkToFit<HTMLDivElement>([product.articleNumber, shortDescription]);
  return (
    <div className="barcode-label">
      <div ref={containerRef} className="barcode-label-text">
        <div className="sticker-line" style={{ fontSize: `${30 * scale}pt` }}>{product.articleNumber}</div>
        <div className="sticker-line" style={{ fontSize: `${20 * scale}pt` }}>{shortDescription}</div>
      </div>
      <div className="barcode-label-svg">
        <BarcodeSvg ean={product.ean} />
      </div>
    </div>
  );
}

export function BarcodePreview({ items, onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow-lg dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {items.length} barcode{items.length === 1 ? '' : 's'} klaar om te printen
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Formaat 150 × 100 mm</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sluiten
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              Printen
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-200">
          Tip: zet in het printvenster de schaal op "Werkelijke grootte" / 100% (niet "Passend maken"), zodat het label exact 150 × 100&nbsp;mm blijft.
        </p>

        <div className="flex flex-col items-center gap-4">
          {items.map((item) => (
            <div key={item.key} className="shadow-lg">
              <BarcodeLabel product={item.product} />
            </div>
          ))}
        </div>
      </div>

      {createPortal(
        <div className="barcode-print-area">
          {items.map((item) => (
            <BarcodeLabel key={item.key} product={item.product} />
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
