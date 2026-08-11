import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Product } from '../types';

interface Props {
  products: Product[];
  productId: string;
  onSelect: (productId: string) => void;
  placeholder?: string;
}

function labelFor(product: Product) {
  return `${product.articleNumber} — ${product.description}`;
}

export function ProductSearchInput({ products, productId, onSelect, placeholder }: Props) {
  const selectedProduct = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId]);

  const [query, setQuery] = useState(selectedProduct ? labelFor(selectedProduct) : '');
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedProduct ? labelFor(selectedProduct) : '');
  }, [selectedProduct]);

  useEffect(() => {
    if (!open) return;

    function updateRect() {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom, left: r.left, width: r.width });
    }

    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setQuery(selectedProduct ? labelFor(selectedProduct) : '');
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, selectedProduct]);

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => p.articleNumber.toLowerCase().includes(q) || p.ean.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, query]);

  function handleSelect(product: Product) {
    onSelect(product.id);
    setQuery(labelFor(product));
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (productId) onSelect('');
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="input"
        placeholder={placeholder ?? 'Zoek artikel...'}
      />
      {open &&
        rect &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: rect.top, left: rect.left, width: Math.max(rect.width, 240) }}
            className="z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {matching.length === 0 && <p className="p-3 text-sm text-slate-400 dark:text-slate-500">Geen artikelen gevonden.</p>}
            {matching.map((p) => (
              <button
                type="button"
                key={p.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
                className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${productId === p.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              >
                <span className="flex flex-col">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{p.articleNumber} — {p.description}</span>
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{p.ean}</span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
