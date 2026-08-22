import { createPortal } from 'react-dom';
import { useShrinkToFit } from '../useShrinkToFit';
import { usePrintPopupLifecycle } from '../usePrintPopupLifecycle';
import { articleNumberLines, stickerDescriptionLines } from '../lib/stickerText';
import { BarcodeSvg } from './BarcodeSvg';
import { CompanyHeader } from './CompanyLogo';
import type { Product } from '../types';

export interface StickerItem {
  key: string;
  product: Product;
}

interface Props {
  items: StickerItem[];
  batchNumber: string;
  includeBarcode: boolean;
  popup: Window;
  onClose: () => void;
  onPrint?: () => void;
}

function StickerMainBox({ articleNumber, description, unitsPerBox, companyId }: { articleNumber: string; description: string; unitsPerBox: number; companyId: string }) {
  const { main, subtitle } = articleNumberLines(articleNumber);
  // Maximaal twee regels: producttype, en watt/kelvin/kleur op de tweede
  // regel. Al het overige (dimbaar, gestuurd, fase-afsnijding, enz.) is er al
  // uitgehaald in stickerDescriptionLines, zodat de sticker altijd overzichtelijk
  // blijft, ook bij een oorspronkelijk veel te lange omschrijving.
  const descriptionLines = stickerDescriptionLines(description, { articleNumber, companyId });
  const { containerRef, scale } = useShrinkToFit<HTMLDivElement>([main, subtitle, ...descriptionLines, unitsPerBox]);
  return (
    <div className="sticker-box sticker-box-main">
      <div ref={containerRef} className="sticker-box-inner">
        <div className="sticker-line sticker-article-number sticker-emphasis" style={{ fontSize: `${40 * scale}pt` }}>{main}</div>
        {subtitle && (
          <div className="sticker-line" style={{ fontSize: `${28 * scale}pt`, whiteSpace: 'nowrap' }}>{subtitle}</div>
        )}
        {descriptionLines.map((line, i) => (
          <div key={i} className="sticker-line" style={{ fontSize: `${22 * scale}pt`, whiteSpace: 'nowrap' }}>{line}</div>
        ))}
        <div className="sticker-line sticker-emphasis" style={{ fontSize: `${34 * scale}pt`, whiteSpace: 'nowrap' }}>({unitsPerBox} st)</div>
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
          <div className="sticker-line sticker-emphasis" style={{ fontSize: `${28 * scale}pt` }}>{batchNumber}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticker-box sticker-box-batch">
      <div className="sticker-box-batch-row">
        <div className="sticker-line sticker-box-batch-number sticker-emphasis" style={{ fontSize: '28pt' }}>{batchNumber}</div>
        <div className="sticker-box-batch-barcode">
          <BarcodeSvg ean={ean} width={1.4} height={36} fontSize={13} margin={0} />
        </div>
      </div>
    </div>
  );
}

// Rendert in een los, al geopend browsertabblad (popup), niet als overlay op de
// huidige pagina: window.print()/Escape/sluiten moeten dus op dát venster werken,
// niet op het venster van de app zelf.
export function StickerPreview({ items, batchNumber, includeBarcode, popup, onClose, onPrint }: Props) {
  const { closed } = usePrintPopupLifecycle(popup, 'Stickers', onClose);

  if (closed || popup.closed) return null;

  const root = popup.document.getElementById('popup-root');
  if (!root) return null;

  return createPortal(
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {items.length} sticker{items.length === 1 ? '' : 's'} klaar om te printen
          </p>
          <p className="text-xs text-slate-500">
            Batch: <span className="font-mono">{batchNumber}</span> · Formaat 150 × 100 mm
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              popup.close();
              onClose();
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Sluiten
          </button>
          <button
            type="button"
            onClick={() => {
              onPrint?.();
              popup.print();
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Printen
          </button>
        </div>
      </div>

      <p className="px-4 py-2 text-xs text-slate-500 print:hidden">
        Tip: zet in het printvenster de schaal op "Werkelijke grootte" / 100% (niet "Passend maken"), zodat de sticker exact 150 × 100&nbsp;mm blijft.
      </p>

      <div className="sticker-print-area">
        {items.map((item) => (
          <div key={item.key} className="sticker-scale-outer">
            <div className="sticker sticker-has-logo shadow-lg print:shadow-none">
              <CompanyHeader companyId={item.product.companyId} />
              <StickerMainBox
                articleNumber={item.product.articleNumber}
                description={item.product.description}
                unitsPerBox={item.product.unitsPerBox}
                companyId={item.product.companyId}
              />
              <StickerBatchBox batchNumber={batchNumber} ean={item.product.ean} includeBarcode={includeBarcode} />
            </div>
          </div>
        ))}
      </div>
    </>,
    root,
  );
}
