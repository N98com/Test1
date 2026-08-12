// Verkort eenheden op stickers om ruimte te besparen: "230 volt" -> "230v", enz.
// Lumen wordt volledig weggelaten (niet relevant op de sticker).
export function abbreviateForSticker(description: string): string {
  return description
    .replace(/(\d+(?:[.,]\d+)?)\s*volt\b/gi, '$1v')
    .replace(/(\d+(?:[.,]\d+)?)\s*watt\b/gi, '$1w')
    .replace(/(\d+(?:[.,]\d+)?)\s*kelvin\b/gi, '$1k')
    .replace(/\s*\d+(?:[.,]\d+)?\s*lumen\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
