import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Company, Movement, MovementType, Product, StockEntry, Warehouse } from './types';

interface CompanyRow {
  id: string;
  name: string;
}

interface WarehouseRow {
  id: string;
  number: number;
  name: string;
  description: string;
}

interface ProductRow {
  id: string;
  article_number: string;
  description: string;
  ean: string;
  company_id: string;
  units_per_box: number;
  created_at: string;
}

interface StockEntryRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  batch_number: string;
  quantity: number;
  created_at: string;
}

interface MovementRow {
  id: string;
  type: MovementType;
  product_id: string;
  warehouse_id: string;
  batch_number: string;
  quantity: number;
  created_at: string;
}

const mapCompany = (row: CompanyRow): Company => ({ id: row.id, name: row.name });

const mapWarehouse = (row: WarehouseRow): Warehouse => ({
  id: row.id,
  number: row.number,
  name: row.name,
  description: row.description,
});

const mapProduct = (row: ProductRow): Product => ({
  id: row.id,
  articleNumber: row.article_number,
  description: row.description,
  ean: row.ean,
  companyId: row.company_id,
  unitsPerBox: row.units_per_box,
  createdAt: row.created_at,
});

const mapStockEntry = (row: StockEntryRow): StockEntry => ({
  id: row.id,
  productId: row.product_id,
  warehouseId: row.warehouse_id,
  batchNumber: row.batch_number,
  quantity: row.quantity,
  createdAt: row.created_at,
});

const mapMovement = (row: MovementRow): Movement => ({
  id: row.id,
  type: row.type,
  productId: row.product_id,
  warehouseId: row.warehouse_id,
  batchNumber: row.batch_number,
  quantity: row.quantity,
  createdAt: row.created_at,
});

export function useInventory(canReadHistory: boolean) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const [companiesRes, warehousesRes, productsRes, stockRes] = await Promise.all([
      supabase.from('companies').select('*'),
      supabase.from('warehouses').select('*').order('number'),
      supabase.from('products').select('*'),
      supabase.from('stock_entries').select('*'),
    ]);

    if (companiesRes.data) setCompanies((companiesRes.data as CompanyRow[]).map(mapCompany));
    if (warehousesRes.data) setWarehouses((warehousesRes.data as WarehouseRow[]).map(mapWarehouse));
    if (productsRes.data) setProducts((productsRes.data as ProductRow[]).map(mapProduct));
    if (stockRes.data) setStock((stockRes.data as StockEntryRow[]).map(mapStockEntry));

    if (canReadHistory) {
      const movementsRes = await supabase.from('movements').select('*').order('created_at', { ascending: false });
      if (movementsRes.data) setMovements((movementsRes.data as MovementRow[]).map(mapMovement));
    } else {
      setMovements([]);
    }

    setLoading(false);
  }, [canReadHistory]);

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_entries' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  async function addProduct(input: Omit<Product, 'id' | 'createdAt'>): Promise<{ product: Product | null; error: string | null }> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        article_number: input.articleNumber,
        description: input.description,
        ean: input.ean,
        company_id: input.companyId,
        units_per_box: input.unitsPerBox,
      })
      .select()
      .single();

    if (error || !data) {
      return { product: null, error: error?.message ?? 'Onbekende fout bij aanmaken artikel.' };
    }
    const product = mapProduct(data as ProductRow);
    setProducts((prev) => [...prev, product]);
    return { product, error: null };
  }

  async function updateProduct(id: string, patch: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<string | null> {
    const dbPatch: Partial<ProductRow> = {};
    if (patch.articleNumber !== undefined) dbPatch.article_number = patch.articleNumber;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.ean !== undefined) dbPatch.ean = patch.ean;
    if (patch.companyId !== undefined) dbPatch.company_id = patch.companyId;
    if (patch.unitsPerBox !== undefined) dbPatch.units_per_box = patch.unitsPerBox;

    const { error } = await supabase.from('products').update(dbPatch).eq('id', id);
    if (error) return error.message;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    return null;
  }

  async function deleteProduct(id: string): Promise<string | null> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return error.message;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setStock((prev) => prev.filter((s) => s.productId !== id));
    return null;
  }

  async function addStock(input: Omit<StockEntry, 'id' | 'createdAt'>): Promise<{ entry: StockEntry | null; error: string | null }> {
    const { data, error } = await supabase
      .from('stock_entries')
      .insert({
        product_id: input.productId,
        warehouse_id: input.warehouseId,
        batch_number: input.batchNumber,
        quantity: input.quantity,
      })
      .select()
      .single();

    if (error || !data) {
      return { entry: null, error: error?.message ?? 'Onbekende fout bij inboeken.' };
    }
    const entry = mapStockEntry(data as StockEntryRow);
    setStock((prev) => [...prev, entry]);

    await supabase.from('movements').insert({
      type: 'in',
      product_id: input.productId,
      warehouse_id: input.warehouseId,
      batch_number: input.batchNumber,
      quantity: input.quantity,
    });

    return { entry, error: null };
  }

  async function deleteStock(id: string): Promise<string | null> {
    const entry = stock.find((s) => s.id === id);
    const { error } = await supabase.from('stock_entries').delete().eq('id', id);
    if (error) return error.message;
    setStock((prev) => prev.filter((s) => s.id !== id));

    if (entry) {
      await supabase.from('movements').insert({
        type: 'correction',
        product_id: entry.productId,
        warehouse_id: entry.warehouseId,
        batch_number: entry.batchNumber,
        quantity: entry.quantity,
      });
    }
    return null;
  }

  async function removeStockQuantity(id: string, amount: number): Promise<string | null> {
    const entry = stock.find((s) => s.id === id);
    if (!entry) return 'Voorraadregel niet gevonden.';

    const remaining = entry.quantity - amount;
    const { error } =
      remaining > 0
        ? await supabase.from('stock_entries').update({ quantity: remaining }).eq('id', id)
        : await supabase.from('stock_entries').delete().eq('id', id);

    if (error) return error.message;

    setStock((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, quantity: Math.max(0, s.quantity - amount) } : s))
        .filter((s) => s.quantity > 0),
    );

    await supabase.from('movements').insert({
      type: 'out',
      product_id: entry.productId,
      warehouse_id: entry.warehouseId,
      batch_number: entry.batchNumber,
      quantity: amount,
    });

    return null;
  }

  return {
    companies,
    warehouses,
    products,
    stock,
    movements,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    addStock,
    deleteStock,
    removeStockQuantity,
  };
}
