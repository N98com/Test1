// Verkort eenheden op stickers om ruimte te besparen: "5 watt" -> "5W", "2700 kelvin" -> "2700K".
// Volt en lumen worden volledig weggelaten (niet relevant op de sticker).
export function abbreviateForSticker(description: string, product?: { articleNumber: string; companyId: string }): string {
  let result = description
    .replace(/\s*\d+(?:[.,]\d+)?\s*volt\b/gi, '')
    .replace(/(\d+(?:[.,]\d+)?)\s*watt\b/gi, '$1W')
    .replace(/(\d+(?:[.,]\d+)?)\s*kelvin\b/gi, '$1K')
    .replace(/\s*\d+(?:[.,]\d+)?\s*lumen\b/gi, '');

  // Wandlampen van LISL (artikelnummer begint met "WD"): "Up en/& Down" niet op de sticker.
  if (product?.companyId === 'lisl' && product.articleNumber.trim().toUpperCase().startsWith('WD')) {
    result = result.replace(/\bup\s*(?:en|&|and)\s*down\b/gi, '');
  }

  return result.replace(/\s{2,}/g, ' ').trim();
}
