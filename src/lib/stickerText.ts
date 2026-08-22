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

// Bekende kleurnamen (met een eventuele glans-aanduiding ervoor, die zelf niet
// getoond wordt: "Mat zwart" -> "Zwart"). Alleen deze woorden tellen als kleur;
// verdere styling-taal ("kantelbaar", "dimbaar", enz.) hoort bij "irrelevante
// informatie" en wordt niet apart herkend, maar valt vanzelf weg omdat het niet
// in de resterende "type"-tekst wordt opgenomen (zie extractStickerFacts).
const COLOR_WORDS = [
  'zwart', 'wit', 'goud', 'zilver', 'brons', 'grijs', 'antraciet', 'chroom',
  'koper', 'messing', 'rvs', 'inox', 'naturel', 'beige', 'bruin', 'rood',
  'blauw', 'groen', 'geel', 'oranje',
];
const COLOR_QUALIFIERS = ['mat', 'glans', 'glanzend', 'geborsteld', 'gepolijst', 'satijn'];

interface StickerFacts {
  type: string;
  watt: string;
  kelvin: string;
  color: string;
}

// Nieuwe, algemene aanpak (i.p.v. de hele omschrijving proberen te tonen):
// haalt alleen de vier dingen eruit die er echt toe doen op een sticker -
// producttype, wattage, kelvin en kleur - en laat al het overige (dimbaar,
// gestuurd, fase-afsnijding, enz.) gewoon weg. Watt/kelvin/volt/lumen-notatie
// wordt genormaliseerd zoals eerder (zie de hoofdletter-K- en Max.-regels
// hierboven), maar dan als aparte velden i.p.v. inline vervangingen.
function extractStickerFacts(description: string, options: { includeWatt: boolean }): StickerFacts {
  let text = description
    .replace(/[|,]/g, ' ')
    .replace(/\s*\d+(?:[.,]\d+)?\s*volt\b/gi, '')
    .replace(/\s*\d+(?:[.,]\d+)?\s*lumen\b/gi, '')
    // Functionele beschrijving (niet type/watt/kelvin/kleur) hoort niet meer
    // op de sticker thuis, bv. "Up en/& Down" bij wandlampen of "Maximaal"
    // (het getal zelf blijft gewoon staan, alleen dit woord ervoor niet).
    .replace(/\bup\s*(?:en|&|and)\s*down\b/gi, '')
    .replace(/\bmaximaal\b/gi, '')
    .replace(/\bdimbaar\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  let watt = '';
  const wattMatch = text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:w\b|watt\b)/i);
  if (wattMatch) {
    watt = `${wattMatch[1]}W`;
    text = text.replace(wattMatch[0], ' ');
  }

  let kelvin = '';
  const kelvinMatch = text.match(/\b(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)\s*(?:k\b|kelvin\b)/i);
  if (kelvinMatch) {
    kelvin = `${kelvinMatch[1].replace(/\s+/g, '')}K`;
    text = text.replace(kelvinMatch[0], ' ');
  }

  let color = '';
  const colorAlternation = COLOR_WORDS.join('|');
  for (const word of COLOR_WORDS) {
    // Ook een dubbele kleur meenemen (bv. "Zwart/Goud"), anders blijft de
    // tweede kleur na "/" los in de type-tekst hangen.
    const re = new RegExp(`\\b(?:(?:${COLOR_QUALIFIERS.join('|')})\\s+)?(${word})\\b(?:\\s*/\\s*(${colorAlternation})\\b)?`, 'i');
    const match = text.match(re);
    if (match) {
      const capitalize = (w: string) => w[0].toUpperCase() + w.slice(1).toLowerCase();
      color = match[2] ? `${capitalize(match[1])}/${capitalize(match[2])}` : capitalize(match[1]);
      text = text.replace(match[0], ' ');
      break;
    }
  }

  const type = collapseEmptySegments(text).replace(/\s{2,}/g, ' ').trim();

  return { type, watt: options.includeWatt ? watt : '', kelvin, color };
}

function factsToLines(facts: StickerFacts): string[] {
  const specLine = [facts.watt, facts.kelvin, facts.color].filter(Boolean).join(' ');
  return [facts.type, specLine].filter(Boolean);
}

// Elk artikel toont voortaan alleen het producttype en de kernspecs (watt,
// kelvin, kleur) in maximaal twee regels - geen losse woorden als "dimbaar"
// of "fase-afsnijding" meer, die maken de sticker onnodig druk. Luma-
// artikelen (dimmers) vallen hier expliciet buiten: die hebben geen kleur/
// kelvin en tonen altijd "Led Dimmer" (+ Zigbee, zie hierboven). Wandlampen
// (WD-) laten watt weg omdat dat al in het artikelnummer staat (bv. "WD-6W-...").
export function stickerDescriptionLines(description: string, product?: { articleNumber: string; companyId: string }): string[] {
  if (isLumaArticle(product)) return lumaDescriptionLines(description);

  const facts = extractStickerFacts(description, { includeWatt: !isWdArticle(product) });
  const lines = factsToLines(facts);
  return lines.length ? lines : [description.trim()];
}
