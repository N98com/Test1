import { pageItems } from '../lib/pagination';

interface Props {
  page: number;
  totalPages: number;
  totalCount: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalCount, itemLabel, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Pagina {page} van {totalPages} ({totalCount} {itemLabel})
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Vorige
        </button>
        {pageItems(page, totalPages).map((item, i) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-slate-400 dark:text-slate-500">…</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`min-w-[2.25rem] rounded-lg px-3 py-2 text-sm font-medium ${
                item === page
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Volgende
        </button>
      </div>
    </div>
  );
}
