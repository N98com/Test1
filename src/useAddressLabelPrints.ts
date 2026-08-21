import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { AddressLabelPrint } from './types';

interface AddressLabelPrintRow {
  id: string;
  print_number: number;
  name: string;
  street: string;
  house_number: string;
  postcode: string;
  city: string;
  province: string;
  country: string;
  created_at: string;
  profiles: { email: string } | null;
}

const mapPrint = (row: AddressLabelPrintRow): AddressLabelPrint => ({
  id: row.id,
  printNumber: row.print_number,
  name: row.name,
  street: row.street,
  houseNumber: row.house_number,
  postcode: row.postcode,
  city: row.city,
  province: row.province,
  country: row.country,
  createdAt: row.created_at,
  createdByEmail: row.profiles?.email ?? null,
});

export interface RecordAddressLabelPrintInput {
  name: string;
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  province: string;
  country: string;
}

export function useAddressLabelPrints(canRead: boolean) {
  const [prints, setPrints] = useState<AddressLabelPrint[]>([]);
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
      .from('address_label_prints')
      .select('*, profiles(email)')
      .order('print_number', { ascending: false });

    if (requestId !== requestIdRef.current) return;

    if (error) console.error('Kon brieflabelhistorie niet laden:', error.message);
    else setPrints((data as AddressLabelPrintRow[]).map(mapPrint));

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
      .channel('address-label-print-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'address_label_prints' }, scheduleRefetch)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [canRead, refetch]);

  const recordPrint = useCallback(async (input: RecordAddressLabelPrintInput): Promise<string | null> => {
    const { error } = await supabase.from('address_label_prints').insert({
      id: crypto.randomUUID(),
      name: input.name,
      street: input.street,
      house_number: input.houseNumber,
      postcode: input.postcode,
      city: input.city,
      province: input.province,
      country: input.country,
    });
    if (error) return error.message;
    return null;
  }, []);

  return { prints, loading, recordPrint };
}
