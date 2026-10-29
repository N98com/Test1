import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PAGE_SIZE } from '../lib/pagination';
import { Pagination } from './Pagination';

interface LogRow {
  id: number;
  created_at: string;
  actor_email: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  product_created: 'Artikel aangemaakt',
  product_updated: 'Artikel gewijzigd',
  product_deleted: 'Artikel verwijderd',
  stickers_printed: 'Stickers geprint',
  account_created: 'Account aangemaakt',
  role_changed: 'Rol gewijzigd',
  email_changed: 'E-mailadres gewijzigd',
  password_changed: 'Wachtwoord gewijzigd',
};

const FIELD_LABELS: Record<string, string> = {
  article_number: 'Artikelnummer',
  description: 'Omschrijving',
  ean: 'EAN',
  company_id: 'Bedrijf',
  units_per_box: 'Stuks per doos',
};

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', user: 'Gebruiker' };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function show(value: unknown): string {
  return value === null || value === undefined || value === '' ? '(leeg)' : String(value);
}

// Zet de opgeslagen details per actie om naar leesbare regels.
function detailLines(row: LogRow): string[] {
  const d = row.details;
  switch (row.action) {
    case 'product_created':
      return [`${show(d.description)}`, `EAN ${show(d.ean)} · ${show(d.units_per_box)} st/doos`];
    case 'product_deleted':
      return [`${show(d.description)}`, `EAN ${show(d.ean)}`];
    case 'product_updated': {
      const changes = (d.changes ?? {}) as Record<string, [unknown, unknown]>;
      return Object.entries(changes).map(
        ([field, [from, to]]) => `${FIELD_LABELS[field] ?? field}: ${show(from)} → ${show(to)}`,
      );
    }
    case 'stickers_printed': {
      const items = (d.items ?? []) as { article_number: string; copies: number }[];
      const batch = d.batch ? `Batch ${d.batch}` : 'Geen batch';
      return [
        `${batch}${d.barcode ? ' · met barcode' : ''}${d.alternative ? ' · alternatief product' : ''}`,
        items.map((item) => `${item.article_number} (${item.copies}×)`).join(', '),
      ];
    }
    case 'account_created':
      return [`Rol: ${ROLE_LABELS[String(d.role)] ?? show(d.role)}`];
    case 'role_changed':
      return [`${ROLE_LABELS[String(d.from)] ?? show(d.from)} → ${ROLE_LABELS[String(d.to)] ?? show(d.to)}`];
    case 'email_changed':
      return [`${show(d.from)} → ${show(d.to)}`];
    default:
      return [];
  }
}

export function LogsView() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagineren gebeurt in de database (range + count), zodat de log onbeperkt
  // mag groeien zonder dat steeds alles wordt ingeladen.
  const fetchPage = useCallback(async (pageNumber: number) => {
    setLoading(true);
    const from = (pageNumber - 1) * PAGE_SIZE;
    const { data, count, error: fetchError } = await supabase
      .from('activity_log')
      .select('id, created_at, actor_email, action, target, details', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setRows((data ?? []) as LogRow[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">Alle acties van alle accounts, nieuwste bovenaan.</p>
        <button
          type="button"
          onClick={() => fetchPage(page)}
          disabled={loading}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Vernieuwen
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}</p>
      )}

      {loading && rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Laden...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nog geen acties gelogd.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[720px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Datum</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Door</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Actie</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Wat</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {rows.map((row) => (
                <tr key={row.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">{formatDateTime(row.created_at)}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.actor_email ?? 'Systeem / Supabase'}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                    {ACTION_LABELS[row.action] ?? row.action}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{row.target ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                    {detailLines(row).map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} itemLabel="acties" onPageChange={setPage} />
    </div>
  );
}
