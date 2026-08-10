const COLORS: Record<string, string> = {
  lisl: 'bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
  eb: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
};

export function CompanyBadge({ companyId, name }: { companyId: string; name: string }) {
  const cls = COLORS[companyId] ?? 'bg-slate-100 text-slate-800 ring-slate-600/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {name}
    </span>
  );
}
