import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShrinkToFit } from '../useShrinkToFit';

export interface AddressLabelData {
  name: string;
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  province: string;
  country: string;
}

interface Props {
  data: AddressLabelData;
  popup: Window;
  onClose: () => void;
  onPrint?: () => void;
}

function addressLines(data: AddressLabelData): string[] {
  return [
    data.name,
    `${data.street} ${data.houseNumber}`.trim(),
    `${data.postcode} ${data.city}`.trim(),
    data.province,
    data.country,
  ]
    .map((line) => line.trim())
    .filter(Boolean);
}

function AddressLabelBox({ lines }: { lines: string[] }) {
  const { containerRef, scale } = useShrinkToFit<HTMLDivElement>(lines);
  return (
    <div className="sticker-box sticker-box-full">
      <div ref={containerRef} className="sticker-box-inner">
        {lines.map((line, i) => (
          <div key={i} className="sticker-line" style={{ fontSize: `${32 * scale}pt` }}>{line}</div>
        ))}
      </div>
    </div>
  );
}

// 150mm omgerekend naar CSS-pixels (96dpi, de standaard mm->px-conversie van browsers).
const STICKER_WIDTH_PX = 150 * (96 / 25.4);

// Zelfde popup-aanpak als StickerPreview: render in een los, al geopend
// browsertabblad, niet als overlay op de huidige pagina.
export function AddressLabelPreview({ data, popup, onClose, onPrint }: Props) {
  const [closed, setClosed] = useState(false);
  const lines = addressLines(data);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        popup.close();
        onClose();
      }
    }
    popup.document.addEventListener('keydown', handleKeyDown);

    const pollClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClosed);
        setClosed(true);
        onClose();
      }
    }, 500);

    return () => {
      popup.document.removeEventListener('keydown', handleKeyDown);
      clearInterval(pollClosed);
    };
  }, [popup, onClose]);

  useEffect(() => {
    function updateScale() {
      const scale = Math.min(1, (popup.innerWidth - 32) / STICKER_WIDTH_PX);
      popup.document.documentElement.style.setProperty('--sticker-scale', String(scale));
    }
    updateScale();
    const raf = popup.requestAnimationFrame(updateScale);
    popup.addEventListener('resize', updateScale);
    return () => {
      popup.cancelAnimationFrame(raf);
      popup.removeEventListener('resize', updateScale);
    };
  }, [popup]);

  if (closed || popup.closed) return null;

  const root = popup.document.getElementById('popup-root');
  if (!root) return null;

  return createPortal(
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div>
          <p className="text-sm font-semibold text-slate-900">Brieflabel klaar om te printen</p>
          <p className="text-xs text-slate-500">Formaat 150 × 100&nbsp;mm</p>
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
        <div className="sticker-scale-outer">
          <div className="sticker shadow-lg print:shadow-none">
            <AddressLabelBox lines={lines} />
          </div>
        </div>
      </div>
    </>,
    root,
  );
}
