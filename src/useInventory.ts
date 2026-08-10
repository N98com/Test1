import { useEffect, useState } from 'react';
import type { Product, StockEntry } from './types';

const PRODUCTS_KEY = 'inventory.products.v1';
const STOCK_KEY = 'inventory.stock.v1';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useInventory() {
  const [products, setProducts] = useState<Product[]>(() => load(PRODUCTS_KEY, []));
  const [stock, setStock] = useState<StockEntry[]>(() => load(STOCK_KEY, []));

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
  }, [stock]);

  function addProduct(input: Omit<Product, 'id' | 'createdAt'>): Product {
    const product: Product = {
      ...input,
      id: makeId(),
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [...prev, product]);
    return product;
  }

  function updateProduct(id: string, patch: Partial<Omit<Product, 'id' | 'createdAt'>>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function deleteProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setStock((prev) => prev.filter((s) => s.productId !== id));
  }

  function addStock(input: Omit<StockEntry, 'id' | 'createdAt'>): StockEntry {
    const entry: StockEntry = {
      ...input,
      id: makeId(),
      createdAt: new Date().toISOString(),
    };
    setStock((prev) => [...prev, entry]);
    return entry;
  }

  function deleteStock(id: string) {
    setStock((prev) => prev.filter((s) => s.id !== id));
  }

  function removeStockQuantity(id: string, amount: number) {
    setStock((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, quantity: Math.max(0, s.quantity - amount) } : s))
        .filter((s) => s.quantity > 0),
    );
  }

  return {
    products,
    stock,
    addProduct,
    updateProduct,
    deleteProduct,
    addStock,
    deleteStock,
    removeStockQuantity,
  };
}
