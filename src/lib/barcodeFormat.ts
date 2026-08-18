export type BarcodeFormat = 'EAN13' | 'EAN8' | 'CODE128';

// EAN-nummers zijn meestal 13 (soms 8) cijfers. Alles daarbuiten (typefout,
// ontbrekend leidend nulletje, etc.) valt terug op CODE128 zodat er altijd
// een scanbare barcode ontstaat.
export function barcodeFormatForEan(ean: string): BarcodeFormat {
  const digits = ean.trim();
  if (/^\d{13}$/.test(digits)) return 'EAN13';
  if (/^\d{8}$/.test(digits)) return 'EAN8';
  return 'CODE128';
}
