import { useRef, useState, type ReactNode } from 'react';
import type { Company, Product } from '../types';
import { CompanyBadge } from './CompanyBadge';
import { parsePakbonText, matchProductsByArticleNumber } from '../lib/pakbonParse';
import type { PakbonOcrProgress } from '../lib/pakbonOcr';

export interface PakbonApplyMatch {
  productId: string;
  copies: number;
  // Alleen bij een variabel aantal: het aantal per doos volgens de pakbon.
  unitsPerBox?: number;
}

interface Props {
  products: Product[];
  companies: Company[];
  onApply: (matches: PakbonApplyMatch[], generateNow: boolean) => void;
  // Batch/barcode/alternatief-instellingen, dezelfde als bij Genereren.
  batchOptions: ReactNode;
}

interface ReviewRow {
  key: string;
  product: Product;
  aantal: number;
  // Stuks per doos volgens de pakbon (kolom Qty/CTN), als die gelezen kon worden.
  pakbonQtyPerCarton: number | null;
  // De afzonderlijke pakbonregels van dit artikel (bij dubbele regels > 1).
  pakbonLines: { cartons: number | null; qtyPerCarton: number | null }[];
}

interface UnknownLine {
  ean: string;
  articleNumber: string;
  aantal: number | null;
}

type Status = 'idle' | 'processing' | 'review' | 'error';

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'OCR-engine laden...',
  'initializing tesseract': 'OCR-engine starten...',
  'loading language traineddata': 'Taalbestand laden...',
  'initializing api': 'Voorbereiden...',
  'recognizing text': 'Tekst herkennen...',
};

// Een afwijkend aantal per doos is alleen een probleem bij een vast aantal:
// bij een variabel aantal wordt het pakbon-aantal juist overgenomen.
// Hetzelfde artikel staat op meerdere pakbonregels met een verschillend aantal
// per doos: die dozen krijgen nu allemaal dezelfde sticker, dus nalopen.
const mixedQtyPerCarton = (row: ReviewRow) =>
  new Set(row.pakbonLines.map((l) => l.qtyPerCarton).filter((q) => q !== null)).size > 1;

const qtyMismatch = (row: ReviewRow) =>
  !row.product.variableUnits && row.pakbonQtyPerCarton !== null && row.pakbonQtyPerCarton !== row.product.unitsPerBox;

export function PakbonUpload({ products, companies, onApply, batchOptions }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<PakbonOcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [unknown, setUnknown] = useState<UnknownLine[]>([]);
  // Of de pakbon als tabel (tekstlaag) gelezen is, of via OCR (foto/scan).
  const [readAsTable, setReadAsTable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF met echte tekst (packing list uit Excel e.d.): alleen de kolommen Buyer
  // code (EAN) en Cartons Qty (aantal dozen) tellen; Qty/CTN ter controle.
  // Dezelfde EAN kan op meerdere regels/pallets staan: die dozen worden opgeteld.
  async function readTable(file: File): Promise<boolean> {
    const { readPdfTextItems, parsePackingList } = await import('../lib/packingList');
    const lines = parsePackingList(await readPdfTextItems(file));
    if (!lines || lines.length === 0) return false;

    const byEan = new Map<
      string,
      { cartons: number | null; qtyPerCarton: number | null; articleNumber: string; lines: ReviewRow['pakbonLines'] }
    >();
    for (const line of lines) {
      const existing = byEan.get(line.ean);
      byEan.set(line.ean, {
        cartons: line.cartons === null ? (existing?.cartons ?? null) : (existing?.cartons ?? 0) + line.cartons,
        qtyPerCarton: existing?.qtyPerCarton ?? line.qtyPerCarton,
        articleNumber: existing?.articleNumber || line.articleNumber,
        lines: [...(existing?.lines ?? []), { cartons: line.cartons, qtyPerCarton: line.qtyPerCarton }],
      });
    }

    const matched: ReviewRow[] = [];
    const notFound: UnknownLine[] = [];
    for (const [ean, line] of byEan) {
      const product = products.find((p) => p.ean.trim() === ean);
      if (product) {
        matched.push({
          key: product.id,
          product,
          aantal: line.cartons ?? 1,
          pakbonQtyPerCarton: line.qtyPerCarton,
          pakbonLines: line.lines,
        });
      } else {
        notFound.push({ ean, articleNumber: line.articleNumber, aantal: line.cartons });
      }
    }

    setRows(matched);
    setUnknown(notFound);
    setReadAsTable(true);
    return true;
  }

  // Foto of gescande PDF: tekstherkenning (OCR) met de bestaande heuristiek.
  async function readWithOcr(file: File) {
    const { extractPakbonText } = await import('../lib/pakbonOcr');
    const text = await extractPakbonText(file, setProgress);

    // Niet elke pakbon heeft EAN's - sommige leveranciers gebruiken alleen hun eigen
    // model-/artikelnummer. Probeer daarom eerst op EAN te matchen, en zoek voor de
    // artikelen die daar niet uit kwamen alsnog op artikelnummer.
    const eanFound = parsePakbonText(text);
    const matched: ReviewRow[] = [];
    const matchedProductIds = new Set<string>();
    const notFound: UnknownLine[] = [];
    for (const line of eanFound) {
      const product = products.find((p) => p.ean.trim() === line.ean);
      if (product) {
        matched.push({ key: product.id, product, aantal: line.aantal, pakbonQtyPerCarton: null, pakbonLines: [] });
        matchedProductIds.add(product.id);
      } else {
        notFound.push({ ean: line.ean, articleNumber: '', aantal: line.aantal });
      }
    }

    const remainingProducts = products.filter((p) => !matchedProductIds.has(p.id));
    for (const m of matchProductsByArticleNumber(text, remainingProducts)) {
      matched.push({ key: m.product.id, product: m.product, aantal: m.aantal, pakbonQtyPerCarton: null, pakbonLines: [] });
    }

    setRows(matched);
    setUnknown(notFound);
    setReadAsTable(false);
  }

  async function handleFile(file: File) {
    setStatus('processing');
    setError(null);
    setProgress(null);

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const handled = isPdf && (await readTable(file));
      if (!handled) await readWithOcr(file);
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
    setUnknown([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleApply(generateNow: boolean) {
    onApply(
      rows.map((r) => ({
        productId: r.product.id,
        copies: r.aantal,
        unitsPerBox: r.product.variableUnits ? (r.pakbonQtyPerCarton ?? undefined) : undefined,
      })),
      generateNow,
    );
  }

  const progressLabel = progress ? (STATUS_LABELS[progress.status] ?? progress.status) : null;
  const progressPercent = progress ? Math.round(progress.progress * 100) : 0;
  const mismatches = rows.filter(qtyMismatch);
  const mixed = rows.filter(mixedQtyPerCarton);
  const totalStickers = rows.reduce((sum, r) => sum + r.aantal, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Upload de pakbon (packing list) van binnengekomen goederen. Bij een PDF met tabel worden alleen de EAN-nummers
        (Buyer code) en het aantal dozen (Cartons Qty) gebruikt: per doos één sticker. Een foto of scan wordt met
        tekstherkenning gelezen; controleer de aantallen dan extra goed.
      </p>

      {status === 'idle' && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400 dark:text-slate-500">
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Klik om een PDF of foto te kiezen</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">PDF, JPG of PNG</span>
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
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">{progressLabel ?? 'Pakbon lezen...'}</p>
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
          {rows.length === 0 && unknown.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Geen EAN-nummers of artikelnummers herkend op deze pakbon. Probeer een scherpere/rechtere foto, of een
              PDF.
            </p>
          )}

          {rows.length > 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {readAsTable ? 'Gelezen uit de tabel van de PDF' : 'Gelezen met tekstherkenning'}: {rows.length} artikel
              {rows.length === 1 ? '' : 'en'}, {totalStickers} sticker{totalStickers === 1 ? '' : 's'} (één per doos).
            </p>
          )}

          {unknown.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <p className="mb-1 font-medium">
                {unknown.length} onbekend{unknown.length === 1 ? ' EAN-nummer' : 'e EAN-nummers'}: niet gevonden bij je
                artikelen, hiervoor worden geen stickers gemaakt.
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {unknown.map((u) => (
                  <li key={u.ean}>
                    <span className="font-mono">{u.ean}</span>
                    {u.articleNumber && <span> · {u.articleNumber}</span>}
                    {u.aantal !== null && <span> · {u.aantal} {u.aantal === 1 ? 'doos' : 'dozen'}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mixed.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <p className="mb-1 font-medium">
                Verschillend aantal per doos binnen hetzelfde artikel ({mixed.length}): staat meerdere keren op de pakbon
                met een ander aantal per doos. Alle dozen krijgen nu dezelfde sticker, controleer dit.
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {mixed.map((r) => (
                  <li key={r.key}>
                    {r.product.articleNumber}:{' '}
                    {r.pakbonLines
                      .map((l) => `${l.cartons ?? '?'} ${l.cartons === 1 ? 'doos' : 'dozen'} × ${l.qtyPerCarton ?? '?'}`)
                      .join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mismatches.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <p className="mb-1 font-medium">
                Stuks per doos wijkt af bij {mismatches.length} artikel{mismatches.length === 1 ? '' : 'en'} (de sticker
                gebruikt het aantal van het artikel):
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {mismatches.map((r) => (
                  <li key={r.key}>
                    {r.product.articleNumber}: pakbon {r.pakbonQtyPerCarton}, artikel {r.product.unitsPerBox}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[680px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikelnr.</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Omschrijving</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bedrijf</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">St/doos</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Dozen</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {rows.map((row, i) => (
                    <tr key={row.key}>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{row.product.articleNumber}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.product.description}</td>
                      <td className="px-3 py-2">
                        <CompanyBadge
                          companyId={row.product.companyId}
                          name={companies.find((c) => c.id === row.product.companyId)?.name ?? '—'}
                        />
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${qtyMismatch(row) ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}
                        title={qtyMismatch(row) ? `Pakbon: ${row.pakbonQtyPerCarton} per doos` : undefined}
                      >
                        {row.product.variableUnits ? (row.pakbonQtyPerCarton ?? 'Variabel') : row.product.unitsPerBox}
                        {qtyMismatch(row) && ` (pakbon ${row.pakbonQtyPerCarton})`}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          value={row.aantal}
                          onChange={(e) => updateAantal(i, Number(e.target.value) || 1)}
                          className="input w-20 text-right"
                        />
                        {row.pakbonLines.length > 1 && (
                          <p
                            className={`mt-1 text-xs ${mixedQtyPerCarton(row) ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}
                          >
                            {row.pakbonLines.map((l) => l.cartons ?? '?').join(' + ')} ({row.pakbonLines.length} regels)
                          </p>
                        )}
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

          {rows.length > 0 && batchOptions}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleApply(true)}
              disabled={rows.length === 0}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              Stickers genereren
            </button>
            <button
              type="button"
              onClick={() => handleApply(false)}
              disabled={rows.length === 0}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Eerst bekijken bij Genereren
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
