import React, { useState } from 'react';
import { Calendar, LayoutGrid, Mic, Sparkles, Stethoscope, Clock, Sliders, LogOut, Globe, ExternalLink, Menu, X, RotateCcw, History } from 'lucide-react';
import { AppSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  activeTab: 'calendar' | 'matrix' | 'analytics';
  setActiveTab: (tab: 'calendar' | 'matrix' | 'analytics') => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenChat: () => void;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  historyCount?: number;
  onOpenHistory?: () => void;
  onUndo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onOpenSettings,
  onOpenChat,
  isVoiceActive,
  onToggleVoice,
  historyCount = 0,
  onOpenHistory,
  onUndo,
}) => {
  const { user, logout, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-[#0F172A] border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      {/* Top Banner with Doctor Info & Status */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2.5">
        {/* Doctor Branding */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Avatar'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Stethoscope className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-bold text-sm sm:text-base md:text-lg text-slate-100 tracking-tight truncate max-w-[160px] xs:max-w-[220px] sm:max-w-none">
                {user?.displayName || settings.doctorTitle || 'BS. Chẩn đoán Hình ảnh'}
              </h1>
              {isAdmin && (
                <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                  Admin
                </span>
              )}
              <span className="hidden xs:inline-block bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium truncate max-w-[140px] sm:max-w-none">
                {settings.hospitalName || 'BV Nội tiết Trung ương'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-2 truncate">
              <span className="truncate">{settings.siteTitle}: {settings.appDescription}</span>
              {settings.appDomain && (
                <a
                  href={settings.appDomain}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/80 px-2 py-0.5 rounded-md transition-colors shrink-0"
                  title="Truy cập domain chính thức"
                >
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>{settings.appDomain.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              )}
            </p>
          </div>
        </div>

        {/* Desktop Quick Actions */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Undo Button */}
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={historyCount === 0}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-amber-300 text-xs px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Hoàn tác (Undo) thao tác vừa thực hiện"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Hoàn tác</span>
            </button>
          )}

          {/* History Button */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 relative"
              title="Xem Nhật ký Chỉnh sửa & Hoàn tác theo thời gian"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lịch Sử</span>
              {historyCount > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {historyCount}
                </span>
              )}
            </button>
          )}

          {/* Settings Button - Admin Only */}
          {isAdmin && (
            <button
              onClick={onOpenSettings}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Mở Cài đặt Chỉnh sửa Tên Website, Nhóm, Mức ưu tiên..."
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cài Đặt</span>
            </button>
          )}

          {/* Voice Chat Button */}
          <button
            onClick={onToggleVoice}
            className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all shadow-sm active:scale-95 ${
              isVoiceActive
                ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400/50'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
            }`}
            title="Bật/Tắt Nhận diện Giọng nói Tiếng Việt"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isVoiceActive ? 'Đang Lắng Nghe...' : 'Nói Tiếng Việt'}</span>
          </button>

          {/* AI Chat Drawer Trigger */}
          <button
            onClick={onOpenChat}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hỏi Trợ Lý AI</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 text-xs px-2.5 py-1.5 rounded-xl font-semibold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            title="Đăng xuất"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Header Buttons */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenChat}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/30 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hỏi AI</span>
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition-colors active:scale-95"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-indigo-400" /> : <Menu className="w-5 h-5 text-indigo-400" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Slide-Down Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900/95 border-b border-slate-800 px-4 py-3 space-y-3 animate-in slide-in-from-top duration-200 shadow-2xl">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800 text-slate-300">
            <span className="font-semibold text-indigo-300">{settings.hospitalName || 'BV Nội tiết Trung ương'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {onUndo && (
              <button
                onClick={() => {
                  onUndo();
                  setIsMobileMenuOpen(false);
                }}
                disabled={historyCount === 0}
                className="bg-slate-800 disabled:opacity-40 border border-slate-700 text-amber-300 text-xs px-3 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Hoàn Tác</span>
              </button>
            )}

            {onOpenHistory && (
              <button
                onClick={() => {
                  onOpenHistory();
                  setIsMobileMenuOpen(false);
                }}
                className="bg-slate-800 border border-slate-700 text-cyan-300 text-xs px-3 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5"
              >
                <History className="w-4 h-4 text-cyan-400" />
                <span>Lịch Sử ({historyCount})</span>
              </button>
            )}

            <button
              onClick={() => {
                onToggleVoice();
                setIsMobileMenuOpen(false);
              }}
              className={`text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition-all ${
                isVoiceActive
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-800 border border-slate-700 text-slate-200'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isVoiceActive ? 'Đang Lắng Nghe' : 'Nói Tiếng Việt'}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  onOpenSettings();
                  setIsMobileMenuOpen(false);
                }}
                className="bg-slate-800 border border-slate-700 text-indigo-300 text-xs px-3 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Cài Đặt Hệ Thống</span>
              </button>
            )}

            <button
              onClick={() => {
                onOpenChat();
                setIsMobileMenuOpen(false);
              }}
              className="bg-indigo-600 text-white text-xs px-3 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>Chatbot Trợ Lý AI</span>
            </button>

            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs px-3 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-800/80 scrollbar-none">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="sm:hidden">Lịch Tuần</span>
          <span className="hidden sm:inline">Thời Gian Biểu Tuần</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <LayoutGrid className="w-4 h-4 text-amber-400" />
          <span className="sm:hidden">Ma Trận P1-P4</span>
          <span className="hidden sm:inline">Ma Trận Eisenhower (P1-P4)</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="sm:hidden">Phân Tích</span>
          <span className="hidden sm:inline">Phân Tích Đệm & Nghỉ Ngơi</span>
        </button>
      </div>
    </header>
  );
};

