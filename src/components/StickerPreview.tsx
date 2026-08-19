import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useShrinkToFit } from '../useShrinkToFit';
import { stickerDescriptionLines } from '../lib/stickerText';
import { BarcodeSvg } from './BarcodeSvg';
import type { Product } from '../types';

export interface StickerItem {
  key: string;
  product: Product;
}

interface Props {
  items: StickerItem[];
  batchNumber: string;
  includeBarcode: boolean;
  onClose: () => void;
  onPrint?: () => void;
}

function StickerMainBox({ articleNumber, description, unitsPerBox, companyId }: { articleNumber: string; description: string; unitsPerBox: number; companyId: string }) {
  const descriptionLines = stickerDescriptionLines(description, { articleNumber, companyId });
  const { containerRef, scale } = useShrinkToFit<HTMLDivElement>([articleNumber, ...descriptionLines, unitsPerBox]);
  return (
    <div className="sticker-box sticker-box-main">
      <div ref={containerRef} className="sticker-box-inner">
        <div className="sticker-line sticker-article-number" style={{ fontSize: `${40 * scale}pt` }}>{articleNumber}</div>
        {descriptionLines.map((line, i) => (
          <div key={i} className="sticker-line" style={{ fontSize: `${26 * scale}pt` }}>{line}</div>
        ))}
        <div className="sticker-line" style={{ fontSize: `${28 * scale}pt` }}>({unitsPerBox} st)</div>
      </div>
    </div>
  );
}

function StickerBatchBox({ batchNumber, ean, includeBarcode }: { batchNumber: string; ean: string; includeBarcode: boolean }) {
  const { containerRef, scale } = useShrinkToFit<HTMLDivElement>([batchNumber]);

  if (!includeBarcode) {
    return (
      <div className="sticker-box sticker-box-batch">
        <div ref={containerRef} className="sticker-box-inner">
          <div className="sticker-line" style={{ fontSize: `${28 * scale}pt` }}>{batchNumber}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticker-box sticker-box-batch">
      <div className="sticker-box-batch-row">
        <div className="sticker-line sticker-box-batch-number" style={{ fontSize: '28pt' }}>{batchNumber}</div>
        <div className="sticker-box-batch-barcode">
          <BarcodeSvg ean={ean} width={1.4} height={36} fontSize={13} margin={0} />
        </div>
      </div>
    </div>
  );
}

export function StickerPreview({ items, batchNumber, includeBarcode, onClose, onPrint }: Props) {
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
              {items.length} sticker{items.length === 1 ? '' : 's'} klaar om te printen
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Batch: <span className="font-mono">{batchNumber}</span> · Formaat 150 × 100 mm
            </p>
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
              onClick={() => {
                onPrint?.();
                window.print();
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              Printen
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-200">
          Tip: zet in het printvenster de schaal op "Werkelijke grootte" / 100% (niet "Passend maken"), zodat de sticker exact 150 × 100&nbsp;mm blijft.
        </p>

        <div className="flex flex-col items-center gap-4">
          {items.map((item) => (
            <div key={item.key} className="sticker shadow-lg">
              <StickerMainBox
                articleNumber={item.product.articleNumber}
                description={item.product.description}
                unitsPerBox={item.product.unitsPerBox}
                companyId={item.product.companyId}
              />
              <StickerBatchBox batchNumber={batchNumber} ean={item.product.ean} includeBarcode={includeBarcode} />
            </div>
          ))}
        </div>
      </div>

      {createPortal(
        <div className="sticker-print-area">
          {items.map((item) => (
            <div key={item.key} className="sticker">
              <StickerMainBox
                articleNumber={item.product.articleNumber}
                description={item.product.description}
                unitsPerBox={item.product.unitsPerBox}
                companyId={item.product.companyId}
              />
              <StickerBatchBox batchNumber={batchNumber} ean={item.product.ean} includeBarcode={includeBarcode} />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
