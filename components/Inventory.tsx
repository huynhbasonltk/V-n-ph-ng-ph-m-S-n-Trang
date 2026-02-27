
import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductCategory, Order, OrderItem } from '../types';
import { DataService } from '../services/store';
import { Plus, Search, Edit2, Trash2, Save, X, Eye, EyeOff, ShieldAlert, Barcode, Eraser, Tags, Filter, TrendingUp, Info, Minus } from 'lucide-react';

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Import Order State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCart, setImportCart] = useState<OrderItem[]>([]);
  const [importTaxStatus, setImportTaxStatus] = useState<'TAX' | 'NO_TAX'>('NO_TAX');
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [importNote, setImportNote] = useState('');
  
  // Import Seller Info (For NO_TAX)
  const [importSellerName, setImportSellerName] = useState('');
  const [importSellerAddress, setImportSellerAddress] = useState('');
  const [importSellerIdCard, setImportSellerIdCard] = useState('');
  const [importPurchaseDate, setImportPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '',
    name: '',
    category: ProductCategory.STATIONERY,
    price: 0,
    wholesalePrice: 0,
    cost: 0,
    stock: 0,
    imageUrl: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await DataService.getProducts();
    setProducts(data);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product, wholesalePrice: product.wholesalePrice || product.price });
    } else {
      setEditingProduct(null);
      setFormData({
        code: '',
        name: '',
        category: ProductCategory.STATIONERY,
        price: 0,
        wholesalePrice: 0,
        cost: 0,
        stock: 0,
        imageUrl: `https://cdn-icons-png.flaticon.com/512/2541/2541988.png`
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    setIsLoading(true);

    const isService = formData.category === ProductCategory.PHOTO_SERVICE;
    const finalStock = isService ? 1000000000 : Number(formData.stock);

    const productToSave: Product = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      code: formData.code || `SP${Date.now()}`,
      name: formData.name,
      category: formData.category as ProductCategory,
      price: Number(formData.price),
      wholesalePrice: Number(formData.wholesalePrice) || Number(formData.price),
      cost: Number(formData.cost),
      stock: finalStock,
      imageUrl: formData.imageUrl || 'https://cdn-icons-png.flaticon.com/512/2541/2541988.png'
    };

    try {
      await DataService.saveProduct(productToSave);
      await loadProducts();
      setIsModalOpen(false);
    } catch (error) {
      alert("Lỗi khi lưu sản phẩm: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      setIsLoading(true);
      try {
        await DataService.deleteProduct(id);
        await loadProducts();
      } catch (error) {
        alert("Không thể xóa sản phẩm. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCleanup = async () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả sản phẩm có tồn kho bằng 0 (trừ dịch vụ)?')) {
      setIsLoading(true);
      try {
        const count = await DataService.deleteOutOfStockProducts();
        if (count > 0) {
          alert(`Đã xóa ${count} sản phẩm hết hàng.`);
          await loadProducts();
        } else {
          alert('Không có sản phẩm nào hết hàng.');
        }
      } catch (error) {
        alert("Lỗi khi dọn kho: " + error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddToImportCart = (product: Product) => {
    setImportCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { 
        productId: product.id, productName: product.name, 
        quantity: 1, price: product.cost, isCustomPrice: false 
      }];
    });
  };

  const handleRemoveFromImportCart = (productId: string) => {
    setImportCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleUpdateImportQuantity = (productId: string, delta: number) => {
    setImportCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const handleUpdateImportPrice = (productId: string, newPrice: number) => {
    setImportCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, price: newPrice };
      }
      return item;
    }));
  };

  const handleSaveImportOrder = async () => {
    if (importCart.length === 0) return;
    setIsLoading(true);
    
    const totalAmount = importCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const newOrder: Order = {
      id: `IMP-${Date.now()}`,
      timestamp: Date.now(),
      type: 'IMPORT',
      items: importCart,
      totalAmount,
      profit: 0,
      paymentStatus: 'PAID',
      amountGiven: totalAmount,
      changeDue: 0,
      debtAmount: 0,
      note: importNote,
      taxStatus: importTaxStatus,
      taxAmount: 0,
      sellerName: importSellerName,
      sellerAddress: importSellerAddress,
      sellerIdCard: importSellerIdCard,
      purchaseDate: importPurchaseDate
    };

    try {
      await DataService.createOrder(newOrder);
      await loadProducts();
      setIsImportModalOpen(false);
      setImportCart([]);
      setImportNote('');
      setImportTaxStatus('NO_TAX');
      setImportSellerName('');
      setImportSellerAddress('');
      setImportSellerIdCard('');
      setImportPurchaseDate(new Date().toISOString().split('T')[0]);
      alert("Đã nhập hàng thành công!");
    } catch (error) {
      alert("Lỗi khi nhập hàng: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cleanupCount = products.filter(p => p.stock <= 0 && p.category !== ProductCategory.PHOTO_SERVICE).length;

  // Lợi nhuận dự kiến cho toàn bộ kho
  const inventoryValue = useMemo(() => {
    return products.reduce((acc, p) => {
        if (p.category === ProductCategory.PHOTO_SERVICE) return acc;
        return acc + (p.cost * p.stock);
    }, 0);
  }, [products]);

  const potentialTotalProfit = useMemo(() => {
    return products.reduce((acc, p) => {
        if (p.category === ProductCategory.PHOTO_SERVICE) return acc;
        return acc + ((p.price - p.cost) * p.stock);
    }, 0);
  }, [products]);

  // Tính toán lợi nhuận hiển thị trong modal
  const retailProfit = (formData.price || 0) - (formData.cost || 0);
  const wholesaleProfit = (formData.wholesalePrice || formData.price || 0) - (formData.cost || 0);
  const retailMargin = formData.price ? (retailProfit / formData.price) * 100 : 0;
  const potentialProfitOnStock = (formData.stock || 0) * retailProfit;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          Quản lý kho hàng
          {isLoading && <span className="ml-3 text-sm font-normal text-blue-600 animate-pulse">(Đang xử lý...)</span>}
        </h1>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
          <button
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            className={`flex items-center px-3 py-2 rounded-lg border transition-colors h-10 ${showSensitiveData ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-300 text-slate-500'}`}
          >
            {showSensitiveData ? <EyeOff size={20} className="sm:mr-2" /> : <Eye size={20} className="sm:mr-2" />}
            <span className="text-sm font-medium hidden sm:inline">{showSensitiveData ? 'Ẩn giá vốn' : 'Hiện giá vốn'}</span>
          </button>

          <div className="relative h-10 w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-full bg-white appearance-none text-sm"
            >
              <option value="ALL">Tất cả danh mục</option>
              {Object.values(ProductCategory).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <div className="relative h-10 w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm tên, mã..." 
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full h-full text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={handleCleanup}
            disabled={isLoading || cleanupCount === 0}
            className={`h-10 flex items-center justify-center px-4 border rounded-lg transition-colors disabled:opacity-50 ${cleanupCount > 0 ? 'bg-red-100 text-red-600 border-red-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
          >
            <Eraser size={20} className="sm:mr-2" />
            <span className="hidden sm:inline">Dọn kho</span>
          </button>

          <button 
            onClick={() => setIsImportModalOpen(true)}
            disabled={isLoading}
            className="h-10 flex items-center justify-center px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <Plus size={20} className="sm:mr-2" />
            <span className="hidden sm:inline">Tạo phiếu nhập</span>
          </button>

          <button 
            onClick={() => handleOpenModal()}
            disabled={isLoading}
            className="h-10 flex items-center justify-center px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={20} className="sm:mr-2" />
            <span className="hidden sm:inline">Thêm SP Mới</span>
          </button>
        </div>
      </div>

      {showSensitiveData && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá trị vốn kho</p>
                   <p className="text-xl font-black text-slate-900">{inventoryValue.toLocaleString('vi-VN')} ₫</p>
                </div>
                <Info size={24} className="text-slate-200" />
             </div>
             <div className="bg-indigo-600 p-4 rounded-xl flex justify-between items-center shadow-lg shadow-indigo-100">
                <div>
                   <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Lợi nhuận tiềm năng</p>
                   <p className="text-xl font-black text-white">{potentialTotalProfit.toLocaleString('vi-VN')} ₫</p>
                </div>
                <TrendingUp size={24} className="text-white/20" />
             </div>
          </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold border-b">Mã SP</th>
                <th className="p-4 font-semibold border-b">Sản phẩm</th>
                <th className="p-4 font-semibold border-b">Danh mục</th>
                <th className="p-4 font-semibold border-b text-right">Giá bán Lẻ</th>
                <th className="p-4 font-semibold border-b text-right text-indigo-600">Giá bán SỈ</th>
                {showSensitiveData && (
                  <>
                    <th className="p-4 font-semibold border-b text-right text-orange-600 bg-orange-50/30">Giá vốn</th>
                    <th className="p-4 font-semibold border-b text-right text-green-600 bg-green-50/30">Lãi/SP</th>
                  </>
                )}
                <th className="p-4 font-semibold border-b text-center">Tồn kho</th>
                <th className="p-4 font-semibold border-b text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => {
                const profit = product.price - product.cost;
                const margin = product.price ? ((profit / product.price) * 100).toFixed(1) : '0';
                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {product.code}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded object-cover mr-3 bg-slate-100" />
                        <span className="font-medium text-slate-800 text-sm">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded uppercase tracking-tighter">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-blue-600 text-sm">
                      {product.price.toLocaleString('vi-VN')} ₫
                    </td>
                     <td className="p-4 text-right font-medium text-indigo-600 text-sm">
                      {(product.wholesalePrice || product.price).toLocaleString('vi-VN')} ₫
                    </td>
                    {showSensitiveData && (
                      <>
                        <td className="p-4 text-right font-medium text-orange-600 bg-orange-50/20 text-sm">
                          {product.cost.toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="p-4 text-right bg-green-50/20">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-green-600">{profit.toLocaleString('vi-VN')} ₫</span>
                            <span className="text-[10px] text-green-400 font-medium">{margin}%</span>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="p-4 text-center">
                      {product.category === ProductCategory.PHOTO_SERVICE ? (
                        <span className="text-blue-500 text-xs font-black uppercase">Dịch vụ</span>
                      ) : (
                        <span className={`font-black text-sm ${product.stock < 10 ? 'text-red-500' : 'text-slate-700'}`}>
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center space-x-1">
                        <button onClick={() => handleOpenModal(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {editingProduct ? 'Cập nhật sản phẩm' : 'Nhập hàng mới'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Thông tin chung</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Mã SP</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                        placeholder="MÃ SP"
                        value={formData.code}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                      />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Tên sản phẩm</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Danh mục</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as ProductCategory})}
                    >
                      {Object.values(ProductCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Link Ảnh</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center">
                    <Tags className="mr-2" size={14} /> Chính sách giá bán
                  </h3>
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-blue-800 mb-1 uppercase tracking-wide">Giá bán LẺ</label>
                      <input type="number" required min="0" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-lg font-black text-blue-700 outline-none focus:ring-4 focus:ring-blue-100" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-800 mb-1 uppercase tracking-wide">Giá bán SỈ</label>
                      <input type="number" min="0" className="w-full p-2 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-700 outline-none focus:ring-4 focus:ring-indigo-100" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: Number(e.target.value)})} placeholder="Để trống = Giá lẻ" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-orange-600 uppercase tracking-widest border-b pb-2 flex items-center">
                    <ShieldAlert size={14} className="mr-2" /> Quản lý nội bộ
                  </h3>
                  <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-orange-800 mb-1 uppercase tracking-wide">Giá nhập (Vốn)</label>
                      <input type="number" required min="0" className="w-full p-3 bg-white border border-orange-200 rounded-xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-orange-100" value={formData.cost} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} />
                    </div>
                    {formData.category !== ProductCategory.PHOTO_SERVICE ? (
                      <div>
                        <label className="block text-[10px] font-black text-orange-800 mb-1 uppercase tracking-wide">Tồn kho hiện tại</label>
                        <input type="number" required min="0" className="w-full p-2 bg-white border border-orange-200 rounded-xl font-bold text-slate-800 outline-none" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                      </div>
                    ) : <div className="p-2 text-[10px] text-orange-600 font-medium italic">* Không tính tồn kho dịch vụ</div>}
                  </div>
                </div>
              </div>

              {/* LIVE PROFIT ANALYSIS BOX */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-200">
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center">
                     <TrendingUp className="mr-2" size={14}/> Phân tích lợi nhuận dự kiến
                   </h4>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-black ${retailMargin > 20 ? 'bg-green-500' : 'bg-orange-500'}`}>
                      MỨC LÃI: {retailMargin.toFixed(1)}%
                   </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Lợi nhuận / Cái (Lẻ)</p>
                      <p className="text-xl font-black text-blue-400">{retailProfit.toLocaleString('vi-VN')} ₫</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Lợi nhuận / Cái (Sỉ)</p>
                      <p className="text-xl font-black text-indigo-400">{wholesaleProfit.toLocaleString('vi-VN')} ₫</p>
                   </div>
                   <div className="space-y-1 col-span-2 md:col-span-1 bg-white/5 p-3 rounded-xl border border-white/10">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tổng lãi tồn kho (Dự kiến)</p>
                      <p className="text-xl font-black text-green-400">{potentialProfitOnStock.toLocaleString('vi-VN')} ₫</p>
                   </div>
                </div>
                <p className="mt-4 text-[10px] text-white/30 italic">
                  * Lợi nhuận tự động tính lại ngay khi bạn nhập giá mới.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Hủy</button>
                <button type="submit" disabled={isLoading} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center active:scale-95 disabled:opacity-50">
                  <Save size={18} className="mr-2" /> {isLoading ? 'Đang lưu...' : 'XÁC NHẬN LƯU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                Tạo phiếu nhập hàng
              </h2>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row h-[70vh]">
              {/* Left: Product Selection */}
              <div className="w-full md:w-1/2 p-4 border-r border-slate-100 flex flex-col gap-4 bg-slate-50/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tìm sản phẩm để nhập..." 
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={importSearchTerm}
                    onChange={(e) => setImportSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {products.filter(p => p.name.toLowerCase().includes(importSearchTerm.toLowerCase()) || p.code.toLowerCase().includes(importSearchTerm.toLowerCase())).map(product => (
                    <div key={product.id} onClick={() => handleAddToImportCart(product)} className="bg-white p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-500">Mã: {product.code} | Tồn: {product.stock}</p>
                      </div>
                      <Plus size={18} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Cart & Settings */}
              <div className="w-full md:w-1/2 p-4 flex flex-col bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700">Danh sách nhập</h3>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setImportTaxStatus('NO_TAX')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${importTaxStatus === 'NO_TAX' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                    >
                      Không thuế
                    </button>
                    <button 
                      onClick={() => setImportTaxStatus('TAX')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${importTaxStatus === 'TAX' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                    >
                      Có thuế VAT
                    </button>
                  </div>
                </div>

                {importTaxStatus === 'NO_TAX' && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 space-y-2 mb-3 animate-fade-in">
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Thông tin người bán (Bắt buộc)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-orange-400 font-bold mb-0.5">Ngày mua</label>
                        <input 
                          type="date" 
                          className="w-full p-2 border border-orange-200 rounded text-xs font-medium outline-none focus:ring-1 focus:ring-orange-300 bg-white"
                          value={importPurchaseDate}
                          onChange={(e) => setImportPurchaseDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-orange-400 font-bold mb-0.5">CMND/CCCD</label>
                        <input 
                          type="text" 
                          placeholder="Số CMND/CCCD" 
                          className="w-full p-2 border border-orange-200 rounded text-xs outline-none focus:ring-1 focus:ring-orange-300"
                          value={importSellerIdCard}
                          onChange={(e) => setImportSellerIdCard(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-orange-400 font-bold mb-0.5">Họ tên người bán</label>
                      <input 
                        type="text" 
                        placeholder="Nguyễn Văn A" 
                        className="w-full p-2 border border-orange-200 rounded text-xs outline-none focus:ring-1 focus:ring-orange-300"
                        value={importSellerName}
                        onChange={(e) => setImportSellerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-orange-400 font-bold mb-0.5">Địa chỉ</label>
                      <input 
                        type="text" 
                        placeholder="Số nhà, đường, phường/xã..." 
                        className="w-full p-2 border border-orange-200 rounded text-xs outline-none focus:ring-1 focus:ring-orange-300"
                        value={importSellerAddress}
                        onChange={(e) => setImportSellerAddress(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                  {importCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                      <p>Chưa có sản phẩm nào</p>
                    </div>
                  ) : (
                    importCart.map((item, idx) => (
                      <div key={idx} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm text-slate-800 line-clamp-1">{item.productName}</span>
                          <button onClick={() => handleRemoveFromImportCart(item.productId)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold">Số lượng</label>
                            <div className="flex items-center mt-1">
                              <button onClick={() => handleUpdateImportQuantity(item.productId, -1)} className="p-1 bg-white border rounded hover:bg-slate-100"><Minus size={12}/></button>
                              <input 
                                type="number" 
                                className="w-full text-center bg-transparent font-bold text-sm outline-none" 
                                value={item.quantity} 
                                onChange={(e) => handleUpdateImportQuantity(item.productId, Number(e.target.value) - item.quantity)}
                              />
                              <button onClick={() => handleUpdateImportQuantity(item.productId, 1)} className="p-1 bg-white border rounded hover:bg-slate-100"><Plus size={12}/></button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold">Giá nhập</label>
                            <input 
                              type="number" 
                              className="w-full mt-1 p-1 bg-white border rounded text-sm font-bold outline-none focus:border-blue-400"
                              value={item.price}
                              onChange={(e) => handleUpdateImportPrice(item.productId, Number(e.target.value))}
                            />
                          </div>
                          <div className="text-right">
                            <label className="block text-[10px] text-slate-400 uppercase font-bold">Thành tiền</label>
                            <p className="mt-2 text-sm font-black text-slate-700">{(item.quantity * item.price).toLocaleString()} ₫</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Ghi chú nhập hàng</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                      placeholder="VD: Nhập từ NCC ABC..."
                      value={importNote}
                      onChange={(e) => setImportNote(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between items-center text-lg font-black text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span>Tổng tiền:</span>
                    <span className="text-blue-600">
                      {importCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} ₫
                    </span>
                  </div>
                  <button 
                    onClick={handleSaveImportOrder}
                    disabled={importCart.length === 0 || isLoading}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center active:scale-95"
                  >
                    {isLoading ? 'Đang lưu...' : 'HOÀN TẤT NHẬP KHO'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
