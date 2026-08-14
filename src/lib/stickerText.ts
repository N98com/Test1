// Verkort eenheden op stickers om ruimte te besparen: "5 watt" -> "5w", "2700 kelvin" -> "2700K".
// Volt en lumen worden volledig weggelaten (niet relevant op de sticker).
export function abbreviateForSticker(description: string): string {
  return description
    .replace(/\s*\d+(?:[.,]\d+)?\s*volt\b/gi, '')
    .replace(/(\d+(?:[.,]\d+)?)\s*watt\b/gi, '$1w')
    .replace(/(\d+(?:[.,]\d+)?)\s*kelvin\b/gi, '$1K')
    .replace(/\s*\d+(?:[.,]\d+)?\s*lumen\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
