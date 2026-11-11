// Leest een packing list als PDF met echte tekst (bv. vanuit Excel geëxporteerd)
// rechtstreeks via de tekstlaag uit, in plaats van via OCR: elke cel is dan een
// los tekststukje met een exacte positie. Per pagina wordt de kopregel gezocht
// ("Buyer code", "Cartons Qty", "Qty/CTN", "Buyer Art.no."), en elke waarde
// eronder hoort bij de kolom waarvan de kop het dichtst boven het midden ervan
// staat. Alleen de EAN (Buyer code) en het aantal dozen (Cartons Qty) worden
// gebruikt; Qty/CTN dient ter controle en Buyer Art.no. alleen om onbekende
// EAN's herkenbaar te melden.

export interface PdfTextItem {
  page: number;
  str: string;
  // Linkerkant en breedte in PDF-punten; y van onder naar boven (zoals in PDF).
  x: number;
  y: number;
  width: number;
}

export interface PackingListRow {
  ean: string;
  cartons: number | null;
  qtyPerCarton: number | null;
  articleNumber: string;
}

const COLUMN_EAN = 'buyer code';
const COLUMN_CARTONS = 'cartons qty';
const COLUMN_QTY_PER_CARTON = 'qty/ctn';
const COLUMN_ARTICLE = 'buyer art.no.';

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const centerX = (item: PdfTextItem) => item.x + item.width / 2;

// Waarden die verticaal iets verschoven staan (bv. bij een cel met twee regels
// tekst) horen nog bij dezelfde rij, maar niet verder dan dit (in PDF-punten).
const MAX_ROW_OFFSET = 14;

// Koppelt elk tekststukje aan de dichtstbijzijnde EAN-rij (op hoogte), en geeft
// per rij het stukje dat er zelf het dichtst bij ligt. Zo krijgt elke rij zijn
// eigen waarde, ook als cellen verticaal net anders uitgelijnd zijn, en valt een
// totaalregel onderaan af (die ligt dichter bij niets dan bij de laatste rij,
// maar die rij heeft zijn eigen, dichterbij gelegen waarde).
function nearestPerRow(rows: PdfTextItem[], candidates: PdfTextItem[]): Map<PdfTextItem, PdfTextItem> {
  const best = new Map<PdfTextItem, PdfTextItem>();
  for (const candidate of candidates) {
    let nearest: PdfTextItem | null = null;
    for (const row of rows) {
      if (!nearest || Math.abs(row.y - candidate.y) < Math.abs(nearest.y - candidate.y)) nearest = row;
    }
    if (!nearest || Math.abs(nearest.y - candidate.y) > MAX_ROW_OFFSET) continue;
    const current = best.get(nearest);
    if (!current || Math.abs(candidate.y - nearest.y) < Math.abs(current.y - nearest.y)) best.set(nearest, candidate);
  }
  return best;
}

// Geeft null als er nergens een "Buyer code"-kolom gevonden wordt: dan is dit
// geen packing list in dit formaat (of een gescande PDF zonder tekstlaag).
export function parsePackingList(items: PdfTextItem[]): PackingListRow[] | null {
  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  const result: PackingListRow[] = [];
  let foundHeader = false;

  for (const page of pages) {
    const pageItems = items.filter((i) => i.page === page && i.str.trim());
    const eanHeader = pageItems.find((i) => normalize(i.str) === COLUMN_EAN);
    if (!eanHeader) continue;
    foundHeader = true;

    // Alle koppen op (ongeveer) dezelfde hoogte als "Buyer code".
    const headers = pageItems.filter((i) => Math.abs(i.y - eanHeader.y) <= 8);
    const columnOf = (item: PdfTextItem) => {
      let nearest = headers[0];
      for (const h of headers) {
        if (Math.abs(centerX(h) - centerX(item)) < Math.abs(centerX(nearest) - centerX(item))) nearest = h;
      }
      return normalize(nearest.str);
    };

    const body = pageItems.filter((i) => i.y < eanHeader.y - 4);
    const inColumn = (column: string) => body.filter((i) => columnOf(i) === column);

    const eanItems = inColumn(COLUMN_EAN).filter((i) => /^\d{8,14}$/.test(i.str.replace(/\s/g, '')));
    if (eanItems.length === 0) continue;

    const numeric = (i: PdfTextItem) => /^\d+$/.test(i.str.trim());
    const cartons = nearestPerRow(eanItems, inColumn(COLUMN_CARTONS).filter(numeric));
    const qtyPerCarton = nearestPerRow(eanItems, inColumn(COLUMN_QTY_PER_CARTON).filter(numeric));

    // Een artikelnummer kan over twee regels staan ("BMDL-101" / "5W/IP44"):
    // alle stukjes die bij een rij horen samenvoegen, van boven naar beneden.
    const articleParts = new Map<PdfTextItem, PdfTextItem[]>();
    for (const part of inColumn(COLUMN_ARTICLE)) {
      let nearest: PdfTextItem | null = null;
      for (const row of eanItems) {
        if (!nearest || Math.abs(row.y - part.y) < Math.abs(nearest.y - part.y)) nearest = row;
      }
      if (!nearest || Math.abs(nearest.y - part.y) > MAX_ROW_OFFSET) continue;
      articleParts.set(nearest, [...(articleParts.get(nearest) ?? []), part]);
    }

    for (const row of [...eanItems].sort((a, b) => b.y - a.y)) {
      const cartonsItem = cartons.get(row);
      const qtyItem = qtyPerCarton.get(row);
      result.push({
        ean: row.str.replace(/\s/g, ''),
        cartons: cartonsItem ? parseInt(cartonsItem.str, 10) : null,
        qtyPerCarton: qtyItem ? parseInt(qtyItem.str, 10) : null,
        articleNumber: (articleParts.get(row) ?? [])
          .sort((a, b) => b.y - a.y)
          .map((p) => p.str.trim())
          .join(' '),
      });
    }
  }

  return foundHeader ? result : null;
}

// Alle tekststukjes uit een PDF, met positie. Leeg bij een gescande PDF (alleen
// afbeeldingen, geen tekstlaag).
export async function readPdfTextItems(file: File): Promise<PdfTextItem[]> {
  let pdfjsLib: typeof import('pdfjs-dist');
  let workerUrl: string;
  try {
    pdfjsLib = await import('pdfjs-dist');
    workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  } catch {
    throw new Error('Kon de PDF-verwerking niet laden. Controleer je internetverbinding en probeer opnieuw.');
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  } catch {
    throw new Error('Dit PDF-bestand kon niet geopend worden. Is het beschadigd of wachtwoord-beveiligd?');
  }

  const items: PdfTextItem[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!('str' in item)) continue;
      items.push({ page: pageNumber, str: item.str, x: item.transform[4], y: item.transform[5], width: item.width });
    }
  }
  return items;
}
