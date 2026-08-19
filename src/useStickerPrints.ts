import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { StickerPrint, StickerPrintItem } from './types';

interface StickerPrintItemRow {
  article_number: string;
  description: string;
  ean: string;
  company_id: string;
  units_per_box: number;
  copies: number;
}

interface StickerPrintRow {
  id: string;
  print_number: number;
  batch_number: string;
  include_barcode: boolean;
  created_at: string;
  profiles: { email: string } | null;
  sticker_print_items: StickerPrintItemRow[];
}

const mapItem = (row: StickerPrintItemRow): StickerPrintItem => ({
  articleNumber: row.article_number,
  description: row.description,
  ean: row.ean,
  companyId: row.company_id,
  unitsPerBox: row.units_per_box,
  copies: row.copies,
});

const mapPrint = (row: StickerPrintRow): StickerPrint => ({
  id: row.id,
  printNumber: row.print_number,
  batchNumber: row.batch_number,
  includeBarcode: row.include_barcode,
  createdAt: row.created_at,
  createdByEmail: row.profiles?.email ?? null,
  items: (row.sticker_print_items ?? []).map(mapItem),
});

export interface RecordPrintInput {
  batchNumber: string;
  includeBarcode: boolean;
  items: StickerPrintItem[];
}

export function useStickerPrints(canRead: boolean) {
  const [prints, setPrints] = useState<StickerPrint[]>([]);
  const [loading, setLoading] = useState(true);

  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!canRead) {
      setPrints([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const { data, error } = await supabase
      .from('sticker_prints')
      .select('*, profiles(email), sticker_print_items(*)')
      .order('print_number', { ascending: false });

    if (requestId !== requestIdRef.current) return;

    if (error) console.error('Kon stickerhistorie niet laden:', error.message);
    else setPrints((data as StickerPrintRow[]).map(mapPrint));

    setLoading(false);
  }, [canRead]);

  useEffect(() => {
    refetch();
    if (!canRead) return;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    function scheduleRefetch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refetch, 250);
    }

    const channel = supabase
      .channel('sticker-print-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sticker_prints' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sticker_print_items' }, scheduleRefetch)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [canRead, refetch]);

  const recordPrint = useCallback(async ({ batchNumber, includeBarcode, items }: RecordPrintInput): Promise<string | null> => {
    const printId = crypto.randomUUID();

    const { error: printError } = await supabase
      .from('sticker_prints')
      .insert({ id: printId, batch_number: batchNumber, include_barcode: includeBarcode });
    if (printError) return printError.message;

    const { error: itemsError } = await supabase.from('sticker_print_items').insert(
      items.map((item) => ({
        print_id: printId,
        article_number: item.articleNumber,
        description: item.description,
        ean: item.ean,
        company_id: item.companyId,
        units_per_box: item.unitsPerBox,
        copies: item.copies,
      })),
    );
    if (itemsError) return itemsError.message;

    return null;
  }, []);

  return { prints, loading, recordPrint };
}
