import { useState } from 'react';
import type { StickerPrint } from '../types';
import { StickerPreview, type StickerItem } from './StickerPreview';
import type { RecordPrintInput } from '../useStickerPrints';
import { openPrintWindow } from '../lib/printWindow';
import { Pagination } from './Pagination';
import { PAGE_SIZE } from '../lib/pagination';

interface Props {
  prints: StickerPrint[];
  loading: boolean;
  onRecordPrint: (input: RecordPrintInput) => Promise<string | null>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StickerHistoryView({ prints, loading, onRecordPrint }: Props) {
  const [reprint, setReprint] = useState<{ print: StickerPrint; items: StickerItem[]; popup: Window } | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(prints.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = prints.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function startReprint(print: StickerPrint) {
    // Moet synchroon in de click-handler gebeuren, anders blokkeren pop-upblokkers dit.
    const popup = openPrintWindow('Stickers');
    if (!popup) {
      setPrintError('Kon geen nieuw tabblad openen. Sta pop-ups toe voor deze site en probeer opnieuw.');
      return;
    }

    const items: StickerItem[] = [];
    print.items.forEach((item, itemIndex) => {
      for (let i = 0; i < item.copies; i += 1) {
        items.push({
          key: `${print.id}-${itemIndex}-${i}`,
          product: {
            id: `${print.id}-${itemIndex}`,
            articleNumber: item.articleNumber,
            description: item.description,
            ean: item.ean,
            companyId: item.companyId,
            unitsPerBox: item.unitsPerBox,
            createdAt: print.createdAt,
          },
        });
      }
    });
    setPrintError(null);
    setReprint({ print, items, popup });
  }

  async function handlePrint() {
    if (!reprint) return;
    const error = await onRecordPrint({
      batchNumber: reprint.print.batchNumber,
      includeBarcode: reprint.print.includeBarcode,
      items: reprint.print.items,
    });
    if (error) setPrintError(`Printen is gelukt, maar het loggen in Historie is mislukt: ${error}`);
  }

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Historie laden...</p>;
  }

  return (
    <div className="space-y-4">
      {printError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{printError}</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[760px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">#</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Datum &amp; tijd</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Door</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Batch</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Barcode</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikelen</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Totaal</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {paginated.map((print) => {
              const total = print.items.reduce((sum, item) => sum + item.copies, 0);
              return (
                <tr key={print.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{print.printNumber}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">{formatDateTime(print.createdAt)}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{print.createdByEmail ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{print.batchNumber}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{print.includeBarcode ? 'Ja' : 'Nee'}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {print.items.map((item, i) => (
                      <div key={i}>
                        {item.articleNumber} <span className="text-slate-400 dark:text-slate-500">(×{item.copies})</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{total}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startReprint(print)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                    >
                      Opnieuw printen
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {prints.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nog geen stickers geprint.
        </p>
      )}

      {prints.length > 0 && (
        <Pagination page={currentPage} totalPages={totalPages} totalCount={prints.length} itemLabel="prints" onPageChange={setPage} />
      )}

      {reprint && (
        <StickerPreview
          items={reprint.items}
          batchNumber={reprint.print.batchNumber}
          includeBarcode={reprint.print.includeBarcode}
          popup={reprint.popup}
          onClose={() => setReprint(null)}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}
