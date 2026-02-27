
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, OrderItem, Order, ProductCategory, Customer, PaymentStatus } from '../types';
import { DataService } from '../services/store';
import { Search, Plus, Minus, Trash2, ShoppingBag, LayoutGrid, List, User, X, CheckCircle, Calculator, UserCheck, Printer, ArrowRight, Edit2, RotateCcw, UserPlus, TrendingUp, Info } from 'lucide-react';
import Fuse from 'fuse.js';

export const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('LIST');
  const [showProfitPreview, setShowProfitPreview] = useState(false); 
  
  // Payment & Customer State
  const [customerCode, setCustomerCode] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editItemData, setEditItemData] = useState<{quantity: number, price: number} | null>(null);
  
  const [paymentMode, setPaymentMode] = useState<'NOW' | 'DEBT'>('NOW');
  const [amountGiven, setAmountGiven] = useState<number>(0);
  const [orderNote, setOrderNote] = useState('');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  
  const paymentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (cart.length > 0) {
      const isWholesale = foundCustomer?.group === 'WHOLESALE';
      setCart(prevCart => prevCart.map(item => {
        if (item.isCustomPrice) return item;
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const newPrice = isWholesale ? (product.wholesalePrice || product.price) : product.price;
          return { ...item, price: newPrice };
        }
        return item;
      }));
    }
  }, [foundCustomer, products]); 

  useEffect(() => {
    if (isPaymentModalOpen && paymentInputRef.current) paymentInputRef.current.focus();
  }, [isPaymentModalOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerCode) {
        const c = customers.find(cust => 
          cust.code.toLowerCase() === customerCode.toLowerCase() ||
          cust.phone === customerCode
        );
        setFoundCustomer(c || null);
        if (c) setQuickCustomerName('');
      } else {
        setFoundCustomer(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerCode, customers]);

  const loadData = async () => {
    const pData = await DataService.getProducts();
    const cData = await DataService.getCustomers();
    setProducts(pData);
    setCustomers(cData);
  };

  const addToCart = (product: Product) => {
    if (isProcessing) return; 
    if (product.category !== ProductCategory.PHOTO_SERVICE && product.stock <= 0) return;
    const isWholesale = foundCustomer?.group === 'WHOLESALE';
    const applicablePrice = isWholesale ? (product.wholesalePrice || product.price) : product.price;

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (product.category !== ProductCategory.PHOTO_SERVICE && existing.quantity >= product.stock) return prev; 
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, price: item.isCustomPrice ? item.price : applicablePrice }
            : item
        );
      }
      return [...prev, { 
        productId: product.id, productName: product.name, 
        quantity: 1, price: applicablePrice, isCustomPrice: false 
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    if (isProcessing) return;
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    if (isProcessing) return;
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        const maxStock = product?.category === ProductCategory.PHOTO_SERVICE ? 999999 : (product?.stock || 0);
        const newQty = Math.max(1, Math.min(item.quantity + delta, maxStock));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleOpenEditModal = (index: number) => {
    if (isProcessing) return;
    const item = cart[index];
    setEditingItemIndex(index);
    setEditItemData({ quantity: item.quantity, price: item.price });
  };

  const handleSaveEdit = () => {
    if (editingItemIndex !== null && editItemData) {
      setCart(prev => {
        const newCart = [...prev];
        const oldItem = newCart[editingItemIndex];
        const product = products.find(p => p.id === oldItem.productId);
        const isWholesale = foundCustomer?.group === 'WHOLESALE';
        const defaultPrice = product ? (isWholesale ? (product.wholesalePrice || product.price) : product.price) : oldItem.price;
        newCart[editingItemIndex] = {
          ...oldItem,
          quantity: editItemData.quantity,
          price: editItemData.price,
          isCustomPrice: editItemData.price !== defaultPrice
        };
        return newCart;
      });
      setEditingItemIndex(null);
      setEditItemData(null);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const estimatedProfit = useMemo(() => {
    return cart.reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        return acc + (item.price - product.cost) * item.quantity;
      }
      return acc;
    }, 0);
  }, [cart, products]);

  const changeDue = paymentMode === 'NOW' ? amountGiven - totalAmount : 0;
  const debtAmount = paymentMode === 'DEBT' ? Math.max(0, totalAmount - amountGiven) : 0;

  const handleConfirmPayment = async () => {
    if (isProcessing) return; 
    
    if (paymentMode === 'NOW' && amountGiven < totalAmount) {
      alert("Số tiền không đủ!"); return;
    }
    if (paymentMode === 'DEBT' && !customerCode && !foundCustomer) {
      alert("Phải có mã/tên khách để ghi nợ!"); return;
    }

    setIsProcessing(true);
    const uniqueOrderId = Date.now().toString() + Math.random().toString(36).substr(2, 6);
    const status: PaymentStatus = paymentMode === 'DEBT' ? (amountGiven > 0 ? 'PARTIAL' : 'DEBT') : 'PAID';
    const finalCustomerCode = foundCustomer ? foundCustomer.code : (customerCode || 'GUEST');

    const newOrder: Order = {
      id: uniqueOrderId,
      timestamp: Date.now(),
      items: [...cart],
      totalAmount,
      profit: estimatedProfit,
      customerCode: finalCustomerCode,
      paymentStatus: status,
      amountGiven,
      changeDue: paymentMode === 'NOW' ? changeDue : 0,
      debtAmount,
      note: orderNote
    };

    try {
      await DataService.createOrder(newOrder, quickCustomerName);
      setCart([]); setCustomerCode(''); setFoundCustomer(null); setQuickCustomerName('');
      setIsPaymentModalOpen(false);
      await loadData(); 
      setLastOrder(newOrder);
    } catch (err) {
      console.error(err);
      alert("Lỗi thanh toán! Vui lòng kiểm tra lại đơn hàng.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewOrder = () => setLastOrder(null);

  const fuse = useMemo(() => new Fuse(products, {
    keys: ['code', 'name', 'category'], threshold: 0.3
  }), [products]);

  const filteredProducts = useMemo(() => searchTerm.trim() ? fuse.search(searchTerm).map(r => r.item) : products, [searchTerm, products, fuse]);

  const quickMoneyOptions = [10000, 20000, 50000, 100000, 200000, 500000].filter(a => a >= totalAmount * 0.5);

  return (
    <div className={`flex flex-col lg:flex-row h-screen bg-slate-100 overflow-hidden relative ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
           <div className="relative w-full sm:w-2/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input 
              disabled={isProcessing}
              type="text" 
              placeholder="Tìm tên, mã sản phẩm..." 
              className="pl-10 pr-4 py-3 w-full border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button disabled={isProcessing} onClick={() => setViewMode('GRID')} className={`p-2 rounded-md ${viewMode === 'GRID' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><LayoutGrid size={20} /></button>
            <button disabled={isProcessing} onClick={() => setViewMode('LIST')} className={`p-2 rounded-md ${viewMode === 'LIST' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><List size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className={viewMode === 'GRID' ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 lg:pb-4" : "flex flex-col gap-1 pb-20 lg:pb-4"}>
            {filteredProducts.map((product) => {
              const isWholesale = foundCustomer?.group === 'WHOLESALE';
              const displayPrice = isWholesale ? (product.wholesalePrice || product.price) : product.price;
              const isOutOfStock = product.category !== ProductCategory.PHOTO_SERVICE && product.stock <= 0;
              
              if (viewMode === 'GRID') {
                return (
                  <div key={product.id} onClick={() => !isOutOfStock && !isProcessing && addToCart(product)} className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:border-blue-300 group ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="aspect-square bg-slate-100 relative">
                      <img src={product.imageUrl} className="w-full h-full object-cover" />
                      {isWholesale && <div className="absolute top-2 left-2 bg-indigo-500 text-white text-[10px] px-2 py-1 rounded-md font-bold">GIÁ SỈ</div>}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-slate-800 text-sm h-10 line-clamp-2">{product.name}</h3>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-blue-600">{displayPrice.toLocaleString('vi-VN')}</span>
                        <span className="text-[10px] text-slate-400">Kho: {product.stock}</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={product.id} 
                  onClick={() => !isOutOfStock && !isProcessing && addToCart(product)} 
                  className={`flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all ${isOutOfStock ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded border border-slate-100 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={product.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 px-1 bg-slate-100 rounded">{product.code}</span>
                        <h4 className="text-sm font-bold text-slate-700 truncate">{product.name}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{product.category}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 shrink-0 ml-4">
                    <div className="text-right">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tồn kho</p>
                       <p className={`text-xs font-black ${product.stock < 5 ? 'text-red-500' : 'text-slate-600'}`}>
                         {product.category === ProductCategory.PHOTO_SERVICE ? '∞' : product.stock}
                       </p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Đơn giá</p>
                      <div className="flex items-center justify-end gap-1">
                        {isWholesale && <span className="text-[8px] bg-indigo-500 text-white px-1 rounded font-black">SỈ</span>}
                        <p className="text-sm font-black text-blue-600">{displayPrice.toLocaleString('vi-VN')} ₫</p>
                      </div>
                    </div>
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                       <Plus size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="lg:w-96 w-full bg-white border-l border-slate-200 flex flex-col h-[45vh] lg:h-full shadow-xl z-10">
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex justify-between items-center">
             <h2 className="font-bold text-slate-800 flex items-center"><ShoppingBag className="mr-2" size={20}/> Đơn hàng</h2>
             <button 
                disabled={isProcessing}
                onClick={() => setShowProfitPreview(!showProfitPreview)} 
                className={`p-1.5 rounded-lg transition-colors ${showProfitPreview ? 'bg-green-100 text-green-600' : 'text-slate-300 hover:text-slate-400'}`}
                title="Xem lợi nhuận đơn này"
             >
                <TrendingUp size={18}/>
             </button>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              {foundCustomer ? <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" size={16}/> : <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>}
              <input 
                  disabled={isProcessing}
                  type="text"
                  placeholder="Mã KH / Số điện thoại..."
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none transition-all ${foundCustomer ? 'bg-green-50 border-green-300 font-bold text-green-700' : 'bg-slate-100 border-transparent'}`}
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
              />
            </div>
            
            {customerCode && !foundCustomer && (
              <div className="relative animate-fade-in">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={16}/>
                <input 
                  disabled={isProcessing}
                  type="text"
                  placeholder="Nhập tên khách mới..."
                  className="w-full pl-9 pr-3 py-2 border border-blue-200 rounded-lg text-sm outline-none bg-blue-50 font-medium text-blue-700 placeholder:text-blue-300"
                  value={quickCustomerName}
                  onChange={(e) => setQuickCustomerName(e.target.value)}
                />
              </div>
            )}
            
            {foundCustomer && <p className="text-xs text-green-600 font-bold flex items-center"><CheckCircle size={12} className="mr-1"/> Khách: {foundCustomer.name} ({foundCustomer.group === 'WHOLESALE' ? 'Sỉ' : 'Lẻ'})</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {cart.map((item, index) => (
            <div key={`${item.productId}-${index}`} className="flex flex-col p-3 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-bold text-slate-800 truncate flex-1 mr-2">{item.productName}</p>
                <div className="flex items-center gap-1">
                   <button disabled={isProcessing} onClick={() => handleOpenEditModal(index)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                   <button disabled={isProcessing} onClick={() => removeFromCart(item.productId)} className="p-1.5 text-red-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-[11px] text-slate-500 flex flex-col">
                   <span className={item.isCustomPrice ? "text-orange-600 font-bold" : ""}>
                     {item.price.toLocaleString('vi-VN')} ₫
                     {item.isCustomPrice && <span className="ml-1 text-[9px] bg-orange-100 px-1 rounded">Sửa tay</span>}
                   </span>
                </div>
                <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <button disabled={isProcessing} onClick={() => updateQuantity(item.productId, -1)} className="px-2 py-1 hover:bg-slate-50 text-slate-500"><Minus size={12}/></button>
                  <span className="w-8 text-center text-xs font-extrabold text-slate-700">{item.quantity}</span>
                  <button disabled={isProcessing} onClick={() => updateQuantity(item.productId, 1)} className="px-2 py-1 hover:bg-slate-50 text-slate-500"><Plus size={12}/></button>
                </div>
                <p className="text-sm text-blue-700 font-black">{(item.price * item.quantity).toLocaleString('vi-VN')} ₫</p>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10 opacity-40"><ShoppingBag size={48} className="mb-2"/><p className="text-sm font-medium">Giỏ hàng đang trống</p></div>}
        </div>

        <div className="p-4 border-t bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          {showProfitPreview && cart.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between animate-fade-in">
               <div className="flex items-center text-green-700">
                  <TrendingUp size={16} className="mr-2"/>
                  <span className="text-xs font-bold">Lợi nhuận ước tính</span>
               </div>
               <span className="text-sm font-black text-green-800">{estimatedProfit.toLocaleString('vi-VN')} ₫</span>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 text-sm font-medium">Tổng thanh toán</span>
            <span className="text-2xl font-black text-slate-900">{totalAmount.toLocaleString('vi-VN')} ₫</span>
          </div>
          <button 
            onClick={() => setIsPaymentModalOpen(true)} 
            disabled={cart.length === 0 || isProcessing} 
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Đang xử lý...' : 'THANH TOÁN'}
          </button>
        </div>
      </div>

      {editingItemIndex !== null && editItemData && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800">Tùy chỉnh</h3><button onClick={() => setEditingItemIndex(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
              <div className="p-5 space-y-5">
                 <div>
                   <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-wider">Số lượng</label>
                   <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" value={editItemData.quantity} onChange={(e) => setEditItemData({...editItemData, quantity: Number(e.target.value)})} autoFocus />
                 </div>
                 <div>
                   <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-wider">Đơn giá (VNĐ)</label>
                   <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" value={editItemData.price} onChange={(e) => setEditItemData({...editItemData, price: Number(e.target.value)})} />
                 </div>
                 <button onClick={handleSaveEdit} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all">Xác nhận</button>
              </div>
           </div>
         </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center text-sm">
                <Calculator className="mr-2 text-blue-600" size={18}/> Xác nhận đơn hàng
              </h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20}/>
              </button>
            </div>
            <div className="flex p-1 bg-slate-100 mx-4 mt-4 rounded-xl">
               <button onClick={() => {setPaymentMode('NOW'); setAmountGiven(totalAmount);}} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${paymentMode === 'NOW' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>TRẢ NGAY</button>
               <button onClick={() => {setPaymentMode('DEBT'); setAmountGiven(0);}} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${paymentMode === 'DEBT' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}>GHI NỢ</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center bg-blue-50/50 py-4 rounded-2xl border border-blue-100/50">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Cần thu khách</p>
                <p className="text-3xl font-black text-blue-700">{totalAmount.toLocaleString('vi-VN')} ₫</p>
                <div className="mt-2 flex items-center justify-center text-[9px] font-black text-slate-400 bg-white/80 w-fit mx-auto px-2 py-0.5 rounded-full border border-slate-100 capitalize">
                   <User size={8} className="mr-1"/> KHÁCH: {quickCustomerName || (foundCustomer ? foundCustomer.name : (customerCode || 'Lẻ vãng lai'))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">{paymentMode === 'NOW' ? 'Tiền mặt khách đưa' : 'Khách trả trước'}</label>
                <input ref={paymentInputRef} type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-center" value={amountGiven} onChange={(e) => setAmountGiven(Number(e.target.value))} onClick={(e) => (e.target as HTMLInputElement).select()} />
                {paymentMode === 'NOW' && (
                  <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                    {quickMoneyOptions.map(amount => (
                      <button key={amount} onClick={() => setAmountGiven(amount)} className="px-2 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all">{amount.toLocaleString('vi-VN')}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-xl border flex justify-between items-center transition-colors ${paymentMode === 'DEBT' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <span className="text-[10px] font-bold text-slate-500">{paymentMode === 'DEBT' ? 'Sẽ ghi vào sổ nợ' : 'Tiền thừa trả khách'}</span>
                <span className={`text-lg font-black ${paymentMode === 'DEBT' ? 'text-red-600' : 'text-green-700'}`}>{paymentMode === 'DEBT' ? debtAmount.toLocaleString('vi-VN') : changeDue.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-slate-200 transition-all"><RotateCcw size={14} className="mr-1.5"/> Sửa</button>
                 <button onClick={handleConfirmPayment} disabled={isProcessing} className={`flex-[2] py-3.5 text-white rounded-xl font-black text-sm shadow-xl transition-all active:scale-[0.97] ${paymentMode === 'DEBT' ? 'bg-red-600 shadow-red-100 hover:bg-red-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'} disabled:opacity-50`}>{isProcessing ? 'ĐANG LƯU...' : (paymentMode === 'DEBT' ? 'GHI NỢ' : 'HOÀN TẤT')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lastOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-green-600 p-8 text-center text-white relative">
               <CheckCircle size={56} className="mx-auto mb-3 text-white/90 drop-shadow-lg" />
               <h2 className="text-2xl font-black tracking-tight uppercase">Xong!</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-5">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                    <span>Khách hàng</span>
                    <span className="text-slate-800">{lastOrder.customerCode}</span>
                 </div>
                 <div className="space-y-3">
                    {lastOrder.items.map((it, i) => (
                       <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-600 font-medium truncate flex-1 mr-4">{it.quantity}x {it.productName}</span>
                          <span className="font-bold text-slate-800">{(it.price * it.quantity).toLocaleString('vi-VN')}</span>
                       </div>
                    ))}
                 </div>
                 <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
                    <div className="flex justify-between text-lg font-black text-slate-900"><span>Tổng:</span><span className="text-blue-600">{lastOrder.totalAmount.toLocaleString('vi-VN')} ₫</span></div>
                    {lastOrder.debtAmount > 0 ? <div className="flex justify-between text-xs text-red-600 font-black bg-red-50 p-2 rounded-lg border border-red-100"><span>Còn nợ:</span><span>{lastOrder.debtAmount.toLocaleString('vi-VN')} ₫</span></div> : <div className="flex justify-between text-xs text-green-600 font-bold"><span>Đã trả:</span><span>{lastOrder.amountGiven.toLocaleString('vi-VN')} ₫</span></div>}
                 </div>
              </div>
            </div>
            <div className="p-5 bg-white border-t border-slate-100 grid grid-cols-2 gap-4">
               <button onClick={() => window.print()} className="py-3.5 border-2 border-slate-100 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all"><Printer size={16} className="mr-1"/> IN BILL</button>
               <button onClick={handleNewOrder} className="py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black flex items-center justify-center hover:bg-black transition-all shadow-xl shadow-slate-200 uppercase tracking-wider">ĐƠN MỚI <ArrowRight size={16} className="ml-2"/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
