export type PakbonOcrProgress = { status: string; progress: number };

// De tesseract.js-motor (workerscript, WASM-core en taalbestanden) wordt vanaf hier
// zelf gehost (public/tessdata) in plaats van van een CDN gehaald te worden: dat was de
// belangrijkste bron van onbetrouwbaarheid (CDN's die geblokkeerd/traag/onbereikbaar
// kunnen zijn op sommige netwerken). Nu wordt alles in één keer vanaf hetzelfde domein
// als de rest van de app opgehaald en daarna door de browser gecachet, dus werkt een
// volgende scan zelfs zonder internetverbinding.
const TESSDATA_BASE = `${import.meta.env.BASE_URL}tessdata`;

// Zet een afbeelding om naar grijstinten met verhoogd contrast: dit is een bekende,
// goedkope manier om de nauwkeurigheid van Tesseract flink te verbeteren bij foto's
// (in plaats van nette scans) - het verkleint kleurruis en laat tekst duidelijker
// afsteken tegen de achtergrond. Schaalt daarnaast (binnen redelijke grenzen) naar een
// resolutie waar Tesseract goed mee overweg kan: te klein verliest detail in kleine
// lettertjes, te groot kost alleen maar onnodig veel rekentijd.
function preprocessToCanvas(source: CanvasImageSource, sourceWidth: number, sourceHeight: number): HTMLCanvasElement {
  const MIN_DIMENSION = 1600;
  const MAX_DIMENSION = 3500;
  const largestSide = Math.max(sourceWidth, sourceHeight);
  let scale = 1;
  if (largestSide < MIN_DIMENSION) scale = MIN_DIMENSION / largestSide;
  else if (largestSide > MAX_DIMENSION) scale = MAX_DIMENSION / largestSide;

  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kon de afbeelding niet verwerken (canvas niet beschikbaar).');
  ctx.drawImage(source, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const CONTRAST = 1.35;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrasted = Math.min(255, Math.max(0, (gray - 128) * CONTRAST + 128));
    data[i] = contrasted;
    data[i + 1] = contrasted;
    data[i + 2] = contrasted;
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

async function imageFileToCanvas(file: File): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Deze afbeelding kon niet geopend worden. Probeer een andere foto (JPG of PNG).');
  }
  try {
    return preprocessToCanvas(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function renderPdfToCanvases(file: File): Promise<HTMLCanvasElement[]> {
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
    const buffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  } catch {
    throw new Error('Dit PDF-bestand kon niet geopend worden. Is het beschadigd of wachtwoord-beveiligd?');
  }

  const canvases: HTMLCanvasElement[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = viewport.width;
    renderCanvas.height = viewport.height;
    const context = renderCanvas.getContext('2d');
    if (!context) throw new Error('Kon PDF-pagina niet renderen.');
    await page.render({ canvasContext: context, viewport, canvas: renderCanvas }).promise;
    canvases.push(preprocessToCanvas(renderCanvas, renderCanvas.width, renderCanvas.height));
  }

  return canvases;
}

// Haalt alle tekst uit een geüploade foto of PDF van een pakbon via OCR (Tesseract.js,
// draait volledig in de browser, geen server). Bij een PDF wordt elke pagina eerst naar
// een canvas gerenderd (pdf.js) en los herkend; de tekst van alle pagina's wordt
// samengevoegd. Beide bestandstypen krijgen eerst dezelfde grijstinten/contrast-
// bewerking (zie preprocessToCanvas) voor betere herkenning.
export async function extractPakbonText(file: File, onProgress?: (p: PakbonOcrProgress) => void): Promise<string> {
  let createWorker: typeof import('tesseract.js').createWorker;
  let PSM: typeof import('tesseract.js').PSM;
  try {
    ({ createWorker, PSM } = await import('tesseract.js'));
  } catch {
    throw new Error('Kon de tekstherkenning niet laden. Controleer je internetverbinding en probeer opnieuw.');
  }

  let worker: Awaited<ReturnType<typeof createWorker>>;
  try {
    worker = await createWorker(['nld', 'eng'], undefined, {
      workerPath: `${TESSDATA_BASE}/worker.min.js`,
      corePath: `${TESSDATA_BASE}/core`,
      langPath: `${TESSDATA_BASE}/lang`,
      logger: (m) => onProgress?.({ status: m.status, progress: m.progress }),
    });
    // Zonder dit expliciet te zetten blijkt de gebruikte core-build in de praktijk op
    // SINGLE_BLOCK (6) te draaien: dat leest een pakbontabel als één lopende alinea en
    // laat daarbij regelmatig hele kolommen (zoals "Aantal") weg. AUTO (3) segmenteert
    // de pagina eerst in kolommen/regels zoals een tabel, en leest dan per rij - precies
    // wat nodig is om EAN/artikelnummer én aantal van dezelfde regel te kunnen matchen.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  } catch {
    throw new Error('Kon de tekstherkenning niet opstarten. Ververs de pagina en probeer het opnieuw.');
  }

  try {
    const canvases = file.type === 'application/pdf' ? await renderPdfToCanvases(file) : [await imageFileToCanvas(file)];

    const texts: string[] = [];
    for (const canvas of canvases) {
      try {
        const { data } = await worker.recognize(canvas);
        texts.push(data.text);
      } catch {
        throw new Error('De tekstherkenning is mislukt tijdens het lezen van de afbeelding. Probeer een andere/scherpere foto.');
      }
    }

    return texts.join('\n');
  } finally {
    await worker.terminate().catch(() => {});
  }
}
