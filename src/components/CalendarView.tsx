import React, { useState } from 'react';
import { ScheduleEvent, EventCategory, PriorityLevel, AppSettings } from '../types';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Zap,
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  Sun,
  Moon,
  Table as TableIcon,
  LayoutGrid,
  Pencil,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Eye,
  Sliders,
  Copy,
  RotateCcw,
  ListTodo,
  CalendarCheck2,
  Check,
  ChevronDown,
  Mail,
  Loader2,
} from 'lucide-react';

interface CalendarViewProps {
  events: ScheduleEvent[];
  settings: AppSettings;
  onAddEvent: (event: Partial<ScheduleEvent>) => void;
  onUpdateEvent: (id: string, updates: Partial<ScheduleEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onQuickAskAI: (prompt: string) => void;
  onBaseDateChange?: (date: Date) => void;
}

// Helper to get Monday of a given date
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Helper to format YYYY-MM-DD
function formatDateISO(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const AVAILABLE_COLORS: Record<string, { activeBg: string; text: string; dotBg: string; border: string }> = {
  cyan: { activeBg: 'bg-cyan-950/90 text-cyan-200 border-cyan-600 shadow-sm ring-1 ring-cyan-500/50', text: 'text-cyan-300', dotBg: 'bg-cyan-400', border: 'border-cyan-800/80' },
  purple: { activeBg: 'bg-purple-950/90 text-purple-200 border-purple-600 shadow-sm ring-1 ring-purple-500/50', text: 'text-purple-300', dotBg: 'bg-purple-400', border: 'border-purple-800/80' },
  emerald: { activeBg: 'bg-emerald-950/90 text-emerald-200 border-emerald-600 shadow-sm ring-1 ring-emerald-500/50', text: 'text-emerald-300', dotBg: 'bg-emerald-400', border: 'border-emerald-800/80' },
  amber: { activeBg: 'bg-amber-950/90 text-amber-200 border-amber-600 shadow-sm ring-1 ring-amber-500/50', text: 'text-amber-300', dotBg: 'bg-amber-400', border: 'border-amber-800/80' },
  rose: { activeBg: 'bg-rose-950/90 text-rose-200 border-rose-600 shadow-sm ring-1 ring-rose-500/50', text: 'text-rose-300', dotBg: 'bg-rose-400', border: 'border-rose-800/80' },
  indigo: { activeBg: 'bg-indigo-950/90 text-indigo-200 border-indigo-600 shadow-sm ring-1 ring-indigo-500/50', text: 'text-indigo-300', dotBg: 'bg-indigo-400', border: 'border-indigo-800' },
  teal: { activeBg: 'bg-teal-950/90 text-teal-200 border-teal-600 shadow-sm ring-1 ring-teal-500/50', text: 'text-teal-300', dotBg: 'bg-teal-400', border: 'border-teal-800' },
  blue: { activeBg: 'bg-blue-950/90 text-blue-200 border-blue-600 shadow-sm ring-1 ring-blue-500/50', text: 'text-blue-300', dotBg: 'bg-blue-400', border: 'border-blue-800' },
  pink: { activeBg: 'bg-pink-950/90 text-pink-200 border-pink-600 shadow-sm ring-1 ring-pink-500/50', text: 'text-pink-300', dotBg: 'bg-pink-400', border: 'border-pink-800' },
  sky: { activeBg: 'bg-sky-950/90 text-sky-200 border-sky-600 shadow-sm ring-1 ring-sky-500/50', text: 'text-sky-300', dotBg: 'bg-sky-400', border: 'border-sky-800' },
};

const CATEGORY_COLOR_SCHEMES: Record<string, string> = {
  hospital: 'cyan',
  study: 'purple',
  clinic: 'emerald',
  rest: 'amber',
  personal: 'rose',
};

const EXTRA_PALETTE = ['indigo', 'teal', 'blue', 'pink', 'sky'];

export function getCategoryTheme(catKey: string, index: number = 0, customColors?: Record<string, string>) {
  const colorName = customColors?.[catKey] || CATEGORY_COLOR_SCHEMES[catKey] || EXTRA_PALETTE[index % EXTRA_PALETTE.length];
  return AVAILABLE_COLORS[colorName] || AVAILABLE_COLORS['indigo'];
}

// Helper to format DD/MM
function formatDateShort(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${dd}/${mm}`;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  settings,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onQuickAskAI,
  onBaseDateChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mainViewMode, setMainViewMode] = useState<'week' | 'month'>('week');
  const [weekViewType, setWeekViewType] = useState<'table' | 'grid'>('table');
  const [selectedMobileDay, setSelectedMobileDay] = useState<number | 'all'>('all');

  // Base date for navigation (default: August 10, 2026)
  const [currentBaseDate, setCurrentBaseDate] = useState<Date>(new Date(2026, 7, 10));

  React.useEffect(() => {
    onBaseDateChange?.(currentBaseDate);
  }, [currentBaseDate, onBaseDateChange]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSundayPlannerOpen, setIsSundayPlannerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<{ date: Date; dateStr: string } | null>(null);

  // Draft state for Sunday Planner
  const [plannerDraftEvents, setPlannerDraftEvents] = useState<ScheduleEvent[] | null>(null);
  const [isActionFromPlanner, setIsActionFromPlanner] = useState<boolean>(false);

  // Email Summary States
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusModal, setEmailStatusModal] = useState<{
    isOpen: boolean;
    success: boolean;
    message: string;
    previewHtml?: string;
  } | null>(null);

  const handleSendEmailSummary = async () => {
    const targetEmail = settings.notificationEmail;
    if (!targetEmail) {
      alert('Vui lòng vào mục Cài đặt (bánh răng) để cấu hình Email nhận tóm tắt trước khi gửi!');
      return;
    }

    setIsSendingEmail(true);
    try {
      // Get events of the current week (from Monday to Sunday)
      const currentWeekEvents = filteredEvents.filter((evt) => {
        if (evt.date) {
          const evtDate = new Date(evt.date);
          const monDate = new Date(monday);
          const sunDate = new Date(sunday);
          evtDate.setHours(0, 0, 0, 0);
          monDate.setHours(0, 0, 0, 0);
          sunDate.setHours(0, 0, 0, 0);
          return evtDate >= monDate && evtDate <= sunDate;
        }
        return true;
      });

      const response = await fetch('/api/send-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: targetEmail,
          events: currentWeekEvents,
          weekRangeText,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser,
          smtpPass: settings.smtpPass,
          doctorTitle: settings.doctorTitle,
          hospitalName: settings.hospitalName,
        }),
      });

      let result: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json();
        } catch (parseErr) {
          console.error('Error parsing JSON:', parseErr);
          const rawText = await response.text();
          result = { error: `Không thể đọc dữ liệu phản hồi (JSON lỗi). Chi tiết: ${rawText.substring(0, 120)}...` };
        }
      } else {
        const rawText = await response.text();
        console.warn('Received non-JSON response:', rawText);
        result = { error: `Máy chủ trả về phản hồi không đúng định dạng. Chi tiết: ${rawText.substring(0, 120)}...` };
      }

      if (response.ok && result.success) {
        setEmailStatusModal({
          isOpen: true,
          success: true,
          message: result.message,
          previewHtml: result.previewHtml,
        });
      } else {
        setEmailStatusModal({
          isOpen: true,
          success: false,
          message: result.error || 'Có lỗi xảy ra khi gửi email tóm tắt lịch trình.',
        });
      }
    } catch (err: any) {
      console.error('Email sending error:', err);
      setEmailStatusModal({
        isOpen: true,
        success: false,
        message: 'Không thể kết nối máy chủ để gửi email. Chi tiết: ' + err.message,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Form state for adding new event
  const [newEvent, setNewEvent] = useState({
    title: '',
    category: 'hospital' as EventCategory,
    categoryLabel: settings.categoryLabels.hospital,
    priority: 'P3' as PriorityLevel,
    dayOfWeek: 1,
    date: formatDateISO(currentBaseDate),
    startTime: '19:30',
    endTime: '21:30',
    location: settings.hospitalName,
    bufferMinutes: settings.defaultBufferMinutes,
    isIntervention: false,
    description: '',
  });

  const handleSlotDoubleClick = (dayOfWeek: number, isoStr: string, isEvening: boolean) => {
    setNewEvent({
      ...newEvent,
      title: '',
      dayOfWeek,
      date: isoStr,
      startTime: isEvening ? '19:00' : '08:00',
      endTime: isEvening ? '21:00' : '10:00',
      isIntervention: false,
      description: '',
    });
    setIsAddModalOpen(true);
  };

  // Calculate Monday of current selected week
  const monday = getMonday(currentBaseDate);

  // Generate 7 days for current week (Mon -> Sun)
  const weekDays = [1, 2, 3, 4, 5, 6, 0].map((dayNum, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    const dayLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const shortLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return {
      dayOfWeek: dayNum,
      label: dayLabels[dayNum],
      short: shortLabels[dayNum],
      dateObj: dayDate,
      dateStr: formatDateShort(dayDate),
      isoStr: formatDateISO(dayDate),
    };
  });

  const sunday = weekDays[6].dateObj;
  const weekRangeText = `${formatDateShort(monday)}/${monday.getFullYear()} - ${formatDateShort(sunday)}/${sunday.getFullYear()}`;

  // Week Navigation
  const handlePrevWeek = () => {
    const next = new Date(currentBaseDate);
    next.setDate(next.getDate() - 7);
    setCurrentBaseDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentBaseDate);
    next.setDate(next.getDate() + 7);
    setCurrentBaseDate(next);
  };

  const handleResetToToday = () => {
    setCurrentBaseDate(new Date(2026, 7, 10)); // Anchor to default demo date or real today
  };

  // Month Navigation
  const handlePrevMonth = () => {
    const next = new Date(currentBaseDate);
    next.setMonth(next.getMonth() - 1);
    setCurrentBaseDate(next);
  };

  const handleNextMonth = () => {
    const next = new Date(currentBaseDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentBaseDate(next);
  };

  // Filter events by selected category
  const filteredEvents = events.filter((evt) => {
    if (selectedCategory === 'all') return true;
    return evt.category === selectedCategory;
  });

  const isDaytimeEvent = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0], 10);
    return hour >= 6 && hour < 18;
  };

  const getCategoryColor = (category: EventCategory) => {
    switch (category) {
      case 'hospital':
        return {
          bg: 'bg-cyan-950/40 hover:bg-cyan-950/60',
          border: 'border-cyan-800/80',
          text: 'text-cyan-200',
          badge: 'bg-cyan-900/80 text-cyan-300 border-cyan-700',
        };
      case 'study':
        return {
          bg: 'bg-purple-950/40 hover:bg-purple-950/60',
          border: 'border-purple-800/80',
          text: 'text-purple-200',
          badge: 'bg-purple-900/80 text-purple-300 border-purple-700',
        };
      case 'clinic':
        return {
          bg: 'bg-emerald-950/40 hover:bg-emerald-950/60',
          border: 'border-emerald-800/80',
          text: 'text-emerald-200',
          badge: 'bg-emerald-900/80 text-emerald-300 border-emerald-700',
        };
      case 'rest':
        return {
          bg: 'bg-amber-950/40 hover:bg-amber-950/60',
          border: 'border-amber-800/80',
          text: 'text-amber-200',
          badge: 'bg-amber-900/80 text-amber-300 border-amber-700',
        };
      default:
        return {
          bg: 'bg-slate-900 hover:bg-slate-800',
          border: 'border-slate-800',
          text: 'text-slate-200',
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const getPriorityBadge = (p: PriorityLevel) => {
    const pSetting = settings.prioritySettings?.[p];
    const pTitle = pSetting?.name || p;
    const pSubtitle = pSetting?.subtitle || '';
    switch (p) {
      case 'P1':
        return <span title={pSubtitle} className="bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">{pTitle}</span>;
      case 'P2':
        return <span title={pSubtitle} className="bg-purple-950 border border-purple-800 text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">{pTitle}</span>;
      case 'P3':
        return <span title={pSubtitle} className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">{pTitle}</span>;
      case 'P4':
        return <span title={pSubtitle} className="bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">{pTitle}</span>;
    }
  };

  const getDefaultCategoryLabel = (category: EventCategory) => {
    return settings.categoryLabels[category] || 'Khác';
  };

  const handleOpenSundayPlanner = () => {
    setPlannerDraftEvents(JSON.parse(JSON.stringify(events)));
    setIsSundayPlannerOpen(true);
    setIsActionFromPlanner(false);
  };

  const handleCloseSundayPlanner = () => {
    setIsSundayPlannerOpen(false);
    setPlannerDraftEvents(null);
    setIsActionFromPlanner(false);
  };

  const handleCommitPlannerDraft = () => {
    if (!plannerDraftEvents) {
      setIsSundayPlannerOpen(false);
      return;
    }

    const mainMap = new Map(events.map((e) => [e.id, e]));
    const draftIds = new Set(plannerDraftEvents.map((e) => e.id));

    // 1. Delete events that were removed in draft
    events.forEach((origEvt) => {
      if (!draftIds.has(origEvt.id)) {
        onDeleteEvent(origEvt.id);
      }
    });

    // 2. Add or Update events from draft
    plannerDraftEvents.forEach((draftEvt) => {
      const origEvt = mainMap.get(draftEvt.id);
      if (!origEvt) {
        onAddEvent(draftEvt);
      } else if (JSON.stringify(origEvt) !== JSON.stringify(draftEvt)) {
        onUpdateEvent(draftEvt.id, draftEvt);
      }
    });

    alert(`Đã đồng bộ & hoàn tất lên lịch làm việc cho tuần (${weekRangeText}) thành công!`);
    setIsSundayPlannerOpen(false);
    setPlannerDraftEvents(null);
    setIsActionFromPlanner(false);
  };

  const handleSubmitNewEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    const createdEvt: ScheduleEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: newEvent.title,
      category: newEvent.category,
      categoryLabel: newEvent.categoryLabel || getDefaultCategoryLabel(newEvent.category),
      priority: newEvent.priority,
      priorityName: settings.prioritySettings[newEvent.priority]?.name || newEvent.priority,
      dayOfWeek: newEvent.dayOfWeek,
      date: newEvent.date,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      location: newEvent.location,
      bufferMinutes: newEvent.bufferMinutes,
      isIntervention: newEvent.isIntervention,
      description: newEvent.description,
      completed: false,
    };

    if (isActionFromPlanner) {
      setPlannerDraftEvents((prev) => (prev ? [...prev, createdEvt] : [createdEvt]));
      setIsAddModalOpen(false);
      setIsSundayPlannerOpen(true);
      setIsActionFromPlanner(false);
    } else {
      onAddEvent({
        ...newEvent,
        categoryLabel: newEvent.categoryLabel || getDefaultCategoryLabel(newEvent.category),
        priorityName: settings.prioritySettings[newEvent.priority]?.name || newEvent.priority,
      });
      setIsAddModalOpen(false);
    }

    setNewEvent({
      title: '',
      category: 'hospital',
      categoryLabel: settings.categoryLabels.hospital,
      priority: 'P3',
      dayOfWeek: 1,
      date: formatDateISO(currentBaseDate),
      startTime: '19:30',
      endTime: '21:30',
      location: settings.hospitalName,
      bufferMinutes: settings.defaultBufferMinutes,
      isIntervention: false,
      description: '',
    });
  };

  const handleSubmitEditEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editingEvent.title.trim()) return;

    const updatedEvt: ScheduleEvent = {
      ...editingEvent,
      categoryLabel: editingEvent.categoryLabel || getDefaultCategoryLabel(editingEvent.category),
      priorityName: settings.prioritySettings[editingEvent.priority]?.name || editingEvent.priority,
    };

    if (isActionFromPlanner) {
      setPlannerDraftEvents((prev) =>
        prev ? prev.map((item) => (item.id === updatedEvt.id ? updatedEvt : item)) : [updatedEvt]
      );
      setEditingEvent(null);
      setIsSundayPlannerOpen(true);
      setIsActionFromPlanner(false);
    } else {
      onUpdateEvent(editingEvent.id, updatedEvt);
      setEditingEvent(null);
    }
  };

  // Render event card
  const renderEventCard = (evt: ScheduleEvent) => {
    const style = getCategoryColor(evt.category);
    return (
      <div
        key={evt.id}
        className={`p-2.5 rounded-xl border transition-all relative group ${style.bg} ${style.border} ${
          evt.completed ? 'opacity-50 grayscale' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          {getPriorityBadge(evt.priority)}

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditingEvent({ ...evt })}
              className="text-slate-400 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-slate-800/80"
              title="Chỉnh sửa nội dung chi tiết"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-400" />
            </button>

            <button
              onClick={() => onUpdateEvent(evt.id, { completed: !evt.completed })}
              className="text-slate-400 hover:text-emerald-400 transition-colors p-1 rounded hover:bg-slate-800/80"
              title={evt.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
            >
              {evt.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => onDeleteEvent(evt.id)}
              className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-slate-800/80 opacity-80 md:opacity-0 group-hover:opacity-100"
              title="Xóa lịch hẹn"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h4 className={`font-semibold text-xs leading-snug mb-1 ${style.text}`}>
          {evt.isIntervention && (
            <Zap className="w-3.5 h-3.5 inline mr-1 text-rose-400 animate-pulse fill-rose-400/30" />
          )}
          {evt.title}
        </h4>

        <div className="space-y-1 text-[11px] text-slate-300">
          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="font-semibold">
              {evt.startTime} - {evt.endTime}
            </span>
          </div>

          <div className="flex items-start gap-1 text-[10px] text-slate-400">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{evt.location}</span>
          </div>
        </div>

        {evt.description && (
          <div className="mt-1 text-[10px] text-slate-400 italic line-clamp-1 border-t border-slate-800/40 pt-1">
            💬 {evt.description}
          </div>
        )}

        <div className="mt-1.5 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
          {evt.bufferMinutes > 0 ? (
            <span className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 text-indigo-300 font-mono text-[9px]">
              ⏳ Đệm: {evt.bufferMinutes}m
            </span>
          ) : (
            <span className="text-[9px] text-slate-500">Không đệm</span>
          )}
          <span className="text-slate-400 text-[9px] truncate max-w-[100px] font-medium">
            {evt.categoryLabel || getDefaultCategoryLabel(evt.category)}
          </span>
        </div>
      </div>
    );
  };

  // Month Grid Calculation logic
  const year = currentBaseDate.getFullYear();
  const monthIdx = currentBaseDate.getMonth(); // 0-11
  const firstDayOfMonth = new Date(year, monthIdx, 1);
  const lastDayOfMonth = new Date(year, monthIdx + 1, 0);
  const totalDaysInMonth = lastDayOfMonth.getDate();

  // Find start day of week for 1st of month (0: Sun, 1: Mon, ..., 6: Sat)
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun
  // Shift so week starts on Mon (Mon=0, Tue=1, ..., Sun=6)
  const shiftedStartCol = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const monthGridCells = [];
  // Add padding days from previous month
  for (let i = 0; i < shiftedStartCol; i++) {
    const prevDate = new Date(year, monthIdx, 1 - (shiftedStartCol - i));
    monthGridCells.push({
      dateObj: prevDate,
      dayNum: prevDate.getDate(),
      isCurrentMonth: false,
      isoStr: formatDateISO(prevDate),
      dayOfWeek: prevDate.getDay(),
    });
  }

  // Add actual month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const thisDate = new Date(year, monthIdx, d);
    monthGridCells.push({
      dateObj: thisDate,
      dayNum: d,
      isCurrentMonth: true,
      isoStr: formatDateISO(thisDate),
      dayOfWeek: thisDate.getDay(),
    });
  }

  // Add trailing days to complete full grid (multiple of 7)
  while (monthGridCells.length % 7 !== 0) {
    const lastCellDate = monthGridCells[monthGridCells.length - 1].dateObj;
    const nextDate = new Date(lastCellDate);
    nextDate.setDate(nextDate.getDate() + 1);
    monthGridCells.push({
      dateObj: nextDate,
      dayNum: nextDate.getDate(),
      isCurrentMonth: false,
      isoStr: formatDateISO(nextDate),
      dayOfWeek: nextDate.getDay(),
    });
  }

  const monthNameVietnamese = `Tháng ${monthIdx + 1} / ${year}`;

  return (
    <div className="space-y-5">
      {/* Navigation & Controls Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 md:p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 shadow-lg">
        {/* Left: View Mode Toggle & Navigation */}
        <div className="flex flex-wrap items-center justify-between xl:justify-start gap-2 sm:gap-3">
          {/* Main Mode Toggle: Week vs Month */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 flex-1 sm:flex-initial">
            <button
              onClick={() => setMainViewMode('week')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mainViewMode === 'week'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Theo Tuần</span>
            </button>

            <button
              onClick={() => setMainViewMode('month')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mainViewMode === 'month'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Theo Tháng</span>
            </button>
          </div>

          {/* Sub View Toggle for Week Mode */}
          {mainViewMode === 'week' && (
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 flex-1 sm:flex-initial">
              <button
                onClick={() => setWeekViewType('table')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                  weekViewType === 'table'
                    ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bảng Ca Ban Ngày & Ca Buổi Tối"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Bảng Ngày/Tối</span>
              </button>
              <button
                onClick={() => setWeekViewType('grid')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                  weekViewType === 'grid'
                    ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Dạng Lưới 7 Ngày"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Lưới 7 Ngày</span>
              </button>
            </div>
          )}

          {/* Date Navigator Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={mainViewMode === 'week' ? handlePrevWeek : handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={mainViewMode === 'week' ? 'Tuần trước' : 'Tháng trước'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold font-mono px-2 text-indigo-300 flex-1 sm:flex-initial min-w-[120px] text-center">
              {mainViewMode === 'week' ? weekRangeText : monthNameVietnamese}
            </span>

            <button
              onClick={mainViewMode === 'week' ? handleNextWeek : handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={mainViewMode === 'week' ? 'Tuần sau' : 'Tháng sau'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetToToday}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors ml-1"
            >
              Hôm Nay
            </button>
          </div>
        </div>

        {/* Category Filters & Add Button */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 w-full xl:w-auto">
          {/* Category Dropdown */}
          <div className="w-full sm:w-48 md:w-56 min-w-0">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none w-full bg-slate-950/90 text-slate-200 text-xs sm:text-sm font-semibold pl-3 sm:pl-4 pr-10 py-2 sm:py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-inner"
              >
                <option value="all">
                  Tất Cả ({events.filter((e) => !e.completed).length})
                </option>
                {Object.entries(settings.categoryLabels || {}).map(([catKey, catLabel]) => {
                  const uncompletedCount = events.filter((e) => !e.completed && e.category === catKey).length;
                  return (
                    <option key={catKey} value={catKey}>
                      {catLabel} ({uncompletedCount})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={handleSendEmailSummary}
              disabled={isSendingEmail}
              className="bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all flex-1 sm:flex-initial shrink-0 disabled:opacity-50"
              title="Gửi tóm tắt toàn bộ lịch làm việc tuần này qua email đã cài đặt"
            >
              {isSendingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              ) : (
                <Mail className="w-4 h-4 text-sky-400" />
              )}
              <span className="truncate">{isSendingEmail ? 'Đang gửi...' : 'Gửi Mail Tuần'}</span>
            </button>

            <button
              onClick={handleOpenSundayPlanner}
              className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all flex-1 sm:flex-initial shrink-0"
              title="Công cụ Chủ Nhật: Lên lịch & sắp xếp công việc hàng ngày cho tuần mới"
            >
              <CalendarCheck2 className="w-4 h-4 text-amber-400" />
              <span className="truncate">📋 Lên Lịch Chủ Nhật</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all flex-1 sm:flex-initial shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="truncate">Thêm Lịch Mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- MODE A: XEM THEO TUẦN (WEEK VIEW) ----------------- */}
      {mainViewMode === 'week' && (
        <>
          {/* Mobile Day Selector Bar */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3 space-y-2.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <span>Xem Lịch Trên Điện Thoại:</span>
              </span>

              <div className="flex items-center gap-2">
                {/* Direct Date Picker Input */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium hidden xs:inline">Chọn Ngày:</span>
                  <input
                    type="date"
                    value={formatDateISO(currentBaseDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-').map(Number);
                        const selectedDate = new Date(y, m - 1, d);
                        setCurrentBaseDate(selectedDate);
                        setSelectedMobileDay(selectedDate.getDay());
                      }
                    }}
                    className="bg-transparent text-indigo-300 text-xs font-mono font-bold focus:outline-none cursor-pointer"
                    title="Chọn ngày cụ thể trên lịch để xem ngay"
                  />
                </div>

                {selectedMobileDay !== 'all' && (
                  <button
                    onClick={() => setSelectedMobileDay('all')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline flex items-center gap-1 shrink-0"
                  >
                    <span>Xem Cả 7 Ngày</span> 📊
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              <button
                onClick={() => setSelectedMobileDay('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all border shrink-0 ${
                  selectedMobileDay === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Tất Cả 7 Ngày 📊
              </button>
              {weekDays.map(({ dayOfWeek, short, dateStr, isoStr }) => {
                const dayEvtsCount = filteredEvents.filter(
                  (e) => (e.date ? e.date === isoStr : e.dayOfWeek === dayOfWeek)
                ).length;
                const isSelected = selectedMobileDay === dayOfWeek;
                const isToday = isoStr === formatDateISO(new Date());

                return (
                  <button
                    key={dayOfWeek}
                    onClick={() => setSelectedMobileDay(dayOfWeek)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-400/40'
                        : dayOfWeek === 6 || dayOfWeek === 0
                        ? 'bg-amber-950/30 text-amber-300 border-amber-800/60'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{short} ({dateStr})</span>
                    {dayEvtsCount > 0 && (
                      <span
                        className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-extrabold ${
                          isSelected ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-800 text-indigo-300'
                        }`}
                      >
                        {dayEvtsCount}
                      </span>
                    )}
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Hôm nay"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dedicated Mobile Single-Day View when a specific day is picked on phone */}
          {selectedMobileDay !== 'all' && (() => {
            const targetDayObj = weekDays.find((d) => d.dayOfWeek === selectedMobileDay);
            if (!targetDayObj) return null;

            const daytimeEvts = filteredEvents
              .filter(
                (e) =>
                  (e.date ? e.date === targetDayObj.isoStr : e.dayOfWeek === targetDayObj.dayOfWeek) &&
                  isDaytimeEvent(e.startTime)
              )
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            const eveningEvts = filteredEvents
              .filter(
                (e) =>
                  (e.date ? e.date === targetDayObj.isoStr : e.dayOfWeek === targetDayObj.dayOfWeek) &&
                  !isDaytimeEvent(e.startTime)
              )
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            const handlePrevDayNav = () => {
              const prev = new Date(targetDayObj.dateObj);
              prev.setDate(prev.getDate() - 1);
              setCurrentBaseDate(prev);
              setSelectedMobileDay(prev.getDay());
            };

            const handleNextDayNav = () => {
              const next = new Date(targetDayObj.dateObj);
              next.setDate(next.getDate() + 1);
              setCurrentBaseDate(next);
              setSelectedMobileDay(next.getDay());
            };

            return (
              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handlePrevDayNav}
                        className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors active:scale-95"
                        title="Ngày trước"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNextDayNav}
                        className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors active:scale-95"
                        title="Ngày tiếp"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                        <span>{targetDayObj.label}</span>
                        <span className="text-xs text-indigo-300 font-mono">({targetDayObj.dateStr})</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tổng số: {daytimeEvts.length + eveningEvts.length} lịch hẹn & công việc
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSlotDoubleClick(targetDayObj.dayOfWeek, targetDayObj.isoStr, false)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Ca</span>
                  </button>
                </div>

                {/* Daytime Block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-amber-950/40 border border-amber-800/40 px-3 py-2 rounded-xl text-xs font-bold text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-400" /> Ban Ngày (06:00 - 18:00)
                    </span>
                    <span className="text-[11px] bg-amber-900/50 text-amber-200 px-2 py-0.5 rounded-full font-mono">
                      {daytimeEvts.length} ca
                    </span>
                  </div>

                  {daytimeEvts.length === 0 ? (
                    <div
                      onClick={() => handleSlotDoubleClick(targetDayObj.dayOfWeek, targetDayObj.isoStr, false)}
                      className="p-4 border border-dashed border-slate-800 hover:border-amber-500/40 rounded-xl text-center text-xs text-slate-500 hover:text-amber-300 cursor-pointer transition-colors"
                    >
                      + Trống ca ban ngày. Nhấp vào đây để tạo lịch mới
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {daytimeEvts.map((evt) => renderEventCard(evt))}
                    </div>
                  )}
                </div>

                {/* Evening Block */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-800/40 px-3 py-2 rounded-xl text-xs font-bold text-indigo-300">
                    <span className="flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-400" /> Buổi Tối (18:00 - 24:00)
                    </span>
                    <span className="text-[11px] bg-indigo-900/50 text-indigo-200 px-2 py-0.5 rounded-full font-mono">
                      {eveningEvts.length} ca
                    </span>
                  </div>

                  {eveningEvts.length === 0 ? (
                    <div
                      onClick={() => handleSlotDoubleClick(targetDayObj.dayOfWeek, targetDayObj.isoStr, true)}
                      className="p-4 border border-dashed border-slate-800 hover:border-indigo-500/40 rounded-xl text-center text-xs text-slate-500 hover:text-indigo-300 cursor-pointer transition-colors"
                    >
                      + Trống ca tối. Nhấp vào đây để tạo lịch mới
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {eveningEvts.map((evt) => renderEventCard(evt))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* OPTION 1: BẢNG PHÂN CA BAN NGÀY & BUỔI TỐI (WHEN SHOWING ALL 7 DAYS) */}
          {weekViewType === 'table' && selectedMobileDay === 'all' && (
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-indigo-300">
                  <TableIcon className="w-4 h-4 text-indigo-400" />
                  <span>
                    Bảng Phân Ca Tuần: Ban Ngày (06h-18h) & Buổi Tối (18h-24h)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  <span className="hidden sm:inline">Dùng nút ✏️ trên mỗi thẻ để sửa chi tiết nội dung</span>
                  <span className="sm:hidden text-amber-300">👈 Vuốt ngang xem đủ 7 ngày</span>
                </span>
              </div>

              <div className="overflow-x-auto scrollbar-thin relative">
                <table className="w-full min-w-[720px] sm:min-w-[840px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800">
                      <th className="p-2 sm:p-3 w-24 sm:w-32 border-r border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider text-center sticky left-0 z-20 bg-slate-950 shadow-md">
                        Khung Giờ
                      </th>
                      {weekDays.map(({ dayOfWeek, label, short, dateStr }) => {
                        const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;
                        return (
                          <th
                            key={dayOfWeek}
                            className={`p-2.5 sm:p-3 text-center border-r border-slate-800/80 last:border-r-0 ${
                              isWeekend ? 'bg-slate-900/40' : ''
                            }`}
                          >
                            <div className="font-bold text-xs text-slate-200">
                              <span className="hidden sm:inline">{label}</span>
                              <span className="sm:hidden">{short}</span>
                            </div>
                            <div className="text-[10px] text-indigo-300 font-mono font-semibold">{dateStr}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {/* ROW 1: BAN NGÀY ☀️ */}
                    <tr className="bg-amber-950/10 hover:bg-amber-950/20 transition-colors">
                      <td className="p-2.5 sm:p-3 border-r border-slate-800/80 bg-slate-950/90 text-center align-top sticky left-0 z-10 shadow-md">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-sm">
                            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </div>
                          <span className="font-bold text-[11px] sm:text-xs text-amber-300">BAN NGÀY</span>
                          <span className="text-[9px] sm:text-[10px] text-amber-400/80 font-mono">06h - 18h</span>
                        </div>
                      </td>

                      {weekDays.map(({ dayOfWeek, isoStr }) => {
                        const daytimeEvts = filteredEvents
                          .filter(
                            (e) =>
                              (e.date ? e.date === isoStr : e.dayOfWeek === dayOfWeek) &&
                              isDaytimeEvent(e.startTime)
                          )
                          .sort((a, b) => a.startTime.localeCompare(b.startTime));

                        return (
                          <td
                            key={dayOfWeek}
                            onDoubleClick={() => handleSlotDoubleClick(dayOfWeek, isoStr, false)}
                            className="p-1.5 sm:p-2 border-r border-slate-800/80 last:border-r-0 align-top min-w-[110px] sm:min-w-[120px] hover:bg-amber-500/5 transition-colors cursor-cell group"
                            title="Nháy đúp để thêm lịch ca sáng/chiều"
                          >
                            <div className="space-y-2 min-h-[120px] sm:min-h-[140px]">
                              {daytimeEvts.length === 0 ? (
                                <div className="h-full min-h-[100px] sm:min-h-[120px] flex items-center justify-center text-[10px] text-slate-600 border border-dashed border-slate-800/60 rounded-xl p-1.5 text-center group-hover:border-amber-500/30 group-hover:text-amber-400/60 transition-all">
                                  <div className="flex flex-col items-center gap-1">
                                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span>Trống ca sáng/chiều</span>
                                  </div>
                                </div>
                              ) : (
                                daytimeEvts.map((evt) => renderEventCard(evt))
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* ROW 2: BUỔI TỐI 🌙 */}
                    <tr className="bg-indigo-950/10 hover:bg-indigo-950/20 transition-colors">
                      <td className="p-2.5 sm:p-3 border-r border-slate-800/80 bg-slate-950/90 text-center align-top sticky left-0 z-10 shadow-md">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </div>
                          <span className="font-bold text-[11px] sm:text-xs text-indigo-300">BUỔI TỐI</span>
                          <span className="text-[9px] sm:text-[10px] text-indigo-400/80 font-mono">18h - 24h</span>
                        </div>
                      </td>

                      {weekDays.map(({ dayOfWeek, isoStr }) => {
                        const eveningEvts = filteredEvents
                          .filter(
                            (e) =>
                              (e.date ? e.date === isoStr : e.dayOfWeek === dayOfWeek) &&
                              !isDaytimeEvent(e.startTime)
                          )
                          .sort((a, b) => a.startTime.localeCompare(b.startTime));

                        return (
                          <td
                            key={dayOfWeek}
                            onDoubleClick={() => handleSlotDoubleClick(dayOfWeek, isoStr, true)}
                            className="p-1.5 sm:p-2 border-r border-slate-800/80 last:border-r-0 align-top min-w-[110px] sm:min-w-[120px] hover:bg-indigo-500/5 transition-colors cursor-cell group"
                            title="Nháy đúp để thêm lịch ca tối"
                          >
                            <div className="space-y-2 min-h-[120px] sm:min-h-[140px]">
                              {eveningEvts.length === 0 ? (
                                <div className="h-full min-h-[100px] sm:min-h-[120px] flex items-center justify-center text-[10px] text-slate-600 border border-dashed border-slate-800/60 rounded-xl p-1.5 text-center group-hover:border-indigo-500/30 group-hover:text-indigo-400/60 transition-all">
                                  <div className="flex flex-col items-center gap-1">
                                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span>Trống ca tối</span>
                                  </div>
                                </div>
                              ) : (
                                eveningEvts.map((evt) => renderEventCard(evt))
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* OPTION 2: LƯỚI 7 NGÀY (GRID VIEW) */}
          {weekViewType === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
              {weekDays.map(({ dayOfWeek, label, dateStr, isoStr }) => {
                const daytimeEvts = filteredEvents
                  .filter(
                    (e) =>
                      (e.date ? e.date === isoStr : e.dayOfWeek === dayOfWeek) &&
                      isDaytimeEvent(e.startTime)
                  )
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                const eveningEvts = filteredEvents
                  .filter(
                    (e) =>
                      (e.date ? e.date === isoStr : e.dayOfWeek === dayOfWeek) &&
                      !isDaytimeEvent(e.startTime)
                  )
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                const totalEvts = daytimeEvts.length + eveningEvts.length;
                const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;

                return (
                  <div
                    key={dayOfWeek}
                    className={`rounded-2xl border p-3 flex flex-col min-h-[480px] transition-all shadow-md ${
                      isWeekend ? 'bg-slate-900/60 border-slate-800/80' : 'bg-[#0F172A] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
                      <div>
                        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                          <span>{label}</span>
                        </h3>
                        <span className="text-[11px] text-indigo-300 font-mono font-semibold">{dateStr}</span>
                      </div>
                      <span className="text-[11px] bg-slate-950 border border-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-full">
                        {totalEvts} lịch
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
                      <div 
                        className="space-y-1.5 cursor-cell group"
                        onDoubleClick={() => handleSlotDoubleClick(dayOfWeek, isoStr, false)}
                        title="Nháy đúp để thêm lịch ca sáng/chiều"
                      >
                        <div className="px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-between text-[11px] font-semibold text-amber-300 group-hover:bg-amber-900/50 transition-colors">
                          <span className="flex items-center gap-1">
                            <Sun className="w-3.5 h-3.5 text-amber-400" /> Ban Ngày
                          </span>
                          <span className="text-[10px] text-amber-400/70 font-mono">06h - 18h</span>
                        </div>

                        {daytimeEvts.length === 0 ? (
                          <div className="py-3 text-center text-[10px] text-slate-600 border border-dashed border-slate-800/60 rounded-xl group-hover:border-amber-500/30 group-hover:text-amber-400/60 transition-all">
                            Trống ca ngày
                          </div>
                        ) : (
                          daytimeEvts.map((evt) => renderEventCard(evt))
                        )}
                      </div>

                      <div 
                        className="space-y-1.5 cursor-cell group"
                        onDoubleClick={() => handleSlotDoubleClick(dayOfWeek, isoStr, true)}
                        title="Nháy đúp để thêm lịch ca tối"
                      >
                        <div className="px-2 py-1 rounded-lg bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-between text-[11px] font-semibold text-indigo-300 group-hover:bg-indigo-900/50 transition-colors">
                          <span className="flex items-center gap-1">
                            <Moon className="w-3.5 h-3.5 text-indigo-400" /> Buổi Tối
                          </span>
                          <span className="text-[10px] text-indigo-400/70 font-mono">18h - 24h</span>
                        </div>

                        {eveningEvts.length === 0 ? (
                          <div className="py-3 text-center text-[10px] text-slate-600 border border-dashed border-slate-800/60 rounded-xl group-hover:border-indigo-500/30 group-hover:text-indigo-400/60 transition-all">
                            Trống ca tối
                          </div>
                        ) : (
                          eveningEvts.map((evt) => renderEventCard(evt))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ----------------- MODE B: XEM THEO THÁNG (MONTH VIEW GRID) ----------------- */}
      {mainViewMode === 'month' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-slate-100 text-sm md:text-base">
                Lịch Toàn Tháng - {monthNameVietnamese}
              </h3>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Bấm vào từng ô ngày để xem danh sách lịch chi tiết hoặc thêm công việc mới
            </p>
          </div>

          {/* Month Day Headers */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800/80">
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div className="text-amber-400">T7</div>
            <div className="text-amber-400">CN</div>
          </div>

          {/* Month Calendar Cells Grid */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {monthGridCells.map((cell, idx) => {
              const dayEvts = filteredEvents.filter(
                (e) => (e.date ? e.date === cell.isoStr : e.dayOfWeek === cell.dayOfWeek)
              );

              const isWeekend = cell.dayOfWeek === 6 || cell.dayOfWeek === 0;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDayDetail({ date: cell.dateObj, dateStr: cell.isoStr })}
                  className={`min-h-[90px] md:min-h-[110px] p-1.5 md:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    cell.isCurrentMonth
                      ? isWeekend
                        ? 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/80 hover:bg-slate-900'
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-indigo-500/80 hover:bg-slate-900'
                      : 'bg-slate-950/20 border-slate-900/50 text-slate-600 opacity-40'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md ${
                        cell.isCurrentMonth
                          ? isWeekend
                            ? 'text-amber-400 bg-amber-950/30'
                            : 'text-slate-200'
                          : 'text-slate-600'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {dayEvts.length > 0 && (
                      <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800/80 font-bold px-1.5 py-0.2 rounded-full">
                        {dayEvts.length}
                      </span>
                    )}
                  </div>

                  {/* Event Badges Preview inside Day Cell */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {dayEvts.slice(0, 3).map((evt) => {
                      const style = getCategoryColor(evt.category);
                      return (
                        <div
                          key={evt.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium border ${style.bg} ${style.border} ${style.text}`}
                        >
                          <span className="font-mono text-[9px] mr-1">{evt.startTime}</span>
                          {evt.title}
                        </div>
                      );
                    })}
                    {dayEvts.length > 3 && (
                      <div className="text-[9px] text-slate-400 font-medium pl-1">
                        +{dayEvts.length - 3} lịch nữa...
                      </div>
                    )}
                  </div>

                  {/* Hover indicator */}
                  <div className="text-[9px] text-indigo-400/80 opacity-0 group-hover:opacity-100 transition-opacity font-medium flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" /> Xem ngày
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- MODAL 1: ADD NEW EVENT MODAL ----------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl w-full max-w-lg p-5 md:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-base md:text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Thêm Lịch Công Việc Mới
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  if (isActionFromPlanner) {
                    setIsSundayPlannerOpen(true);
                    setIsActionFromPlanner(false);
                  }
                }}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tên công việc / Sự kiện *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Ca học MRI sọ não, Trực siêu âm, Tập cầu lông..."
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phân Nhóm Danh Mục</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => {
                      const cat = e.target.value as EventCategory;
                      setNewEvent({
                        ...newEvent,
                        category: cat,
                        categoryLabel: getDefaultCategoryLabel(cat),
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {Object.entries(settings.categoryLabels || {}).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tên Nhãn Hiển Thị Tùy Chỉnh</label>
                  <input
                    type="text"
                    placeholder="VD: Khoa CĐHA, Phòng Đọc MRI, v.v."
                    value={newEvent.categoryLabel}
                    onChange={(e) => setNewEvent({ ...newEvent, categoryLabel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mức Ưu Tiên Eisenhower</label>
                  <select
                    value={newEvent.priority}
                    onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value as PriorityLevel })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="P1">{settings.prioritySettings.P1.name} {settings.prioritySettings.P1.subtitle ? `(${settings.prioritySettings.P1.subtitle})` : ''}</option>
                    <option value="P2">{settings.prioritySettings.P2.name} {settings.prioritySettings.P2.subtitle ? `(${settings.prioritySettings.P2.subtitle})` : ''}</option>
                    <option value="P3">{settings.prioritySettings.P3.name} {settings.prioritySettings.P3.subtitle ? `(${settings.prioritySettings.P3.subtitle})` : ''}</option>
                    <option value="P4">{settings.prioritySettings.P4.name} {settings.prioritySettings.P4.subtitle ? `(${settings.prioritySettings.P4.subtitle})` : ''}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thời Gian Đệm (Buffer Minutes)</label>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={newEvent.bufferMinutes}
                    onChange={(e) => setNewEvent({ ...newEvent, bufferMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thứ Trong Tuần</label>
                  <select
                    value={newEvent.dayOfWeek}
                    onChange={(e) => setNewEvent({ ...newEvent, dayOfWeek: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>Thứ Hai</option>
                    <option value={2}>Thứ Ba</option>
                    <option value={3}>Thứ Tư</option>
                    <option value={4}>Thứ Năm</option>
                    <option value={5}>Thứ Sáu</option>
                    <option value={6}>Thứ Bảy</option>
                    <option value={0}>Chủ Nhật</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Giờ Bắt Đầu</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Giờ Kết Thúc</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Địa Điểm Làm Việc / Học Tập</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Ghi Chú & Chi Tiết Tùy Chỉnh</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về nội dung bài giảng, ca siêu âm..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isInterventionCheck"
                  checked={newEvent.isIntervention}
                  onChange={(e) => setNewEvent({ ...newEvent, isIntervention: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isInterventionCheck" className="text-slate-300 cursor-pointer">
                  Ca thủ thuật can thiệp khẩn cấp (RFA / VABB / Sinh thiết)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    if (isActionFromPlanner) {
                      setIsSundayPlannerOpen(true);
                      setIsActionFromPlanner(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
                >
                  Thêm Vào Lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL 2: EDIT EXISTING EVENT MODAL ----------------- */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F172A] border border-indigo-900/80 rounded-2xl w-full max-w-lg p-5 md:p-6 shadow-2xl space-y-4 my-auto ring-1 ring-indigo-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-base md:text-lg flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-400" />
                Chỉnh Sửa Lịch Công Việc
              </h3>
              <button
                onClick={() => {
                  setEditingEvent(null);
                  if (isActionFromPlanner) {
                    setIsSundayPlannerOpen(true);
                    setIsActionFromPlanner(false);
                  }
                }}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tên công việc / Sự kiện *</label>
                <input
                  type="text"
                  required
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phân Nhóm Danh Mục</label>
                  <select
                    value={editingEvent.category}
                    onChange={(e) => {
                      const cat = e.target.value as EventCategory;
                      setEditingEvent({
                        ...editingEvent,
                        category: cat,
                        categoryLabel: getDefaultCategoryLabel(cat),
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {Object.entries(settings.categoryLabels || {}).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tên Nhãn Tùy Chỉnh</label>
                  <input
                    type="text"
                    value={editingEvent.categoryLabel || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, categoryLabel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mức Ưu Tiên Eisenhower (P1-P4)</label>
                  <select
                    value={editingEvent.priority}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, priority: e.target.value as PriorityLevel })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="P1">{settings.prioritySettings.P1.name} {settings.prioritySettings.P1.subtitle ? `(${settings.prioritySettings.P1.subtitle})` : ''}</option>
                    <option value="P2">{settings.prioritySettings.P2.name} {settings.prioritySettings.P2.subtitle ? `(${settings.prioritySettings.P2.subtitle})` : ''}</option>
                    <option value="P3">{settings.prioritySettings.P3.name} {settings.prioritySettings.P3.subtitle ? `(${settings.prioritySettings.P3.subtitle})` : ''}</option>
                    <option value="P4">{settings.prioritySettings.P4.name} {settings.prioritySettings.P4.subtitle ? `(${settings.prioritySettings.P4.subtitle})` : ''}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thời Gian Đệm (Buffer Minutes)</label>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={editingEvent.bufferMinutes}
                    onChange={(e) => setEditingEvent({ ...editingEvent, bufferMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ngày Diễn Ra</label>
                  <input
                    type="date"
                    value={editingEvent.date || ''}
                    onChange={(e) => {
                      const newDateStr = e.target.value;
                      if (!newDateStr) return;
                      const parsed = new Date(newDateStr);
                      const dOfWeek = parsed.getDay();
                      setEditingEvent({
                        ...editingEvent,
                        date: newDateStr,
                        dayOfWeek: dOfWeek,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thứ Trong Tuần</label>
                  <select
                    value={editingEvent.dayOfWeek}
                    onChange={(e) => setEditingEvent({ ...editingEvent, dayOfWeek: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value={1}>Thứ Hai</option>
                    <option value={2}>Thứ Ba</option>
                    <option value={3}>Thứ Tư</option>
                    <option value={4}>Thứ Năm</option>
                    <option value={5}>Thứ Sáu</option>
                    <option value={6}>Thứ Bảy</option>
                    <option value={0}>Chủ Nhật</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Giờ Bắt Đầu</label>
                  <input
                    type="time"
                    value={editingEvent.startTime}
                    onChange={(e) => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Giờ Kết Thúc</label>
                  <input
                    type="time"
                    value={editingEvent.endTime}
                    onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Quick Date/Time Reschedule Shift Buttons */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  ⚡ Điều chỉnh nhanh ngày & giờ:
                </span>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = editingEvent.date ? new Date(editingEvent.date) : new Date();
                      cur.setDate(cur.getDate() + 1);
                      const iso = formatDateISO(cur);
                      setEditingEvent({ ...editingEvent, date: iso, dayOfWeek: cur.getDay() });
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    📅 +1 Ngày (Lùi 1 ngày)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = editingEvent.date ? new Date(editingEvent.date) : new Date();
                      cur.setDate(cur.getDate() - 1);
                      const iso = formatDateISO(cur);
                      setEditingEvent({ ...editingEvent, date: iso, dayOfWeek: cur.getDay() });
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    📅 -1 Ngày (Tiến 1 ngày)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent({ ...editingEvent, startTime: '07:30', endTime: '12:00' });
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    🌅 Ca Sáng (07:30 - 12:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent({ ...editingEvent, startTime: '13:30', endTime: '16:30' });
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    🌆 Ca Chiều (13:30 - 16:30)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent({ ...editingEvent, startTime: '19:30', endTime: '21:30' });
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-purple-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    🌙 Ca Tối (19:30 - 21:30)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Địa Điểm Làm Việc / Học Tập</label>
                <input
                  type="text"
                  value={editingEvent.location}
                  onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Ghi Chú & Mô Tả Bổ Sung</label>
                <textarea
                  rows={2}
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isInterventionEditCheck"
                  checked={editingEvent.isIntervention || false}
                  onChange={(e) => setEditingEvent({ ...editingEvent, isIntervention: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isInterventionEditCheck" className="text-slate-300 cursor-pointer">
                  Ca thủ thuật can thiệp khẩn cấp (RFA / VABB / Sinh thiết)
                </label>
              </div>

              <div className="pt-3 flex justify-between items-center border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (isActionFromPlanner && plannerDraftEvents) {
                      setPlannerDraftEvents((prev) => (prev ? prev.filter((e) => e.id !== editingEvent.id) : []));
                      setEditingEvent(null);
                      setIsSundayPlannerOpen(true);
                      setIsActionFromPlanner(false);
                    } else {
                      onDeleteEvent(editingEvent.id);
                      setEditingEvent(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-medium flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Lịch</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent(null);
                      if (isActionFromPlanner) {
                        setIsSundayPlannerOpen(true);
                        setIsActionFromPlanner(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Thay Đổi</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL 3: DAY DETAIL DRAWER/MODAL (CLICK FROM MONTH VIEW) ----------------- */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F172A] border border-indigo-900/80 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-400" />
                  Lịch Chi Tiết Ngày {formatDateShort(selectedDayDetail.date)} / {selectedDayDetail.date.getFullYear()}
                </h3>
                <p className="text-xs text-indigo-300">
                  {selectedDayDetail.date.toLocaleDateString('vi-VN', { weekday: 'long' })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of events for this selected day */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
              {(() => {
                const dayEvts = filteredEvents.filter((e) =>
                  e.date ? e.date === selectedDayDetail.dateStr : e.dayOfWeek === selectedDayDetail.date.getDay()
                );

                if (dayEvts.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      Không có công việc nào trong ngày này.
                    </div>
                  );
                }

                return dayEvts.map((evt) => renderEventCard(evt));
              })()}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => {
                  const dOfWeek = selectedDayDetail.date.getDay();
                  setNewEvent({
                    ...newEvent,
                    date: selectedDayDetail.dateStr,
                    dayOfWeek: dOfWeek,
                  });
                  setSelectedDayDetail(null);
                  setIsAddModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Lịch Ngày Này</span>
              </button>

              <button
                onClick={() => setSelectedDayDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL 4: SUNDAY WEEKLY PLANNER ----------------- */}
      {isSundayPlannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F172A] border border-amber-500/50 rounded-2xl w-full max-w-3xl p-5 shadow-2xl space-y-4 my-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-100 text-base md:text-lg">
                      Lên Lịch & Sắp Xếp Công Việc Tuần Mới (Chủ Nhật)
                    </h3>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      📝 Bản Nháp
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Tuần đang chọn: <span className="text-amber-300 font-mono font-semibold">{weekRangeText}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseSundayPlanner}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanatory Notice */}
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200/90 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                💡 <strong>Chế độ bản nháp an toàn:</strong> Bạn có thể thoải mái thêm, sửa, sao chép hoặc xóa lịch trong cửa sổ này. Dữ liệu chỉ chính thức đồng bộ vào lịch khi bạn nhấn nút <strong className="text-amber-300">"Hoàn Tất Lên Lịch"</strong> ở bên dưới.
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  const activeDraft = plannerDraftEvents !== null ? plannerDraftEvents : events;

                  // 1. Calculate previous week 7 days ISO dates
                  const prevMondayObj = new Date(monday);
                  prevMondayObj.setDate(prevMondayObj.getDate() - 7);

                  const prevWeekDays = [1, 2, 3, 4, 5, 6, 0].map((dayNum, idx) => {
                    const d = new Date(prevMondayObj);
                    d.setDate(prevMondayObj.getDate() + idx);
                    return {
                      dayOfWeek: dayNum,
                      isoStr: formatDateISO(d),
                    };
                  });

                  // 2. Search for events belonging to previous week in active draft or events
                  let sourceEvents = activeDraft.filter((e) =>
                    prevWeekDays.some((pwd) => pwd.isoStr === e.date)
                  );

                  // Fallback if no specific previous week ISO events found
                  if (sourceEvents.length === 0) {
                    sourceEvents = activeDraft.filter((e) => !!e.title);
                  }

                  if (sourceEvents.length === 0) {
                    alert('Không tìm thấy lịch làm việc nào để sao chép!');
                    return;
                  }

                  const newDraftItems: ScheduleEvent[] = [];

                  // 3. For each day of current target week, copy corresponding events
                  weekDays.forEach((targetWd, idx) => {
                    const sourceIso = prevWeekDays[idx].isoStr;

                    let daySourceEvts = sourceEvents.filter((e) => e.date === sourceIso);

                    if (daySourceEvts.length === 0) {
                      daySourceEvts = sourceEvents.filter((e) => e.dayOfWeek === targetWd.dayOfWeek);
                    }

                    const existingTargetEvts = activeDraft.filter((e) => e.date === targetWd.isoStr);

                    daySourceEvts.forEach((se) => {
                      const isAlreadyOnTarget = existingTargetEvts.some(
                        (te) => te.title === se.title && te.startTime === se.startTime
                      );

                      if (!isAlreadyOnTarget) {
                        newDraftItems.push({
                          id: `evt-draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                          title: se.title,
                          category: se.category,
                          categoryLabel: se.categoryLabel,
                          priority: se.priority,
                          priorityName: se.priorityName,
                          dayOfWeek: targetWd.dayOfWeek,
                          date: targetWd.isoStr,
                          startTime: se.startTime,
                          endTime: se.endTime,
                          location: se.location,
                          description: se.description,
                          bufferMinutes: se.bufferMinutes,
                          isIntervention: se.isIntervention,
                          completed: false,
                        });
                      }
                    });
                  });

                  if (newDraftItems.length > 0) {
                    setPlannerDraftEvents((prev) => (prev ? [...prev, ...newDraftItems] : newDraftItems));
                    alert(`Đã thêm ${newDraftItems.length} công việc vào BẢN NHÁP cửa sổ lên lịch!\n\nNhấn "Hoàn Tất Lên Lịch" khi bạn sẵn sàng đồng bộ vào lịch.`);
                  } else {
                    alert('Tất cả công việc tuần trước đã có sẵn trong bản nháp tuần này!');
                  }
                }}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 p-3 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all"
              >
                <Copy className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold text-xs">Sao Chép Lịch Tuần Trước</span>
                <span className="text-[10px] text-slate-400">Sao chép vào bản nháp</span>
              </button>

              <button
                onClick={() => {
                  onQuickAskAI('Hãy lập lịch làm việc tuần mới tối ưu cho tôi từ Thứ Hai đến Chủ Nhật');
                  setIsSundayPlannerOpen(false);
                }}
                className="bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-800/80 text-indigo-200 p-3 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all"
              >
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="font-semibold text-xs">AI Gợi Ý Sắp Xếp Tuần</span>
                <span className="text-[10px] text-indigo-300">Tối ưu P1-P4 & đệm tự động</span>
              </button>

              <button
                onClick={() => {
                  const activeDraft = plannerDraftEvents !== null ? plannerDraftEvents : events;

                  const eventsInWeek = activeDraft.filter((e) =>
                    weekDays.some((wd) => (e.date ? e.date === wd.isoStr : e.dayOfWeek === wd.dayOfWeek))
                  );

                  if (eventsInWeek.length === 0) {
                    return;
                  }

                  const idsToRemove = new Set(eventsInWeek.map((e) => e.id));
                  setPlannerDraftEvents(activeDraft.filter((e) => !idsToRemove.has(e.id)));
                }}
                className="bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-200 p-3 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <span className="font-semibold text-xs">Xóa Sạch Lịch Tuần Này</span>
                <span className="text-[10px] text-rose-300/80">Clear bản nháp tuần này</span>
              </button>
            </div>

            {/* Day by Day Quick Add & Overview */}
            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1 scrollbar-thin">
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Danh sách công việc bản nháp (Tuần {weekRangeText})</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Tổng bản nháp: {(plannerDraftEvents !== null ? plannerDraftEvents : events).length} công việc
                </span>
              </h4>

              {weekDays.map((wd) => {
                const activeDraft = plannerDraftEvents !== null ? plannerDraftEvents : events;
                const dayEvts = activeDraft.filter((e) =>
                  e.date ? e.date === wd.isoStr : e.dayOfWeek === wd.dayOfWeek
                );

                return (
                  <div key={wd.isoStr} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-800/80 font-mono">
                          {wd.short}
                        </span>
                        <div>
                          <span className="font-bold text-xs text-slate-200">{wd.label}</span>
                          <span className="text-[11px] text-slate-400 font-mono ml-2">({wd.dateStr})</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setNewEvent({
                            ...newEvent,
                            date: wd.isoStr,
                            dayOfWeek: wd.dayOfWeek,
                          });
                          setIsActionFromPlanner(true);
                          setIsSundayPlannerOpen(false);
                          setIsAddModalOpen(true);
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm Việc {wd.short}</span>
                      </button>
                    </div>

                    {/* Day Events */}
                    {dayEvts.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic px-1 py-0.5">
                        Chưa có lịch cho ngày này. Nhấn nút "+ Thêm Việc" để bổ sung.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dayEvts.map((evt) => (
                          <div
                            key={evt.id}
                            className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-200 truncate">{evt.title}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                ⏰ {evt.startTime} - {evt.endTime} • <span className="text-indigo-300">{evt.priority}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingEvent(evt);
                                  setIsActionFromPlanner(true);
                                  setIsSundayPlannerOpen(false);
                                }}
                                className="text-slate-400 hover:text-indigo-300 p-1 rounded hover:bg-slate-800"
                                title="Sửa công việc"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setPlannerDraftEvents((prev) =>
                                    (prev !== null ? prev : events).filter((item) => item.id !== evt.id)
                                  );
                                }}
                                className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
                                title="Xóa công việc này khỏi bản nháp"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={handleCloseSundayPlanner}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy / Thoát
              </button>
              <button
                onClick={handleCommitPlannerDraft}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Hoàn Tất Lên Lịch & Đồng Bộ</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Email Sending Status & Preview Modal */}
      {emailStatusModal?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  emailStatusModal.success 
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60' 
                    : 'bg-rose-950 text-rose-400 border-rose-800/60'
                }`}>
                  {emailStatusModal.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-200 text-sm">Trạng thái Gửi Email</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Báo cáo tóm tắt lịch trình tuần {weekRangeText}</p>
                </div>
              </div>
              <button
                onClick={() => setEmailStatusModal(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className={`p-3.5 rounded-2xl border text-xs font-semibold leading-relaxed ${
                emailStatusModal.success 
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' 
                  : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
              }`}>
                {emailStatusModal.message}
              </div>

              {emailStatusModal.previewHtml && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Bản xem trước Email gửi cho Bác sĩ:</span>
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-white max-h-[50vh] overflow-y-auto p-1 shadow-inner">
                    <iframe
                      srcDoc={emailStatusModal.previewHtml}
                      title="Email Preview"
                      className="w-full min-h-[450px] border-0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/30">
              <button
                onClick={() => setEmailStatusModal(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
