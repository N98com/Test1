import { useRef, useState } from 'react';
import type { Company, Product } from '../types';
import { CompanyBadge } from './CompanyBadge';
import { parsePakbonText, type PakbonLineMatch } from '../lib/pakbonParse';
import type { PakbonOcrProgress } from '../lib/pakbonOcr';

interface Props {
  products: Product[];
  companies: Company[];
  onApply: (matches: { productId: string; copies: number }[]) => void;
}

interface ReviewRow {
  ean: string;
  product: Product | null;
  aantal: number;
}

type Status = 'idle' | 'processing' | 'review' | 'error';

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'OCR-engine laden...',
  'initializing tesseract': 'OCR-engine starten...',
  'loading language traineddata': 'Taalbestand laden...',
  'initializing api': 'Voorbereiden...',
  'recognizing text': 'Tekst herkennen...',
};

export function PakbonUpload({ products, companies, onApply }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<PakbonOcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [unmatched, setUnmatched] = useState<PakbonLineMatch[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus('processing');
    setError(null);
    setProgress(null);

    try {
      const { extractPakbonText } = await import('../lib/pakbonOcr');
      const text = await extractPakbonText(file, setProgress);
      const found = parsePakbonText(text);

      const matched: ReviewRow[] = [];
      const notFound: PakbonLineMatch[] = [];
      for (const line of found) {
        const product = products.find((p) => p.ean.trim() === line.ean) ?? null;
        if (product) {
          matched.push({ ean: line.ean, product, aantal: line.aantal });
        } else {
          notFound.push(line);
        }
      }

      setRows(matched);
      setUnmatched(notFound);
      setStatus('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Het lezen van de pakbon is mislukt. Probeer het opnieuw.');
      setStatus('error');
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function updateAantal(index: number, aantal: number) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, aantal: Math.max(1, aantal) } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    setStatus('idle');
    setProgress(null);
    setError(null);
    setRows([]);
    setUnmatched([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleApply() {
    onApply(rows.filter((r) => r.product).map((r) => ({ productId: r.product!.id, copies: r.aantal })));
  }

  const progressLabel = progress ? (STATUS_LABELS[progress.status] ?? progress.status) : null;
  const progressPercent = progress ? Math.round(progress.progress * 100) : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Upload een foto of PDF van een pakbon van binnengekomen goederen. De EAN-nummers en aantallen worden er
        automatisch uit gelezen (herkenning gebeurt volledig in je browser) en gematcht met je artikelen, zodat je
        de juiste stickers in de juiste aantallen klaar kunt zetten.
      </p>

      {status === 'idle' && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400 dark:text-slate-500">
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Klik om een foto of PDF te kiezen</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG of PDF</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </label>
      )}

      {status === 'processing' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">{progressLabel ?? 'Bezig...'}</p>
          <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-100" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Opnieuw proberen
          </button>
        </div>
      )}

      {status === 'review' && (
        <div className="space-y-4">
          {rows.length === 0 && unmatched.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Geen EAN-nummers herkend op deze pakbon. Probeer een scherpere/rechtere foto, of een PDF.
            </p>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[600px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikelnr.</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Omschrijving</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bedrijf</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Aantal stickers</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {rows.map((row, i) => (
                    <tr key={`${row.ean}-${i}`}>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{row.product!.articleNumber}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.product!.description}</td>
                      <td className="px-3 py-2">
                        <CompanyBadge
                          companyId={row.product!.companyId}
                          name={companies.find((c) => c.id === row.product!.companyId)?.name ?? '—'}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          value={row.aantal}
                          onChange={(e) => updateAantal(i, Number(e.target.value) || 1)}
                          className="input w-20 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="text-xs font-medium text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                        >
                          Verwijderen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {unmatched.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <p className="mb-1 font-medium">
                {unmatched.length} EAN-nummer{unmatched.length === 1 ? '' : 's'} op de pakbon niet gevonden in je artikelen:
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {unmatched.map((u) => (
                  <li key={u.ean} className="font-mono">{u.ean} <span className="font-sans">(aantal: {u.aantal})</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={rows.length === 0}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              Toepassen op stickers genereren
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Nieuwe pakbon uploaden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
