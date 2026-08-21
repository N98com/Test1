export interface Company {
  id: string;
  name: string;
}

export interface Warehouse {
  id: string;
  number: number;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  articleNumber: string;
  description: string;
  ean: string;
  companyId: string;
  unitsPerBox: number;
  createdAt: string;
}

export interface StockEntry {
  id: string;
  productId: string;
  warehouseId: string;
  batchNumber: string;
  quantity: number;
  createdAt: string;
}

export type MovementType = 'in' | 'out' | 'correction';

export interface Movement {
  id: string;
  type: MovementType;
  productId: string;
  warehouseId: string;
  batchNumber: string;
  quantity: number;
  createdAt: string;
  createdByEmail: string | null;
}

export interface StickerPrintItem {
  articleNumber: string;
  description: string;
  ean: string;
  companyId: string;
  unitsPerBox: number;
  copies: number;
}

export interface StickerPrint {
  id: string;
  printNumber: number;
  batchNumber: string;
  includeBarcode: boolean;
  createdAt: string;
  createdByEmail: string | null;
  items: StickerPrintItem[];
}

export interface AddressLabelPrint {
  id: string;
  printNumber: number;
  name: string;
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  province: string;
  country: string;
  createdAt: string;
  createdByEmail: string | null;
}

export type Role = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}
