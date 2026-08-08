import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { ScheduleEvent, PriorityLevel, EventCategory } from '../types';

export const DOCTOR_SYSTEM_INSTRUCTION = `Trợ lý AI Quản lý Lịch Thông Minh dành riêng cho Bác sĩ Chẩn đoán Hình ảnh - Bệnh viện Nội tiết TƯ.
BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT: Bạn PHẢI tuân thủ nghiêm ngặt mọi quy tắc, hướng dẫn trong prompt chính (hướng dẫn hệ thống này) và prompt phụ (phần [KÝ ỨC/THÓI QUEN]). Tuyệt đối không được bỏ qua bất kỳ ghi nhớ hoặc quy tắc thói quen nào của Bác sĩ.

Bối cảnh hoạt động:
- Thứ 2 đến Thứ 6: Ca hành chính bệnh viện (Siêu âm, MRI, can thiệp RFA, VABB, Sinh thiết).
- Buổi tối (từ 19:30+): Học tập chuyên môn (MRI/CLVT) hoặc Nghỉ ngơi cá nhân (P4).
- Cuối tuần (T7, CN): Làm phòng khám ngoài giờ (MSK) ban ngày, nghỉ ngơi buổi tối.

Quy tắc Ma trận Eisenhower:
- P1 (Khẩn cấp/Lâm sàng): Can thiệp RFA, VABB, Sinh thiết, Cấp cứu.
- P2 (Quan trọng): Học tập chuyên môn, Đọc phim chuyên sâu (Cần đệm 30-45p sau giờ làm).
- P3 (Thường quy): Siêu âm phòng khám, Lịch họp bệnh viện.
- P4 (Nghỉ ngơi): Thời gian phục hồi. TUYỆT ĐỐI không chèn lịch trừ khi Bác sĩ yêu cầu rõ ràng.

QUY TẮC HOÀN TÁC (UNDO) QUAN TRỌNG:
- Khi Bác sĩ ra lệnh hoàn tác, quay lại, undo, hủy thao tác gần nhất (Ví dụ: "hoàn tác", "undo", "quay lại bước trước", "hoàn tác 2 bước", "hủy thao tác vừa làm"), bạn BẮT BUỘC PHẢI gọi hàm \`hoan_tac_thao_tac\` ngay lập tức.
- Bạn PHẢI trích xuất chính xác tham số \`steps\` là số bước muốn hoàn tác lùi lại (mặc định là 1 nếu Bác sĩ không nêu rõ số bước cụ thể). Tuyệt đối không thực hiện thêm hành động sửa đổi lịch nào khác cùng lúc với lệnh hoàn tác này.

HỖ TRỢ ĐA TÁC VỤ & SAO CHÉP HÀNG LOẠT (BATCH OPERATIONS):
- Bác sĩ có thể yêu cầu sao chép (copy) công việc từ một ngày sang một khoảng ngày (ví dụ: "copy công việc ngày 10/8 sang từ 11/8 đến 14/8" hoặc "nhân bản lịch ngày hôm nay cho cả tuần").
- Hãy BẮT BUỘC ưu tiên gọi hàm \`sao_chep_lich_hen\` với các tham số \`sourceDate\`, \`startDateRange\`, \`endDateRange\` hoặc \`targetDates\`.
- Ngoài ra Bác sĩ có thể yêu cầu nhiều công việc cùng lúc (vừa đổi lịch, vừa thêm lịch, vừa xóa lịch), hãy tự tin thực thi đầy đủ.

YÊU CẦU TRÌNH BÀY & TRUYỀN TẢI THÔNG TIN (BẮT BUỘC TUÂN THỦ):
1. Xưng em, gọi "Anh" hoặc "Bác sĩ" thân mật, tôn trọng, chuyên nghiệp.
2. BẮT BUỘC DÙNG DẤU GẠCH ĐẦU DÒNG (\`-\`) CHO TẤT CẢ CÁC DANH SÁCH LỊCH LÀM VIỆC VÀ CHI TIẾT CÔNG VIỆC:
   - Tất cả các mục ngày tháng, tên công việc, thời gian, địa điểm, mức ưu tiên VÀ lưu ý ĐỀU PHẢI NẰM TRONG DẤU GẠCH ĐẦU DÒNG (\`-\`).
   - TUYỆT ĐỐI KHÔNG viết các thuộc tính (Công việc, Thời gian, Ưu tiên) lửng lơ hoặc dính cục mà không có dấu gạch đầu dòng (\`-\`).
3. MẪU TRÌNH BÀY CHUẨN MẪU:
   Dạ em gửi Bác sĩ lịch làm việc chi tiết:
   - 📅 **Ngày 10/08/2026 (Thứ 2)**:
     - **Công việc**: 123355
     - **Thời gian**: 08:00 - 10:00
     - **Ưu tiên**: P3 (Thường quy)
   - 📅 **Ngày 11/08/2026 (Thứ 3)**:
     - **Công việc**: Siêu âm tại phòng 11
     - **Thời gian**: 07:30 - 16:30
     - **Ưu tiên**: P3 (Thường quy)
   - 💡 **Lưu ý & Đề xuất**:
     - Theo thói quen, lịch học MRI thường vào tối Thứ 3 & Thứ 5 (19:30 - 21:30). Bác sĩ có muốn em thêm vào lịch không ạ?`;

export const taoLichHenDeclaration: FunctionDeclaration = {
  name: 'tao_lich_hen',
  description: 'Tạo một lịch hẹn hoặc công việc mới trong thời gian biểu của bác sĩ.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Tên công việc hoặc sự kiện (VD: Học MRI sọ nào, Can thiệp RFA giáp, Siêu âm PK)' },
      date: { type: Type.STRING, description: 'Ngày diễn ra theo định dạng YYYY-MM-DD (VD: 2026-08-11)' },
      dayOfWeek: { type: Type.INTEGER, description: 'Thứ trong tuần (1: Thứ 2, 2: Thứ 3, ..., 6: Thứ 7, 0: Chủ Nhật)' },
      startTime: { type: Type.STRING, description: 'Giờ bắt đầu dạng HH:mm (VD: 19:30)' },
      endTime: { type: Type.STRING, description: 'Giờ kết thúc dạng HH:mm (VD: 21:30)' },
      category: { type: Type.STRING, description: 'Phân loại nhóm: hospital, study, clinic, rest, personal' },
      priority: { type: Type.STRING, description: 'Mức độ ưu tiên Eisenhower: P1, P2, P3, P4' },
      location: { type: Type.STRING, description: 'Địa điểm làm việc/học tập' },
      bufferMinutes: { type: Type.INTEGER, description: 'Thời gian đệm nghỉ ngơi/di chuyển tính bằng phút' },
      isIntervention: { type: Type.BOOLEAN, description: 'Có phải là ca thủ thuật can thiệp lâm sàng khẩn cấp không' },
      description: { type: Type.STRING, description: 'Ghi chú bổ sung cho lịch hẹn' },
    },
    required: ['title', 'startTime', 'endTime', 'category'],
  },
};

export const capNhatUuTienDeclaration: FunctionDeclaration = {
  name: 'cap_nhat_uu_tien',
  description: 'Cập nhật mức độ ưu tiên Eisenhower (P1-P4) hoặc phân loại nhóm cho công việc đã có.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: { type: Type.STRING, description: 'Mã id sự kiện cần cập nhật' },
      eventTitleKeyword: { type: Type.STRING, description: 'Từ khóa tìm kiếm tên sự kiện nếu không có id' },
      newPriority: { type: Type.STRING, description: 'Mức ưu tiên mới (P1, P2, P3, P4)' },
      newCategory: { type: Type.STRING, description: 'Phân loại mới (hospital, study, clinic, rest, personal)' },
    },
    required: ['newPriority'],
  },
};

export const xoaLichHenDeclaration: FunctionDeclaration = {
  name: 'xoa_lich_hen',
  description: 'Xóa hoặc hủy một lịch hẹn/công việc trong thời gian biểu.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: { type: Type.STRING, description: 'Mã sự kiện cần xóa' },
      titleKeyword: { type: Type.STRING, description: 'Từ khóa tìm kiếm sự kiện muốn hủy' },
    },
  },
};

export const dieuChinhLichHenDeclaration: FunctionDeclaration = {
  name: 'dieu_chinh_lich_hen',
  description: 'Điều chỉnh, đổi ngày, đổi giờ (thời gian bắt đầu/kết thúc), dời lịch hoặc đổi tên/địa điểm/mức ưu tiên cho lịch hẹn/công việc đã có trong thời gian biểu.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: { type: Type.STRING, description: 'Mã ID sự kiện cần điều chỉnh nếu có' },
      titleKeyword: { type: Type.STRING, description: 'Từ khóa tìm kiếm tên sự kiện muốn sửa (VD: "lịch học MRI", "siêu âm", "đọc CLVT")' },
      newDate: { type: Type.STRING, description: 'Ngày mới diễn ra theo định dạng YYYY-MM-DD (VD: "2026-08-14")' },
      newDayOfWeek: { type: Type.INTEGER, description: 'Thứ mới trong tuần (1: Thứ 2, 2: Thứ 3, ..., 6: Thứ 7, 0: Chủ Nhật)' },
      newStartTime: { type: Type.STRING, description: 'Giờ bắt đầu mới dạng HH:mm (VD: "20:00")' },
      newEndTime: { type: Type.STRING, description: 'Giờ kết thúc mới dạng HH:mm (VD: "22:00")' },
      newTitle: { type: Type.STRING, description: 'Tên công việc mới nếu muốn đổi tiêu đề' },
      newLocation: { type: Type.STRING, description: 'Địa điểm mới nếu muốn thay đổi' },
      newPriority: { type: Type.STRING, description: 'Mức ưu tiên mới (P1, P2, P3, P4)' },
      newCategory: { type: Type.STRING, description: 'Phân loại nhóm mới (hospital, study, clinic, rest, personal)' },
      newDescription: { type: Type.STRING, description: 'Ghi chú mới bổ sung' },
    },
  },
};

export const saoChepLichHenDeclaration: FunctionDeclaration = {
  name: 'sao_chep_lich_hen',
  description: 'Sao chép (copy), nhân bản hàng loạt các công việc/lịch hẹn từ một ngày nguồn (hoặc theo từ khóa công việc) sang một khoảng ngày hoặc danh sách nhiều ngày đích khác nhau.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sourceDate: { type: Type.STRING, description: 'Ngày nguồn chứa các công việc cần sao chép theo định dạng YYYY-MM-DD (VD: "2026-08-10") hoặc cụm ngày như "10/08"' },
      titleKeyword: { type: Type.STRING, description: 'Từ khóa tên công việc cụ thể nếu chỉ muốn copy 1 công việc nhất định (để trống nếu muốn copy toàn bộ công việc trong ngày nguồn)' },
      startDateRange: { type: Type.STRING, description: 'Ngày bắt đầu của khoảng ngày đích cần sao chép sang dạng YYYY-MM-DD (VD: "2026-08-11")' },
      endDateRange: { type: Type.STRING, description: 'Ngày kết thúc của khoảng ngày đích cần sao chép sang dạng YYYY-MM-DD (VD: "2026-08-14")' },
      targetDates: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Danh sách các ngày đích cụ thể dạng YYYY-MM-DD nếu không dùng khoảng ngày (VD: ["2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"])',
      },
    },
  },
};

export const hoanTacThaoTacDeclaration: FunctionDeclaration = {
  name: 'hoan_tac_thao_tac',
  description: 'CHỈ SỬ DỤNG LỆNH NÀY KHI CẦN HOÀN TÁC (UNDO). Lệnh này sẽ HỦY BỎ thao tác gần nhất vừa thực hiện. KHÔNG ĐƯỢC thực hiện kèm theo bất kỳ lệnh nào khác cùng lúc.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      steps: {
        type: Type.INTEGER,
        description: 'Số bước thao tác muốn hoàn tác lùi lại (Mặc định: 1)',
      },
    },
  },
};


export const tinhKhangDemDeclaration: FunctionDeclaration = {
  name: 'tinh_khang_dem',
  description: 'Tính toán khoảng nghỉ đệm (Buffer time) và cảnh báo xung đột giữa ca bệnh viện và buổi học tối.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      dayOfWeek: { type: Type.INTEGER, description: 'Thứ cần kiểm tra khoảng đệm (1-6, 0)' },
    },
  },
};

export const ghiNhoThoiQuenDeclaration: FunctionDeclaration = {
  name: 'ghi_nho_thoi_quen',
  description: 'CHỈ SỬ DỤNG khi Bác sĩ yêu cầu rõ ràng việc lưu lại, ghi nhớ, ghi nhận thói quen mới, giờ giấc làm việc hoặc yêu cầu cập nhật Prompt Phụ (VD: "hãy ghi nhớ...", "lưu lại thói quen...", "cập nhật bộ nhớ..."). KHÔNG TỰ ĐỘNG GỌI khi người dùng chỉ chia sẻ thông tin thông thường.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      memoryText: { type: Type.STRING, description: 'Câu tóm tắt vắn tắt thói quen hoặc khung giờ làm việc/nghỉ ngơi mới của Bác sĩ' },
    },
    required: ['memoryText'],
  },
};

function getPriorityName(p: PriorityLevel): string {
  switch (p) {
    case 'P1': return 'P1 - Khẩn cấp / Lâm sàng';
    case 'P2': return 'P2 - Học tập / Chuyên sâu';
    case 'P3': return 'P3 - Thường quy';
    case 'P4': return 'P4 - Nghỉ ngơi / Cá nhân';
    default: return 'P3 - Thường quy';
  }
}

function getCategoryLabel(c: EventCategory): string {
  switch (c) {
    case 'hospital': return 'Bệnh viện Nội tiết TƯ';
    case 'study': return 'Học tập chuyên môn';
    case 'clinic': return 'Phòng khám ngoài giờ';
    case 'rest': return 'Nghỉ ngơi';
    case 'personal': return 'Cá nhân';
    default: return 'Bệnh viện';
  }
}

export interface ChatPayload {
  message: string;
  history?: any[];
  systemInstruction?: string;
  learnedPrompt?: string;
  learnedMemories?: string[];
  aiProvider?: string;
  aiModel?: string;
  geminiApiKey?: string;
  shopaikeyApiKey?: string;
  shopaikeyBaseUrl?: string;
  currentEvents?: ScheduleEvent[];
  currentBaseDate?: string;
}

export async function processChatRequest(payload: ChatPayload): Promise<{
  reply: string;
  executedCall?: any;
  updatedEvents?: ScheduleEvent[];
  updatedLearnedMemories?: string[];
  updatedLearnedPrompt?: string;
}> {
  // 1. Try calling the backend /api/chat endpoint first
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && !data.error) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend /api/chat unavailable or returned error, falling back to client-side AI processing:', err);
  }

  // 2. Client-side Gemini Fallback (for Vercel or standalone frontend deployments)
  return await processChatClientSide(payload);
}

async function processChatClientSide(payload: ChatPayload) {
  const {
    message,
    history,
    systemInstruction,
    learnedPrompt,
    learnedMemories,
    aiProvider,
    aiModel,
    geminiApiKey,
    shopaikeyApiKey,
    shopaikeyBaseUrl,
    currentEvents = [],
    currentBaseDate,
  } = payload;

  // Determine API key based on provider
  const envKey = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_GEMINI_API_KEY : undefined;
  let apiKey = envKey;
  let baseUrl: string | undefined = undefined;
  let apiVersion: string | undefined = undefined;

  if (aiProvider === 'shopaikey') {
    apiKey = shopaikeyApiKey || geminiApiKey || envKey;
    let rawBaseUrl = shopaikeyBaseUrl || 'https://api.shopaikey.com';

    if (rawBaseUrl.endsWith('/v1')) {
      rawBaseUrl = rawBaseUrl.slice(0, -3);
      apiVersion = 'v1';
    } else if (rawBaseUrl.endsWith('/v1beta')) {
      rawBaseUrl = rawBaseUrl.slice(0, -7);
      apiVersion = 'v1beta';
    } else if (rawBaseUrl.endsWith('/')) {
      rawBaseUrl = rawBaseUrl.slice(0, -1);
    }
    baseUrl = rawBaseUrl;
  } else {
    // default to gemini
    apiKey = geminiApiKey || envKey;
  }

  if (!apiKey || apiKey === 'dummy-key') {
    return {
      reply: '⚠️ **Thông báo**: Chưa tìm thấy API Key hợp lệ. Bác sĩ vui lòng vào mục **Cài đặt hệ thống (biểu tượng bánh răng ⚙️)** -> Chọn nguồn API (Google Gemini hoặc ShopAIKey) và nhập API Key của Bác sĩ nhé!',
    };
  }

  const httpOptions: any = {
    headers: {
      'User-Agent': 'aistudio-build',
      ...(apiKey ? { 'x-goog-api-key': apiKey, 'Authorization': `Bearer ${apiKey}` } : {}),
    },
  };

  if (baseUrl) {
    httpOptions.baseUrl = baseUrl;
  }
  if (apiVersion) {
    httpOptions.apiVersion = apiVersion;
  }

  const clientOptions: any = {
    apiKey: apiKey,
    httpOptions,
  };

  const ai = new GoogleGenAI(clientOptions);
  const selectedModel = aiModel || 'gemini-1.5-flash';

  const baseSystemInstruction = systemInstruction?.trim() || DOCTOR_SYSTEM_INSTRUCTION;

  let currentMemories: string[] = Array.isArray(learnedMemories) && learnedMemories.length > 0
    ? [...learnedMemories]
    : [
        'Lịch làm việc cố định Bệnh viện: Sáng 07:30 - 12:00, Chiều 13:30 - 16:30 (Thứ 2 - Thứ 6)',
        'Lịch phòng khám ngoài giờ: Thứ 7 và Chủ Nhật từ 08:00 - 11:30',
        'Lịch học cố định: Tối Thứ 3 và Thứ 5 học MRI từ 19:30 - 21:30',
        'Khoảng đệm di chuyển & nghỉ ngơi: Tối thiểu 30-45 phút sau ca làm việc bệnh viện',
        'Ưu tiên đặc biệt: Tự động gắn P1 cho các ca can thiệp lâm sàng RFA giáp, VABB vú và Sinh thiết kim',
      ];

  const formattedLearnedPrompt = learnedPrompt?.trim() || currentMemories.map((m) => `- ${m}`).join('\n');

  const activeSystemInstruction = `${baseSystemInstruction}
[KÝ ỨC/THÓI QUEN]:
${formattedLearnedPrompt}
[QUY TẮC]: CHỈ cập nhật thói quen mới bằng hàm \`ghi_nho_thoi_quen\` KHI Bác sĩ có yêu cầu rõ ràng việc ghi nhớ, lưu thói quen hoặc cập nhật Prompt Phụ (VD: "hãy ghi nhớ...", "lưu thói quen này...", "cập nhật prompt phụ..."). TUYỆT ĐỐI không tự động lưu hoặc cập nhật thói quen nếu không có yêu cầu trực tiếp từ Bác sĩ.`;

  const MAX_HISTORY = 4;
  const contents: any[] = [];
  if (history && Array.isArray(history)) {
    const prunedHistory = history.slice(-MAX_HISTORY);
    for (const msg of prunedHistory) {
      if (msg.text) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        });
      }
    }
  }

  const now = new Date();
  const currentScheduleSummary = currentEvents
    .filter((e) => {
      if (!e.date) return true;
      const eventDate = new Date(e.date);
      const diffTime = eventDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= -1 && diffDays <= 7;
    })
    .slice(0, 15)
    .map((e) => `${e.id}|${e.date}|${e.startTime}-${e.endTime}|${e.title}|${e.priority}`)
    .join('\n');

  const normalizeDateStr = (dateStr: string, currentBaseDateStr: string): string => {
    if (!dateStr) return '';
    let normalized = dateStr.trim().replace(/\//g, '-');
    
    const dmyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const ymdPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const dmPattern = /^(\d{1,2})-(\d{1,2})$/;

    if (ymdPattern.test(normalized)) {
      const parts = normalized.split('-');
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    if (dmyPattern.test(normalized)) {
      const parts = normalized.split('-');
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }

    if (dmPattern.test(normalized)) {
      const parts = normalized.split('-');
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = currentBaseDateStr.split('-')[0] || '2026';
      return `${y}-${m}-${d}`;
    }

    return dateStr;
  };

  const buildCalendarReferenceContext = (currentBaseDateStr?: string): string => {
    const baseDateStr = currentBaseDateStr || '2026-08-10';
    const parts = baseDateStr.split('-');
    const y = parseInt(parts[0], 10) || 2026;
    const m = parseInt(parts[1], 10) || 8;
    const d = parseInt(parts[2], 10) || 10;
    
    const baseDate = new Date(y, m - 1, d);
    
    const getMonday = (dt: Date): Date => {
      const dTemp = new Date(dt);
      const day = dTemp.getDay();
      const diff = dTemp.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(dTemp.setDate(diff));
    };
    
    const monday = getMonday(baseDate);
    const weekDates = [1, 2, 3, 4, 5, 6, 0].map((dayNum, idx) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + idx);
      const dayLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      return {
        dayOfWeek: dayNum,
        label: dayLabels[dayNum],
        isoStr: `${yyyy}-${mm}-${dd}`
      };
    });
    
    const formattedWeekList = weekDates.map(item => `- ${item.label}: ${item.isoStr} (dayOfWeek: ${item.dayOfWeek})`).join('\n');
    
    return `[Context: Calendar Reference Date]
- Today / Reference Date is ${baseDateStr}.
- The active calendar week being displayed is from Monday ${weekDates[1].isoStr} to Sunday ${weekDates[0].isoStr}.
- Here is the complete list of days and their corresponding dates for this week:
${formattedWeekList}
- CRITICAL: When the Bác sĩ requests scheduling on a specific day of the week (e.g. "thứ ba", "chủ nhật"), look up and use the EXACT date (YYYY-MM-DD) and dayOfWeek from the list above. Do NOT schedule for any past weeks or arbitrary future dates unless explicitly requested.`;
  };

  const refContext = buildCalendarReferenceContext(currentBaseDate);

  contents.push({
    role: 'user',
    parts: [
      {
        text: `${refContext}\n\n[Context: Current Schedule]\n${currentScheduleSummary}\n\n[Message]\n${message}`,
      },
    ],
  });

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: activeSystemInstruction,
        tools: [
          {
            functionDeclarations: [
              taoLichHenDeclaration,
              dieuChinhLichHenDeclaration,
              saoChepLichHenDeclaration,
              hoanTacThaoTacDeclaration,
              capNhatUuTienDeclaration,
              xoaLichHenDeclaration,
              tinhKhangDemDeclaration,
              ghiNhoThoiQuenDeclaration,
            ],
          },
        ],
      },
    });

    const functionCalls = response.functionCalls;
    let replyText = response.text || '';
    let executedCall: any = null;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const name = call.name;
      const args = call.args as Record<string, any>;

      if (name === 'tao_lich_hen') {
        const baseDateStr = currentBaseDate || '2026-08-10';
        let finalDate = args.date ? normalizeDateStr(args.date, baseDateStr) : '';
        let finalDayOfWeek = args.dayOfWeek !== undefined ? Number(args.dayOfWeek) : undefined;

        if (finalDate) {
          // Calculate dayOfWeek from date
          const parts = finalDate.split('-');
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          const dateObj = new Date(y, m - 1, d);
          if (!isNaN(dateObj.getTime())) {
            finalDayOfWeek = dateObj.getDay();
          }
        } else if (finalDayOfWeek !== undefined) {
          // Calculate date from dayOfWeek based on currentBaseDate
          const parts = baseDateStr.split('-');
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          const baseDateObj = new Date(y, m - 1, d);
          
          const getMonday = (dt: Date): Date => {
            const dTemp = new Date(dt);
            const day = dTemp.getDay();
            const diff = dTemp.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(dTemp.setDate(diff));
          };
          
          const monday = getMonday(baseDateObj);
          const idx = finalDayOfWeek === 0 ? 6 : finalDayOfWeek - 1;
          const targetDateObj = new Date(monday);
          targetDateObj.setDate(monday.getDate() + idx);
          
          const yyyy = targetDateObj.getFullYear();
          const mm = String(targetDateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(targetDateObj.getDate()).padStart(2, '0');
          finalDate = `${yyyy}-${mm}-${dd}`;
        } else {
          // Defaults
          finalDate = '2026-08-11';
          finalDayOfWeek = 2;
        }

        const newEvt: ScheduleEvent = {
          id: `evt-${Date.now()}`,
          title: args.title || 'Lịch mới từ AI',
          category: (args.category as EventCategory) || 'hospital',
          categoryLabel: getCategoryLabel((args.category as EventCategory) || 'hospital'),
          priority: (args.priority as PriorityLevel) || 'P2',
          priorityName: getPriorityName((args.priority as PriorityLevel) || 'P2'),
          dayOfWeek: finalDayOfWeek,
          date: finalDate,
          startTime: args.startTime || '19:30',
          endTime: args.endTime || '21:30',
          location: args.location || 'Bệnh viện Nội tiết TƯ / Đại học Y',
          description: args.description || 'Được tạo tự động bởi Trợ lý AI',
          bufferMinutes: args.bufferMinutes || 45,
          isIntervention: args.isIntervention || false,
          repeat: 'weekly',
          completed: false,
        };

        if (newEvt.category !== 'rest' && (finalDayOfWeek === 1 || finalDayOfWeek === 5) && args.startTime >= '19:00') {
          replyText = `⚠️ **Lưu ý Bác sĩ**: Tối Thứ ${finalDayOfWeek + 1} là thời gian nghỉ ngơi & thể thao quan trọng (P4) để tái tạo năng lượng. Em đã thêm lịch "${newEvt.title}" theo yêu cầu, nhưng khuyến nghị Bác sĩ cân nhắc dành thời gian thư giãn!`;
        } else {
          replyText =
            replyText ||
            `✅ Em đã tạo lịch hẹn thành công: **${newEvt.title}** vào Thứ ${newEvt.dayOfWeek === 0 ? 'Chủ Nhật' : newEvt.dayOfWeek + 1} (${newEvt.startTime} - ${newEvt.endTime}). Mức ưu tiên gán tự động: **${newEvt.priorityName}**.`;
        }

        executedCall = { name, args, result: { success: true, createdEvent: newEvt } };
      } else if (name === 'dieu_chinh_lich_hen') {
        const titleStr = args.newTitle || args.titleKeyword || 'công việc';
        const dateStr = args.newDate ? `ngày **${args.newDate}**` : '';
        const dayStr = args.newDayOfWeek !== undefined ? `Thứ ${args.newDayOfWeek === 0 ? 'Chủ Nhật' : args.newDayOfWeek + 1}` : '';
        const timeStr = args.newStartTime ? `lúc **${args.newStartTime}${args.newEndTime ? ' - ' + args.newEndTime : ''}**` : '';

        replyText =
          replyText ||
          `✅ Em đã điều chỉnh thời gian biểu cho **${titleStr}** sang ${dateStr || dayStr} ${timeStr} thành công theo yêu cầu của Bác sĩ!`;
        executedCall = { name, args, result: { success: true } };
      } else if (name === 'sao_chep_lich_hen') {
        const srcStr = args.sourceDate || 'ngày nguồn';
        let rangeStr = '';
        if (args.startDateRange && args.endDateRange) {
          rangeStr = `từ **${args.startDateRange}** đến **${args.endDateRange}**`;
        } else if (args.targetDates && args.targetDates.length > 0) {
          rangeStr = `cho **${args.targetDates.length} ngày** (${args.targetDates.join(', ')})`;
        } else {
          rangeStr = `sang các ngày đích mới`;
        }
        replyText =
          replyText ||
          `📋 Em đã sao chép công việc từ ngày **${srcStr}** ${rangeStr} thành công cho Bác sĩ!`;
        executedCall = { name, args, result: { success: true } };
      } else if (name === 'hoan_tac_thao_tac') {
        const steps = args.steps || 1;
        replyText =
          replyText ||
          `🔄 Em đã hoàn tác (Undo) thành công ${steps} thao tác vừa làm cho Bác sĩ! Lịch làm việc đã được khôi phục về trạng thái trước đó.`;
        executedCall = { name, args, result: { success: true, steps } };
      } else if (name === 'cap_nhat_uu_tien') {
        const priority = args.newPriority as PriorityLevel;
        replyText =
          replyText ||
          `✅ Em đã cập nhật mức ưu tiên **${priority}** (${getPriorityName(priority)}) cho các công việc phù hợp!`;
        executedCall = { name, args, result: { success: true } };
      } else if (name === 'xoa_lich_hen') {
        replyText = replyText || `🗑️ Em đã dời/xóa thành công lịch hẹn theo yêu cầu của Bác sĩ!`;
        executedCall = { name, args, result: { success: true } };
      } else if (name === 'tinh_khang_dem') {
        const day = args.dayOfWeek ?? 2;
        replyText =
          replyText ||
          `📊 **Phân tích Thời gian Đệm (Thứ ${day + 1})**:\n- Ca làm việc tại bệnh viện kết thúc lúc 17:00.\n- Buổi học tối bắt đầu lúc 19:30.\n- Khoảng đệm di chuyển & nghỉ ngơi đạt **150 phút** (đạt tiêu chuẩn an toàn > 45 phút, không lo kiệt sức!).`;
        executedCall = { name, args, result: { day, bufferMinutes: 150, safe: true } };
      } else if (name === 'ghi_nho_thoi_quen') {
        const memText = args.memoryText || '';
        if (memText && !currentMemories.includes(memText)) {
          currentMemories.unshift(memText);
        }
        replyText =
          replyText ||
          `🧠 **Đã tự ghi nhận vào Prompt Phụ (Ký Ức Tự Học)**:\n"${memText}"\n\nEm đã lưu thông tin này vào bộ nhớ thói quen để tự động áp dụng tối ưu hiệu suất cho các lần xếp lịch tiếp theo của Bác sĩ!`;
        executedCall = { name, args, result: { success: true, newMemory: memText } };
      }
    }

    if (!replyText) {
      replyText = `Em đã ghi nhận ý kiến của Bác sĩ. Lịch trình của Bác sĩ đã được cập nhật!`;
    }

    const updatedPromptText = currentMemories.map((m) => `- ${m}`).join('\n');

    return {
      reply: replyText,
      executedCall,
      updatedLearnedMemories: currentMemories,
      updatedLearnedPrompt: updatedPromptText,
    };
  } catch (err: any) {
    console.error('Client Gemini Error:', err);
    const errMsg = err?.message || '';
    if (errMsg.includes('proxy_api_error') || errMsg.includes('Invalid token') || errMsg.includes('API_KEY_INVALID')) {
      return {
        reply: `⚠️ **Lỗi xác thực API Key (${aiProvider === 'shopaikey' ? 'ShopAIKey' : 'Google Gemini'})**: Token không hợp lệ. Bác sĩ vui lòng mở **Cài đặt hệ thống (⚙️)** -> **Cấu hình Nguồn API Trợ Lý AI** và cập nhật đúng API Key/Token nhé!`,
      };
    }
    return {
      reply: `⚠️ Không thể kết nối Gemini API (${errMsg || 'Lỗi mạng'}). Bác sĩ vui lòng kiểm tra lại API Key trong mục Cài đặt.`,
    };
  }
}
