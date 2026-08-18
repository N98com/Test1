import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { barcodeFormatForEan } from '../lib/barcodeFormat';

interface Props {
  ean: string;
  width?: number;
  height?: number;
  fontSize?: number;
  margin?: number;
}

export function BarcodeSvg({ ean, width = 2, height = 90, fontSize = 22, margin = 10 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const options = { width, height, fontSize, margin, lineColor: '#000000' };
    try {
      JsBarcode(svgRef.current, ean, { ...options, format: barcodeFormatForEan(ean) });
    } catch {
      // Checksum van de EAN klopt niet (typefout e.d.): val terug op CODE128
      // zodat er alsnog een werkende barcode ontstaat.
      JsBarcode(svgRef.current, ean, { ...options, format: 'CODE128' });
    }
  }, [ean, width, height, fontSize, margin]);

  return <svg ref={svgRef} />;
}
