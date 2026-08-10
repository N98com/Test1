import { useEffect, useState } from 'react';
import type { Movement, MovementType, Product, StockEntry } from './types';

const PRODUCTS_KEY = 'inventory.products.v1';
const STOCK_KEY = 'inventory.stock.v1';
const MOVEMENTS_KEY = 'inventory.movements.v1';

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
  const [movements, setMovements] = useState<Movement[]>(() => load(MOVEMENTS_KEY, []));

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
  }, [stock]);

  useEffect(() => {
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
  }, [movements]);

  function addMovement(
    type: MovementType,
    productId: string,
    warehouseId: string,
    batchNumber: string,
    quantity: number,
  ) {
    const movement: Movement = {
      id: makeId(),
      type,
      productId,
      warehouseId,
      batchNumber,
      quantity,
      createdAt: new Date().toISOString(),
    };
    setMovements((prev) => [movement, ...prev]);
  }

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
    addMovement('in', input.productId, input.warehouseId, input.batchNumber, input.quantity);
    return entry;
  }

  function deleteStock(id: string) {
    const entry = stock.find((s) => s.id === id);
    setStock((prev) => prev.filter((s) => s.id !== id));
    if (entry) {
      addMovement('correction', entry.productId, entry.warehouseId, entry.batchNumber, entry.quantity);
    }
  }

  function removeStockQuantity(id: string, amount: number) {
    const entry = stock.find((s) => s.id === id);
    setStock((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, quantity: Math.max(0, s.quantity - amount) } : s))
        .filter((s) => s.quantity > 0),
    );
    if (entry) {
      addMovement('out', entry.productId, entry.warehouseId, entry.batchNumber, amount);
    }
  }

  return {
    products,
    stock,
    movements,
    addProduct,
    updateProduct,
    deleteProduct,
    addStock,
    deleteStock,
    removeStockQuantity,
  };
}
