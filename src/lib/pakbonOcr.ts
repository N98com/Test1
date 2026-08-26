export type PakbonOcrProgress = { status: string; progress: number };

async function renderPdfToCanvases(file: File): Promise<HTMLCanvasElement[]> {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const canvases: HTMLCanvasElement[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    // Hogere schaal dan de standaard 1x geeft merkbaar betere OCR-herkenning van
    // kleine lettertjes/cijfers op een pakbon.
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Kon PDF-pagina niet renderen.');
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    canvases.push(canvas);
  }

  return canvases;
}

// Haalt alle tekst uit een geüploade foto of PDF van een pakbon via OCR (Tesseract.js,
// draait volledig in de browser). Bij een PDF wordt elke pagina eerst naar een canvas
// gerenderd (pdf.js) en los herkend; de tekst van alle pagina's wordt samengevoegd.
export async function extractPakbonText(file: File, onProgress?: (p: PakbonOcrProgress) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['nld', 'eng'], undefined, {
    logger: (m) => onProgress?.({ status: m.status, progress: m.progress }),
  });

  try {
    if (file.type === 'application/pdf') {
      const pages = await renderPdfToCanvases(file);
      const texts: string[] = [];
      for (const canvas of pages) {
        const { data } = await worker.recognize(canvas);
        texts.push(data.text);
      }
      return texts.join('\n');
    }

    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
