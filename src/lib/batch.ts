export const MONTHS = [
  'JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN',
  'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC',
] as const;

export function formatBatch(month: string, year: string): string {
  const shortYear = year.slice(-2).padStart(2, '0');
  return `${month}/${shortYear}`;
}

export function currentYearShort(): string {
  return new Date().getFullYear().toString().slice(-2);
}

export function currentMonthAbbrev(): string {
  return MONTHS[new Date().getMonth()];
}
