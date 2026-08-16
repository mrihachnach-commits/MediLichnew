import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { ChatMessage } from '../types';
import { Sparkles, Send, Mic, MicOff, X, Bot, User, RotateCcw, CheckCircle2, Zap, Brain, RefreshCw } from 'lucide-react';

interface ChatbotWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  onOpenSettings?: () => void;
  onReset?: () => void;
  learnedMemoriesCount?: number;
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isLoading,
  isVoiceActive,
  onToggleVoice,
  onOpenSettings,
  onReset,
  learnedMemoriesCount = 5,
}) => {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleChipClick = (promptText: string) => {
    onSendMessage(promptText);
  };

  return (
    <div
      className={`fixed inset-y-0 right-0 w-full sm:w-[400px] lg:w-[420px] z-50 bg-[#0F172A] border-l border-slate-700/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
              <span>Trợ Lý MediSync AI</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h3>
            <p className="text-[11px] text-slate-400">Gemini 3.6 Flash • AI Adaptive Context</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onReset && (
            <button
              onClick={onReset}
              className="text-slate-400 hover:text-amber-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Reset Chat"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
              title="Mở Cài Đặt Prompt Phụ (Bộ Nhớ AI Tự Học)"
            >
              <Brain className="w-3 h-3 text-purple-400" />
              <span>Prompt Phụ ({learnedMemoriesCount})</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Thu gọn khung chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Suggested Doctor Prompt Chips */}
      <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1.5 text-xs shrink-0">
        <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Lệnh Nhanh:</span>
        <button
          onClick={() => handleChipClick('Hãy ghi nhớ thói quen: làm việc tại bv thời gian là 7h30-12h và chiều là 13h30-16h30')}
          className="bg-purple-950/90 hover:bg-purple-900 text-purple-200 px-2.5 py-1 rounded-full text-[11px] shrink-0 border border-purple-800/90 transition-all font-semibold flex items-center gap-1"
          title="Yêu cầu AI lưu thói quen làm việc vào Prompt Phụ"
        >
          <Brain className="w-3 h-3 text-purple-400" />
          Dạy AI: Giờ làm việc BV
        </button>
        <button
          onClick={() => handleChipClick('Thêm lịch học MRI tối T3 từ 19h30 đến 21h30')}
          className="bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2.5 py-1 rounded-full text-[11px] shrink-0 border border-slate-700/80 transition-all"
        >
          + Lịch học MRI T3
        </button>
        <button
          onClick={() => handleChipClick('Hoàn tác thao tác vừa thực hiện')}
          className="bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 px-2.5 py-1 rounded-full text-[11px] shrink-0 border border-amber-800/80 transition-all font-bold"
        >
          ↺ Hoàn tác vừa làm
        </button>
        <button
          onClick={() => handleChipClick('Copy công việc ngày 10/8 sang các ngày từ 11/8 đến 14/8')}
          className="bg-slate-800 hover:bg-slate-700 text-teal-300 px-2.5 py-1 rounded-full text-[11px] shrink-0 border border-slate-700/80 transition-all font-semibold"
        >
          📋 Copy 10/8 sang 11/8-14/8
        </button>
        <button
          onClick={() => handleChipClick('Đổi lịch học MRI từ tối T3 sang tối T5 từ 20:00 - 22:00')}
          className="bg-slate-800 hover:bg-slate-700 text-purple-300 px-2.5 py-1 rounded-full text-[11px] shrink-0 border border-slate-700/80 transition-all font-semibold"
        >
          🔄 Đổi lịch MRI sang T5
        </button>
        <button
          onClick={() => handleChipClick('Dời lịch siêu âm phòng 11 ngày 11/08 sang ngày 12/08 lúc 08h00')}
          className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2.5 py-1 rounded-full text-[11px] shrink-0 border border-slate-700/80 transition-all font-semibold"
        >
          📅 Dời Siêu âm sang 12/08
        </button>
        <button
          onClick={() => handleChipClick('Cảnh báo nếu lịch học chen vào tối nghỉ ngơi P4')}
          className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded-full text-[11px] shrink-0 border border-slate-700/80 transition-all"
        >
          Bảo vệ Nghỉ ngơi P4
        </button>
        <button
          onClick={() => handleChipClick('Xếp lịch ca can thiệp RFA giáp sáng T2 lúc 08h00')}
          className="bg-slate-800 hover:bg-slate-700 text-rose-300 px-2.5 py-1 rounded-full text-[11px] shrink-0 border border-slate-700/80 transition-all"
        >
          Ca RFA Giáp P1
        </button>
        <button
          onClick={() => handleChipClick('Đồng bộ tất cả lên Google Calendar và Outlook')}
          className="bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-full text-[11px] shrink-0 border border-slate-700/80 transition-all"
        >
          Đồng bộ Calendar
        </button>
      </div>

      {/* Chat History Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 shadow-md ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                ) : (
                  <div className="markdown-body leading-relaxed text-slate-100 text-xs space-y-1">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                )}

                {/* Render Function Calling Details if Executed */}
                {msg.functionCalled && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] bg-slate-950/90 p-2.5 rounded-xl border border-indigo-900/50 text-indigo-200 flex items-center justify-between gap-2 shadow-inner">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-200">
                          {msg.functionCalled.name === 'tao_lich_hen'
                            ? '⚡ Đã tự động tạo lịch hẹn'
                            : msg.functionCalled.name === 'dieu_chinh_lich_hen'
                            ? '📅 Đã điều chỉnh / dời lịch hẹn'
                            : msg.functionCalled.name === 'sao_chep_lich_hen'
                            ? '📋 Đã sao chép lịch đa tác vụ'
                            : msg.functionCalled.name === 'cap_nhat_uu_tien'
                            ? '✏️ Đã cập nhật mức ưu tiên'
                            : msg.functionCalled.name === 'xoa_lich_hen'
                            ? '🗑️ Đã xóa lịch thành công'
                            : msg.functionCalled.name === 'ghi_nho_thoi_quen'
                            ? '🧠 Đã lưu thói quen mới vào Prompt Phụ'
                            : '⚙️ Đã thực thi lệnh AI'}
                        </span>
                        {msg.functionCalled.args?.title && (
                          <span className="block text-[10px] text-indigo-300 font-mono truncate">
                            {msg.functionCalled.args.title}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Hoàn thành
                    </span>
                  </div>
                )}

                <span className={`block text-[10px] text-right ${isUser ? 'text-indigo-200/80' : 'text-slate-500'}`}>
                  {msg.timestamp}
                </span>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs p-2.5 bg-slate-900 rounded-xl w-max border border-slate-800">
            <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Trợ lý AI Gemini đang phân tích & thực thi...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Voice Status Alert */}
      {isVoiceActive && (
        <div className="bg-rose-950/90 border-t border-rose-800 px-4 py-2 flex items-center justify-between text-xs text-rose-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="font-semibold">Đang lắng nghe giọng nói Tiếng Việt...</span>
          </div>
          <button onClick={onToggleVoice} className="text-xs text-rose-300 underline font-bold">
            Tắt Mic
          </button>
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleVoice}
          className={`p-2.5 rounded-xl border transition-all ${
            isVoiceActive
              ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title="Nói tiếng Việt"
        >
          {isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-slate-400" />}
        </button>

        <input
          type="text"
          placeholder="Nhập yêu cầu bằng tiếng Việt (VD: Dời lịch học sang tối T5)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all shadow-md shadow-indigo-900/40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
