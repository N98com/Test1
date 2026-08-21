export const PAGE_SIZE = 50;

// Bouwt de rij paginanummers op zoals bij Google: altijd de eerste en laatste
// pagina, de huidige pagina met één buur aan weerszijden, en een "…" waar een
// stuk wordt overgeslagen (voorkomt tientallen knoppen bij veel pagina's).
export function pageItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: (number | 'ellipsis')[] = [1];
  if (current > 3) items.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p += 1) items.push(p);

  if (current < total - 2) items.push('ellipsis');
  items.push(total);

  return items;
}
