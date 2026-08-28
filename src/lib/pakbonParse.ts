export interface PakbonLineMatch {
  ean: string;
  aantal: number;
}

export interface PakbonArticleProduct {
  id: string;
  articleNumber: string;
  unitsPerBox: number;
}

export interface PakbonArticleMatch<T extends PakbonArticleProduct> {
  product: T;
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

function normalizeArticleCode(s: string): string {
  return s.toUpperCase().replace(/[\s./]/g, '');
}

// Niet elke pakbon heeft EAN's - veel (buitenlandse) leveranciers gebruiken alleen hun
// eigen model-/artikelnummer (bv. "WD-6W-ZW/DT"). Zoekt daarom voor elk nog niet gematcht
// artikel of het artikelnummer letterlijk voorkomt in een regel van de OCR-tekst
// (spaties/punten/schuine strepen genegeerd, voor wat OCR-ruis in die tekens). Voor het
// aantal wordt het bekende "stuks per doos" van dat artikel als anker gebruikt: op een
// pakbonregel staan meestal meerdere getallen (stuks/doos, aantal dozen, totaal stuks,
// gewichten, ...), maar het getal vlak ná de al bekende stuks/doos-waarde is vrijwel
// altijd het aantal dozen. Komt die waarde niet voor op de regel (andere layout, of
// stuks/doos in het systeem klopt niet), dan valt dit terug op het tweede losse getal op
// de regel - net als bij de EAN-heuristiek controleert de gebruiker dit nog na.
export function matchProductsByArticleNumber<T extends PakbonArticleProduct>(text: string, products: T[]): PakbonArticleMatch<T>[] {
  const results: PakbonArticleMatch<T>[] = [];
  const matchedIds = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const normalizedLine = normalizeArticleCode(rawLine);
    if (normalizedLine.length < 3) continue;

    for (const product of products) {
      if (matchedIds.has(product.id)) continue;
      const normalizedArticle = normalizeArticleCode(product.articleNumber);
      if (normalizedArticle.length < 3 || !normalizedLine.includes(normalizedArticle)) continue;

      results.push({ product, aantal: extractBoxCount(rawLine, product.unitsPerBox) });
      matchedIds.add(product.id);
      break;
    }
  }

  return results;
}

function extractBoxCount(line: string, unitsPerBox: number): number {
  const withoutPrices = line.replace(/\d+[.,]\d+/g, ' ');
  const numbers: string[] = withoutPrices.match(/(?<!\d)\d{1,6}(?!\d)/g) ?? [];

  const anchorIndex = numbers.indexOf(String(unitsPerBox));
  if (anchorIndex !== -1 && anchorIndex + 1 < numbers.length) {
    return parseInt(numbers[anchorIndex + 1], 10) || 1;
  }

  const shortNumbers = numbers.filter((n) => n.length <= 4);
  if (shortNumbers.length >= 2) return parseInt(shortNumbers[1], 10) || 1;
  if (shortNumbers.length === 1) return parseInt(shortNumbers[0], 10) || 1;
  return 1;
}
