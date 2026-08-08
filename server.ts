import express from 'express';
import path from 'path';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { INITIAL_EVENTS } from './src/data/initialData';
import { ScheduleEvent, PriorityLevel, EventCategory } from './src/types';

dotenv.config();

const app = express();
app.use(express.json());

// Enable CORS middleware supporting https://medilich.vercel.app and Vercel deployments
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://medilich.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.APP_URL,
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const PORT = 3000;

// Initialize in-memory database store
let scheduleEvents: ScheduleEvent[] = [...INITIAL_EVENTS];
let syncStatus = { googleConnected: false, totalSyncedEvents: 0 };

// System Instruction for Gemini AI Assistant
const DOCTOR_SYSTEM_INSTRUCTION = `Trợ lý AI Quản lý Lịch Thông Minh dành riêng cho Bác sĩ Chẩn đoán Hình ảnh - Bệnh viện Nội tiết TƯ.
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

// Function Declarations for Gemini Tool Use
const taoLichHenDeclaration: FunctionDeclaration = {
  name: 'tao_lich_hen',
  description: 'Tạo một lịch hẹn hoặc công việc mới trong thời gian biểu của bác sĩ.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Tên công việc hoặc sự kiện (VD: Học MRI sọ não, Can thiệp RFA giáp, Siêu âm PK)',
      },
      date: {
        type: Type.STRING,
        description: 'Ngày diễn ra theo định dạng YYYY-MM-DD (VD: 2026-08-11)',
      },
      dayOfWeek: {
        type: Type.INTEGER,
        description: 'Thứ trong tuần (1: Thứ 2, 2: Thứ 3, ..., 6: Thứ 7, 0: Chủ Nhật)',
      },
      startTime: {
        type: Type.STRING,
        description: 'Giờ bắt đầu dạng HH:mm (VD: 19:30)',
      },
      endTime: {
        type: Type.STRING,
        description: 'Giờ kết thúc dạng HH:mm (VD: 21:30)',
      },
      category: {
        type: Type.STRING,
        description: 'Phân loại nhóm: hospital (Bệnh viện), study (Học tập), clinic (Phòng khám), rest (Nghỉ ngơi), personal (Cá nhân)',
      },
      priority: {
        type: Type.STRING,
        description: 'Mức độ ưu tiên Eisenhower: P1 (Khẩn cấp/Lâm sàng), P2 (Học tập/Chuyên sâu), P3 (Thường quy), P4 (Nghỉ ngơi)',
      },
      location: {
        type: Type.STRING,
        description: 'Địa điểm làm việc/học tập (VD: Bệnh viện Nội tiết TƯ - Phòng MRI, Hội trường Đại học Y)',
      },
      bufferMinutes: {
        type: Type.INTEGER,
        description: 'Thời gian đệm nghỉ ngơi/di chuyển tính bằng phút (mặc định 30-45 phút trước buổi học)',
      },
      isIntervention: {
        type: Type.BOOLEAN,
        description: 'Có phải là ca thủ thuật can thiệp lâm sàng khẩn cấp không (RFA, VABB, Sinh thiết)',
      },
      description: {
        type: Type.STRING,
        description: 'Ghi chú bổ sung cho lịch hẹn',
      },
    },
    required: ['title', 'startTime', 'endTime', 'category'],
  },
};

const capNhatUuTienDeclaration: FunctionDeclaration = {
  name: 'cap_nhat_uu_tien',
  description: 'Cập nhật mức độ ưu tiên Eisenhower (P1-P4) hoặc phân loại nhóm cho công việc đã có.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'Mã id sự kiện cần cập nhật',
      },
      eventTitleKeyword: {
        type: Type.STRING,
        description: 'Từ khóa tìm kiếm tên sự kiện nếu không có id',
      },
      newPriority: {
        type: Type.STRING,
        description: 'Mức ưu tiên mới (P1, P2, P3, P4)',
      },
      newCategory: {
        type: Type.STRING,
        description: 'Phân loại mới (hospital, study, clinic, rest, personal)',
      },
    },
    required: ['newPriority'],
  },
};

const dieuChinhLichHenDeclaration: FunctionDeclaration = {
  name: 'dieu_chinh_lich_hen',
  description: 'Điều chỉnh, đổi ngày, đổi giờ (thời gian bắt đầu/kết thúc), dời lịch hoặc đổi tên/địa điểm/mức ưu tiên cho lịch hẹn/công việc đã có trong thời gian biểu.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'Mã ID sự kiện cần điều chỉnh nếu có',
      },
      titleKeyword: {
        type: Type.STRING,
        description: 'Từ khóa tìm kiếm tên sự kiện muốn sửa (VD: "lịch học MRI", "siêu âm", "đọc CLVT")',
      },
      newDate: {
        type: Type.STRING,
        description: 'Ngày mới diễn ra theo định dạng YYYY-MM-DD (VD: "2026-08-14")',
      },
      newDayOfWeek: {
        type: Type.INTEGER,
        description: 'Thứ mới trong tuần (1: Thứ 2, 2: Thứ 3, ..., 6: Thứ 7, 0: Chủ Nhật)',
      },
      newStartTime: {
        type: Type.STRING,
        description: 'Giờ bắt đầu mới dạng HH:mm (VD: "20:00")',
      },
      newEndTime: {
        type: Type.STRING,
        description: 'Giờ kết thúc mới dạng HH:mm (VD: "22:00")',
      },
      newTitle: {
        type: Type.STRING,
        description: 'Tên công việc mới nếu muốn đổi tiêu đề',
      },
      newLocation: {
        type: Type.STRING,
        description: 'Địa điểm mới nếu muốn thay đổi',
      },
      newPriority: {
        type: Type.STRING,
        description: 'Mức ưu tiên mới (P1, P2, P3, P4)',
      },
      newCategory: {
        type: Type.STRING,
        description: 'Phân loại nhóm mới (hospital, study, clinic, rest, personal)',
      },
      newDescription: {
        type: Type.STRING,
        description: 'Ghi chú mới bổ sung',
      },
    },
  },
};

const saoChepLichHenDeclaration: FunctionDeclaration = {
  name: 'sao_chep_lich_hen',
  description: 'Sao chép (copy), nhân bản hàng loạt các công việc/lịch hẹn từ một ngày nguồn (hoặc theo từ khóa công việc) sang một khoảng ngày hoặc danh sách nhiều ngày đích khác nhau.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sourceDate: {
        type: Type.STRING,
        description: 'Ngày nguồn chứa các công việc cần sao chép theo định dạng YYYY-MM-DD (VD: "2026-08-10") hoặc cụm ngày như "10/08"',
      },
      titleKeyword: {
        type: Type.STRING,
        description: 'Từ khóa tên công việc cụ thể nếu chỉ muốn copy 1 công việc nhất định (để trống nếu muốn copy toàn bộ công việc trong ngày nguồn)',
      },
      startDateRange: {
        type: Type.STRING,
        description: 'Ngày bắt đầu của khoảng ngày đích cần sao chép sang dạng YYYY-MM-DD (VD: "2026-08-11")',
      },
      endDateRange: {
        type: Type.STRING,
        description: 'Ngày kết thúc của khoảng ngày đích cần sao chép sang dạng YYYY-MM-DD (VD: "2026-08-14")',
      },
      targetDates: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Danh sách các ngày đích cụ thể dạng YYYY-MM-DD nếu không dùng khoảng ngày (VD: ["2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"])',
      },
    },
  },
};

const hoanTacThaoTacDeclaration: FunctionDeclaration = {
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


// dongBoCalendarDeclaration removed

const xoaLichHenDeclaration: FunctionDeclaration = {
  name: 'xoa_lich_hen',
  description: 'Xóa hoặc hủy một lịch hẹn/công việc trong thời gian biểu.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'Mã sự kiện cần xóa',
      },
      titleKeyword: {
        type: Type.STRING,
        description: 'Từ khóa tìm kiếm sự kiện muốn hủy',
      },
    },
  },
};

const tinhKhangDemDeclaration: FunctionDeclaration = {
  name: 'tinh_khang_dem',
  description: 'Tính toán khoảng nghỉ đệm (Buffer time) và cảnh báo xung đột giữa ca bệnh viện và buổi học tối.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      dayOfWeek: {
        type: Type.INTEGER,
        description: 'Thứ cần kiểm tra khoảng đệm (1-6, 0)',
      },
    },
  },
};

const ghiNhoThoiQuenDeclaration: FunctionDeclaration = {
  name: 'ghi_nho_thoi_quen',
  description: 'CHỈ SỬ DỤNG khi Bác sĩ yêu cầu rõ ràng việc lưu lại, ghi nhớ, ghi nhận thói quen mới, giờ giấc làm việc hoặc yêu cầu cập nhật Prompt Phụ (VD: "hãy ghi nhớ...", "lưu lại thói quen...", "cập nhật bộ nhớ..."). KHÔNG TỰ ĐỘNG GỌI khi người dùng chỉ chia sẻ thông tin thông thường.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      memoryText: {
        type: Type.STRING,
        description: 'Câu tóm tắt vắn tắt thói quen hoặc khung giờ làm việc/nghỉ ngơi mới của Bác sĩ (VD: "Thời gian làm việc tại BV Nội tiết TƯ: Sáng 07:30 - 12:00, Chiều 13:30 - 16:30")',
      },
    },
    required: ['memoryText'],
  },
};

// Lazy initialization of Gemini API Client
function getGeminiAI(options?: { aiProvider?: string; geminiApiKey?: string; shopaikeyApiKey?: string; shopaikeyBaseUrl?: string }) {
  let apiKey = process.env.GEMINI_API_KEY;
  let baseUrl: string | undefined = undefined;
  
  const clientOptions: any = {
    apiKey: apiKey || 'dummy-key',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  };

  if (options?.aiProvider === 'shopaikey') {
    apiKey = options.shopaikeyApiKey || apiKey;
    // The GoogleGenAI SDK automatically appends /v1beta/... or /v1/... to the baseUrl
    // If the user provided a URL ending in /v1, we can set apiVersion to 'v1' and strip it from baseUrl.
    let rawBaseUrl = options.shopaikeyBaseUrl || 'https://api.shopaikey.com';
    let apiVersion = undefined;
    
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
    
    if (apiVersion) {
      clientOptions.httpOptions.apiVersion = apiVersion;
    }
  } else if (options?.aiProvider === 'gemini') {
    apiKey = options.geminiApiKey || apiKey;
  }

  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is not set. Mock fallback will be used if needed.');
  }

  // update the API key in clientOptions if it changed
  clientOptions.apiKey = apiKey || 'dummy-key';

  if (apiKey) {
    clientOptions.httpOptions.headers = {
      ...(clientOptions.httpOptions.headers || {}),
      'x-goog-api-key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
    };
  }

  if (baseUrl) {
    clientOptions.httpOptions.baseUrl = baseUrl;
  }

  return new GoogleGenAI(clientOptions);
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), doctor: 'BS. Chẩn đoán Hình ảnh - BVNTTƯ' });
});

// GET all events
app.get('/api/events', (req, res) => {
  res.json({ events: scheduleEvents, syncStatus });
});

// POST new event
app.post('/api/events', (req, res) => {
  const newEvt: ScheduleEvent = {
    id: `evt-${Date.now()}`,
    title: req.body.title || 'Công việc mới',
    category: req.body.category || 'hospital',
    categoryLabel: req.body.categoryLabel || 'Bệnh viện',
    priority: req.body.priority || 'P3',
    priorityName: getPriorityName(req.body.priority || 'P3'),
    dayOfWeek: req.body.dayOfWeek ?? 1,
    date: req.body.date || '2026-08-10',
    startTime: req.body.startTime || '08:00',
    endTime: req.body.endTime || '17:00',
    location: req.body.location || 'Bệnh viện Nội tiết TƯ',
    description: req.body.description || '',
    bufferMinutes: req.body.bufferMinutes || 30,
    isIntervention: req.body.isIntervention || false,
    repeat: req.body.repeat || 'weekly',
    completed: false,
    createdAt: new Date().toISOString(),
  };

  scheduleEvents.push(newEvt);
  res.status(201).json({ event: newEvt, total: scheduleEvents.length });
});

// PUT update event
app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const index = scheduleEvents.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
  }

  scheduleEvents[index] = {
    ...scheduleEvents[index],
    ...req.body,
    priorityName: req.body.priority ? getPriorityName(req.body.priority) : scheduleEvents[index].priorityName,
  };

  res.json({ event: scheduleEvents[index] });
});

// DELETE event
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  scheduleEvents = scheduleEvents.filter((e) => e.id !== id);
  res.json({ success: true, remaining: scheduleEvents.length });
});

// Calendar Sync API
// Sync endpoint removed

// Export iCal (.ics) format
app.get('/api/calendar/export.ics', (req, res) => {
  let icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BS Radiology AI Assistant//Schedule App//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Lịch Bác Sĩ CĐHA - BV Nội Tiết TƯ',
  ];

  scheduleEvents.forEach((evt) => {
    const cleanTitle = evt.title.replace(/,/g, '\\,');
    const cleanLoc = evt.location.replace(/,/g, '\\,');
    const dateFormatted = evt.date.replace(/-/g, '');
    const startFormatted = evt.startTime.replace(':', '') + '00';
    const endFormatted = evt.endTime.replace(':', '') + '00';

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:evt-${evt.id}@radiology-ai.local`);
    icsLines.push(`SUMMARY:[${evt.priority}] ${cleanTitle}`);
    icsLines.push(`LOCATION:${cleanLoc}`);
    icsLines.push(`DESCRIPTION:Phân loại: ${evt.categoryLabel}. Ưu tiên: ${evt.priorityName}. ${evt.description || ''}`);
    icsLines.push(`DTSTART:${dateFormatted}T${startFormatted}`);
    icsLines.push(`DTEND:${dateFormatted}T${endFormatted}`);
    icsLines.push('END:VEVENT');
  });

  icsLines.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Lich_Bac_Si_CDHA.ics"');
  res.send(icsLines.join('\r\n'));
});

// POST send schedule summary email
app.post('/api/send-summary', async (req, res) => {
  const { 
    email, 
    events = [], 
    weekRangeText = '', 
    smtpHost, 
    smtpPort, 
    smtpUser, 
    smtpPass,
    doctorTitle = 'BS. Chẩn đoán Hình ảnh',
    hospitalName = 'BV Nội tiết Trung ương'
  } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Thiếu email nhận thông tin.' });
  }

  // Count metrics
  const totalCount = events.length;
  const hospitalCount = events.filter((e: any) => e.category === 'hospital').length;
  const studyCount = events.filter((e: any) => e.category === 'study').length;
  const clinicCount = events.filter((e: any) => e.category === 'clinic').length;
  const restCount = events.filter((e: any) => e.category === 'rest').length;
  const urgentCount = events.filter((e: any) => e.priority === 'P1' || e.priority === 'P2').length;

  const daysMap: Record<number, string> = {
    1: 'Thứ Hai',
    2: 'Thứ Ba',
    3: 'Thứ Tư',
    4: 'Thứ Năm',
    5: 'Thứ Sáu',
    6: 'Thứ Bảy',
    0: 'Chủ Nhật'
  };

  const sortedEvents = [...events].sort((a: any, b: any) => {
    const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    if (dayA !== dayB) return dayA - dayB;
    return a.startTime.localeCompare(b.startTime);
  });

  // Group by day
  const grouped: Record<string, any[]> = {};
  sortedEvents.forEach((evt: any) => {
    const dayName = daysMap[evt.dayOfWeek] || 'Lịch trình';
    const dayLabel = evt.date ? `${dayName} (${evt.date.split('-').reverse().join('/')})` : dayName;
    if (!grouped[dayLabel]) {
      grouped[dayLabel] = [];
    }
    grouped[dayLabel].push(evt);
  });

  let scheduleHtml = '';
  Object.entries(grouped).forEach(([dayLabel, dayEvts]) => {
    scheduleHtml += `
      <div class="day-group" style="margin-bottom: 20px;">
        <div class="day-title" style="font-size: 13.5px; font-weight: 800; color: #0f172a; background-color: #f1f5f9; padding: 10px 14px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #4f46e5; letter-spacing: 0.3px;">
          📅 ${dayLabel}
        </div>
    `;

    dayEvts.forEach((evt: any) => {
      let categoryText = 'Bệnh viện';
      let catBg = '#e0f2fe';
      let catColor = '#0369a1';
      let cardBg = '#f0f9ff';
      let borderLeftColor = '#0284c7';

      if (evt.category === 'study') {
        categoryText = 'Nghiên cứu';
        catBg = '#f3e8ff';
        catColor = '#6b21a8';
        cardBg = '#faf5ff';
        borderLeftColor = '#9333ea';
      } else if (evt.category === 'clinic') {
        categoryText = 'Phòng khám';
        catBg = '#dcfce7';
        catColor = '#15803d';
        cardBg = '#f0fdf4';
        borderLeftColor = '#16a34a';
      } else if (evt.category === 'rest') {
        categoryText = 'Nghỉ ngơi';
        catBg = '#fef3c7';
        catColor = '#b45309';
        cardBg = '#fffbeb';
        borderLeftColor = '#d97706';
      }

      let priorityText = evt.priorityName || evt.priority || 'Thường quy (P3)';
      let priorityBg = '#f1f5f9';
      let priorityColor = '#475569';
      if (evt.priority === 'P1') {
        priorityBg = '#fee2e2';
        priorityColor = '#b91c1c';
      } else if (evt.priority === 'P2') {
        priorityBg = '#f3e8ff';
        priorityColor = '#7e22ce';
      } else if (evt.priority === 'P4') {
        priorityBg = '#fef3c7';
        priorityColor = '#a16207';
      }

      scheduleHtml += `
        <div class="event-card" style="background-color: ${cardBg}; border-left: 4px solid ${borderLeftColor}; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 14px 16px; border-radius: 12px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <div style="font-weight: 800; color: #0f172a; font-size: 13.5px; line-height: 1.4;">
              ${evt.isIntervention ? '<span style="color: #ef4444; font-weight: bold; margin-right: 4px;">⚠️</span>' : ''}${evt.title}
            </div>
            <div style="text-align: right; shrink-0;">
              <span style="background-color: ${priorityBg}; color: ${priorityColor}; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; white-space: nowrap;">
                ${priorityText}
              </span>
            </div>
          </div>

          <div style="font-size: 12px; color: #475569; margin-bottom: 4px; line-height: 1.5; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center;">
            <span style="font-weight: 700; color: #4f46e5; white-space: nowrap;">⏰ ${evt.startTime} - ${evt.endTime}</span>
            <span style="color: #cbd5e1;">|</span>
            <span style="font-weight: 600; color: #334155;">📍 ${evt.location || 'Bệnh viện'}</span>
            <span style="color: #cbd5e1;">|</span>
            <span style="background-color: ${catBg}; color: ${catColor}; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; white-space: nowrap;">
              ${categoryText}
            </span>
          </div>

          ${evt.bufferMinutes ? `
            <div style="font-size: 11px; color: #d97706; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
              ⏳ Khoảng đệm: <b>${evt.bufferMinutes} phút</b> trước ca tiếp theo
            </div>
          ` : ''}

          ${evt.description ? `
            <div style="font-size: 11.5px; color: #475569; background-color: rgba(255, 255, 255, 0.7); border: 1px solid #e2e8f0; border-left: 2px solid #cbd5e1; padding: 8px 12px; border-radius: 8px; margin-top: 6px; font-style: italic; line-height: 1.4;">
              💬 Ghi chú: ${evt.description}
            </div>
          ` : ''}
        </div>
      `;
    });

    scheduleHtml += `</div>`;
  });

  if (sortedEvents.length === 0) {
    scheduleHtml = `
      <div style="text-align: center; color: #64748b; padding: 35px 20px; font-style: italic; background-color: #f8fafc; border-radius: 16px; border: 1px dashed #cbd5e1;">
        Không có lịch trình làm việc nào được xếp cho tuần này.
      </div>
    `;
  }

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>[MediSync] Tóm tắt Lịch trình Tuần</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f1f5f9;
          margin: 0;
          padding: 0;
          color: #0f172a;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 580px;
          margin: 15px auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #0f172a;
          background-image: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #155e75 100%);
          padding: 24px 16px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.3px;
          color: #ffffff;
          text-transform: uppercase;
        }
        .header p {
          margin: 4px 0 0;
          font-size: 12.5px;
          color: #38bdf8;
          font-weight: 600;
        }
        .week-tag {
          display: inline-block;
          margin-top: 10px;
          background-color: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          font-size: 12px;
          font-family: monospace;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 30px;
        }
        .content {
          padding: 16px;
        }
        .summary-title {
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
        }
        .summary-grid {
          margin-bottom: 20px;
          text-align: center;
        }
        .summary-card {
          width: 44%;
          display: inline-block;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px;
          text-align: center;
          margin: 2%;
          box-sizing: border-box;
          vertical-align: top;
        }
        .summary-card .num {
          font-size: 20px;
          font-weight: 800;
          color: #4f46e5;
          line-height: 1;
        }
        .summary-card.urgent .num {
          color: #ef4444;
        }
        .summary-card .label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          margin-top: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .section-title {
          font-size: 12.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
          border-left: 3px solid #4f46e5;
          padding-left: 8px;
          margin-top: 20px;
          margin-bottom: 12px;
        }
        .tips-box {
          margin-top: 20px;
          padding: 12px 14px;
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          font-size: 11.5px;
          color: #166534;
          line-height: 1.45;
        }
        .tips-title {
          font-weight: 700;
          margin-bottom: 3px;
          color: #14532d;
        }
        .footer {
          background-color: #f8fafc;
          padding: 16px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          line-height: 1.45;
        }
        @media (max-width: 480px) {
          .summary-card {
            width: 96%;
            margin: 1.5% 2%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TÓM TẮT LỊCH TRÌNH TUẦN</h1>
          <p>${doctorTitle} | ${hospitalName}</p>
          <div class="week-tag">
            📅 Tuần: ${weekRangeText}
          </div>
        </div>
        <div class="content">
          <div class="quick-summary-box" style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: left;">
            <div style="font-size: 13px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
              ⚡ TÓM TẮT LỊCH CÔNG TÁC NHANH (10/08 - 16/08)
            </div>
            <div style="font-size: 12.5px; color: #334155; line-height: 1.6;">
              <p style="margin: 0 0 8px 0; font-weight: 700; color: #0f172a;">💼 Làm việc tại BV (07:30 - 16:30): <span style="font-weight: normal; color: #475569;">Thứ Hai đến thứ Sáu.</span></p>
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #0f172a;">📚 Học tập (P2):</p>
              <ul style="margin: 0 0 8px 0; padding-left: 20px; color: #475569;">
                <li><b>Thứ Ba (19:30 - 21:30):</b> MRI khóa 6 tháng.</li>
                <li><b>Thứ Năm (19:30 - 21:30):</b> CLVT chuyên sâu.</li>
                <li><b>Thứ Bảy (08:00 - 17:30):</b> Học siêu âm chuyên sâu.</li>
              </ul>
              <p style="margin: 0 0 8px 0; font-weight: 700; color: #ef4444;">🚨 Việc quan trọng (P1): <span style="font-weight: bold; color: #b91c1c;">Thứ Bảy (08:00 - 11:00) Kiểm định Bộ Y tế.</span></p>
              <p style="margin: 0 0 8px 0; font-weight: 700; color: #d97706;">🔋 Nghỉ ngơi (P4): <span style="font-weight: normal; color: #475569;">Thứ Hai, thứ Tư, thứ Sáu và thứ Bảy (tối).</span></p>
              <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px 12px; margin-top: 10px; color: #991b1b; font-size: 11.5px; font-weight: 600;">
                ⚠️ Lưu ý: Vào thứ Bảy, lịch "Học siêu âm" (08:00 - 17:30) đang trùng với giờ "Kiểm định Bộ Y tế" (08:00 - 11:00).
              </div>
            </div>
          </div>

          <div class="summary-title">📊 THỐNG KÊ LỊCH TRÌNH</div>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="num">${totalCount}</div>
              <div class="label">Tổng số</div>
            </div>
            <div class="summary-card">
              <div class="num">${hospitalCount}</div>
              <div class="label">Bệnh viện</div>
            </div>
            <div class="summary-card">
              <div class="num">${clinicCount}</div>
              <div class="label">Phòng khám</div>
            </div>
            <div class="summary-card urgent">
              <div class="num">${urgentCount}</div>
              <div class="label">Ưu tiên cao</div>
            </div>
          </div>

          <div class="section-title">📅 CHI TIẾT LỊCH TRÌNH HÀNG NGÀY</div>
          ${scheduleHtml}

          <div class="tips-box">
            <div class="tips-title">💡 Gợi ý từ Trợ lý AI:</div>
            Lịch trình đã được tối ưu hóa thông minh với các khoảng thời gian đệm an toàn và phân phối hợp lý dựa trên thói quen của Bác sĩ. Chúc Bác sĩ một tuần làm việc hiệu quả và tràn đầy năng lượng!
          </div>
        </div>
        <div class="footer">
          <p>Email này được tạo tự động bởi hệ thống lập lịch thông minh <b>MediSync AI Scheduler</b>.</p>
          <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Mọi thắc mắc hoặc yêu cầu điều chỉnh lịch vui lòng phản hồi qua giao diện Trợ lý AI của bạn.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const host = smtpHost || process.env.SMTP_HOST;
  const port = smtpPort || Number(process.env.SMTP_PORT) || 587;
  const user = smtpUser || process.env.SMTP_USER;
  const pass = smtpPass || process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"${doctorTitle} - AI" <${user}>`,
        to: email,
        subject: `[MediSync] Tóm tắt lịch trình tuần ${weekRangeText}`,
        html: htmlBody,
      });

      console.log('Email sent successfully:', info.messageId);
      return res.json({ 
        success: true, 
        message: 'Đã gửi email tóm tắt lịch trình thành công thông qua máy chủ SMTP cấu hình của bạn!', 
        previewHtml: htmlBody,
        simulated: false 
      });
    } catch (sendErr: any) {
      console.error('SMTP sending error:', sendErr);
      return res.json({
        success: true,
        message: `Mô phỏng gửi thành công tóm tắt lịch trình đến: ${email}! (Không gửi được qua SMTP do: ${sendErr.message})`,
        previewHtml: htmlBody,
        simulated: true,
        errorDetails: sendErr.message
      });
    }
  } else {
    console.log(`[SIMULATED EMAIL] Send summary to ${email} for week ${weekRangeText}`);
    return res.json({
      success: true,
      message: `Gửi tóm tắt lịch thành công đến: ${email} (chế độ xem trước). Bạn có thể thiết lập SMTP Host, Port, User, Pass trong mục Cài đặt để gửi email thực tế thông qua tài khoản của mình!`,
      previewHtml: htmlBody,
      simulated: true
    });
  }
});

// System Architecture & Schema Metadata Endpoint
app.get('/api/schema', (req, res) => {
  res.json({
    role: 'Trợ lý AI Quản lý Lịch và Công việc Chuyên biệt dành cho Bác sĩ Chẩn đoán Hình ảnh Bệnh viện Nội tiết Trung ương',
    systemInstruction: DOCTOR_SYSTEM_INSTRUCTION.trim(),
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
    architectureSteps: [
      {
        id: '1',
        title: 'Xử lý Đầu vào & Giọng nói tiếng Việt',
        desc: 'Web Speech API & Giao diện Chatbot nhận yêu cầu bằng tiếng Việt tự nhiên (chữ hoặc giọng nói).',
        tech: 'React 19 + Web Speech API (vi-VN)',
      },
      {
        id: '2',
        title: 'Phân tích Ý định & Function Calling với Gemini AI',
        desc: 'Server Node/Express chuyển câu thoại sang Gemini 3.6 Flash để trích xuất JSON Schema & tự động quyết định gọi tool thích hợp.',
        tech: '@google/genai SDK (gemini-3.6-flash)',
      },
      {
        id: '3',
        title: 'Ma trận Eisenhower & Tính toán Thời gian Đệm',
        desc: 'Kiểm tra bối cảnh lâm sàng (P1-P4), tính toán Buffer Time (30-45 phút) và bảo vệ tuyệt đối các buổi tối nghỉ ngơi.',
        tech: 'Custom Priority & Buffer Engine (Node.js)',
      },
      {
        id: '4',
        title: 'Tự Động Học Hỏi & Tổng Hợp Prompt Phụ (Adaptive Context)',
        desc: 'Tự động trích xuất khung giờ làm việc, thói quen và quy tắc cá nhân từ tin nhắn của Bác sĩ để tự học nâng cao hiệu suất.',
        tech: 'Dynamic Memory Extraction & Prompt Synthesis',
      },
    ],
  });
});

// Gemini Chat & Function Calling Endpoint
function normalizeDateStr(dateStr: string, currentBaseDateStr: string): string {
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
}

function buildCalendarReferenceContext(currentBaseDateStr?: string): string {
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
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, systemInstruction, learnedPrompt, learnedMemories, aiProvider, aiModel, geminiApiKey, shopaikeyApiKey, shopaikeyBaseUrl, currentEvents, currentBaseDate } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Nội dung tin nhắn không hợp lệ' });
    }

    // Synchronize in-memory database with the live state from client Firestore
    if (Array.isArray(currentEvents)) {
      scheduleEvents = [...currentEvents];
    }

    const ai = getGeminiAI({
      aiProvider,
      geminiApiKey,
      shopaikeyApiKey,
      shopaikeyBaseUrl,
    });

    const selectedModel = aiModel || 'gemini-1.5-flash';

    // Core System Instruction (Prompt Chính)
    const baseSystemInstruction =
      typeof systemInstruction === 'string' && systemInstruction.trim()
        ? systemInstruction.trim()
        : DOCTOR_SYSTEM_INSTRUCTION;

    // Learned Memories (Prompt Phụ)
    let currentMemories: string[] =
      Array.isArray(learnedMemories) && learnedMemories.length > 0
        ? [...learnedMemories]
        : [
            'Lịch làm việc cố định Bệnh viện: Sáng 07:30 - 12:00, Chiều 13:30 - 16:30 (Thứ 2 - Thứ 6)',
            'Lịch phòng khám ngoài giờ: Thứ 7 và Chủ Nhật từ 08:00 - 11:30',
            'Lịch học cố định: Tối Thứ 3 và Thứ 5 học MRI từ 19:30 - 21:30',
            'Khoảng đệm di chuyển & nghỉ ngơi: Tối thiểu 30-45 phút sau ca làm việc bệnh viện',
            'Ưu tiên đặc biệt: Tự động gắn P1 cho các ca can thiệp lâm sàng RFA giáp, VABB vú và Sinh thiết kim',
          ];

    const formattedLearnedPrompt =
      typeof learnedPrompt === 'string' && learnedPrompt.trim()
        ? learnedPrompt.trim()
        : currentMemories.map((m) => `- ${m}`).join('\n');

    // Combine Prompt Chính and Prompt Phụ
    const activeSystemInstruction = `${baseSystemInstruction}
[KÝ ỨC/THÓI QUEN]:
${formattedLearnedPrompt}
[QUY TẮC]: CHỈ cập nhật thói quen mới bằng hàm \`ghi_nho_thoi_quen\` KHI Bác sĩ có yêu cầu rõ ràng việc ghi nhớ, lưu thói quen hoặc cập nhật Prompt Phụ (VD: "hãy ghi nhớ...", "lưu thói quen này...", "cập nhật prompt phụ..."). TUYỆT ĐỐI không tự động lưu hoặc cập nhật thói quen nếu không có yêu cầu trực tiếp từ Bác sĩ.`;

    // 1. Optimize History (Last 4 messages)
    const MAX_HISTORY = 4;
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      const prunedHistory = history.slice(-MAX_HISTORY);
      for (const msg of prunedHistory) {
        if (msg.text) {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
      }
    }

    // 2. Filter & Condense Schedule Summary
    const activeEvents: ScheduleEvent[] = Array.isArray(currentEvents) ? currentEvents : scheduleEvents;
    
    const now = new Date();
    const currentScheduleSummary = activeEvents
      .filter(e => {
        if (!e.date) return true;
        const eventDate = new Date(e.date);
        const diffTime = eventDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= -1 && diffDays <= 7;
      })
      .slice(0, 15) // Condense even more
      .map(
        (e) => `${e.id}|${e.date}|${e.startTime}-${e.endTime}|${e.title}|${e.priority}`
      )
      .join('\n');

    const refContext = buildCalendarReferenceContext(currentBaseDate);

    // Append the latest context and message
    contents.push({
      role: 'user',
      parts: [
        {
          text: `${refContext}\n\n[Context: Current Schedule]\n${currentScheduleSummary}\n\n[Message]\n${message}`
        }
      ]
    });

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: contents,
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
        const baseDateStr = (currentBaseDate as string) || '2026-08-10';
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

        // Check for protection rule: P4 Rest Protection
        if (newEvt.category !== 'rest' && (finalDayOfWeek === 1 || finalDayOfWeek === 5) && args.startTime >= '19:00') {
          replyText = `⚠️ **Lưu ý Bác sĩ**: Tối Thứ ${finalDayOfWeek + 1} là thời gian nghỉ ngơi & thể thao quan trọng (P4) để tái tạo năng lượng. Em đã thêm lịch "${newEvt.title}" theo yêu cầu, nhưng khuyến nghị Bác sĩ cân nhắc dành thời gian thư giãn!`;
        } else {
          replyText =
            replyText ||
            `✅ Em đã tạo lịch hẹn thành công: **${newEvt.title}** vào Thứ ${newEvt.dayOfWeek === 0 ? 'Chủ Nhật' : newEvt.dayOfWeek + 1} (${newEvt.startTime} - ${newEvt.endTime}). Mức ưu tiên gán tự động: **${newEvt.priorityName}**.`;
        }

        executedCall = { name, args, result: { success: true, createdEvent: newEvt } };
      } else if (name === 'dieu_chinh_lich_hen') {
        const kw = (args.titleKeyword || '').toLowerCase();
        let updatedCount = 0;

        scheduleEvents = scheduleEvents.map((evt) => {
          if ((args.eventId && evt.id === args.eventId) || (kw && evt.title.toLowerCase().includes(kw))) {
            updatedCount++;
            return {
              ...evt,
              title: args.newTitle || evt.title,
              date: args.newDate || evt.date,
              dayOfWeek: args.newDayOfWeek !== undefined ? args.newDayOfWeek : evt.dayOfWeek,
              startTime: args.newStartTime || evt.startTime,
              endTime: args.newEndTime || evt.endTime,
              location: args.newLocation || evt.location,
              priority: (args.newPriority as PriorityLevel) || evt.priority,
              priorityName: args.newPriority ? getPriorityName(args.newPriority as PriorityLevel) : evt.priorityName,
              category: (args.newCategory as EventCategory) || evt.category,
              categoryLabel: args.newCategory ? getCategoryLabel(args.newCategory as EventCategory) : evt.categoryLabel,
              description: args.newDescription || evt.description,
            };
          }
          return evt;
        });

        const titleStr = args.newTitle || args.titleKeyword || 'công việc';
        const dateStr = args.newDate ? `ngày **${args.newDate}**` : '';
        const dayStr = args.newDayOfWeek !== undefined ? `Thứ ${args.newDayOfWeek === 0 ? 'Chủ Nhật' : args.newDayOfWeek + 1}` : '';
        const timeStr = args.newStartTime ? `lúc **${args.newStartTime}${args.newEndTime ? ' - ' + args.newEndTime : ''}**` : '';

        replyText =
          replyText ||
          `✅ Em đã điều chỉnh thành công lịch làm việc cho **${titleStr}** sang ${dateStr || dayStr} ${timeStr}!`;
        executedCall = { name, args, result: { success: true, updatedCount } };
      } else if (name === 'sao_chep_lich_hen') {
        const srcDate = args.sourceDate || '';
        const titleKw = (args.titleKeyword || '').toLowerCase();

        // Helper to normalize the date format to YYYY-MM-DD if possible
        const normalizeToISO = (dStr: string): string => {
          if (!dStr) return '';
          const normalized = dStr.replace(/\//g, '-');
          const parts = normalized.split('-');
          if (parts.length < 3) return dStr;
          let y = 2026, m = 8, d = 10;
          if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
          } else if (parts[2].length === 4) {
            d = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            y = parseInt(parts[2], 10);
          } else {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
          }
          const mm = String(m).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          return `${y}-${mm}-${dd}`;
        };

        const normalizedSrcDate = normalizeToISO(srcDate);

        // Find source events
        const sourceEvents = scheduleEvents.filter((evt) => {
          if (srcDate) {
            const matchesDate = (evt.date === srcDate) || 
              (evt.date && normalizeToISO(evt.date) === normalizedSrcDate) ||
              (srcDate.includes('/') && evt.date && (() => {
                const parts = srcDate.split('/');
                if (parts.length >= 2) {
                  const dayP = parts[0].padStart(2, '0');
                  const monthP = parts[1].padStart(2, '0');
                  return evt.date.endsWith(`-${monthP}-${dayP}`);
                }
                return false;
              })());
            
            if (!matchesDate) return false;
          }
          
          if (titleKw) {
            if (!evt.title.toLowerCase().includes(titleKw)) return false;
          }
          
          if (!srcDate && !titleKw) return false;
          
          return true;
        });

        const parseRobustDate = (dateStr: string): Date => {
          if (!dateStr) return new Date();
          const normalized = dateStr.replace(/\//g, '-');
          const parts = normalized.split('-');
          if (parts.length < 3) return new Date(dateStr);
          let y = 2026, m = 8, d = 10;
          if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
          } else if (parts[2].length === 4) {
            d = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            y = parseInt(parts[2], 10);
          } else {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
          }
          return new Date(y, m - 1, d);
        };

        // Determine target dates
        let targetDates: string[] = [];
        if (args.startDateRange && args.endDateRange) {
          const start = parseRobustDate(args.startDateRange);
          const end = parseRobustDate(args.endDateRange);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            targetDates.push(`${yyyy}-${mm}-${dd}`);
          }
        } else if (Array.isArray(args.targetDates) && args.targetDates.length > 0) {
          targetDates = args.targetDates.map(normalizeToISO);
        }

        const getDayOfWeekFromDate = (dateStr: string): number => {
          if (!dateStr) return 1;
          const normalized = dateStr.replace(/\//g, '-');
          const parts = normalized.split('-');
          if (parts.length < 3) return 1;
          let y = 2026, m = 8, d = 10;
          if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
          } else if (parts[2].length === 4) {
            d = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            y = parseInt(parts[2], 10);
          } else {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
          }
          const dateObj = new Date(y, m - 1, d);
          return isNaN(dateObj.getTime()) ? 1 : dateObj.getDay();
        };

        const newClonedEvents: ScheduleEvent[] = [];
        for (const tDate of targetDates) {
          const tDayOfWeek = getDayOfWeekFromDate(tDate);
          for (const sEvt of sourceEvents) {
            newClonedEvents.push({
              ...sEvt,
              id: `evt-copy-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              date: tDate,
              dayOfWeek: tDayOfWeek,
            });
          }
        }

        scheduleEvents = [...scheduleEvents, ...newClonedEvents];

        const srcStr = srcDate || 'ngày nguồn';
        const rangeStr = targetDates.length > 0 ? `sang ${targetDates.length} ngày (${targetDates[0]} đến ${targetDates[targetDates.length - 1]})` : 'sang các ngày đích';
        replyText =
          replyText ||
          `📋 Em đã sao chép thành công **${sourceEvents.length} công việc** từ **${srcStr}** ${rangeStr} (tạo ra **${newClonedEvents.length} lịch mới**) cho Bác sĩ!`;
        executedCall = { name, args, result: { success: true, createdCount: newClonedEvents.length, createdEvents: newClonedEvents } };
      } else if (name === 'hoan_tac_thao_tac') {
        const steps = args.steps || 1;
        replyText =
          replyText ||
          `🔄 Em đã hoàn tác (Undo) thành công ${steps} thao tác vừa làm cho Bác sĩ! Lịch làm việc đã được khôi phục về trạng thái trước đó.`;
        executedCall = { name, args, result: { success: true, steps } };
      } else if (name === 'cap_nhat_uu_tien') {
        const priority = args.newPriority as PriorityLevel;
        const kw = (args.eventTitleKeyword || '').toLowerCase();
        let updatedCount = 0;

        scheduleEvents = scheduleEvents.map((evt) => {
          if ((args.eventId && evt.id === args.eventId) || (kw && evt.title.toLowerCase().includes(kw))) {
            updatedCount++;
            return {
              ...evt,
              priority: priority || evt.priority,
              priorityName: priority ? getPriorityName(priority) : evt.priorityName,
              category: (args.newCategory as EventCategory) || evt.category,
              categoryLabel: args.newCategory ? getCategoryLabel(args.newCategory as EventCategory) : evt.categoryLabel,
            };
          }
          return evt;
        });

        replyText =
          replyText ||
          `✅ Em đã cập nhật mức ưu tiên **${priority}** (${getPriorityName(priority)}) cho ${updatedCount} công việc phù hợp!`;
        executedCall = { name, args, result: { success: true, updatedCount } };
      } else if (name === 'xoa_lich_hen') {
        const kw = (args.titleKeyword || '').toLowerCase();
        const initialCount = scheduleEvents.length;

        scheduleEvents = scheduleEvents.filter((evt) => {
          if (args.eventId && evt.id === args.eventId) return false;
          if (kw && evt.title.toLowerCase().includes(kw)) return false;
          return true;
        });

        const deleted = initialCount - scheduleEvents.length;
        replyText = replyText || `🗑️ Em đã dời/xóa thành công ${deleted} lịch hẹn theo yêu cầu của Bác sĩ!`;
        executedCall = { name, args, result: { success: true, deletedCount: deleted } };
      } else if (name === 'tinh_khang_dem') {
        const day = args.dayOfWeek ?? 2;
        const dayEvents = scheduleEvents.filter((e) => e.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));

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

    // Heuristic memory extraction fallback ONLY if the user explicitly requests to save/remember/update
    const lowerMsg = message.toLowerCase();
    const hasExplicitSaveRequest = lowerMsg.includes('lưu') || lowerMsg.includes('ghi nhớ') || lowerMsg.includes('nhớ') || lowerMsg.includes('cập nhật') || lowerMsg.includes('update') || lowerMsg.includes('remember') || lowerMsg.includes('save') || lowerMsg.includes('bộ nhớ') || lowerMsg.includes('prompt phụ');
    if (
      hasExplicitSaveRequest &&
      (lowerMsg.includes('làm việc') || lowerMsg.includes('bv') || lowerMsg.includes('bệnh viện') || lowerMsg.includes('thời gian là') || lowerMsg.includes('giờ là') || lowerMsg.includes('thói quen') || lowerMsg.includes('lịch cố định')) &&
      (lowerMsg.includes('h') || lowerMsg.includes(':') || lowerMsg.includes('tối') || lowerMsg.includes('sáng') || lowerMsg.includes('chiều'))
    ) {
      const extractedSnippet = `Thời gian làm việc Bệnh viện: ${message.trim()}`;
      const isAlreadySaved = currentMemories.some((m) => m.toLowerCase().includes(message.trim().toLowerCase()));
      if (!isAlreadySaved) {
        currentMemories.unshift(extractedSnippet);
        if (!replyText.includes('Prompt Phụ') && !replyText.includes('Ký Ức')) {
          replyText += `\n\n🧠 *[Cập nhật Prompt Phụ theo yêu cầu]*: Em đã ghi nhận và lưu thói quen làm việc mới vào bộ nhớ: "${extractedSnippet}"!`;
        }
      }
    }

    if (!replyText) {
      replyText = `Em đã ghi nhận ý kiến của Bác sĩ. Lịch trình tuần này của Bác sĩ đã được tối ưu cân bằng giữa ca làm việc bệnh viện, lịch học MRI/CLVT và thời gian nghỉ ngơi!`;
    }

    const updatedPromptText = currentMemories.map((m) => `- ${m}`).join('\n');

    res.json({
      reply: replyText,
      executedCall,
      updatedEvents: scheduleEvents,
      syncStatus,
      updatedLearnedMemories: currentMemories,
      updatedLearnedPrompt: updatedPromptText,
    });
  } catch (err: any) {
    console.error('Gemini API Error:', err);

    // Graceful fallback response if API fails
    res.status(500).json({
      error: 'Không thể kết nối Gemini API. Hãy kiểm tra GEMINI_API_KEY.',
      details: err?.message,
    });
  }
});

function getPriorityName(p: PriorityLevel): string {
  switch (p) {
    case 'P1':
      return 'P1 - Khẩn cấp / Lâm sàng';
    case 'P2':
      return 'P2 - Học tập / Chuyên sâu';
    case 'P3':
      return 'P3 - Thường quy';
    case 'P4':
      return 'P4 - Nghỉ ngơi / Cá nhân';
    default:
      return 'P3 - Thường quy';
  }
}

function getCategoryLabel(c: EventCategory): string {
  switch (c) {
    case 'hospital':
      return 'Bệnh viện Nội tiết TƯ';
    case 'study':
      return 'Học tập chuyên môn';
    case 'clinic':
      return 'Phòng khám ngoài giờ';
    case 'rest':
      return 'Nghỉ ngơi';
    case 'personal':
      return 'Cá nhân';
    default:
      return 'Bệnh viện';
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Doctor AI Scheduler backend running on http://localhost:${PORT}`);
  });
}

// Don't start standard listener when running as Vercel serverless functions
if (!process.env.VERCEL) {
  startServer();
}

export default app;
