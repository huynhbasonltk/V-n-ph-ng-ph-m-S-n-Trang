// =====================================================================================
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
  // Lock để tránh xung đột khi nhiều người cùng ghi
  var lock = LockService.getScriptLock();
  // Đợi tối đa 10 giây để lấy lock
  lock.tryLock(10000);
  
  try {
    // Lấy tham số từ URL hoặc Body
    var action = e.parameter.action;
    var sheetName = e.parameter.sheet;
    
    var params = {};
    // Nếu là POST request, lấy dữ liệu từ body
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch(err) {
        // Fallback nếu không phải JSON chuẩn
      }
    }
    
    // Ưu tiên lấy action/sheet từ body nếu không có trên URL
    if (!action && params.action) action = params.action;
    if (!sheetName && params.sheet) sheetName = params.sheet;
    
    if (!action || !sheetName) {
      return createJSONOutput({ status: 'error', message: "Thiếu tham số 'action' hoặc 'sheet'" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    // Nếu sheet chưa tồn tại, tạo mới và thêm header
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['ID', 'JSON_DATA', 'READABLE_INFO', 'UPDATED_AT']);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
      // Freeze header row
      sheet.setFrozenRows(1);
    }

    var result = { status: 'success' };

    if (action === 'getAll') {
      // Lấy toàn bộ dữ liệu
      var rows = sheet.getDataRange().getValues();
      var data = [];
      // Bỏ qua dòng header (i=1)
      for (var i = 1; i < rows.length; i++) {
        var jsonCell = rows[i][1]; // Cột B chứa JSON
        if (jsonCell) {
          try {
            data.push(JSON.parse(jsonCell));
          } catch(err) {
            // Bỏ qua dòng lỗi
          }
        }
      }
      result = data; // Trả về mảng trực tiếp cho getAll
      
    } else if (action === 'save') {
      // Lưu hoặc Cập nhật
      var item = params.item;
      if (!item || !item.id) return createJSONOutput({ status: 'error', message: "Dữ liệu thiếu ID" });
      
      var id = String(item.id);
      var rows = sheet.getDataRange().getValues();
      var rowIndex = -1;
      
      // Tìm dòng có ID tương ứng (Cột A)
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === id) {
          rowIndex = i + 1; // Row index trong Sheet bắt đầu từ 1
          break;
        }
      }
      
      var jsonStr = JSON.stringify(item);
      // Tạo thông tin dễ đọc cho cột C (để người quản lý xem trực tiếp trên Sheet dễ hơn)
      var readable = item.name || item.code || ("ID " + id);
      if (item.totalAmount) readable += " - " + item.totalAmount.toLocaleString() + "đ";
      
      var timestamp = new Date();
      
      if (rowIndex > 0) {
        // Update dòng cũ
        sheet.getRange(rowIndex, 2).setValue(jsonStr);
        sheet.getRange(rowIndex, 3).setValue(readable);
        sheet.getRange(rowIndex, 4).setValue(timestamp);
      } else {
        // Thêm dòng mới
        sheet.appendRow([id, jsonStr, readable, timestamp]);
      }
      
    } else if (action === 'delete') {
      // Xóa
      var id = String(params.id);
      var rows = sheet.getDataRange().getValues();
      var rowIndex = -1;
      
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex > 0) {
        sheet.deleteRow(rowIndex);
      }
    }

    return createJSONOutput(result);
    
  } catch (e) {
    return createJSONOutput({ status: 'error', message: e.toString() });
  } finally {
    // Giải phóng lock
    lock.releaseLock();
  }
}

function createJSONOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
