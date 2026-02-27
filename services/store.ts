
import { Product, Order, ProductCategory, DailyStat, Customer, AppSettings } from '../types';

// Dữ liệu khởi tạo rỗng
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_CUSTOMERS: Customer[] = [];
const INITIAL_ORDERS: Order[] = [];

export const calculateDailyStats = (orders: Order[]): DailyStat[] => {
  const stats: DailyStat[] = [];
  const today = new Date();
  const map = new Map<string, DailyStat>();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const stat: DailyStat = { date: dateStr, revenue: 0, orders: 0, profit: 0 };
    stats.push(stat);
    map.set(dateStr, stat);
  }

  orders.forEach(order => {
    // Chỉ tính doanh thu/lợi nhuận từ đơn BÁN HÀNG (SALE)
    if (order.type === 'DEBT_COLLECTION') return;
    
    const dateStr = new Date(order.timestamp).toISOString().split('T')[0];
    const stat = map.get(dateStr);
    if (stat) {
      stat.revenue += order.totalAmount;
      stat.orders += 1;
      stat.profit += order.profit;
    }
  });

  return stats;
};

const apiCall = async (url: string, action: string, sheet: string, data?: any) => {
  if (action === 'getAll') {
    const t = new Date().getTime();
    try {
      const res = await fetch(`${url}?action=${action}&sheet=${sheet}&t=${t}`, {
        method: 'GET',
        redirect: 'follow'
      });
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON response:", text);
        throw new Error("Dữ liệu trả về bị lỗi định dạng.");
      }
    } catch (e) {
      console.error("Fetch Error:", e);
      throw e;
    }
  } else {
    const payload = JSON.stringify({ action, sheet, ...data });
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("API Response not JSON:", text);
      return { success: true }; // Fallback for old scripts
    }
  }
};

export const DataService = {
  getSettings: async (): Promise<AppSettings> => {
    const stored = localStorage.getItem('appSettings');
    return stored ? JSON.parse(stored) : { useGoogleSheets: false, googleSheetUrl: '' };
  },

  saveSettings: async (settings: AppSettings): Promise<void> => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  },

  // --- PRODUCTS ---
  getProducts: async (): Promise<Product[]> => {
    const settings = await DataService.getSettings();
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
      try {
        const data = await apiCall(settings.googleSheetUrl, 'getAll', 'Products');
        if (Array.isArray(data)) return data;
        return [];
      } catch (e) { console.error(e); }
    }
    const stored = localStorage.getItem('products');
    let products = stored ? JSON.parse(stored) : INITIAL_PRODUCTS;
    return products.map((p: any) => ({ ...p, code: p.code || `SP${p.id}` }));
  },

  saveProduct: async (product: Product): Promise<void> => {
    const settings = await DataService.getSettings();
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
      await apiCall(settings.googleSheetUrl, 'save', 'Products', { item: product });
    } else {
      const products = await DataService.getProducts();
      const index = products.findIndex(p => p.id === product.id);
      if (index >= 0) products[index] = product;
      else products.push(product);
      localStorage.setItem('products', JSON.stringify(products));
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    const settings = await DataService.getSettings();
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
       await apiCall(settings.googleSheetUrl, 'delete', 'Products', { id });
    } else {
      let products = await DataService.getProducts();
      products = products.filter(p => String(p.id) !== String(id));
      localStorage.setItem('products', JSON.stringify(products));
    }
  },

  deleteOutOfStockProducts: async (): Promise<number> => {
    const settings = await DataService.getSettings();
    let products = await DataService.getProducts();
    const toDeleteIds = products
      .filter(p => (Number(p.stock) <= 0 && p.category !== ProductCategory.PHOTO_SERVICE))
      .map(p => p.id);
    
    if (toDeleteIds.length === 0) return 0;
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
      for (const id of toDeleteIds) await apiCall(settings.googleSheetUrl, 'delete', 'Products', { id });
      return toDeleteIds.length;
    } else {
      const remaining = products.filter(p => !toDeleteIds.includes(p.id));
      localStorage.setItem('products', JSON.stringify(remaining));
      return toDeleteIds.length;
    }
  },

  // --- CUSTOMERS ---
  getCustomers: async (): Promise<Customer[]> => {
    const settings = await DataService.getSettings();
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
       try {
        const data = await apiCall(settings.googleSheetUrl, 'getAll', 'Customers');
        if (Array.isArray(data)) return data.map((c: any) => ({...c, debt: Number(c.debt) || 0}));
        return [];
       } catch (e) { console.error(e); }
    }
    const stored = localStorage.getItem('customers');
    const customers = stored ? JSON.parse(stored) : INITIAL_CUSTOMERS;
    return customers.map((c: any) => ({...c, debt: Number(c.debt) || 0}));
  },

  saveCustomer: async (customer: Customer): Promise<void> => {
    const settings = await DataService.getSettings();
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
       await apiCall(settings.googleSheetUrl, 'save', 'Customers', { item: customer });
    } else {
      const customers = await DataService.getCustomers();
      const index = customers.findIndex(c => c.id === customer.id);
      if (index >= 0) customers[index] = customer;
      else customers.push(customer);
      localStorage.setItem('customers', JSON.stringify(customers));
    }
  },

  collectDebt: async (id: string, amount: number, note?: string): Promise<void> => {
    const settings = await DataService.getSettings();
    const customers = await DataService.getCustomers();
    const customer = customers.find(c => c.id === id);
    if (!customer) throw new Error("Không tìm thấy khách hàng");
    
    // 1. Cập nhật nợ của khách hàng
    customer.debt = Math.max(0, (customer.debt || 0) - amount);
    
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
       await apiCall(settings.googleSheetUrl, 'save', 'Customers', { item: customer });
    } else {
       localStorage.setItem('customers', JSON.stringify(customers));
    }

    // 2. Tạo một Order bản ghi để lưu vào lịch sử (như một bằng chứng thanh toán)
    const debtOrder: Order = {
      id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      type: 'DEBT_COLLECTION',
      customerCode: customer.code,
      items: [{ productId: 'DEBT_PAY', productName: 'THANH TOÁN NỢ', quantity: 1, price: 0 }],
      totalAmount: 0, 
      profit: 0,
      paymentStatus: 'PAID',
      amountGiven: amount,
      changeDue: 0,
      debtAmount: 0,
      note: note || `Thu nợ khách hàng ${customer.name}`
    };

    if (settings.useGoogleSheets && settings.googleSheetUrl) {
      await apiCall(settings.googleSheetUrl, 'save', 'Orders', { item: debtOrder });
    } else {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      orders.push(debtOrder);
      localStorage.setItem('orders', JSON.stringify(orders));
    }
  },

  payOrderDebt: async (orderId: string, amount: number, note?: string): Promise<void> => {
    const settings = await DataService.getSettings();
    const orders = await DataService.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    if (order.debtAmount <= 0) throw new Error("Đơn hàng này đã thanh toán hết nợ");

    const paymentAmount = Math.min(amount, order.debtAmount);

    // 1. Cập nhật chính đơn hàng đó
    order.debtAmount -= paymentAmount;
    order.amountGiven += paymentAmount;
    order.paymentStatus = order.debtAmount <= 0 ? 'PAID' : 'PARTIAL';
    order.note = order.note ? `${order.note} | Trả thêm ${paymentAmount.toLocaleString()}₫ vào ${new Date().toLocaleDateString()}` : `Trả thêm ${paymentAmount.toLocaleString()}₫`;

    // 2. Lưu đơn hàng đã cập nhật
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
      await apiCall(settings.googleSheetUrl, 'save', 'Orders', { item: order });
    } else {
      localStorage.setItem('orders', JSON.stringify(orders));
    }

    // 3. Cập nhật nợ trên thẻ Khách hàng
    if (order.customerCode && order.customerCode !== 'GUEST') {
        const customers = await DataService.getCustomers();
        const customer = customers.find(c => c.code === order.customerCode);
        if (customer) {
            customer.debt = Math.max(0, (customer.debt || 0) - paymentAmount);
            if (settings.useGoogleSheets && settings.googleSheetUrl) {
                await apiCall(settings.googleSheetUrl, 'save', 'Customers', { item: customer });
            } else {
                localStorage.setItem('customers', JSON.stringify(customers));
            }
        }
    }

    // 4. Tạo một phiếu thu nợ riêng biệt để ghi log dòng tiền
    const collectionLog: Order = {
        id: `DEBT-${Date.now()}`,
        timestamp: Date.now(),
        type: 'DEBT_COLLECTION',
        customerCode: order.customerCode,
        items: [{ productId: 'ORDER_DEBT', productName: `TRẢ NỢ ĐƠN #${order.id.slice(-6).toUpperCase()}`, quantity: 1, price: 0 }],
        totalAmount: 0,
        profit: 0,
        paymentStatus: 'PAID',
        amountGiven: paymentAmount,
        changeDue: 0,
        debtAmount: 0,
        note: note || `Thanh toán nợ cho đơn hàng #${order.id}`
    };

    if (settings.useGoogleSheets && settings.googleSheetUrl) {
        await apiCall(settings.googleSheetUrl, 'save', 'Orders', { item: collectionLog });
    } else {
        const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        allOrders.push(collectionLog);
        localStorage.setItem('orders', JSON.stringify(allOrders));
    }
  },

  deleteCustomer: async (id: string): Promise<void> => {
    const settings = await DataService.getSettings();
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
      await apiCall(settings.googleSheetUrl, 'delete', 'Customers', { id });
    } else {
      let customers = await DataService.getCustomers();
      customers = customers.filter(c => String(c.id) !== String(id));
      localStorage.setItem('customers', JSON.stringify(customers));
    }
  },

  // --- ORDERS ---
  getOrders: async (): Promise<Order[]> => {
    const settings = await DataService.getSettings();
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
       try {
         const data = await apiCall(settings.googleSheetUrl, 'getAll', 'Orders');
         if (Array.isArray(data)) return data;
         return [];
       } catch (e) { console.error(e); }
    }
    const stored = localStorage.getItem('orders');
    return stored ? JSON.parse(stored) : INITIAL_ORDERS;
  },

  createOrder: async (order: Order, quickCustomerName?: string): Promise<void> => {
    const settings = await DataService.getSettings();
    
    const existingOrders = await DataService.getOrders();
    if (existingOrders.some(o => o.id === order.id)) {
      console.warn("Đơn hàng đã tồn tại. Bỏ qua ghi đè để tránh sai sót số liệu.");
      return;
    }

    if (!order.type) order.type = 'SALE';

    if (settings.useGoogleSheets && settings.googleSheetUrl) {
      await apiCall(settings.googleSheetUrl, 'save', 'Orders', { item: order });
    } else {
      const orders = [...existingOrders, order];
      localStorage.setItem('orders', JSON.stringify(orders));
    }
    
    if (order.type === 'SALE') {
      const products = await DataService.getProducts();
      for (const item of order.items) {
        const p = products.find(p => p.id === item.productId);
        if (p) {
          p.stock -= item.quantity;
          if (settings.useGoogleSheets && settings.googleSheetUrl) {
             await apiCall(settings.googleSheetUrl, 'save', 'Products', { item: p });
          }
        }
      }
      if (!settings.useGoogleSheets) {
         localStorage.setItem('products', JSON.stringify(products));
      }
    } else if (order.type === 'IMPORT') {
      const products = await DataService.getProducts();
      for (const item of order.items) {
        const p = products.find(p => p.id === item.productId);
        if (p) {
          // Calculate Weighted Average Cost
          const currentStock = Math.max(0, p.stock);
          const currentCost = p.cost || 0;
          const importQty = item.quantity;
          const importCost = item.price; // In IMPORT order, price is cost

          if (currentStock + importQty > 0) {
            p.cost = Math.round(((currentStock * currentCost) + (importQty * importCost)) / (currentStock + importQty));
          } else {
            p.cost = importCost;
          }

          p.stock += importQty;
          
          if (settings.useGoogleSheets && settings.googleSheetUrl) {
             await apiCall(settings.googleSheetUrl, 'save', 'Products', { item: p });
          }
        }
      }
      if (!settings.useGoogleSheets) {
         localStorage.setItem('products', JSON.stringify(products));
      }
    }

    const customers = await DataService.getCustomers();
    const cCode = order.customerCode || 'GUEST';
    let customer = customers.find(c => c.code === cCode);

    if (!customer) {
      customer = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        code: cCode,
        name: quickCustomerName || (cCode === 'GUEST' ? 'Khách lẻ vãng lai' : `Khách mới (${cCode})`),
        phone: cCode.match(/^\d+$/) ? cCode : '',
        group: 'RETAIL',
        totalSpent: 0,
        debt: 0
      };
      customers.push(customer);
    }

    customer.totalSpent += order.totalAmount;
    customer.lastPurchaseDate = order.timestamp;
    if (order.paymentStatus === 'DEBT' || order.paymentStatus === 'PARTIAL') {
       customer.debt = (customer.debt || 0) + (order.debtAmount || 0);
    }

    if (settings.useGoogleSheets && settings.googleSheetUrl) {
      await apiCall(settings.googleSheetUrl, 'save', 'Customers', { item: customer });
    } else {
      localStorage.setItem('customers', JSON.stringify(customers));
    }
  },

  syncLocalToCloud: async (onProgress: (count: number, total: number, msg: string) => void): Promise<void> => {
    const settings = await DataService.getSettings();
    if (!settings.useGoogleSheets || !settings.googleSheetUrl) throw new Error("Chưa cấu hình Google Sheets");

    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');

    const total = products.length + customers.length + orders.length;
    let count = 0;

    for (const p of products) {
      await apiCall(settings.googleSheetUrl, 'save', 'Products', { item: p });
      count++;
      onProgress(count, total, `Đang đẩy sản phẩm: ${p.name}`);
    }
    for (const c of customers) {
      await apiCall(settings.googleSheetUrl, 'save', 'Customers', { item: c });
      count++;
      onProgress(count, total, `Đang đẩy khách hàng: ${c.name}`);
    }
    for (const o of orders) {
      await apiCall(settings.googleSheetUrl, 'save', 'Orders', { item: o });
      count++;
      onProgress(count, total, `Đang đẩy đơn hàng: ${o.id}`);
    }
  },

  syncCloudToLocal: async (onProgress: (count: number, total: number, msg: string) => void): Promise<void> => {
    const settings = await DataService.getSettings();
    if (!settings.useGoogleSheets || !settings.googleSheetUrl) throw new Error("Chưa cấu hình Google Sheets");

    onProgress(1, 3, "Đang tải sản phẩm từ Cloud...");
    const products = await apiCall(settings.googleSheetUrl, 'getAll', 'Products');
    localStorage.setItem('products', JSON.stringify(products));

    onProgress(2, 3, "Đang tải khách hàng từ Cloud...");
    const customers = await apiCall(settings.googleSheetUrl, 'getAll', 'Customers');
    localStorage.setItem('customers', JSON.stringify(customers));

    onProgress(3, 3, "Đang tải đơn hàng từ Cloud...");
    const orders = await apiCall(settings.googleSheetUrl, 'getAll', 'Orders');
    localStorage.setItem('orders', JSON.stringify(orders));
  }
};
