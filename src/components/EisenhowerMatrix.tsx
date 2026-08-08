import React, { useState } from 'react';
import { ScheduleEvent, PriorityLevel, EventCategory, AppSettings } from '../types';
import {
  ShieldAlert,
  BookOpen,
  Clock,
  Heart,
  CheckCircle2,
  Circle,
  ArrowRightLeft,
  Pencil,
  Trash2,
  Save,
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Filter,
} from 'lucide-react';

function formatDateISO(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateShort(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${dd}/${mm}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

interface EisenhowerMatrixProps {
  events: ScheduleEvent[];
  settings?: AppSettings;
  onUpdatePriority: (id: string, newPriority: PriorityLevel) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onUpdateEvent?: (id: string, updates: Partial<ScheduleEvent>) => void;
  onDeleteEvent?: (id: string) => void;
}

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({
  events,
  settings,
  onUpdatePriority,
  onToggleComplete,
  onUpdateEvent,
  onDeleteEvent,
}) => {
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [viewScope, setViewScope] = useState<'week' | 'month' | 'all'>('week');
  const [baseDate, setBaseDate] = useState<Date>(new Date(2026, 7, 10));

  const monday = getMonday(baseDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekRangeText = `${formatDateShort(monday)} - ${formatDateShort(sunday)}/${sunday.getFullYear()}`;
  const monthText = `Tháng ${String(baseDate.getMonth() + 1).padStart(2, '0')}/${baseDate.getFullYear()}`;

  const handlePrevDate = () => {
    const next = new Date(baseDate);
    if (viewScope === 'week') {
      next.setDate(next.getDate() - 7);
    } else if (viewScope === 'month') {
      next.setMonth(next.getMonth() - 1);
    }
    setBaseDate(next);
  };

  const handleNextDate = () => {
    const next = new Date(baseDate);
    if (viewScope === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (viewScope === 'month') {
      next.setMonth(next.getMonth() + 1);
    }
    setBaseDate(next);
  };

  const handleResetToday = () => {
    setBaseDate(new Date(2026, 7, 10));
  };

  const getFilteredEvents = () => {
    if (viewScope === 'all') return events;

    if (viewScope === 'week') {
      const weekIsoList: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekIsoList.push(formatDateISO(d));
      }
      return events.filter((e) => {
        if (e.date) {
          return weekIsoList.includes(e.date);
        }
        return true;
      });
    }

    if (viewScope === 'month') {
      const yyyy = baseDate.getFullYear();
      const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
      const monthPrefix = `${yyyy}-${mm}`;
      return events.filter((e) => {
        if (e.date) {
          return e.date.startsWith(monthPrefix);
        }
        return true;
      });
    }

    return events;
  };

  const activeEvents = getFilteredEvents();

  const p1Events = activeEvents.filter((e) => e.priority === 'P1');
  const p2Events = activeEvents.filter((e) => e.priority === 'P2');
  const p3Events = activeEvents.filter((e) => e.priority === 'P3');
  const p4Events = activeEvents.filter((e) => e.priority === 'P4');

  const getDefaultCategoryLabel = (category: EventCategory) => {
    if (settings?.categoryLabels?.[category]) {
      return settings.categoryLabels[category];
    }
    switch (category) {
      case 'hospital': return 'Bệnh viện';
      case 'study': return 'Học tập chuyên môn';
      case 'clinic': return 'Phòng khám ngoài giờ';
      case 'rest': return 'Nghỉ ngơi & Thể thao';
      case 'personal': return 'Cá nhân';
      default: return 'Khác';
    }
  };


  const handleSubmitEditEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editingEvent.title.trim()) return;

    if (onUpdateEvent) {
      onUpdateEvent(editingEvent.id, {
        ...editingEvent,
        categoryLabel: editingEvent.categoryLabel || getDefaultCategoryLabel(editingEvent.category),
      });
    }
    setEditingEvent(null);
  };

  const renderQuadrantCard = (
    title: string,
    subtitle: string,
    badgeText: string,
    badgeColor: string,
    icon: React.ReactNode,
    quadEvents: ScheduleEvent[],
    priorityKey: PriorityLevel,
    borderColor: string,
    bgHeader: string
  ) => {
    return (
      <div className={`bg-slate-900 border ${borderColor} rounded-2xl p-4 flex flex-col h-full shadow-lg`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 mb-3 border-b border-slate-800 ${bgHeader} -mx-4 -mt-4 p-4 rounded-t-2xl`}
        >
          <div className="flex items-center gap-2.5">
            {icon}
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>{title}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {badgeText}
                </span>
              </h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <span className="text-xs bg-slate-950/80 border border-slate-800 text-slate-300 font-mono px-2.5 py-1 rounded-full font-bold">
            {quadEvents.filter((e) => !e.completed).length} chưa xong
          </span>
        </div>

        {/* Task List */}
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {quadEvents.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-slate-500 text-xs text-center border border-dashed border-slate-800/80 rounded-xl p-3">
              <span>Không có công việc ở ma trận này</span>
            </div>
          ) : (
            quadEvents.map((evt) => (
              <div
                key={evt.id}
                className={`p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between gap-2 ${
                  evt.completed ? 'opacity-40 grayscale' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onToggleComplete(evt.id, !evt.completed)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                      title={evt.completed ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                    >
                      {evt.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-200 leading-snug">{evt.title}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {evt.date && <span className="text-indigo-300 font-semibold mr-1">{evt.date.split('-').slice(1).join('/')}</span>}
                        Thứ {evt.dayOfWeek === 0 ? 'CN' : evt.dayOfWeek + 1} • {evt.startTime} - {evt.endTime}
                        {evt.location && <span className="text-slate-500 ml-1">({evt.location})</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingEvent({ ...evt })}
                      className="text-slate-400 hover:text-indigo-300 p-1 rounded hover:bg-slate-800"
                      title="Chỉnh sửa chi tiết"
                    >
                      <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                    {onDeleteEvent && (
                      <button
                        onClick={() => onDeleteEvent(evt.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
                        title="Xóa công việc"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer Controls & Move Priority */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 text-[10px] font-medium">
                    {evt.categoryLabel || getDefaultCategoryLabel(evt.category)}
                  </span>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 mr-1 flex items-center gap-0.5">
                      <ArrowRightLeft className="w-3 h-3" /> Chuyển:
                    </span>
                    {(['P1', 'P2', 'P3', 'P4'] as PriorityLevel[]).map((p) => {
                      if (p === priorityKey) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => onUpdatePriority(evt.id, p)}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-300 text-[10px] px-1.5 py-0.5 rounded transition-all font-mono"
                          title={`Chuyển sang ${p}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Overview Intro */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="font-bold text-slate-100 text-sm sm:text-base">Ma Trận Ưu Tiên Eisenhower</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Phân loại linh hoạt theo mong muốn người dùng (Bệnh viện, Học tập, Phòng khám, Nghỉ ngơi P1-P4).
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap">
          <span className="bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-lg font-medium text-[10px] sm:text-[11px]" title={settings?.prioritySettings?.P1?.subtitle}>
            {settings?.prioritySettings?.P1?.name || 'P1: Can thiệp khẩn'}
          </span>
          <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-lg font-medium text-[10px] sm:text-[11px]" title={settings?.prioritySettings?.P2?.subtitle}>
            {settings?.prioritySettings?.P2?.name || 'P2: Học tập chuyên sâu'}
          </span>
          <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-lg font-medium text-[10px] sm:text-[11px]" title={settings?.prioritySettings?.P3?.subtitle}>
            {settings?.prioritySettings?.P3?.name || 'P3: Thường quy'}
          </span>
          <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-lg font-medium text-[10px] sm:text-[11px]" title={settings?.prioritySettings?.P4?.subtitle}>
            {settings?.prioritySettings?.P4?.name || 'P4: Bảo vệ nghỉ ngơi'}
          </span>
        </div>
      </div>

      {/* Time Scope Filter Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setViewScope('week')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
              viewScope === 'week'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Theo Tuần</span>
          </button>
          <button
            onClick={() => setViewScope('month')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
              viewScope === 'month'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Theo Tháng</span>
          </button>
          <button
            onClick={() => setViewScope('all')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
              viewScope === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Tất Cả Lịch</span>
          </button>
        </div>

        {viewScope !== 'all' && (
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={handlePrevDate}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Thời gian trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-indigo-300 font-mono text-center flex-1 sm:flex-initial min-w-[120px] text-xs">
              {viewScope === 'week' ? weekRangeText : monthText}
            </span>

            <button
              onClick={handleNextDate}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Thời gian tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetToday}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ml-1 shrink-0"
              title="Trở về mốc thời gian hiện tại"
            >
              <RotateCcw className="w-3 h-3 text-indigo-400" />
              <span>Hiện tại</span>
            </button>
          </div>
        )}
      </div>

      {/* 2x2 Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P1: Urgent & Clinical Important */}
        {renderQuadrantCard(
          settings?.prioritySettings?.P1?.name || 'P1: Khẩn Cấp / Can Thiệp Lâm Sàng',
          settings?.prioritySettings?.P1?.subtitle || 'RFA giáp, VABB vú, Sinh thiết, Trực cấp cứu',
          'P1 - URGENT',
          'bg-rose-950 text-rose-200 border border-rose-700',
          <ShieldAlert className="w-5 h-5 text-rose-400" />,
          p1Events,
          'P1',
          'border-rose-900/60',
          'bg-rose-950/20'
        )}

        {/* P2: Important / Study & Expertise */}
        {renderQuadrantCard(
          settings?.prioritySettings?.P2?.name || 'P2: Quan Trọng / Học Tập Chuyên Sâu',
          settings?.prioritySettings?.P2?.subtitle || 'Khóa học MRI 6 tháng, CLVT nâng cao',
          'P2 - HIGH PRIORITY',
          'bg-purple-950 text-purple-200 border border-purple-700',
          <BookOpen className="w-5 h-5 text-purple-400" />,
          p2Events,
          'P2',
          'border-purple-900/60',
          'bg-purple-950/20'
        )}

        {/* P3: Routine Duty / Outpatient Clinic */}
        {renderQuadrantCard(
          settings?.prioritySettings?.P3?.name || 'P3: Thường Quy / Phòng Khám',
          settings?.prioritySettings?.P3?.subtitle || 'Siêu âm thường quy, Đọc phim CLVT/MRI, Phòng khám T7-CN',
          'P3 - ROUTINE',
          'bg-slate-800 text-slate-200 border border-slate-700',
          <Clock className="w-5 h-5 text-slate-400" />,
          p3Events,
          'P3',
          'border-slate-800',
          'bg-slate-950/40'
        )}

        {/* P4: Protected Rest & Personal Health */}
        {renderQuadrantCard(
          settings?.prioritySettings?.P4?.name || 'P4: Bảo Vệ Nghỉ Ngơi & Gia Đình',
          settings?.prioritySettings?.P4?.subtitle || 'Buổi tối nghỉ ngơi/thể thao (T2, T5, T7, CN) - Bắt buộc',
          'P4 - PROTECTED REST',
          'bg-amber-950 text-amber-200 border border-amber-700',
          <Heart className="w-5 h-5 text-amber-400" />,

          p4Events,
          'P4',
          'border-amber-900/60',
          'bg-amber-950/20'
        )}
      </div>

      {/* EDIT MODAL IN MATRIX VIEW */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F172A] border border-indigo-900/80 rounded-2xl w-full max-w-lg p-5 md:p-6 shadow-2xl space-y-4 my-auto ring-1 ring-indigo-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-base md:text-lg flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-400" />
                Chỉnh Sửa Lịch Trình (Ma Trận Eisenhower)
              </h3>
              <button
                onClick={() => setEditingEvent(null)}
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
                    {Object.entries(settings?.categoryLabels || {}).map(([key, label]) => (
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
                    <option value="P1">{settings?.prioritySettings?.P1?.name || 'P1 - Khẩn cấp'} {settings?.prioritySettings?.P1?.subtitle ? `(${settings.prioritySettings.P1.subtitle})` : ''}</option>
                    <option value="P2">{settings?.prioritySettings?.P2?.name || 'P2 - Học tập'} {settings?.prioritySettings?.P2?.subtitle ? `(${settings.prioritySettings.P2.subtitle})` : ''}</option>
                    <option value="P3">{settings?.prioritySettings?.P3?.name || 'P3 - Thường quy'} {settings?.prioritySettings?.P3?.subtitle ? `(${settings.prioritySettings.P3.subtitle})` : ''}</option>
                    <option value="P4">{settings?.prioritySettings?.P4?.name || 'P4 - Nghỉ ngơi'} {settings?.prioritySettings?.P4?.subtitle ? `(${settings.prioritySettings.P4.subtitle})` : ''}</option>
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thứ Trong Tuần</label>
                  <select
                    value={editingEvent.dayOfWeek}
                    onChange={(e) => setEditingEvent({ ...editingEvent, dayOfWeek: Number(e.target.value) })}
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
                    value={editingEvent.startTime}
                    onChange={(e) => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Giờ Kết Thúc</label>
                  <input
                    type="time"
                    value={editingEvent.endTime}
                    onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
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

              <div className="pt-3 flex justify-between items-center border-t border-slate-800">
                {onDeleteEvent ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
                        onDeleteEvent(editingEvent.id);
                        setEditingEvent(null);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-medium flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
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
    </div>
  );
};
