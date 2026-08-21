import { useLayoutEffect, useReducer, useRef, useState } from 'react';

/**
 * Shrinks a block of text to fit its container by scaling down font-size
 * until content no longer overflows. Re-measures after every render caused
 * by a scale change, so it converges over a few cycles rather than needing
 * an explicit measurement library.
 */
export function useShrinkToFit<T extends HTMLElement>(deps: unknown[]) {
  const containerRef = useRef<T>(null);
  const [scale, setScale] = useState(1);
  const attemptsRef = useRef(0);
  const [, forceRecheck] = useReducer((c: number) => c + 1, 0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    setScale(1);
    attemptsRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (attemptsRef.current > 50) return;

    // Vlak na het openen van een (pop-up)venster kan de layout nog niet klaar
    // zijn, waardoor clientWidth/clientHeight hier nog 0 uitlezen. Dat zou
    // anders ten onrechte als "overflow" gezien worden en de tekst
    // onnodig (tot het minimum) laten krimpen, zonder dat er daarna nog een
    // trigger is om dat te herstellen. Wacht in dat geval op het volgende
    // frame i.p.v. te krimpen op basis van een onbetrouwbare meting.
    if (el.clientWidth === 0 || el.clientHeight === 0) {
      const raf = requestAnimationFrame(forceRecheck);
      return () => cancelAnimationFrame(raf);
    }

    const overflowing = el.scrollHeight > el.clientHeight + 0.5 || el.scrollWidth > el.clientWidth + 0.5;
    if (overflowing && scale > 0.15) {
      attemptsRef.current += 1;
      setScale((s) => Math.max(0.15, s * 0.94));
    }
  });

  return { containerRef, scale };
}
