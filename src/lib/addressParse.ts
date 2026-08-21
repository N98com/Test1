// Beste-poging parser voor los geplakte persoonsgegevens (naam, adres, evt.
// telefoon/e-mail/land/provincie in willekeurige volgorde, zonder duidelijke
// regelscheiding) naar de velden voor het brieflabel. Alles blijft daarna nog
// handmatig te corrigeren in het formulier, dit hoeft dus niet perfect te zijn.

export interface ParsedAddress {
  name: string;
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  province: string;
  country: string; // leeg = Nederland (of onbekend) -> niet op het label
}

const PROVINCES = [
  'Groningen',
  'Friesland',
  'Fryslân',
  'Drenthe',
  'Overijssel',
  'Flevoland',
  'Gelderland',
  'Utrecht',
  'Noord-Holland',
  'Noord Holland',
  'Zuid-Holland',
  'Zuid Holland',
  'Zeeland',
  'Noord-Brabant',
  'Noord Brabant',
  'Limburg',
];

// Nederland zelf wordt altijd genegeerd (niet op het label); een ander land
// juist niet, want dan is het voor de bezorging relevant.
const COUNTRIES = [
  'Nederland',
  'België',
  'Belgie',
  'Duitsland',
  'Frankrijk',
  'Luxemburg',
  'Spanje',
  'Italië',
  'Italie',
  'Verenigd Koninkrijk',
  'Engeland',
  'Oostenrijk',
  'Zwitserland',
  'Polen',
  'Portugal',
  'Denemarken',
  'Zweden',
  'Noorwegen',
  'Verenigde Staten',
  'Amerika',
];

// Grote(re) Nederlandse steden/plaatsen per provincie: betrouwbaarder dan
// postcode-reeksen, die niet netjes langs provinciegrenzen lopen.
const CITY_PROVINCE: Record<string, string> = {
  groningen: 'Groningen',
  winschoten: 'Groningen',
  veendam: 'Groningen',
  delfzijl: 'Groningen',
  hoogezand: 'Groningen',
  stadskanaal: 'Groningen',
  appingedam: 'Groningen',

  leeuwarden: 'Friesland',
  sneek: 'Friesland',
  drachten: 'Friesland',
  heerenveen: 'Friesland',
  harlingen: 'Friesland',
  franeker: 'Friesland',
  dokkum: 'Friesland',

  assen: 'Drenthe',
  emmen: 'Drenthe',
  hoogeveen: 'Drenthe',
  meppel: 'Drenthe',
  coevorden: 'Drenthe',
  roden: 'Drenthe',

  zwolle: 'Overijssel',
  enschede: 'Overijssel',
  deventer: 'Overijssel',
  almelo: 'Overijssel',
  hengelo: 'Overijssel',
  oldenzaal: 'Overijssel',
  kampen: 'Overijssel',
  steenwijk: 'Overijssel',

  almere: 'Flevoland',
  lelystad: 'Flevoland',
  dronten: 'Flevoland',
  emmeloord: 'Flevoland',
  urk: 'Flevoland',

  arnhem: 'Gelderland',
  nijmegen: 'Gelderland',
  apeldoorn: 'Gelderland',
  ede: 'Gelderland',
  doetinchem: 'Gelderland',
  zutphen: 'Gelderland',
  tiel: 'Gelderland',
  harderwijk: 'Gelderland',
  wageningen: 'Gelderland',
  culemborg: 'Gelderland',
  winterswijk: 'Gelderland',

  utrecht: 'Utrecht',
  amersfoort: 'Utrecht',
  nieuwegein: 'Utrecht',
  veenendaal: 'Utrecht',
  zeist: 'Utrecht',
  woerden: 'Utrecht',
  houten: 'Utrecht',

  amsterdam: 'Noord-Holland',
  haarlem: 'Noord-Holland',
  alkmaar: 'Noord-Holland',
  zaanstad: 'Noord-Holland',
  hoorn: 'Noord-Holland',
  haarlemmermeer: 'Noord-Holland',
  'den helder': 'Noord-Holland',
  purmerend: 'Noord-Holland',
  hilversum: 'Noord-Holland',
  amstelveen: 'Noord-Holland',
  volendam: 'Noord-Holland',

  rotterdam: 'Zuid-Holland',
  'den haag': 'Zuid-Holland',
  "'s-gravenhage": 'Zuid-Holland',
  leiden: 'Zuid-Holland',
  dordrecht: 'Zuid-Holland',
  zoetermeer: 'Zuid-Holland',
  delft: 'Zuid-Holland',
  gouda: 'Zuid-Holland',
  'alphen aan den rijn': 'Zuid-Holland',
  spijkenisse: 'Zuid-Holland',
  vlaardingen: 'Zuid-Holland',
  schiedam: 'Zuid-Holland',

  middelburg: 'Zeeland',
  vlissingen: 'Zeeland',
  goes: 'Zeeland',
  terneuzen: 'Zeeland',
  zierikzee: 'Zeeland',

  eindhoven: 'Noord-Brabant',
  tilburg: 'Noord-Brabant',
  breda: 'Noord-Brabant',
  "'s-hertogenbosch": 'Noord-Brabant',
  'den bosch': 'Noord-Brabant',
  helmond: 'Noord-Brabant',
  roosendaal: 'Noord-Brabant',
  'bergen op zoom': 'Noord-Brabant',
  oss: 'Noord-Brabant',

  maastricht: 'Limburg',
  venlo: 'Limburg',
  heerlen: 'Limburg',
  sittard: 'Limburg',
  roermond: 'Limburg',
  kerkrade: 'Limburg',
  weert: 'Limburg',
};

// Ruwe, benaderende terugval op basis van de eerste cijfers van de postcode,
// voor het geval de plaatsnaam niet herkend wordt. Postcodes lopen niet netjes
// langs provinciegrenzen, dus dit is bewust grof or benaderend.
const POSTCODE_PREFIX_PROVINCE: { max: number; province: string }[] = [
  { max: 1299, province: 'Noord-Holland' },
  { max: 1349, province: 'Flevoland' },
  { max: 2099, province: 'Noord-Holland' },
  { max: 3299, province: 'Zuid-Holland' },
  { max: 3999, province: 'Utrecht' },
  { max: 4699, province: 'Zeeland' },
  { max: 5799, province: 'Noord-Brabant' },
  { max: 6499, province: 'Limburg' },
  { max: 6999, province: 'Gelderland' },
  { max: 7799, province: 'Overijssel' },
  { max: 7999, province: 'Drenthe' },
  { max: 8299, province: 'Overijssel' },
  { max: 8999, province: 'Friesland' },
  { max: 9499, province: 'Groningen' },
  { max: 9699, province: 'Drenthe' },
  { max: 9999, province: 'Groningen' },
];

const TUSSENVOEGSELS = new Set([
  'de', 'den', 'der', 'van', 'ter', 'ten', 'te', "'t", 'in', 'uit', 'aan', 'op', 'onder', 'over', 'bij', 'la', 'le', 'du', "d'",
]);

// Splitst het gedeelte vóór het huisnummer in voornaam+achternaam en straatnaam.
// Houdt rekening met Nederlandse tussenvoegsels ("Jan de Vries", "Anne van der Berg")
// zodat die niet per ongeluk bij de straatnaam belanden.
function splitNameAndStreet(beforeNumber: string[]): { name: string; street: string } {
  if (beforeNumber.length === 0) return { name: '', street: '' };

  const nameWords = [beforeNumber[0]];
  let idx = 1;
  while (idx < beforeNumber.length && TUSSENVOEGSELS.has(beforeNumber[idx].toLowerCase())) {
    nameWords.push(beforeNumber[idx]);
    idx++;
  }
  if (idx < beforeNumber.length) {
    nameWords.push(beforeNumber[idx]);
    idx++;
  }

  return { name: nameWords.join(' '), street: beforeNumber.slice(idx).join(' ') };
}

// Token-gebaseerd i.p.v. regex-\b: bij \b breekt de woordgrens-check op accenten
// ("België" eindigt op "ë", geen \w-teken, dus \b zit daar nooit) en dit voorkomt
// dat soort false negatives sowieso.
function findAndStrip(text: string, terms: string[]): { match: string | null; rest: string } {
  const words = text.split(' ').filter(Boolean);
  for (const term of terms) {
    const termWords = term.split(' ');
    for (let i = 0; i <= words.length - termWords.length; i += 1) {
      let matches = true;
      for (let j = 0; j < termWords.length; j += 1) {
        if (words[i + j].toLowerCase() !== termWords[j].toLowerCase()) {
          matches = false;
          break;
        }
      }
      if (matches) {
        const rest = [...words.slice(0, i), ...words.slice(i + termWords.length)].join(' ');
        return { match: term, rest };
      }
    }
  }
  return { match: null, rest: text };
}

function provinceForPostcode(postcode: string): string {
  const digits = parseInt(postcode.slice(0, 4), 10);
  if (Number.isNaN(digits)) return '';
  const entry = POSTCODE_PREFIX_PROVINCE.find((e) => digits <= e.max);
  return entry?.province ?? '';
}

// Onzichtbare marker die de oorspronkelijke plek van de postcode in de tekst
// vasthoudt, ook nadat land/provincie/telefoonnummer er later omheen worden
// weggehaald. Nodig omdat een geplakt adres in allerlei volgordes kan komen
// (straat+nummer vóór of ná postcode+plaats, met soms een ander cijfer-woord
// ertussen zoals een klant- of ordernummer): het huisnummer is niet zomaar
// "het eerste cijfer-woord in de tekst", maar het cijfer-woord dat het dichtst
// bij de postcode staat, zodat huisnummer en postcode altijd bij elkaar horen.
const POSTCODE_MARKER = 'POSTCODEMARKER';

export function parseAddressBlock(raw: string): ParsedAddress {
  let text = raw.replace(/\n/g, ' ').replace(/[, ]/g, ' ').replace(/\s+/g, ' ').trim();

  // E-mail eruit.
  text = text.replace(/\S+@\S+\.\S+/g, ' ');

  // Postcode eruit (en genormaliseerd bewaren), met een marker op zijn plek.
  let postcode = '';
  const postcodeMatch = text.match(/\b(\d{4})\s?([A-Za-z]{2})\b/);
  if (postcodeMatch) {
    postcode = `${postcodeMatch[1]} ${postcodeMatch[2].toUpperCase()}`;
    text = text.replace(postcodeMatch[0], ` ${POSTCODE_MARKER} `);
  }

  // Land eruit; "Nederland" wordt genegeerd, een ander land bewaard.
  const countryResult = findAndStrip(text, COUNTRIES);
  text = countryResult.rest;
  const country = countryResult.match && countryResult.match.toLowerCase() !== 'nederland' ? countryResult.match : '';

  // Provincie eruit, indien letterlijk aanwezig.
  const provinceResult = findAndStrip(text, PROVINCES);
  text = provinceResult.rest;
  let province = provinceResult.match ?? '';

  // Telefoonnummers eruit: tokens die alleen uit cijfers/spaties/streepjes/plus bestaan (6+ cijfers).
  text = text
    .split(/\s+/)
    .filter((token) => {
      const digitsOnly = token.replace(/[\s\-+()]/g, '');
      return !(digitsOnly.length >= 6 && /^\d+$/.test(digitsOnly));
    })
    .join(' ');

  text = text.replace(/\s+/g, ' ').trim();
  const words = text.length ? text.split(' ') : [];
  const markerIndex = words.indexOf(POSTCODE_MARKER);

  // Kandidaat-huisnummers: alle overgebleven cijfer-woorden, m.u.v. de marker zelf.
  // Kies de kandidaat die het dichtst bij de postcode staat, niet zomaar de eerste
  // in de hele tekst (anders kaapt bv. een klantnummer vóór het echte adres het
  // huisnummer-veld terwijl postcode/plaats gewoon van het echte adres komen).
  const digitIndices: number[] = [];
  for (let i = 0; i < words.length; i += 1) {
    if (i !== markerIndex && /^\d/.test(words[i])) digitIndices.push(i);
  }
  let numberIndex = -1;
  if (digitIndices.length > 0) {
    numberIndex = markerIndex === -1
      ? digitIndices[0]
      : digitIndices.reduce((best, i) => (Math.abs(i - markerIndex) < Math.abs(best - markerIndex) ? i : best));
  }

  let name = '';
  let street = '';
  let houseNumber = '';
  let cityWords: string[] = [];

  if (numberIndex === -1) {
    // Geen huisnummer gevonden: geen straat/plaats te bepalen.
    ({ name, street } = splitNameAndStreet(words.filter((w) => w !== POSTCODE_MARKER)));
  } else {
    houseNumber = words[numberIndex];
    let afterNumberIndex = numberIndex + 1;
    // Toevoeging direct na het huisnummer ("Geelster 3 A") bij het nummer trekken,
    // anders belandt die per ongeluk bij de plaatsnaam.
    if (
      afterNumberIndex < words.length &&
      words[afterNumberIndex] !== POSTCODE_MARKER &&
      /^[A-Za-z]{1,2}$/.test(words[afterNumberIndex])
    ) {
      houseNumber += ` ${words[afterNumberIndex]}`;
      afterNumberIndex += 1;
    }

    const beforeNumber = words.slice(0, numberIndex).filter((w) => w !== POSTCODE_MARKER);
    ({ name, street } = splitNameAndStreet(beforeNumber));
    cityWords = words.slice(afterNumberIndex).filter((w) => w !== POSTCODE_MARKER);
  }

  // Dubbel voorkomende plaatsnaam (bv. twee keer "Oldenzaal") ontdubbelen.
  const seen = new Set<string>();
  const dedupedCity: string[] = [];
  for (const w of cityWords) {
    const key = w.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      dedupedCity.push(w);
    }
  }
  let city = dedupedCity.join(' ');

  if (!province) {
    const cityKey = city.toLowerCase();
    province = CITY_PROVINCE[cityKey] ?? (postcode ? provinceForPostcode(postcode) : '');
  } else if (!city && CITY_PROVINCE[province.toLowerCase()] === province) {
    // Plaatsen die toevallig hetzelfde heten als hun provincie (Groningen, Utrecht,
    // Limburg) werden hierboven als provincie herkend en weggehaald; de plaatsnaam
    // is dan gelijk aan de provincie.
    city = province;
  }

  return { name, street, houseNumber, postcode, city, province, country };
}
