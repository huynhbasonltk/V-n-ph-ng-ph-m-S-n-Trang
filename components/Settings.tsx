
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/store';
import { AppSettings } from '../types';
import { Save, Database, Server, RefreshCw, UploadCloud, DownloadCloud, CheckCircle, Code, Copy, HelpCircle, ChevronDown, ChevronUp, AlertCircle, ExternalLink, ArrowRightLeft, RotateCcw } from 'lucide-react';

// =================================================================================
// CẤU HÌNH URL MẶC ĐỊNH (Điền URL Web App vào đây để không phải nhập tay mỗi lần)
// Ví dụ: const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/XXX/exec";
const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzQ2vsSHCTvF1WF6j8DSRl_U0wAV8MUmArJs5TikhNoQAkFtkzHwimlG-F1tz7QZbj6_g/exec"; 
// =================================================================================

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    useGoogleSheets: false,
    googleSheetUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Connection Test State
  const [connectionStatus, setConnectionStatus] = useState<{ type: 'success' | 'error' | 'warning', msg: string } | null>(null);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<{progress: number, msg: string} | null>(null);
  
  // Guide State
  const [showGuide, setShowGuide] = useState(false);

  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-test connection when URL changes
  useEffect(() => {
    if (isFirstLoad) return;
    
    if (settings.useGoogleSheets && settings.googleSheetUrl) {
      const timer = setTimeout(() => {
        handleTestConnection(settings.googleSheetUrl);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [settings.googleSheetUrl, settings.useGoogleSheets]);

  const loadSettings = async () => {
    const s = await DataService.getSettings();
    // Tự động điền URL mặc định nếu chưa có
    if (DEFAULT_WEB_APP_URL && (!s.googleSheetUrl || s.googleSheetUrl.trim() === '')) {
       s.googleSheetUrl = DEFAULT_WEB_APP_URL;
       s.useGoogleSheets = true; // Tự động bật chế độ Cloud nếu có URL mặc định
    }
    setSettings(s);
    setIsFirstLoad(false);
    
    // Test connection immediately on load if URL exists
    if (s.useGoogleSheets && s.googleSheetUrl) {
        handleTestConnection(s.googleSheetUrl);
    }
  };

  const updateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await DataService.saveSettings(newSettings);
  };

  const handleTestConnection = async (urlToCheck: string) => {
    if (!urlToCheck) return;

    if (urlToCheck.includes('/edit')) {
       setConnectionStatus({ 
         type: 'error', 
         msg: "URL SAI: Bạn đang dùng link chỉnh sửa script (/edit). Hãy làm lại bước Deploy và copy URL kết thúc bằng '/exec'." 
       });
       return;
    }

    setIsLoading(true);
    setConnectionStatus({ type: 'warning', msg: "Đang kiểm tra kết nối..." });
    
    try {
      const t = new Date().getTime();
      const response = await fetch(`${urlToCheck}?action=getAll&sheet=Products&t=${t}`, {
          method: 'GET',
          redirect: 'follow'
      });
      
      if (!response.ok) {
         throw new Error(`Lỗi HTTP: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          setConnectionStatus({ 
              type: 'success', 
              msg: `KẾT NỐI THÀNH CÔNG! Đã tìm thấy ${json.length} sản phẩm.` 
          });
          // Auto-save on success
          await DataService.saveSettings({...settings, googleSheetUrl: urlToCheck});
        } else if (json.error) {
           setConnectionStatus({ type: 'error', msg: `Script báo lỗi: ${json.error}` });
        } else {
           setConnectionStatus({ type: 'error', msg: "Dữ liệu trả về không đúng định dạng." });
        }
      } catch (e) {
         if (text.trim().startsWith('<')) {
            setConnectionStatus({ 
              type: 'error', 
              msg: "LỖI QUYỀN TRUY CẬP: Hãy chọn 'Who has access: Anyone' khi Deploy." 
            });
         } else {
            setConnectionStatus({ type: 'error', msg: "Không thể đọc dữ liệu JSON." });
         }
      }
    } catch (error: any) {
      setConnectionStatus({ type: 'error', msg: "Lỗi mạng/CORS: " + error.message });
    }
    setIsLoading(false);
  };

  const handleSyncToCloud = async () => {
    if (!settings.googleSheetUrl) {
      alert("Vui lòng nhập URL Google Apps Script trước.");
      return;
    }
    if (!window.confirm("Hành động này sẽ gửi toàn bộ dữ liệu từ thiết bị này lên Google Sheet. Dữ liệu trên Cloud cùng ID sẽ bị ghi đè. Bạn có chắc không?")) {
      return;
    }

    setIsLoading(true);
    setSyncStatus({ progress: 0, msg: 'Đang chuẩn bị...' });

    try {
      await DataService.syncLocalToCloud((count, total, msg) => {
        setSyncStatus({
          progress: Math.round((count / total) * 100),
          msg: msg
        });
      });
      alert("Đẩy dữ liệu lên Cloud thành công!");
    } catch (error) {
      alert("Lỗi khi đồng bộ: " + error);
    } finally {
      setIsLoading(false);
      setSyncStatus(null);
    }
  };

  const handleSyncFromCloud = async () => {
    if (!settings.googleSheetUrl) {
      alert("Vui lòng nhập URL Google Apps Script trước.");
      return;
    }
    if (!window.confirm("Hành động này sẽ TẢI TOÀN BỘ dữ liệu từ Google Sheet về máy này. Dữ liệu hiện tại trên thiết bị sẽ bị THAY THẾ hoàn toàn. Bạn có chắc không?")) {
      return;
    }

    setIsLoading(true);
    setSyncStatus({ progress: 0, msg: 'Đang chuẩn bị tải...' });

    try {
      await DataService.syncCloudToLocal((count, total, msg) => {
        setSyncStatus({
          progress: Math.round((count / total) * 100),
          msg: msg
        });
      });
      alert("Tải dữ liệu từ Cloud về máy thành công!");
      window.location.reload(); // Reload để cập nhật dữ liệu mới nhất
    } catch (error) {
      alert("Lỗi khi tải dữ liệu: " + error);
    } finally {
      setIsLoading(false);
      setSyncStatus(null);
    }
  };

  const GAS_CODE = `// =====================================================================================
// GOOGLE APPS SCRIPT CODE
// =====================================================================================
// Hướng dẫn cài đặt:
// 1. Truy cập: https://script.google.com/home
// 2. Tạo dự án mới (New Project)
// 3. Copy toàn bộ nội dung file này dán vào file Code.gs
// 4. Nhấn Deploy (Triển khai) -> New Deployment (Tạo triển khai mới)
// 5. Chọn loại: Web App
// 6. Cấu hình:
//    - Description: VPP Store API
//    - Execute as: Me (Tôi)
//    - Who has access: Anyone (Bất kỳ ai) -> QUAN TRỌNG!
// 7. Copy URL (kết thúc bằng /exec) và dán vào phần Cài đặt của ứng dụng.
// =====================================================================================

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var action = e.parameter.action;
    var sheetName = e.parameter.sheet;
    
    var params = {};
    if (e.postData && e.postData.contents) {
      try { params = JSON.parse(e.postData.contents); } catch(err) {}
    }
    
    if (!action && params.action) action = params.action;
    if (!sheetName && params.sheet) sheetName = params.sheet;
    
    if (!action || !sheetName) return createJSONOutput({ error: "Missing parameters" });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['ID', 'JSON_DATA', 'READABLE_INFO', 'UPDATED_AT']);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    var result = { status: 'success' };

    if (action === 'getAll') {
      var rows = sheet.getDataRange().getValues();
      var data = [];
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][1]) try { data.push(JSON.parse(rows[i][1])); } catch(err) {}
      }
      result = data;
      
    } else if (action === 'save') {
      var item = params.item;
      if (!item || !item.id) return createJSONOutput({ error: "Missing ID" });
      
      var id = String(item.id);
      var rows = sheet.getDataRange().getValues();
      var rowIndex = -1;
      
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === id) { rowIndex = i + 1; break; }
      }
      
      var jsonStr = JSON.stringify(item);
      var readable = item.name || item.code || ("ID " + id);
      if (item.totalAmount) readable += " - " + item.totalAmount.toLocaleString() + "đ";
      var timestamp = new Date();
      
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 2).setValue(jsonStr);
        sheet.getRange(rowIndex, 3).setValue(readable);
        sheet.getRange(rowIndex, 4).setValue(timestamp);
      } else {
        sheet.appendRow([id, jsonStr, readable, timestamp]);
      }
      
    } else if (action === 'delete') {
      var id = String(params.id);
      var rows = sheet.getDataRange().getValues();
      var rowIndex = -1;
      
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === id) { rowIndex = i + 1; break; }
      }
      
      if (rowIndex > 0) sheet.deleteRow(rowIndex);
    }

    return createJSONOutput(result);
  } catch (e) { return createJSONOutput({ error: e.toString() }); } finally { lock.releaseLock(); }
}

function createJSONOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(GAS_CODE);
    alert("Đã copy mã Script!");
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
        <ArrowRightLeft className="mr-3 text-blue-600" /> 
        Cài đặt & Đồng bộ
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cấu hình kết nối */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center">
            <Database className="text-blue-600 mr-3" />
            <h2 className="text-lg font-bold text-slate-800">1. Cấu hình nguồn dữ liệu</h2>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="p-6 space-y-6">
            <div className="space-y-4">
              <label className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${!settings.useGoogleSheets ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input 
                  type="radio" 
                  name="dataSource"
                  checked={!settings.useGoogleSheets}
                  onChange={() => updateSettings({...settings, useGoogleSheets: false})}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="block font-bold text-slate-800">Chỉ dùng bộ nhớ máy (Offline)</span>
                  <span className="block text-xs text-slate-500">Dữ liệu lưu tại LocalStorage của trình duyệt này.</span>
                </div>
                <Database className={!settings.useGoogleSheets ? "text-blue-500" : "text-slate-300"} />
              </label>

              <label className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.useGoogleSheets ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input 
                  type="radio" 
                  name="dataSource"
                  checked={settings.useGoogleSheets}
                  onChange={() => updateSettings({...settings, useGoogleSheets: true})}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="block font-bold text-slate-800">Dùng Google Sheets (Cloud)</span>
                  <span className="block text-xs text-slate-500">Lưu dữ liệu trực tiếp lên Cloud, hỗ trợ nhiều máy.</span>
                </div>
                <Server className={settings.useGoogleSheets ? "text-blue-500" : "text-slate-300"} />
              </label>
            </div>

            {settings.useGoogleSheets && (
              <div className="animate-fade-in space-y-3 pt-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Web App URL (Kết thúc bằng /exec)</label>
                <div className="relative">
                  <input 
                    type="url" 
                    required={settings.useGoogleSheets}
                    placeholder="https://script.google.com/macros/s/XXXXX/exec"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs pr-10"
                    value={settings.googleSheetUrl}
                    onChange={(e) => setSettings({...settings, googleSheetUrl: e.target.value})}
                  />
                  {DEFAULT_WEB_APP_URL && (
                    <button 
                      type="button"
                      onClick={() => setSettings({...settings, googleSheetUrl: DEFAULT_WEB_APP_URL})}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Sử dụng URL mặc định từ code"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-2 min-h-[24px]">
                   <div className="flex items-center">
                      {isLoading && <RefreshCw size={14} className="mr-2 animate-spin text-blue-600" />}
                      {connectionStatus ? (
                        <span className={`text-[10px] font-bold ${connectionStatus.type === 'success' ? 'text-green-600' : connectionStatus.type === 'warning' ? 'text-orange-500' : 'text-red-600'}`}>
                           {connectionStatus.msg}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Đang chờ nhập URL...</span>
                      )}
                   </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t flex justify-between items-center">
               <span className="text-green-600 text-xs font-bold">{message}</span>
               {/* Auto-save enabled, button removed */}
            </div>
          </form>
        </div>

        {/* Công cụ đồng bộ */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center">
                <RefreshCw className="text-orange-600 mr-3" />
                <h2 className="text-lg font-bold text-slate-800">2. Công cụ đồng bộ 2 chiều</h2>
              </div>
              <div className="p-6 space-y-5">
                <p className="text-slate-500 text-xs leading-relaxed">
                  Dùng để chuyển đổi dữ liệu giữa <strong>Máy cục bộ</strong> và <strong>Google Sheet</strong>. Lưu ý rằng hành động này có thể ghi đè dữ liệu cũ.
                </p>

                {syncStatus ? (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-pulse">
                     <p className="text-xs font-bold text-blue-700 mb-2">{syncStatus.msg}</p>
                     <div className="w-full bg-blue-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${syncStatus.progress}%` }}></div>
                     </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={handleSyncToCloud}
                      disabled={isLoading || !settings.googleSheetUrl}
                      className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-orange-300 hover:bg-orange-50 transition-all group"
                    >
                      <UploadCloud size={32} className="text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-700">Đẩy lên Cloud</span>
                      <span className="text-[10px] text-slate-400 mt-1">Local → Cloud</span>
                    </button>

                    <button 
                      onClick={handleSyncFromCloud}
                      disabled={isLoading || !settings.googleSheetUrl}
                      className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                    >
                      <DownloadCloud size={32} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-700">Tải về máy</span>
                      <span className="text-[10px] text-slate-400 mt-1">Cloud → Local</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Hướng dẫn */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
              <div 
                className="p-4 bg-slate-50 flex items-center justify-between cursor-pointer"
                onClick={() => setShowGuide(!showGuide)}
              >
                <div className="flex items-center text-sm font-bold text-slate-700">
                  <HelpCircle className="text-slate-400 mr-2" size={18} />
                  Hướng dẫn cấu hình Script
                </div>
                {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {showGuide && (
                <div className="p-4 border-t text-[11px] text-slate-600 space-y-3 bg-white animate-fade-in">
                  <p>1. Copy mã Script bên dưới.</p>
                  <p>2. Mở Google Sheets &gt; Tiện ích mở rộng &gt; Apps Script.</p>
                  <p>3. Dán mã, sau đó <strong>Deploy &gt; New Deployment &gt; Web App</strong>.</p>
                  <p>4. <span className="text-red-600 font-bold">QUAN TRỌNG:</span> Mục "Who has access" chọn <strong>Anyone</strong>.</p>
                  <div className="relative">
                    <pre className="p-3 bg-slate-900 text-green-400 rounded-lg h-32 overflow-y-auto font-mono leading-tight">
                      {GAS_CODE}
                    </pre>
                    <button onClick={copyCode} className="absolute top-2 right-2 p-1.5 bg-slate-700 text-white rounded hover:bg-slate-600">
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};
