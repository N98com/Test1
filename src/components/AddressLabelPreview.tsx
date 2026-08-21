import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShrinkToFit } from '../useShrinkToFit';
import { capitalizeWords, normalizeProvince } from '../lib/addressParse';

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

interface LabelLine {
  text: string;
  // Naam, straat+huisnummer en postcode+plaats moeten altijd op één regel
  // passen (i.p.v. af te breken); provincie/land mogen wel wrappen.
  oneLine: boolean;
}

// "1234AA, Plaatsnaam": zonder spatie in de postcode, in hoofdletters, gevolgd
// door een komma en de plaatsnaam - los van hoe de postcode in het (bewerkbare)
// formulierveld staat opgeslagen (daar blijft "1234 AA" i.v.m. leesbaarheid).
function formatPostcodeCity(postcode: string, city: string): string {
  const compactPostcode = postcode.replace(/\s+/g, '').toUpperCase();
  const cityName = capitalizeWords(city.trim());
  if (compactPostcode && cityName) return `${compactPostcode}, ${cityName}`;
  return compactPostcode || cityName;
}

function addressLines(data: AddressLabelData): LabelLine[] {
  const name = capitalizeWords(data.name.trim());
  const street = capitalizeWords(data.street.trim());
  const province = normalizeProvince(data.province);
  const country = data.country.trim();

  const lines: LabelLine[] = [
    { text: name, oneLine: true },
    { text: `${street} ${data.houseNumber.trim()}`.trim(), oneLine: true },
    { text: formatPostcodeCity(data.postcode, data.city), oneLine: true },
    { text: province, oneLine: false },
    { text: country, oneLine: false },
  ];

  return lines.filter((line) => line.text.length > 0);
}

function AddressLabelBox({ lines }: { lines: LabelLine[] }) {
  const { containerRef, scale } = useShrinkToFit<HTMLDivElement>(lines.map((l) => l.text));
  return (
    <div className="sticker-box sticker-box-full">
      <div ref={containerRef} className="sticker-box-inner">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`sticker-line${line.oneLine ? ' whitespace-nowrap' : ''}`}
            style={{ fontSize: `${28 * scale}pt` }}
          >
            {line.text}
          </div>
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
