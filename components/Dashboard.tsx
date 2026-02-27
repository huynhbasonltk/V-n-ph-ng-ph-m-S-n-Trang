
import React, { useEffect, useState, useRef } from 'react';
import { DailyStat, Product, Order, ProductCategory } from '../types';
import { calculateDailyStats, DataService } from '../services/store';
import { GeminiService } from '../services/gemini';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle, Sparkles, DollarSign, ArrowRight, ShoppingCart, Activity, CheckCircle, CalendarDays, History, FileText, Download, Printer, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  
  // Today's metrics
  const [todayMetrics, setTodayMetrics] = useState({ revenue: 0, orders: 0, profit: 0 });

  // Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'REVENUE' | 'PURCHASE'>('REVENUE');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<{date: string, desc: string, amount: number}[]>([]);
  const [purchaseReportData, setPurchaseReportData] = useState<{
    date: string, 
    sellerName: string, 
    sellerAddress: string, 
    sellerId: string, 
    itemName: string, 
    quantity: number, 
    price: number, 
    total: number, 
    note: string
  }[]>([]);
  const [reportTotal, setReportTotal] = useState(0);

  useEffect(() => {
    if (isReportModalOpen) {
      generateReportData();
    }
  }, [reportMonth, reportYear, isReportModalOpen, reportType]);

  const generateReportData = async () => {
    const orders = await DataService.getOrders();
    const allProducts = await DataService.getProducts();
    const daysInMonth = new Date(reportYear, reportMonth, 0).getDate();
    
    if (reportType === 'REVENUE') {
      const data = [];
      let total = 0;

      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Filter orders for this day
        const dailyOrders = orders.filter(o => {
          const orderDate = new Date(o.timestamp);
          const orderDateStr = orderDate.toISOString().split('T')[0];
          return orderDateStr === dateStr && o.type === 'SALE';
        });

        const dailyRevenue = dailyOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        if (dailyRevenue > 0) {
          // Collect product names
          const productNames = new Set<string>();
          dailyOrders.forEach(o => {
            o.items.forEach(item => {
               const product = allProducts.find(p => p.id === item.productId);
               if (product && product.category === ProductCategory.PHOTO_SERVICE) {
                   productNames.add('Photo tài liệu');
               } else {
                   productNames.add(item.productName);
               }
            });
          });
          const desc = Array.from(productNames).join(', ') || 'Doanh thu bán hàng';

          data.push({
            date: `${String(i).padStart(2, '0')}/${String(reportMonth).padStart(2, '0')}/${reportYear}`,
            desc: desc,
            amount: dailyRevenue
          });
          total += dailyRevenue;
        }
      }
      setReportData(data);
      setReportTotal(total);
    } else {
      // PURCHASE REPORT
      const data: any[] = [];
      let total = 0;
      
      const monthStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}`;
      
      // Filter IMPORT orders for this month with NO_TAX
      const importOrders = orders.filter(o => {
        const orderDate = new Date(o.timestamp);
        const orderMonthStr = orderDate.toISOString().slice(0, 7);
        return orderMonthStr === monthStr && o.type === 'IMPORT' && o.taxStatus === 'NO_TAX';
      });

      importOrders.forEach(order => {
        const date = new Date(order.purchaseDate || order.timestamp);
        const dateFormatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        
        order.items.forEach(item => {
          data.push({
            date: dateFormatted,
            sellerName: order.sellerName || '',
            sellerAddress: order.sellerAddress || '',
            sellerId: order.sellerIdCard || '',
            itemName: item.productName,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
            note: order.note || ''
          });
          total += item.quantity * item.price;
        });
      });
      
      // Sort by date
      data.sort((a, b) => {
         const [d1, m1, y1] = a.date.split('/').map(Number);
         const [d2, m2, y2] = b.date.split('/').map(Number);
         return new Date(y1, m1-1, d1).getTime() - new Date(y2, m2-1, d2).getTime();
      });

      setPurchaseReportData(data);
      setReportTotal(total);
    }
  };

  const handleExportExcel = () => {
    if (reportType === 'REVENUE') {
      const ws = XLSX.utils.json_to_sheet(reportData.map((item, index) => ({
        'STT': index + 1,
        'Ngày tháng': item.date,
        'Diễn giải': item.desc,
        'Số tiền': item.amount
      })));
      
      // Add total row
      XLSX.utils.sheet_add_json(ws, [{
        'STT': '',
        'Ngày tháng': '',
        'Diễn giải': 'Tổng cộng',
        'Số tiền': reportTotal
      }], {skipHeader: true, origin: -1});

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DoanhThu");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'});
      saveAs(data, `BaoCaoDoanhThu_T${reportMonth}_${reportYear}.xlsx`);
    } else {
      const ws = XLSX.utils.json_to_sheet(purchaseReportData.map((item, index) => ({
        'Ngày tháng': item.date,
        'Tên người bán': item.sellerName,
        'Địa chỉ': item.sellerAddress,
        'Số CCCD': item.sellerId,
        'Tên mặt hàng': item.itemName,
        'Số lượng': item.quantity,
        'Đơn giá': item.price,
        'Tổng giá thanh toán': item.total,
        'Ghi chú': item.note
      })));

      // Add total row
      XLSX.utils.sheet_add_json(ws, [{
        'Ngày tháng': 'TỔNG CỘNG',
        'Tên người bán': '',
        'Địa chỉ': '',
        'Số CCCD': '',
        'Tên mặt hàng': '',
        'Số lượng': '',
        'Đơn giá': '',
        'Tổng giá thanh toán': reportTotal,
        'Ghi chú': ''
      }], {skipHeader: true, origin: -1});

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BangKeThuMua");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'});
      saveAs(data, `BangKeThuMua_T${reportMonth}_${reportYear}.xlsx`);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-report');
    if (printContent) {
      const win = window.open('', '', 'height=700,width=900');
      if (win) {
        win.document.write('<html><head><title>In Báo Cáo</title>');
        win.document.write('<script src="https://cdn.tailwindcss.com"></script>'); // Use Tailwind for print styles
        win.document.write(`
          <style>
            @media print {
              @page { size: ${reportType === 'PURCHASE' ? 'landscape' : 'portrait'}; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; }
            }
            .landscape-print { width: 100%; max-width: none; }
          </style>
        `);
        win.document.write('</head><body >');
        win.document.write(printContent.innerHTML);
        win.document.write('</body></html>');
        win.document.close();
        win.setTimeout(() => {
            win.print();
        }, 1000);
      }
    }
  };
  useEffect(() => {
    const load = async () => {
      const orders = await DataService.getOrders();
      const loadedProducts = await DataService.getProducts();
      
      const computedStats = calculateDailyStats(orders);
      
      setStats(computedStats);
      setProducts(loadedProducts);
      setTotalRevenue(computedStats.reduce((acc, cur) => acc + cur.revenue, 0));
      setTotalProfit(computedStats.reduce((acc, cur) => acc + cur.profit, 0));

      // Calculate Today's Metrics
      const today = new Date().toISOString().split('T')[0];
      const todayStat = computedStats.find(s => s.date === today);
      
      if (todayStat) {
        setTodayMetrics({
          revenue: todayStat.revenue,
          orders: todayStat.orders,
          profit: todayStat.profit
        });
      }
    };
    load();
  }, []);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await GeminiService.analyzeBusiness(stats, products);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const totalOrders = stats.reduce((acc, s) => acc + s.orders, 0);

  // Reverse stats for table view (most recent first)
  const reversedStats = [...stats].reverse().filter(s => s.revenue > 0 || s.orders > 0);

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bảng điều khiển</h1>
          <p className="text-slate-500 text-sm">Chào mừng quay trở lại, đây là hiệu quả kinh doanh của bạn.</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition-all font-bold"
          >
            <FileText className="w-5 h-5 mr-2" />
            Báo cáo thuế
          </button>
          <button
            onClick={handleAiAnalysis}
            disabled={isAnalyzing}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-100 hover:scale-105 transition-all disabled:opacity-50 font-bold"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {isAnalyzing ? 'Đang phân tích...' : 'AI Phân tích hiệu quả'}
          </button>
        </div>
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center">
                <FileText className="mr-2 text-blue-600" /> Xuất báo cáo doanh thu
              </h2>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 border-b bg-white flex flex-wrap gap-4 items-center">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setReportType('REVENUE')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${reportType === 'REVENUE' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Báo cáo doanh thu
                </button>
                <button 
                  onClick={() => setReportType('PURCHASE')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${reportType === 'PURCHASE' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Bảng kê thu mua
                </button>
              </div>
              <div className="h-6 w-px bg-slate-200 mx-2"></div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-slate-500">Tháng:</label>
                <select 
                  value={reportMonth} 
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-slate-500">Năm:</label>
                <select 
                  value={reportYear} 
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                >
                  {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1"></div>
              <button onClick={handleExportExcel} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm">
                <Download size={18} className="mr-2" /> Xuất Excel
              </button>
              <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors shadow-sm">
                <Printer size={18} className="mr-2" /> In Báo Cáo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
              <div id="printable-report" className={`bg-white p-10 shadow-sm mx-auto ${reportType === 'PURCHASE' ? 'max-w-[297mm] min-h-[210mm] landscape-print' : 'max-w-[210mm] min-h-[297mm]'} text-black`}>
                {reportType === 'REVENUE' ? (
                  <>
                    {/* Header */}
                    <div className="flex justify-between mb-8">
                      <div className="text-xs font-medium space-y-1">
                        <p className="font-bold uppercase">HỘ, CÁ NHÂN KINH DOANH: VĂN PHÒNG PHẨM SƠN TRANG</p>
                        <p>Địa chỉ: Tổ 2, ấp Quảng Giao, xã Xuân Sơn, Tp.HCM</p>
                        <p>Mã số thuế: <span className="font-bold">077086005873</span></p>
                      </div>
                      <div className="text-[10px] text-right space-y-1 italic">
                        <p className="font-bold not-italic border border-black px-2 py-1 inline-block mb-1">Mẫu số S1-HKD</p>
                        <p>(Ban hành kèm theo Thông tư số 88/2021/TT-BTC</p>
                        <p>ngày 11/10/2021 của Bộ trưởng Bộ Tài chính)</p>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6">
                      <h1 className="text-xl font-bold uppercase mb-2">SỔ DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</h1>
                      <p className="text-sm italic">Kỳ kê khai: Tháng {reportMonth} năm {reportYear}</p>
                    </div>

                    {/* Table */}
                    <table className="w-full border-collapse border border-black text-sm">
                      <thead>
                        <tr>
                          <th className="border border-black p-2 w-32">Ngày tháng</th>
                          <th className="border border-black p-2">Diễn giải</th>
                          <th className="border border-black p-2 w-40 text-right">Số tiền (VNĐ)</th>
                        </tr>
                        <tr className="bg-slate-100">
                          <th className="border border-black p-1 text-center italic font-normal">A</th>
                          <th className="border border-black p-1 text-center italic font-normal">B</th>
                          <th className="border border-black p-1 text-center italic font-normal">1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="border border-black p-2 text-center">{row.date}</td>
                            <td className="border border-black p-2">{row.desc}</td>
                            <td className="border border-black p-2 text-right font-medium">{row.amount.toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                        {reportData.length === 0 && (
                          <tr>
                            <td colSpan={3} className="border border-black p-8 text-center italic text-slate-400">Không có dữ liệu doanh thu trong tháng này</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-slate-50">
                          <td colSpan={2} className="border border-black p-2 text-center uppercase">Tổng cộng</td>
                          <td className="border border-black p-2 text-right">{reportTotal.toLocaleString('vi-VN')}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </>
                ) : (
                  <>
                    {/* PURCHASE REPORT HEADER */}
                    <div className="flex justify-between mb-8">
                      <div className="text-xs font-medium space-y-1">
                        <p className="font-bold uppercase">Tên doanh nghiệp: VĂN PHÒNG PHẨM SƠN TRANG</p>
                        <p>Địa chỉ: Tổ 2, ấp Quảng Giao, xã Xuân Sơn, thành phố Hồ Chí Minh</p>
                        <p>Địa chỉ nơi tổ chức thu mua: Tổ 2, ấp Quảng Giao, xã Xuân Sơn, thành phố Hồ Chí Minh</p>
                        <p>Người phụ trách thu mua: <span className="font-bold">Huỳnh Bá Sơn</span></p>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] space-y-1 italic mb-4">
                            <p className="font-bold not-italic border border-black px-2 py-1 inline-block mb-1">Mẫu số: 01/TNDN</p>
                            <p>(Ban hành kèm theo Thông tư</p>
                            <p>số 78/2014/TT-BTC của Bộ Tài chính)</p>
                         </div>
                         <div className="border border-black p-2 inline-block text-left text-xs">
                            <p>Mã số thuế: <span className="font-bold">077086005873</span></p>
                         </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6">
                      <h1 className="text-xl font-bold uppercase mb-2">BẢNG KÊ THU MUA HÀNG HÓA, DỊCH VỤ MUA VÀO KHÔNG CÓ HÓA ĐƠN</h1>
                      <p className="text-sm italic">(Ngày ..... tháng {reportMonth} năm {reportYear})</p>
                    </div>

                    {/* Table */}
                    <table className="w-full border-collapse border border-black text-[10px] md:text-xs">
                      <thead>
                        <tr>
                          <th className="border border-black p-1 w-16 text-center" rowSpan={2}>Ngày tháng năm mua hàng</th>
                          <th className="border border-black p-1 text-center" colSpan={3}>Người bán</th>
                          <th className="border border-black p-1 text-center" colSpan={4}>Hàng hóa mua vào</th>
                          <th className="border border-black p-1 w-20 text-center" rowSpan={2}>Ghi chú</th>
                        </tr>
                        <tr>
                          <th className="border border-black p-1 text-center">Tên người bán</th>
                          <th className="border border-black p-1 text-center">Địa chỉ</th>
                          <th className="border border-black p-1 text-center w-20">Số CCCD</th>
                          <th className="border border-black p-1 text-center">Tên mặt hàng</th>
                          <th className="border border-black p-1 text-center w-12">Số lượng</th>
                          <th className="border border-black p-1 text-center w-20">Đơn giá</th>
                          <th className="border border-black p-1 text-center w-24">Tổng giá thanh toán</th>
                        </tr>
                        <tr className="bg-slate-100">
                          <th className="border border-black p-1 text-center italic font-normal">1</th>
                          <th className="border border-black p-1 text-center italic font-normal">2</th>
                          <th className="border border-black p-1 text-center italic font-normal">3</th>
                          <th className="border border-black p-1 text-center italic font-normal">4</th>
                          <th className="border border-black p-1 text-center italic font-normal">5</th>
                          <th className="border border-black p-1 text-center italic font-normal">6</th>
                          <th className="border border-black p-1 text-center italic font-normal">7</th>
                          <th className="border border-black p-1 text-center italic font-normal">8</th>
                          <th className="border border-black p-1 text-center italic font-normal">9</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseReportData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="border border-black p-1 text-center">{row.date}</td>
                            <td className="border border-black p-1">{row.sellerName}</td>
                            <td className="border border-black p-1">{row.sellerAddress}</td>
                            <td className="border border-black p-1 text-center">{row.sellerId}</td>
                            <td className="border border-black p-1">{row.itemName}</td>
                            <td className="border border-black p-1 text-center">{row.quantity}</td>
                            <td className="border border-black p-1 text-right">{row.price.toLocaleString('vi-VN')}</td>
                            <td className="border border-black p-1 text-right font-bold">{row.total.toLocaleString('vi-VN')}</td>
                            <td className="border border-black p-1">{row.note}</td>
                          </tr>
                        ))}
                        {purchaseReportData.length === 0 && (
                          <tr>
                            <td colSpan={9} className="border border-black p-8 text-center italic text-slate-400">Không có dữ liệu nhập hàng không thuế trong tháng này</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-slate-50">
                          <td colSpan={7} className="border border-black p-2 text-center uppercase">Tổng cộng</td>
                          <td className="border border-black p-2 text-right">{reportTotal.toLocaleString('vi-VN')}</td>
                          <td className="border border-black p-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </>
                )}

                {/* Footer */}
                <div className="mt-8 flex justify-between text-center">
                  <div className="space-y-8 w-1/3">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Người lập bảng kê</p>
                      <p className="italic text-xs">(Ký, ghi rõ họ tên)</p>
                    </div>
                    <div className="h-20"></div>
                  </div>
                  <div className="space-y-8 w-1/3">
                     {/* Empty for spacing */}
                  </div>
                  <div className="space-y-8 w-1/3">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">{reportType === 'REVENUE' ? 'NGƯỜI ĐẠI DIỆN HỘ KINH DOANH' : 'Chủ cơ sở kinh doanh'}</p>
                      <p className="italic text-xs">({reportType === 'REVENUE' ? 'Ký, ghi rõ họ tên' : 'Ký tên, đóng dấu'})</p>
                    </div>
                    <div className="h-20"></div>
                    <p className="font-bold">Huỳnh Bá Sơn</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's High-Level Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <Activity size={18} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh thu hôm nay</p>
            </div>
            <h3 className="text-2xl font-black text-slate-800">{formatCurrency(todayMetrics.revenue)}</h3>
            <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center">
              <TrendingUp size={12} className="mr-1"/> Từ {todayMetrics.orders} hóa đơn
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-600 text-white rounded-xl">
                <DollarSign size={18} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lợi nhuận hôm nay</p>
            </div>
            <h3 className="text-2xl font-black text-slate-800">{formatCurrency(todayMetrics.profit)}</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-2 italic">
              * Ước tính dựa trên giá vốn
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-orange-600 text-white rounded-xl">
                <Package size={18} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cảnh báo nhập hàng</p>
            </div>
            <h3 className="text-2xl font-black text-slate-800">{products.filter(p => p.stock < 10).length}</h3>
            <p className="text-[10px] text-orange-600 font-bold mt-2">
              Sản phẩm có tồn kho thấp
            </p>
          </div>
        </div>
      </div>

      {/* AI Analysis Result Box */}
      {aiAnalysis && (
        <div className="bg-white border border-purple-100 rounded-3xl shadow-xl shadow-purple-50 p-6 animate-fade-in ring-4 ring-purple-50">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-600 text-white rounded-lg mr-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-black text-purple-900 uppercase tracking-tight">Chiến lược đề xuất từ AI</h3>
          </div>
          <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-medium">
             <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br />') }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <CalendarDays className="mr-2 text-blue-600" size={16}/> Biểu đồ 30 ngày
              </h3>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Doanh thu</div>
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Lợi nhuận</div>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} 
                    tickFormatter={(val) => val.split('-').slice(2).join('/')} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} 
                    tickFormatter={(val) => `${val/1000}k`} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}
                    formatter={(value: number) => [formatCurrency(value), '']} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="profit" stroke="#94a3b8" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                  <History className="mr-2 text-blue-600" size={16}/> Nhật ký doanh thu ngày
                </h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                         <th className="p-4 border-b">Ngày</th>
                         <th className="p-4 border-b text-right">Đơn hàng</th>
                         <th className="p-4 border-b text-right">Doanh thu</th>
                         <th className="p-4 border-b text-right">Lợi nhuận</th>
                         <th className="p-4 border-b text-center">Hiệu suất</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {reversedStats.slice(0, 7).map((s, idx) => {
                         const margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
                         return (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                               <td className="p-4">
                                  <span className="text-xs font-bold text-slate-600">
                                     {new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                  </span>
                               </td>
                               <td className="p-4 text-right">
                                  <span className="text-xs font-black text-slate-800">{s.orders}</span>
                               </td>
                               <td className="p-4 text-right">
                                  <span className="text-xs font-black text-blue-600">{formatCurrency(s.revenue)}</span>
                               </td>
                               <td className="p-4 text-right">
                                  <span className="text-xs font-black text-green-600">{formatCurrency(s.profit)}</span>
                               </td>
                               <td className="p-4 text-center">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${margin > 25 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                     {margin.toFixed(0)}%
                                  </span>
                               </td>
                            </tr>
                         )
                      })}
                   </tbody>
                </table>
             </div>
             <div className="p-4 bg-slate-50/50 border-t text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hiển thị 7 ngày gần nhất có phát sinh đơn hàng</p>
             </div>
          </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest">Cần nhập kho ngay</h3>
            <div className="space-y-4">
              {products.filter(p => p.stock < 10).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-orange-200 transition-colors">
                  <div className="flex items-center min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="ml-3 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{p.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono">{p.code}</p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    <span className={`inline-block px-2 py-1 text-[9px] font-black rounded-lg uppercase ${p.stock <= 0 ? 'bg-red-500 text-white' : 'bg-orange-100 text-orange-600'}`}>
                      {p.stock <= 0 ? 'Hết' : `Còn: ${p.stock}`}
                    </span>
                  </div>
                </div>
              ))}
              {products.length > 0 && products.filter(p => p.stock < 10).length === 0 && (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                   <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="text-green-500" size={32} />
                   </div>
                   <p className="text-xs font-black uppercase tracking-tight text-slate-500">Kho hàng an toàn!</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200 text-white relative overflow-hidden">
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6">Thống kê tích lũy</h3>
             <div className="space-y-4 relative">
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                   <span className="text-[10px] font-bold text-white/60">Doanh thu (30đ)</span>
                   <span className="text-lg font-black text-blue-400">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                   <span className="text-[10px] font-bold text-white/60">Đơn hàng (30đ)</span>
                   <span className="text-lg font-black text-white">{totalOrders}</span>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-[10px] font-bold text-white/60">Lợi nhuận (30đ)</span>
                   <span className="text-lg font-black text-green-400">{formatCurrency(totalProfit)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
