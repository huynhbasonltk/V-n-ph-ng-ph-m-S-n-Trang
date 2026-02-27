
import React, { useState, useEffect } from 'react';
import { Customer, Order, CustomerGroup } from '../types';
import { DataService } from '../services/store';
import { Plus, Search, Edit2, Trash2, Save, X, Phone, User, TrendingUp, Calendar, Crown, Loader2, Users, Banknote, CheckCircle, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Tab = 'LIST' | 'STATS';

export const Customers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('LIST');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debt Modal State
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtCustomer, setDebtCustomer] = useState<Customer | null>(null);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState<number>(0);
  const [debtNote, setDebtNote] = useState('');

  // Stats State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [formData, setFormData] = useState<Partial<Customer>>({
    code: '',
    name: '',
    phone: '',
    group: 'RETAIL',
    totalSpent: 0,
    debt: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const custData = await DataService.getCustomers();
    const orderData = await DataService.getOrders();
    setCustomers(custData);
    setOrders(orderData);
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ ...customer, group: customer.group || 'RETAIL' });
    } else {
      setEditingCustomer(null);
      setFormData({
        code: '',
        name: '',
        phone: '',
        group: 'RETAIL',
        totalSpent: 0,
        debt: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDebtModal = (customer: Customer) => {
    setDebtCustomer(customer);
    setDebtPaymentAmount(customer.debt || 0);
    setDebtNote(`Khách ${customer.name} trả nợ ngày ${new Date().toLocaleDateString('vi-VN')}`);
    setIsDebtModalOpen(true);
  };

  const handleCollectDebt = async () => {
    if (!debtCustomer || debtPaymentAmount <= 0) return;
    setIsLoading(true);
    try {
      await DataService.collectDebt(debtCustomer.id, debtPaymentAmount, debtNote);
      await loadData();
      setIsDebtModalOpen(false);
      setDebtCustomer(null);
      setDebtNote('');
    } catch (error) {
      alert("Lỗi khi thu nợ: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;
    setIsLoading(true);

    const customerToSave: Customer = {
      id: editingCustomer ? editingCustomer.id : Date.now().toString(),
      code: formData.code!,
      name: formData.name!,
      phone: formData.phone || '',
      group: formData.group || 'RETAIL',
      totalSpent: formData.totalSpent || 0,
      debt: formData.debt || 0,
      lastPurchaseDate: editingCustomer?.lastPurchaseDate || undefined
    };

    try {
      await DataService.saveCustomer(customerToSave);
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      alert("Lỗi khi lưu khách hàng: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa khách hàng này?')) {
      setIsLoading(true);
      try {
        await DataService.deleteCustomer(id);
        await loadData();
      } catch (error) {
        alert("Không thể xóa khách hàng. Vui lòng kiểm tra kết nối và thử lại.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  const getMonthlyStats = () => {
    const monthlyData = Array(12).fill(0).map((_, i) => ({
      name: `T${i + 1}`,
      registered: 0,
      guest: 0
    }));

    orders.forEach(order => {
      if (order.type === 'DEBT_COLLECTION') return; // Không tính thu nợ vào doanh số bán hàng

      const date = new Date(order.timestamp);
      if (date.getFullYear() === selectedYear) {
        const month = date.getMonth();
        if (order.customerCode && order.customerCode !== 'GUEST') {
          monthlyData[month].registered += order.totalAmount;
        } else {
          monthlyData[month].guest += order.totalAmount;
        }
      }
    });
    return monthlyData;
  };

  const monthlyStats = getMonthlyStats();

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          Quản lý Khách hàng
          {isLoading && <span className="ml-3 text-sm font-normal text-blue-600 animate-pulse flex items-center"><Loader2 size={16} className="animate-spin mr-1"/> Đang xử lý...</span>}
        </h1>
        
        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
           <button 
             onClick={() => setActiveTab('LIST')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'LIST' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
           >
             Danh sách
           </button>
           <button 
             onClick={() => setActiveTab('STATS')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'STATS' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
           >
             Thống kê
           </button>
        </div>
      </div>

      {activeTab === 'LIST' ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
             <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Tìm tên, mã, số điện thoại..." 
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => handleOpenModal()}
                disabled={isLoading}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto disabled:opacity-50"
              >
                <Plus size={20} className="mr-2" />
                Thêm khách
              </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b">Mã KH</th>
                    <th className="p-4 font-semibold border-b">Họ tên</th>
                    <th className="p-4 font-semibold border-b">Nhóm khách</th>
                    <th className="p-4 font-semibold border-b">Số điện thoại</th>
                    <th className="p-4 font-semibold border-b text-right">Tổng chi tiêu</th>
                    <th className="p-4 font-semibold border-b text-right text-red-600">Nợ hiện tại</th>
                    <th className="p-4 font-semibold border-b text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map(cust => (
                    <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {cust.code}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-800">{cust.name}</td>
                      <td className="p-4">
                        {cust.group === 'WHOLESALE' ? (
                          <span className="px-2 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                            Khách Sỉ
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                            Khách Lẻ
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">{cust.phone}</td>
                      <td className="p-4 text-right font-bold text-blue-600">
                        {cust.totalSpent.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="p-4 text-right font-bold text-red-600">
                        {(cust.debt || 0).toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center space-x-2">
                          {cust.debt > 0 && (
                            <button 
                              onClick={() => handleOpenDebtModal(cust)} 
                              className="flex items-center px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors border border-green-100"
                              title="Khách trả nợ"
                            >
                              <Banknote size={16} className="mr-1.5" />
                              <span className="text-sm font-medium">Thu nợ</span>
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenModal(cust)} 
                            disabled={isLoading} 
                            className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg disabled:opacity-30 transition-colors border border-blue-100"
                            title="Sửa thông tin khách hàng"
                          >
                            <Edit2 size={16} className="mr-1.5" />
                            <span className="text-sm font-medium">Sửa</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(cust.id)} 
                            disabled={isLoading}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors"
                            title="Xóa khách hàng"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Không tìm thấy khách hàng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {topCustomers.map((cust, index) => (
               <div key={cust.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center relative overflow-hidden">
                  <div className={`absolute top-0 right-0 p-2 opacity-10 ${index === 0 ? 'text-yellow-500' : 'text-slate-500'}`}>
                    <Crown size={80} />
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4 ${index === 0 ? 'bg-yellow-500 shadow-yellow-200' : 'bg-blue-500 shadow-blue-200'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{cust.name}</h3>
                    <p className="text-xs text-slate-500 mb-1">{cust.code}</p>
                    <p className="font-bold text-blue-600">{cust.totalSpent.toLocaleString('vi-VN')} ₫</p>
                    {cust.debt > 0 && <p className="text-xs text-red-500">Nợ: {cust.debt.toLocaleString('vi-VN')} ₫</p>}
                  </div>
               </div>
             ))}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-slate-800 flex items-center">
                 <TrendingUp className="mr-2 text-blue-600" />
                 Doanh số theo khách hàng (Năm {selectedYear})
               </h3>
               <div className="flex items-center space-x-2">
                 <Calendar size={18} className="text-slate-400" />
                 <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                 >
                   {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
               </div>
             </div>
             
             <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(val) => `${val/1000000}M`} />
                    <Tooltip 
                      formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                    />
                    <Bar dataKey="registered" name="Khách quen" stackId="a" fill="#2563eb" />
                    <Bar dataKey="guest" name="Khách vãng lai" stackId="a" fill="#94a3b8" />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {/* Debt Payment Modal */}
      {isDebtModalOpen && debtCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b bg-green-600 text-white">
              <h2 className="text-lg font-black flex items-center uppercase tracking-tight">
                <Banknote className="mr-2" /> Ghi nhận thu nợ
              </h2>
              <button onClick={() => setIsDebtModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Khách hàng</p>
                <p className="text-lg font-bold text-slate-800">{debtCustomer.name}</p>
                <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center">
                   <p className="text-xs text-red-500 font-bold uppercase tracking-wider">Tổng nợ hiện tại</p>
                   <p className="text-xl font-black text-red-600">{debtCustomer.debt.toLocaleString('vi-VN')} ₫</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Số tiền khách trả</label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-3xl font-black outline-none focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-center text-green-600" 
                    value={debtPaymentAmount} 
                    onChange={(e) => setDebtPaymentAmount(Math.min(debtCustomer.debt, Number(e.target.value)))}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <div className="flex justify-center gap-2 mt-3">
                     <button onClick={() => setDebtPaymentAmount(debtCustomer.debt / 2)} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all">Trả 50%</button>
                     <button onClick={() => setDebtPaymentAmount(debtCustomer.debt)} className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-[10px] font-black text-blue-600 hover:bg-blue-600 hover:text-white transition-all">Trả hết 100%</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Ghi chú phiếu thu</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 text-slate-300" size={18} />
                  <textarea 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-slate-100 resize-none h-20"
                    placeholder="VD: Khách trả tiền mặt..."
                    value={debtNote}
                    onChange={(e) => setDebtNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl border bg-slate-900 text-white flex justify-between items-center shadow-lg">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Nợ còn lại</span>
                <span className="text-xl font-black">
                  {Math.max(0, debtCustomer.debt - debtPaymentAmount).toLocaleString('vi-VN')} ₫
                </span>
              </div>

              <button 
                onClick={handleCollectDebt}
                disabled={isLoading || debtPaymentAmount <= 0}
                className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-green-100 hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-tight"
              >
                {isLoading ? 'Đang lưu...' : 'Xác nhận thu tiền'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                {editingCustomer ? 'Sửa thông tin khách' : 'Thêm khách hàng mới'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mã khách hàng</label>
                <input 
                  type="text" 
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                  placeholder="VD: KH001"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm khách hàng</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.group}
                    onChange={e => setFormData({...formData, group: e.target.value as CustomerGroup})}
                  >
                    <option value="RETAIL">Khách Lẻ (Giá niêm yết)</option>
                    <option value="WHOLESALE">Khách Sỉ (Giá ưu đãi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="tel" 
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="09xxx..."
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nợ ban đầu (Nếu có)</label>
                <div className="relative">
                   <input 
                    type="number" 
                    min="0"
                    className="w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    value={formData.debt}
                    onChange={e => setFormData({...formData, debt: Number(e.target.value)})}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">VNĐ</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                <button 
                  type="button"
                  disabled={isLoading}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 font-bold disabled:opacity-50"
                >
                  {isLoading ? 'Đang lưu...' : (editingCustomer ? 'Cập nhật' : 'Lưu khách hàng')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
