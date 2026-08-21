// Verkort eenheden op stickers om ruimte te besparen: "5 watt" -> "5W", "2700 kelvin" -> "2700K".
// Volt en lumen worden volledig weggelaten (niet relevant op de sticker).
export function abbreviateForSticker(description: string, product?: { articleNumber: string; companyId: string }): string {
  let result = description
    .replace(/\s*\d+(?:[.,]\d+)?\s*volt\b/gi, '')
    .replace(/(\d+(?:[.,]\d+)?)\s*watt\b/gi, '$1W')
    .replace(/(\d+(?:[.,]\d+)?)\s*kelvin\b/gi, '$1K')
    .replace(/\s*\d+(?:[.,]\d+)?\s*lumen\b/gi, '');

  // Wandlampen van LISL (artikelnummer begint met "WD"): "Up en/& Down" niet op de sticker.
  if (isWdArticle(product)) {
    result = result.replace(/\bup\s*(?:en|&|and)\s*down\b/gi, '');
  }

  return result.replace(/\s{2,}/g, ' ').trim();
}

function isWdArticle(product?: { articleNumber: string; companyId: string }): boolean {
  return !!product && product.companyId === 'lisl' && product.articleNumber.trim().toUpperCase().startsWith('WD');
}

// Sommige artikelnummers zijn eigenlijk geen echt artikelnummer maar een
// artikelnummer met een aantekening erachter geplakt (bv. "ELV-54-W-Zonder-Driver",
// omdat er geen apart artikelnummer voor de driverloze variant is). Op de sticker
// tonen we het echte artikelnummer en de aantekening als eigen regel eronder,
// in plaats van de hele string als (te lang) artikelnummer af te drukken.
export function articleNumberLines(articleNumber: string): { main: string; subtitle: string | null } {
  const match = articleNumber.match(/^(.+)-Zonder[- ]Driver$/i);
  if (match) return { main: match[1], subtitle: 'Zonder Driver' };
  return { main: articleNumber, subtitle: null };
}

// Wandlampen (WD-): wattage staat al in het artikelnummer (bv. "WD-6W-..."), dus niet
// herhalen in de omschrijving. De resterende tekst wordt in twee regels geknipt op de
// kelvin-waarde, zodat "Led Wandlamp" en "3000K Zwart/Goud" los blijven i.p.v. één lange regel.
export function stickerDescriptionLines(description: string, product?: { articleNumber: string; companyId: string }): string[] {
  const abbreviated = abbreviateForSticker(description, product);
  if (!isWdArticle(product)) return [abbreviated];

  const withoutWattage = abbreviated
    .replace(/\b\d+(?:[.,]\d+)?W\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Ook kelvin-bereiken zoals "2200-6500K" in hun geheel meenemen, niet alleen het laatste getal.
  const kelvinMatch = withoutWattage.match(/\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?K\b/i);
  if (!kelvinMatch || kelvinMatch.index === undefined) return [withoutWattage];

  const before = withoutWattage.slice(0, kelvinMatch.index).trim();
  const from = withoutWattage.slice(kelvinMatch.index).trim();
  if (!before || !from) return [withoutWattage];

  return [before, from];
}
