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
  'koper', 'messing', 'nikkel', 'gunmetal', 'rvs', 'inox', 'naturel', 'beige',
  'bruin', 'rood', 'blauw', 'groen', 'geel', 'oranje',
];
const COLOR_QUALIFIERS = ['mat', 'glans', 'glanzend', 'geborsteld', 'gepolijst', 'satijn'];

const QUALIFIER_RE = `(?:(?:${COLOR_QUALIFIERS.join('|')})\\s+)?`;
const COLOR_RE = `(?:${COLOR_WORDS.join('|')})`;
// Eén kleur of een combinatie ("Zwart & Goud", "Wit en Goud", "Zwart/Goud").
const COLOR_SEQUENCE_RE = new RegExp(
  `\\b${QUALIFIER_RE}${COLOR_RE}\\b(?:\\s*(?:/|&|\\+|\\ben\\b)\\s*${QUALIFIER_RE}${COLOR_RE}\\b)*`,
  'gi',
);

// Lichtkleur ("warm wit", "extra warm wit", ...) is geen behuizingskleur: de
// kelvinwaarde staat al op de sticker, en anders zou "wit" hieruit als kleur
// gezien worden terwijl de echte kleur (bv. "| Nikkel") verderop staat.
const LIGHT_COLOR_RE = /\b(?:extra\s+)?(?:warm|koel|koud|neutraal|daglicht)\s+wit\b/gi;

// Afkortingen (RVS) volledig in hoofdletters, overige kleuren met één hoofdletter.
const capitalize = (w: string) =>
  w.toLowerCase() === 'rvs' ? 'RVS' : w[0].toUpperCase() + w.slice(1).toLowerCase();

// Zet een gevonden kleurreeks om naar de sticker-notatie: glans-aanduiding
// weg, elke kleur met hoofdletter, en een combinatie met "/" blijft "/",
// anders " & " ("Zwart en goud" -> "Zwart & Goud").
function formatColor(sequence: string): string {
  const colors = [...sequence.matchAll(new RegExp(`\\b${COLOR_RE}\\b`, 'gi'))].map((m) => capitalize(m[0]));
  return colors.join(sequence.includes('/') ? '/' : ' & ');
}

interface StickerFacts {
  type: string;
  watt: string;
  kelvin: string;
  color: string;
}

const NUMBER = String.raw`\d+(?:\.\d+)?`;
// Watt, ook meerdere opties ("18W/25W").
const WATT_RE = new RegExp(String.raw`\b${NUMBER}\s*(?:w|watt)\b(?:\s*/\s*${NUMBER}\s*(?:w|watt)\b)*`, 'i');
// Kelvin, ook een bereik ("2000-3000 kelvin"), meerdere opties
// ("3000K/4000K/5000K") en een bereik zonder bovengrens ("2200 - kelvin").
const KELVIN_RE = new RegExp(
  String.raw`\b${NUMBER}(?:\s*-\s*${NUMBER})?(?:\s*-)?\s*(?:k|kelvin)\b(?:\s*/\s*${NUMBER}\s*(?:k|kelvin)\b)*`,
  'i',
);

// Nieuwe, algemene aanpak (i.p.v. de hele omschrijving proberen te tonen):
// haalt alleen de vier dingen eruit die er echt toe doen op een sticker -
// producttype, wattage, kelvin en kleur - en laat al het overige (dimbaar,
// gestuurd, fase-afsnijding, enz.) gewoon weg. Watt/kelvin/volt/lumen-notatie
// wordt genormaliseerd zoals eerder (zie de hoofdletter-K- en Max.-regels
// hierboven), maar dan als aparte velden i.p.v. inline vervangingen.
function extractStickerFacts(description: string, options: { includeWatt: boolean }): StickerFacts {
  let text = description
    // Lange streepjes ("2000–3000") gelijk trekken met een gewoon streepje.
    .replace(/[‒-―]/g, '-')
    // Decimale komma ("3,5 watt") als punt, zodat het getal heel blijft;
    // overige komma's en "|" zijn alleen scheidingstekens.
    .replace(/(\d),(\d)/g, '$1.$2')
    // Vóór het weghalen van "|": zo telt "dim to warm | Wit" niet als "warm wit".
    .replace(LIGHT_COLOR_RE, ' ')
    .replace(/[|,]/g, ' ')
    .replace(/\s*(?:voor\s+)?\d+(?:\.\d+)?(?:\s*(?:en|\/|-)\s*\d+(?:\.\d+)?)*\s*volt\b/gi, '')
    .replace(/\s*\d+(?:\.\d+)?\s*lumen\b/gi, '')
    // Functionele beschrijving (niet type/watt/kelvin/kleur) hoort niet meer
    // op de sticker thuis, bv. "Up en/& Down" bij wandlampen of "Maximaal"
    // (het getal zelf blijft gewoon staan, alleen dit woord ervoor niet).
    .replace(/\bup\s*(?:en|&|and)\s*down\b/gi, '')
    .replace(/\bmaximaal\b/gi, '')
    // "(wel) dimbaar" weg; "niet dimbaar" blijft wel staan, dat is juist
    // het verschil met een verder gelijk dimbaar artikel.
    .replace(/(?<!\bniet\s)\b(?:wel\s+)?dimbaar\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  let watt = '';
  const wattMatch = text.match(WATT_RE);
  if (wattMatch) {
    watt = [...wattMatch[0].matchAll(new RegExp(NUMBER, 'g'))].map((m) => `${m[0]}W`).join('/');
    text = text.replace(wattMatch[0], ' ');
  }

  let kelvin = '';
  const kelvinMatch = text.match(KELVIN_RE);
  if (kelvinMatch) {
    kelvin = kelvinMatch[0]
      .replace(/\s+/g, '')
      .replace(/-?(?:kelvin|k)\b/gi, 'K')
      .replace(/-K/g, 'K');
    text = text.replace(kelvinMatch[0], ' ');
  }

  // De productkleur staat meestal achteraan (vaak na "|"): bij meerdere
  // kleurvermeldingen telt dus de laatste.
  let color = '';
  const colorMatches = [...text.matchAll(COLOR_SEQUENCE_RE)];
  const colorMatch = colorMatches[colorMatches.length - 1];
  if (colorMatch) {
    color = formatColor(colorMatch[0]);
    text = text.slice(0, colorMatch.index) + ' ' + text.slice(colorMatch.index! + colorMatch[0].length);
  }

  const type = collapseEmptySegments(
    text
      // Lege haakjes en losse "/" die overblijven na het weghalen van watt/kelvin
      // (bv. "(18W)" of "2200K/flame"); "inbouw/opbouw" blijft gewoon staan.
      .replace(/\(\s*\)/g, ' ')
      .replace(/(^|\s)\/+|\/+(?=\s|$)/g, '$1'),
  )
    // " - " is in de omschrijving een scheidingsteken; op de sticker staan de
    // delen gewoon naast elkaar (anders breekt een regel af op een los streepje).
    .replace(/\s+-\s+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    // Vaste woordgroepen niet over twee regels verdelen (zie balanceTwoLines).
    .replace(/\bniet dimbaar\b|\bdim to warm\b/gi, (phrase) => phrase.replace(/ /g, '\u00a0'));

  return { type, watt: options.includeWatt ? watt : '', kelvin, color };
}

// Verdeelt tokens (los te breken type-woorden, plus watt/kelvin/kleur samen
// als één vast blok) zo gelijkmatig mogelijk over twee regels, i.p.v. altijd
// "hele type op regel 1, hele spec op regel 2": bij een lang type en een
// korte (of lege) spec zou dat één overvolle en één bijna lege regel geven,
// wat de tekst onnodig klein maakt terwijl de tweede regel amper gebruikt
// wordt. Door het omslagpunt te kiezen dat de regellengtes het dichtst bij
// elkaar brengt, past dezelfde tekst op minder brede regels en kan-ie dus
// groter (leesbaarder) afgedrukt worden.
function balanceTwoLines(tokens: string[]): string[] {
  if (tokens.length <= 1) return tokens;

  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < tokens.length; i += 1) {
    const line1 = tokens.slice(0, i).join(' ');
    const line2 = tokens.slice(i).join(' ');
    const diff = Math.abs(line1.length - line2.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }
  return [tokens.slice(0, bestSplit).join(' '), tokens.slice(bestSplit).join(' ')];
}

function factsToLines(facts: StickerFacts): string[] {
  const specLine = [facts.watt, facts.kelvin, facts.color].filter(Boolean).join(' ');
  const typeWords = facts.type.split(' ').filter(Boolean);
  const tokens = specLine ? [...typeWords, specLine] : typeWords;
  return balanceTwoLines(tokens);
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
