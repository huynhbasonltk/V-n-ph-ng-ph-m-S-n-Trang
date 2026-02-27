
export enum ProductCategory {
  STATIONERY = 'Văn phòng phẩm',
  PHOTO_SERVICE = 'Dịch vụ Photo/In ấn',
  BOOKS = 'Sách/Truyện',
  OTHER = 'Khác'
}

export type CustomerGroup = 'RETAIL' | 'WHOLESALE';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: ProductCategory;
  price: number;
  wholesalePrice?: number;
  cost: number;
  stock: number;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  group: CustomerGroup;
  totalSpent: number;
  debt: number;
  lastPurchaseDate?: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  isCustomPrice?: boolean;
}

export type PaymentStatus = 'PAID' | 'DEBT' | 'PARTIAL';
export type OrderType = 'SALE' | 'DEBT_COLLECTION' | 'IMPORT'; // SALE: Bán hàng, DEBT_COLLECTION: Thu nợ, IMPORT: Nhập hàng

export interface Order {
  id: string;
  timestamp: number;
  type?: OrderType; // Loại đơn
  items: OrderItem[];
  totalAmount: number;
  profit: number;
  customerCode?: string;
  paymentStatus: PaymentStatus;
  amountGiven: number;
  changeDue: number;
  debtAmount: number;
  note?: string;
  taxStatus?: 'TAX' | 'NO_TAX';
  taxAmount?: number;
  sellerName?: string;
  sellerAddress?: string;
  sellerIdCard?: string;
  purchaseDate?: string; // YYYY-MM-DD
}

export interface DailyStat {
  date: string;
  revenue: number;
  orders: number;
  profit: number;
}

export interface AppSettings {
  useGoogleSheets: boolean;
  googleSheetUrl: string;
}

export type ViewState = 'DASHBOARD' | 'INVENTORY' | 'POS' | 'CUSTOMERS' | 'ORDERS' | 'SETTINGS';
