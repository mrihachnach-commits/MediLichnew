export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export type EventCategory = 'hospital' | 'study' | 'clinic' | 'rest' | 'personal' | string;

export interface ScheduleEvent {
  id: string;
  userId?: string;
  title: string;
  category: EventCategory;
  categoryLabel: string;
  priority: PriorityLevel;
  priorityName: string;
  dayOfWeek: number; // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  location: string;
  description?: string;
  bufferMinutes: number; // Buffer interval in minutes
  isIntervention?: boolean; // Urgent or clinical procedure flag
  repeat?: 'none' | 'weekly' | 'daily';
  completed?: boolean;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  functionCalled?: {
    name: string;
    args: Record<string, any>;
    result?: Record<string, any>;
  };
  suggestedActions?: string[];
}

// CalendarSyncStatus removed

export interface DoctorWorkloadStats {
  hospitalHours: number;
  studyHours: number;
  clinicHours: number;
  restHours: number;
  p1InterventionsCount: number;
  restEveningsProtected: number; // Target >= 2-3 nights
  bufferTimeCompliancePercent: number;
}

export interface PrioritySetting {
  name: string;
  subtitle: string;
}

export const DEFAULT_DOCTOR_SYSTEM_INSTRUCTION = `Bạn là Trợ lý AI Quản lý Lịch và Công việc Chuyên biệt dành cho Bác sĩ Nam, Chẩn đoán Hình ảnh tại Bệnh viện Nội tiết Trung ương.

**Bối cảnh công việc của Bác sĩ**:
- Ban ngày (T2 - T6): Làm việc tại Bệnh viện (Siêu âm chẩn đoán, Đọc phim CLVT & MRI 3.0T, Can thiệp RFA nhân giáp, Sinh thiết hút chân không VABB u vú, Sinh thiết kim).
- Buổi tối trong tuần (Từ 19h30): Có 2 buổi học MRI (Khóa 6 tháng), 1 buổi học CLVT chuyên sâu. Các buổi tối còn lại (2-3 buổi/tuần) BẮT BUỘC dành để nghỉ ngơi & tập thể thao.
- Cuối tuần (Ban ngày T7, CN): Làm thêm tại Phòng khám (Tập trung Siêu âm Tĩnh mạch chi dưới & Cơ xương khớp MSK). Ban ngày nhàn nên có thể tranh thủ tự học.
- Cuối tuần (Buổi tối T7, CN): Nghỉ ngơi 100% dành cho bản thân và gia đình.

**Quy tắc phân loại Ưu tiên (Ma trận Eisenhower)**:
- **P1 (Khẩn cấp / Lâm sàng)**: Ca can thiệp RFA giáp, VABB vú, Sinh thiết, Trực cấp cứu, Ca can thiệp lâm sàng tại Bệnh viện.
- **P2 (Học tập / Chuyên sâu)**: Ca học MRI 6 tháng, Học CLVT chuyên sâu, Hội thảo chuyên môn. Yêu cầu đệm tối thiểu 45 phút sau giờ làm việc ở viện.
- **P3 (Thường quy)**: Siêu âm thường quy, đọc phim thường quy, làm việc phòng khám ngoài giờ cuối tuần.
- **P4 (Nghỉ ngơi / Bảo vệ)**: Thời gian nghỉ ngơi tối trong tuần (2-3 buổi), tối T7/CN. TUYỆT ĐỐI không chen lịch học/làm việc vào thời gian P4 trừ khi bác sĩ chủ động yêu cầu!

**Nhiệm vụ của bạn**:
1. Phân tích thông tin từ tin nhắn/giọng nói tiếng Việt của Bác sĩ.
2. Tự động gọi các hàm (Function Calling) thích hợp như: tao_lich_hen, cap_nhat_uu_tien, xoa_lich_hen, tinh_khang_dem.
3. Khi phản hồi, luôn lịch sự, xưng "Em" và gọi "Bác sĩ" hoặc "Anh". Trả lời rõ ràng, kèm tóm tắt các thay đổi lịch đã thực hiện.`;

export interface AppSettings {
  siteTitle: string;
  doctorTitle: string;
  hospitalName: string;
  appDescription: string;
  categoryLabels: Record<string, string>;
  categoryColors?: Record<string, string>; // mapping from catKey to color string (e.g. 'cyan', 'emerald')
  prioritySettings: {
    P1: PrioritySetting;
    P2: PrioritySetting;
    P3: PrioritySetting;
    P4: PrioritySetting;
  };
  defaultBufferMinutes: number;
  systemInstruction?: string; // Prompt chính
  learnedPrompt?: string;     // Prompt phụ (Tự động học từ hội thoại)
  learnedMemories?: string[]; // Danh sách các ký ức thói quen đã tự ghi nhận
  aiProvider?: 'gemini' | 'shopaikey';
  aiModel?: string;
  geminiApiKey?: string;
  shopaikeyApiKey?: string;
  shopaikeyBaseUrl?: string;
  appDomain?: string;
}

export const DEFAULT_LEARNED_MEMORIES: string[] = [
  'Lịch làm việc cố định Bệnh viện: Sáng 07:30 - 12:00, Chiều 13:30 - 16:30 (Thứ 2 - Thứ 6)',
  'Lịch phòng khám ngoài giờ: Thứ 7 và Chủ Nhật từ 08:00 - 11:30',
  'Lịch học cố định: Tối Thứ 3 và Thứ 5 học MRI từ 19:30 - 21:30',
  'Khoảng đệm di chuyển & nghỉ ngơi: Tối thiểu 30-45 phút sau ca làm việc bệnh viện',
  'Ưu tiên đặc biệt: Tự động gắn P1 cho các ca can thiệp lâm sàng RFA giáp, VABB vú và Sinh thiết kim',
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  siteTitle: 'MediSync AI',
  doctorTitle: 'BS. Chẩn đoán Hình ảnh',
  hospitalName: 'BV Nội tiết Trung ương',
  appDescription: 'Trợ lý AI Quản lý Lịch làm việc & Ma trận Ưu tiên Chuyên khoa',
  categoryLabels: {
    hospital: 'Bệnh viện Nội tiết TƯ',
    study: 'Học tập chuyên môn (MRI/CLVT)',
    clinic: 'Phòng khám ngoài giờ',
    rest: 'Nghỉ ngơi & Thể thao (P4)',
    personal: 'Cá nhân & Gia đình',
  },
  prioritySettings: {
    P1: {
      name: 'P1: Khẩn Cấp / Can Thiệp Lâm Sàng',
      subtitle: 'RFA giáp, VABB vú, Sinh thiết, Trực cấp cứu',
    },
    P2: {
      name: 'P2: Học Tập Chuyên Sâu',
      subtitle: 'Khóa học MRI 6 tháng, CLVT nâng cao',
    },
    P3: {
      name: 'P3: Thường Quy / Phòng Khám',
      subtitle: 'Siêu âm thường quy, Đọc phim CLVT/MRI, Phòng khám T7-CN',
    },
    P4: {
      name: 'P4: Bảo Vệ Nghỉ Ngơi & Gia Đình',
      subtitle: 'Nghỉ ngơi / Thể thao tối trong tuần & Cuối tuần - Bắt buộc',
    },
  },
  defaultBufferMinutes: 30,
  systemInstruction: DEFAULT_DOCTOR_SYSTEM_INSTRUCTION,
  learnedPrompt: DEFAULT_LEARNED_MEMORIES.map((m) => `- ${m}`).join('\n'),
  learnedMemories: DEFAULT_LEARNED_MEMORIES,
  aiProvider: 'gemini',
  aiModel: 'gemini-1.5-flash',
  shopaikeyBaseUrl: 'https://api.shopaikey.com/v1',
  appDomain: 'https://medilich.vercel.app',
};

export interface SystemSchemaDoc {
  role: string;
  systemInstruction: string;
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  architectureSteps: Array<{
    id: string;
    title: string;
    desc: string;
    tech: string;
  }>;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  actionType: 'add' | 'update' | 'delete' | 'copy' | 'batch' | 'undo';
  description: string;
  snapshot: ScheduleEvent[];
}


