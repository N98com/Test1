export interface PakbonLineMatch {
  ean: string;
  aantal: number;
}

// Haalt per regel van de OCR-tekst een EAN-nummer (13 of 8 losse cijfers) en een
// bijbehorend aantal uit een pakbon. Pakbon-layouts verschillen sterk per leverancier,
// dus dit is een heuristiek: prijzen (getallen met een komma/punt, bv. "12,50") worden
// eerst weggehaald zodat die niet per ongeluk als aantal gezien worden, en van de
// overgebleven korte losse getallen op de regel wordt de LAATSTE als aantal genomen -
// artikelcodes/omschrijvingen met cijfers erin (bv. "WD-6W-Zwart") staan vrijwel altijd
// vóór de EAN/aantal-kolommen, terwijl "aantal" in de meeste pakbon-layouts vlak vóór of
// na de prijs aan het eind van de regel staat. Bij twijfel valt het aantal terug op 1 -
// de gebruiker controleert en corrigeert de gevonden regels altijd nog voordat ze
// toegepast worden.
export function parsePakbonText(text: string): PakbonLineMatch[] {
  const byEan = new Map<string, number>();

  for (const rawLine of text.split(/\r?\n/)) {
    const eanMatch = rawLine.match(/(?<!\d)(\d{13}|\d{8})(?!\d)/);
    if (!eanMatch) continue;
    const ean = eanMatch[0];

    const withoutPrices = rawLine.replace(/\d+[.,]\d+/g, ' ');
    const withoutEan = withoutPrices.replace(ean, ' ');
    const qtyMatches = withoutEan.match(/(?<!\d)\d{1,5}(?!\d)/g);
    const aantal = qtyMatches && qtyMatches.length > 0 ? parseInt(qtyMatches[qtyMatches.length - 1], 10) : 1;

    byEan.set(ean, aantal > 0 ? aantal : 1);
  }

  return Array.from(byEan, ([ean, aantal]) => ({ ean, aantal }));
}
