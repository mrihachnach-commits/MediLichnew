import React, { useState } from 'react';
import { ScheduleEvent, AppSettings } from '../types';
import {
  ShieldCheck,
  Clock,
  Zap,
  Activity,
  HeartPulse,
  CheckCircle,
  BarChart3,
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

function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

const CAT_COLORS = [
  { bg: 'bg-cyan-500', fill: 'bg-cyan-500', border: 'border-cyan-900/50', text: 'text-cyan-300' },
  { bg: 'bg-purple-500', fill: 'bg-purple-500', border: 'border-purple-900/50', text: 'text-purple-300' },
  { bg: 'bg-emerald-500', fill: 'bg-emerald-500', border: 'border-emerald-900/50', text: 'text-emerald-300' },
  { bg: 'bg-amber-500', fill: 'bg-amber-500', border: 'border-amber-900/50', text: 'text-amber-300' },
  { bg: 'bg-rose-500', fill: 'bg-rose-500', border: 'border-rose-900/50', text: 'text-rose-300' },
  { bg: 'bg-indigo-500', fill: 'bg-indigo-500', border: 'border-indigo-900/50', text: 'text-indigo-300' },
  { bg: 'bg-teal-500', fill: 'bg-teal-500', border: 'border-teal-900/50', text: 'text-teal-300' },
  { bg: 'bg-blue-500', fill: 'bg-blue-500', border: 'border-blue-900/50', text: 'text-blue-300' },
  { bg: 'bg-pink-500', fill: 'bg-pink-500', border: 'border-pink-900/50', text: 'text-pink-300' },
  { bg: 'bg-sky-500', fill: 'bg-sky-500', border: 'border-sky-900/50', text: 'text-sky-300' },
];

interface SmartAnalyticsProps {
  events: ScheduleEvent[];
  settings?: AppSettings;
}

export const SmartAnalytics: React.FC<SmartAnalyticsProps> = ({ events, settings }) => {
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

  // Dynamic Category Hours
  const categoryHoursMap: Record<string, number> = {};
  const catEntries = Object.entries(settings?.categoryLabels || {});
  catEntries.forEach(([key]) => {
    categoryHoursMap[key] = 0;
  });

  const activeEventsForList: ScheduleEvent[] = [];

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const weekIsoList: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekIsoList.push(formatDateISO(d));
  }

  const countOccurrencesInMonth = (targetDayOfWeek: number) => {
    const daysCount = getDaysInMonth(year, month);
    let count = 0;
    for (let day = 1; day <= daysCount; day++) {
      const d = new Date(year, month, day);
      if (d.getDay() === targetDayOfWeek) {
        count++;
      }
    }
    return count;
  };

  events.forEach((evt) => {
    const [startH, startM] = evt.startTime.split(':').map(Number);
    const [endH, endM] = evt.endTime.split(':').map(Number);
    let duration = (endH * 60 + endM - (startH * 60 + startM)) / 60;
    if (duration < 0) duration += 24;

    let multiplier = 0;

    if (viewScope === 'all') {
      multiplier = 1;
      activeEventsForList.push(evt);
    } else if (viewScope === 'week') {
      if (evt.date) {
        if (weekIsoList.includes(evt.date)) {
          multiplier = 1;
          activeEventsForList.push(evt);
        }
      } else {
        multiplier = 1;
        activeEventsForList.push(evt);
      }
    } else if (viewScope === 'month') {
      if (evt.date) {
        if (evt.date.startsWith(monthPrefix)) {
          multiplier = 1;
          activeEventsForList.push(evt);
        }
      } else {
        multiplier = countOccurrencesInMonth(evt.dayOfWeek);
        if (multiplier > 0) {
          activeEventsForList.push(evt);
        }
      }
    }

    const totalEvtDuration = duration * multiplier;
    const cat = evt.category || 'hospital';
    categoryHoursMap[cat] = (categoryHoursMap[cat] || 0) + totalEvtDuration;
  });

  const totalHours = Object.values(categoryHoursMap).reduce((acc, h) => acc + h, 0) || 1;
  const studyHours = categoryHoursMap['study'] || 0;
  const hospitalHours = categoryHoursMap['hospital'] || 0;

  // Interventions count
  const interventions = activeEventsForList.filter((e) => e.isIntervention || e.priority === 'P1');
  const defaultBuffer = settings?.defaultBufferMinutes ?? 30;

  return (
    <div className="space-y-6">
      {/* Time Scope Filter Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
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

      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Stat 1: Rest Protection */}
        <div className="bg-slate-900 border border-emerald-900/80 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-slate-400 font-medium truncate block">
              {settings?.prioritySettings?.P4?.name || 'Bảo Vệ Nghỉ Ngơi'}
            </span>
            <div className="text-xl font-extrabold text-emerald-300">100% Đạt Chuẩn</div>
            <p className="text-[10px] text-emerald-400/80 truncate">
              {settings?.prioritySettings?.P4?.subtitle || '3 Tối trong tuần + 2 Tối cuối tuần'}
            </p>
          </div>
        </div>

        {/* Stat 2: Buffer Time */}
        <div className="bg-slate-900 border border-cyan-900/80 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="p-3 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-slate-400 font-medium truncate block">Đệm An Toàn (Buffer)</span>
            <div className="text-xl font-extrabold text-cyan-300">{defaultBuffer} Phút / Buổi</div>
            <p className="text-[10px] text-cyan-400/80 truncate">Cài đặt khoảng đệm di chuyển & ăn uống</p>
          </div>
        </div>

        {/* Stat 3: Clinical Interventions */}
        <div className="bg-slate-900 border border-rose-900/80 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="p-3 rounded-xl bg-rose-950 text-rose-400 border border-rose-800 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-slate-400 font-medium truncate block">
              {settings?.prioritySettings?.P1?.name || 'Ca Can Thiệp Lâm Sàng'}
            </span>
            <div className="text-xl font-extrabold text-rose-300">
              {interventions.length} Ca {viewScope === 'month' ? 'Tháng Này' : viewScope === 'week' ? 'Tuần Này' : ''}
            </div>
            <p className="text-[10px] text-rose-400/80 truncate">
              {settings?.prioritySettings?.P1?.subtitle || 'RFA Nhân Giáp & VABB Vú'}
            </p>
          </div>
        </div>

        {/* Stat 4: Total Active Hours */}
        <div className="bg-slate-900 border border-purple-900/80 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="p-3 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-slate-400 font-medium truncate block">
              {settings?.prioritySettings?.P2?.name || 'Khóa Học Chuyên Sâu'}
            </span>
            <div className="text-xl font-extrabold text-purple-300">
              {studyHours.toFixed(1)} Giờ / {viewScope === 'month' ? 'Tháng' : viewScope === 'week' ? 'Tuần' : 'Tất cả'}
            </div>
            <p className="text-[10px] text-purple-400/80 truncate">
              {settings?.prioritySettings?.P2?.subtitle || 'Học tập & Hội thảo chuyên môn'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workload Distribution Bar */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Phân Bổ Thời Gian {viewScope === 'month' ? 'Hàng Tháng' : viewScope === 'week' ? 'Hàng Tuần' : 'Tổng Thể'} Bác Sĩ
              </h3>
              <p className="text-xs text-slate-400">Tỉ lệ tổng số giờ làm việc, học tập và phục hồi thể lực</p>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              Tổng: {totalHours.toFixed(1)} Giờ
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-2">
            <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
              {Object.entries(categoryHoursMap).map(([catKey, hours], idx) => {
                const color = CAT_COLORS[idx % CAT_COLORS.length];
                const pct = (hours / totalHours) * 100;
                if (pct <= 0) return null;
                const label = settings?.categoryLabels?.[catKey] || catKey;
                return (
                  <div
                    key={catKey}
                    style={{ width: `${pct}%` }}
                    className={`h-full ${color.bg} transition-all`}
                    title={`${label}: ${hours.toFixed(1)}h`}
                  ></div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
              {Object.entries(categoryHoursMap).map(([catKey, hours], idx) => {
                const color = CAT_COLORS[idx % CAT_COLORS.length];
                const label = settings?.categoryLabels?.[catKey] || catKey;
                const pct = ((hours / totalHours) * 100).toFixed(1);

                return (
                  <div key={catKey} className={`bg-slate-950 p-2.5 rounded-xl border ${color.border}`}>
                    <div className={`flex items-center gap-1.5 font-semibold ${color.text} truncate`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${color.fill} shrink-0`}></span>
                      <span className="truncate">{label}</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-slate-100 mt-1">{hours.toFixed(1)} Giờ</div>
                    <span className="text-[10px] text-slate-500">{pct}% thời gian</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Procedure Focus Box */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
            <h4 className="font-bold text-xs text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-rose-400" />
              <span>Danh Sách Ca Can Thiệp / Ưu Tiên Cao ({settings?.prioritySettings?.P1?.name || 'P1'})</span>
            </h4>
            <div className="space-y-2">
              {interventions.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2">Không có ca can thiệp khẩn cấp trong tuần này.</p>
              ) : (
                interventions.map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-rose-200 block">{evt.title}</span>
                      <span className="text-[11px] text-slate-400">{evt.location}</span>
                    </div>
                    <span className="font-mono text-rose-300 font-bold bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                      Thứ {evt.dayOfWeek === 0 ? 'CN' : evt.dayOfWeek + 1} • {evt.startTime}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Protected Rest & Rules Compliance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 pb-3 border-b border-slate-800">
            <HeartPulse className="w-5 h-5 text-amber-400" />
            Quy Tắc Bảo Vệ Sức Khỏe & Lịch Làm Việc
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/80 space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Quy tắc P1: {settings?.prioritySettings?.P1?.name || 'Khẩn Cấp / Can Thiệp Lâm Sàng'}</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {settings?.prioritySettings?.P1?.subtitle || 'Mức ưu tiên cao nhất, cần sắp xếp ngay.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/80 space-y-1">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Quy tắc P2: {settings?.prioritySettings?.P2?.name || 'Quan Trọng / Học Tập Chuyên Sâu'}</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {settings?.prioritySettings?.P2?.subtitle || 'Nâng cao trình độ và năng lực chuyên môn.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-1">
              <div className="font-bold text-slate-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Quy tắc P3: {settings?.prioritySettings?.P3?.name || 'Thường Quy / Phòng Khám'}</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {settings?.prioritySettings?.P3?.subtitle || 'Công việc thường quy và lịch phòng khám ngoài giờ.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/80 space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Quy tắc P4: {settings?.prioritySettings?.P4?.name || 'Bảo Vệ Nghỉ Ngơi & Gia Đình'}</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {settings?.prioritySettings?.P4?.subtitle || 'Thời gian bảo vệ nghỉ ngơi và tái tạo sức lao động.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/80 space-y-1">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Đệm Giữa Ca Làm Việc ({defaultBuffer} Phút)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Thiết lập thời gian đệm mặc định {defaultBuffer} phút giúp bác sĩ nghỉ ngơi, di chuyển giữa ca bệnh viện và ca học/phòng khám.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

