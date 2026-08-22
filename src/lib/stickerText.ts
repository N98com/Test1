// Verwijderde stukjes (volt/lumen/wattage/etc.) laten soms een leeg segment
// achter tussen " - "-scheidingstekens (bv. "5W -  - wit" of, als het eerste
// of laatste stukje verwijderd is, een los streepje aan het begin/eind).
// Zo'n leeg segment (en de streepjes eromheen) wordt hier opgeruimd. Een
// "kale" streep zonder spaties eromheen (zoals in een bereik als
// "2000-3000K") is geen scheidingsteken en blijft dus staan: die komt nooit
// twee keer achter elkaar voor, dus de {2,}-herhaling hieronder raakt 'm niet.
function collapseEmptySegments(text: string): string {
  return text
    .replace(/(?:\s*-\s*){2,}/g, ' - ')
    .replace(/^\s*-\s*/, '')
    .replace(/\s*-\s*$/, '')
    .trim();
}

// Verkort eenheden op stickers om ruimte te besparen: "5 watt" -> "5W", "2700 kelvin" -> "2700K".
// Volt en lumen worden volledig weggelaten (niet relevant op de sticker).
export function abbreviateForSticker(description: string, product?: { articleNumber: string; companyId: string }): string {
  let result = description
    .replace(/\s*\d+(?:[.,]\d+)?\s*volt\b/gi, '')
    .replace(/(\d+(?:[.,]\d+)?)\s*watt\b/gi, '$1W')
    .replace(/(\d+(?:[.,]\d+)?)\s*kelvin\b/gi, '$1K')
    .replace(/\s*\d+(?:[.,]\d+)?\s*lumen\b/gi, '')
    // Korte "k"-afkorting voor kelvin (bv. "2700k", ook in een bereik als
    // "2000-3000k") moet net als het volledige woord altijd een hoofdletter zijn.
    .replace(/(\d)\s*k\b/gi, '$1K')
    // "Maximaal 150W" -> "Max. 150W": scheelt ruimte op de sticker.
    .replace(/\bmaximaal\b/gi, 'Max.');

  // Wandlampen van LISL (artikelnummer begint met "WD"): "Up en/& Down" niet op de sticker.
  if (isWdArticle(product)) {
    result = result.replace(/\bup\s*(?:en|&|and)\s*down\b/gi, '');
  }

  result = collapseEmptySegments(result);

  return result.replace(/\s{2,}/g, ' ').trim();
}

function isWdArticle(product?: { articleNumber: string; companyId: string }): boolean {
  return !!product && product.companyId === 'lisl' && product.articleNumber.trim().toUpperCase().startsWith('WD');
}

function isLumaArticle(product?: { articleNumber: string; companyId: string }): boolean {
  return !!product && product.articleNumber.trim().toUpperCase().startsWith('LUMA');
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

// Luma-artikelen (artikelnummer begint met "LUMA"): de omschrijving bevat
// veel meer detail dan op de sticker past. Daar is altijd sprake van een Led
// Dimmer; alleen "Zigbee" (indien in de omschrijving vermeld) is relevant
// genoeg om erbij te zetten, de rest wordt weggelaten.
function lumaDescriptionLines(description: string): string[] {
  const hasZigbee = /zigbee/i.test(description) && !/\b(?:geen|niet|zonder)\s+zigbee/i.test(description);
  return [hasZigbee ? 'Led Dimmer Zigbee' : 'Led Dimmer'];
}

// Wandlampen (WD-): wattage staat al in het artikelnummer (bv. "WD-6W-..."), dus niet
// herhalen in de omschrijving. De resterende tekst wordt in twee regels geknipt op de
// kelvin-waarde, zodat "Led Wandlamp" en "3000K Zwart/Goud" los blijven i.p.v. één lange regel.
export function stickerDescriptionLines(description: string, product?: { articleNumber: string; companyId: string }): string[] {
  if (isLumaArticle(product)) return lumaDescriptionLines(description);

  const abbreviated = abbreviateForSticker(description, product);
  if (!isWdArticle(product)) return [abbreviated];

  const withoutWattage = collapseEmptySegments(
    abbreviated.replace(/\b\d+(?:[.,]\d+)?W\b/gi, ''),
  )
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Ook kelvin-bereiken zoals "2200-6500K" in hun geheel meenemen, niet alleen het laatste getal.
  const kelvinMatch = withoutWattage.match(/\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?K\b/i);
  if (!kelvinMatch || kelvinMatch.index === undefined) return [withoutWattage];

  const before = collapseEmptySegments(withoutWattage.slice(0, kelvinMatch.index));
  const from = withoutWattage.slice(kelvinMatch.index).trim();
  if (!before || !from) return [withoutWattage];

  return [before, from];
}
