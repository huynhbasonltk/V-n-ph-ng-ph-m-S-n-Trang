
import React, { useState, useEffect } from 'react';
import { Order, OrderItem } from '../types';
import { DataService } from '../services/store';
import { Search, Calendar, User, Eye, X, FileText, CheckCircle, Clock, AlertCircle, ShoppingBag, ReceiptText, Banknote, Filter, CreditCard, Loader2 } from 'lucide-react';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pay Debt State
  const [isPayingDebt, setIsPayingDebt] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNote, setPayNote] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    const data = await DataService.getOrders();
    setOrders(data.sort((a, b) => b.timestamp - a.timestamp));
    setIsLoading(false);
  };

  const handleSettleOrderDebt = async () => {
    if (!selectedOrder || payAmount <= 0) return;
    setIsLoading(true);
    try {
      await DataService.payOrderDebt(selectedOrder.id, payAmount, payNote);
      await loadOrders();
      setSelectedOrder(null);
      setIsPayingDebt(false);
      setPayAmount(0);
      setPayNote('');
    } catch (error) {
      alert("Lỗi khi thanh toán: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (o.customerCode && o.customerCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchDebt = filterDebtOnly ? (o.paymentStatus === 'DEBT' || o.paymentStatus === 'PARTIAL') : true;
    return matchSearch && matchDebt;
  });

  const getStatusBadge = (order: Order) => {
    if (order.type === 'DEBT_COLLECTION') {
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full flex items-center w-fit uppercase tracking-tighter shadow-sm border border-blue-200"><Banknote size={10} className="mr-1"/> PHIẾU THU NỢ</span>;
    }

    switch (order.paymentStatus) {
      case 'PAID':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full flex items-center w-fit"><CheckCircle size={10} className="mr-1"/> ĐÃ TRẢ</span>;
      case 'DEBT':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full flex items-center w-fit"><Clock size={10} className="mr-1"/> CÒN NỢ</span>;
      case 'PARTIAL':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full flex items-center w-fit"><AlertCircle size={10} className="mr-1"/> TRẢ MỘT PHẦN</span>;
      default:
        return null;
    }
  };

  const openPayDebtModal = (order: Order) => {
    setPayAmount(order.debtAmount);
    setPayNote(`Thu nợ đơn #${order.id.slice(-6).toUpperCase()}`);
    setIsPayingDebt(true);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            Lịch sử đơn hàng
            {isLoading && <span className="ml-3 text-sm font-normal text-blue-600 animate-pulse flex items-center"><Loader2 size={16} className="animate-spin mr-1"/>...</span>}
          </h1>
          <p className="text-slate-500 text-xs mt-1">Quản lý bán hàng và thu hồi công nợ</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <button 
            onClick={() => setFilterDebtOnly(!filterDebtOnly)}
            className={`flex items-center px-4 py-2 rounded-xl border text-sm font-bold transition-all ${filterDebtOnly ? 'bg-red-50 border-red-200 text-red-600 ring-2 ring-red-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter size={16} className="mr-2" />
            {filterDebtOnly ? 'Đang lọc: Đơn nợ' : 'Tất cả đơn'}
          </button>

          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm mã đơn, mã khách..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-widest">
                <th className="p-4 font-black border-b text-center">STT</th>
                <th className="p-4 font-black border-b">Ngày giờ</th>
                <th className="p-4 font-black border-b">Mã đơn</th>
                <th className="p-4 font-black border-b">Khách hàng</th>
                <th className="p-4 font-black border-b text-right">Tổng tiền</th>
                <th className="p-4 font-black border-b text-right text-red-600">Còn nợ</th>
                <th className="p-4 font-black border-b">Trạng thái</th>
                <th className="p-4 font-black border-b text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order, idx) => (
                <tr 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${order.type === 'DEBT_COLLECTION' ? 'bg-blue-50/10' : ''}`}
                >
                  <td className="p-4 text-center text-[10px] font-bold text-slate-300">
                    {idx + 1}
                  </td>
                  <td className="p-4 text-[11px] text-slate-500">
                    {new Date(order.timestamp).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-4">
                    <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${order.type === 'DEBT_COLLECTION' ? 'text-blue-600 bg-blue-100 border border-blue-200' : 'text-slate-600 bg-slate-100 border border-slate-200'}`}>
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center text-sm font-medium text-slate-700">
                      <User size={14} className="mr-2 text-slate-400" />
                      {order.customerCode || 'GUEST'}
                    </div>
                  </td>
                  <td className="p-4 text-right font-black text-slate-900">
                    {order.type === 'DEBT_COLLECTION' ? (
                       <span className="text-blue-600 text-xs">+{order.amountGiven.toLocaleString('vi-VN')} ₫</span>
                    ) : (
                       <span>{order.totalAmount.toLocaleString('vi-VN')} ₫</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`text-sm font-black ${order.debtAmount > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                      {order.debtAmount > 0 ? `${order.debtAmount.toLocaleString('vi-VN')} ₫` : '—'}
                    </span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(order)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                       {order.debtAmount > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); openPayDebtModal(order); }}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                            title="Thanh toán nợ cho đơn này"
                          >
                             <CreditCard size={16} />
                          </button>
                       )}
                       <button className="p-2 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-100 rounded-lg transition-all border border-transparent group-hover:border-blue-100">
                         <Eye size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="p-20 text-center">
                    <div className="flex flex-col items-center opacity-40">
                       <ShoppingBag size={48} className="mb-4 text-slate-300" />
                       <p className="text-slate-500 font-medium">Không tìm thấy dữ liệu phù hợp.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && !isPayingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedOrder.type === 'DEBT_COLLECTION' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  {selectedOrder.type === 'DEBT_COLLECTION' ? <Banknote size={24} /> : <ReceiptText size={24} />}
                </div>
                <div>
                  <h2 className="font-black text-slate-800 text-lg leading-tight uppercase">
                    {selectedOrder.type === 'DEBT_COLLECTION' ? 'Chi tiết thu nợ' : 'Chi tiết đơn hàng'}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Mã hệ thống: #{selectedOrder.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24}/>
              </button>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Thời gian</p>
                  <p className="text-xs font-bold text-slate-700">{new Date(selectedOrder.timestamp).toLocaleString('vi-VN')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Khách hàng</p>
                  <p className="text-xs font-bold text-slate-700">{selectedOrder.customerCode || 'KHÁCH LẺ'}</p>
                </div>
              </div>

              {selectedOrder.type !== 'DEBT_COLLECTION' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1 mb-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh sách mặt hàng</h3>
                    <span className="text-[10px] text-slate-400 font-bold">{selectedOrder.items.length} món</span>
                  </div>
                  
                  <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50 shadow-sm bg-white">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div className="flex-1 mr-4">
                          <p className="text-sm font-bold text-slate-800 mb-0.5">{item.productName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-400">{item.quantity} x</span>
                            <span className="text-xs font-bold text-blue-600">{item.price.toLocaleString('vi-VN')} ₫</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">{(item.quantity * item.price).toLocaleString('vi-VN')} ₫</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`p-6 rounded-2xl space-y-4 shadow-xl shadow-slate-200 relative overflow-hidden ${selectedOrder.type === 'DEBT_COLLECTION' ? 'bg-green-600' : 'bg-slate-900'} text-white`}>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                
                {selectedOrder.type === 'DEBT_COLLECTION' ? (
                  <div className="text-center py-4">
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Số tiền đã thu từ khách</p>
                    <p className="text-4xl font-black">{selectedOrder.amountGiven.toLocaleString('vi-VN')} ₫</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-xs text-white/60">
                      <span>Tổng tiền hóa đơn</span>
                      <span className="font-bold text-white">{selectedOrder.totalAmount.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-white/60">
                      <span>Đã thanh toán</span>
                      <span className="font-bold text-green-400">{selectedOrder.amountGiven.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    {selectedOrder.debtAmount > 0 && (
                      <div className="flex justify-between items-center p-3 bg-red-500/20 rounded-xl border border-red-500/20">
                        <span className="text-xs font-bold text-red-200 italic">Số tiền còn nợ lại</span>
                        <span className="text-lg font-black text-white">{selectedOrder.debtAmount.toLocaleString('vi-VN')} ₫</span>
                      </div>
                    )}
                  </>
                )}

                <div className="pt-2 flex justify-between items-center border-t border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Tình trạng thanh toán</span>
                  {getStatusBadge(selectedOrder)}
                </div>
              </div>

              {selectedOrder.note && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3">
                  <AlertCircle size={18} className="text-orange-500 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-orange-600 uppercase mb-1 tracking-widest">Lịch sử trả nợ / Ghi chú</p>
                    <p className="text-xs text-orange-800 font-medium italic">"{selectedOrder.note}"</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex gap-3">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all"
              >
                Đóng
              </button>
              {selectedOrder.debtAmount > 0 && (
                <button 
                  onClick={() => openPayDebtModal(selectedOrder)}
                  className="flex-[2] py-3.5 bg-red-600 text-white rounded-xl font-black text-sm shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CreditCard size={18} />
                  DUYỆT TRẢ NỢ
                </button>
              )}
              {selectedOrder.debtAmount === 0 && (
                 <button 
                    onClick={() => window.print()}
                    className="flex-[2] py-3.5 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                    <FileText size={18} />
                    IN HÓA ĐƠN
                 </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settlement Modal (Paying debt for a specific order) */}
      {isPayingDebt && selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
              <div className="p-5 border-b bg-red-600 text-white flex justify-between items-center">
                 <h2 className="text-lg font-black uppercase tracking-tight flex items-center">
                    <CreditCard className="mr-2"/> Thu tiền nợ đơn hàng
                 </h2>
                 <button onClick={() => setIsPayingDebt(false)} className="hover:rotate-90 transition-transform"><X/></button>
              </div>

              <div className="p-6 space-y-5">
                 <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Mã đơn hàng</p>
                    <p className="text-lg font-mono font-bold text-slate-800">#{selectedOrder.id.slice(-10).toUpperCase()}</p>
                    <div className="mt-4 flex justify-between items-center border-t border-slate-200 pt-3">
                       <span className="text-xs font-bold text-slate-500 uppercase">Khách cần trả</span>
                       <span className="text-xl font-black text-red-600">{selectedOrder.debtAmount.toLocaleString('vi-VN')} ₫</span>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Số tiền khách đưa</label>
                    <input 
                       type="number" 
                       className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-3xl font-black outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition-all text-center text-red-600"
                       value={payAmount}
                       onChange={(e) => setPayAmount(Math.min(selectedOrder.debtAmount, Number(e.target.value)))}
                       onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <div className="flex gap-2 mt-3">
                       <button onClick={() => setPayAmount(selectedOrder.debtAmount / 2)} className="flex-1 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:border-red-400 hover:text-red-600 transition-all">TRẢ 50%</button>
                       <button onClick={() => setPayAmount(selectedOrder.debtAmount)} className="flex-1 py-1.5 bg-red-50 border border-red-200 rounded-full text-[10px] font-black text-red-600 hover:bg-red-600 hover:text-white transition-all">TRẢ HẾT</button>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Ghi chú</label>
                    <input 
                       type="text" 
                       className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-slate-200"
                       placeholder="VD: Trả tiền mặt, chuyển khoản..."
                       value={payNote}
                       onChange={(e) => setPayNote(e.target.value)}
                    />
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button 
                       onClick={() => setIsPayingDebt(false)}
                       className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                       Hủy
                    </button>
                    <button 
                       onClick={handleSettleOrderDebt}
                       disabled={isLoading || payAmount <= 0}
                       className="flex-[2] py-3.5 bg-red-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-red-100 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                       {isLoading ? 'ĐANG LƯU...' : 'XÁC NHẬN THU NỢ'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
