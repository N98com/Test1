import { useEffect, useReducer, useState } from 'react';
import { ensurePrintWindowContent } from './lib/printWindow';

// 150mm omgerekend naar CSS-pixels (96dpi, de standaard mm->px-conversie van browsers).
const STICKER_WIDTH_PX = 150 * (96 / 25.4);

/**
 * Beheert de levenscyclus van een los sticker/label-printvenster (popup),
 * gedeeld door StickerPreview en AddressLabelPreview:
 * - Escape-toets en het zelf sluiten van het tabblad sluiten de preview.
 * - Detecteert of de browser het (nog niet gesloten) tabblad op de achtergrond
 *   heeft "ontladen" om geheugen vrij te maken — zie ensurePrintWindowContent —
 *   en bouwt de inhoud dan opnieuw op, inclusief het opnieuw aanhaken van de
 *   Escape-listener aan het (nieuwe) document en het herberekenen van de
 *   schaal, in plaats van de preview stilletjes te laten verdwijnen.
 * - Houdt de --sticker-scale CSS-variabele bij voor de op-schermweergave.
 */
export function usePrintPopupLifecycle(popup: Window, title: string, onClose: () => void) {
  const [closed, setClosed] = useState(false);
  const [, forceRerender] = useReducer((c: number) => c + 1, 0);

  useEffect(() => {
    let doc = popup.document;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        popup.close();
        onClose();
      }
    }

    function updateScale() {
      const scale = Math.min(1, (popup.innerWidth - 32) / STICKER_WIDTH_PX);
      popup.document.documentElement.style.setProperty('--sticker-scale', String(scale));
    }

    doc.addEventListener('keydown', handleKeyDown);
    popup.addEventListener('resize', updateScale);
    updateScale();
    // Direct na het openen kan popup.innerWidth nog even afwijken van de uiteindelijke,
    // gesettelde waarde (viewport-meta/layout die nog moet bijtrekken) — nog een keer
    // meten na een frame vangt dat op.
    let raf = popup.requestAnimationFrame(updateScale);

    const pollId = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollId);
        setClosed(true);
        onClose();
        return;
      }

      if (ensurePrintWindowContent(popup, title)) {
        // De inhoud is net opnieuw opgebouwd in een vers Document-object: de oude
        // listener zat aan het weggegooide document, dus opnieuw aanhaken.
        doc.removeEventListener('keydown', handleKeyDown);
        doc = popup.document;
        doc.addEventListener('keydown', handleKeyDown);
        updateScale();
        forceRerender(); // her-render zodat de nieuwe #popup-root gevonden wordt
      }
    }, 500);

    return () => {
      doc.removeEventListener('keydown', handleKeyDown);
      popup.removeEventListener('resize', updateScale);
      popup.cancelAnimationFrame(raf);
      clearInterval(pollId);
    };
  }, [popup, onClose, title]);

  return { closed };
}
