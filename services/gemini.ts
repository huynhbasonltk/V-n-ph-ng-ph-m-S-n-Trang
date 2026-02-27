
import { GoogleGenAI } from "@google/genai";
import { DailyStat, Product } from "../types";

export const GeminiService = {
  analyzeBusiness: async (stats: DailyStat[], topProducts: Product[]) => {
    // Corrected: Always rely on process.env.API_KEY being present.
    if (!process.env.API_KEY) {
      return "Chưa cấu hình API Key. Vui lòng kiểm tra môi trường.";
    }

    try {
      // Corrected: Initializing GoogleGenAI instance right before the call with named parameter.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Tôi là chủ cửa hàng. Dưới đây là dữ liệu kinh doanh 30 ngày qua:
        - Tổng doanh thu: ${stats.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()} VNĐ
        - Xu hướng doanh thu (đầu kỳ vs cuối kỳ): ${stats[0].revenue} -> ${stats[stats.length - 1].revenue}
        - Top sản phẩm tồn kho thấp: ${topProducts.filter(p => p.stock < 10).map(p => p.name).join(', ')}

        Hãy đóng vai chuyên gia phân tích tài chính, đưa ra nhận định ngắn gọn (dưới 200 từ) về tình hình kinh doanh, cảnh báo rủi ro và 1 lời khuyên hành động cụ thể.
        Định dạng trả về Markdown.
      `;

      // Corrected: Using the recommended model 'gemini-3-flash-preview' for basic text tasks.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      // Corrected: Accessing response.text as a property, not a method.
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Không thể phân tích dữ liệu lúc này. Vui lòng thử lại sau.";
    }
  }
};
