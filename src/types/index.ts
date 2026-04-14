export interface Medicine {
  id: string;
  name: string;
  price: number;
  quantity: number;
  expiryDate: string; // ISO date string YYYY-MM-DD
  batchNumber: string;
  reorderLevel: number; // Custom threshold for low stock alert
  createdAt: string;
}

export interface SaleItem {
  medicineId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  billNumber?: number;
  items: SaleItem[];
  totalAmount: number;
  createdAt: string;
}

export interface CartItem extends SaleItem {
  maxQuantity: number;
}
