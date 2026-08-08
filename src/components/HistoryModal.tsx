import React from 'react';
import { HistoryEntry } from '../types';
import { X, RotateCcw, History, Trash2, Check, Clock, Calendar, ArrowLeft } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyStack: HistoryEntry[];
  onUndo: (steps?: number) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  historyStack,
  onUndo,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const getActionBadge = (actionType: HistoryEntry['actionType']) => {
    switch (actionType) {
      case 'add':
        return <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 text-[10px] px-2 py-0.5 rounded-md font-medium">Thêm mới</span>;
      case 'update':
        return <span className="bg-amber-950/90 text-amber-300 border border-amber-800/80 text-[10px] px-2 py-0.5 rounded-md font-medium">Đổi / Chỉnh sửa</span>;
      case 'delete':
        return <span className="bg-rose-950/90 text-rose-300 border border-rose-800/80 text-[10px] px-2 py-0.5 rounded-md font-medium">Xóa lịch</span>;
      case 'copy':
        return <span className="bg-teal-950/90 text-teal-300 border border-teal-800/80 text-[10px] px-2 py-0.5 rounded-md font-medium">Copy hàng loạt</span>;
      case 'batch':
        return <span className="bg-purple-950/90 text-purple-300 border border-purple-800/80 text-[10px] px-2 py-0.5 rounded-md font-medium">Đa tác vụ AI</span>;
      case 'undo':
        return <span className="bg-indigo-950/90 text-indigo-300 border border-indigo-800/80 text-[10px] px-2 py-0.5 rounded-md font-medium">Hoàn tác</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-medium">Thao tác</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0F172A] border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-950/90 border border-indigo-800/80 text-indigo-400 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Lịch Sử Chỉnh Sửa & Hoàn Tác</span>
                <span className="bg-indigo-950 text-indigo-300 text-xs px-2 py-0.5 rounded-full border border-indigo-800/80 font-mono">
                  {historyStack.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Xem lại các bước điều chỉnh và hoàn tác (Undo) theo thời gian</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => onUndo(1)}
            disabled={historyStack.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Hoàn tác 1 bước gần nhất</span>
          </button>

          {historyStack.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-transparent hover:border-rose-900/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa nhật ký</span>
            </button>
          )}
        </div>

        {/* History Item List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
          {historyStack.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-slate-700 opacity-60" />
              <p className="text-sm font-medium">Chưa có lịch sử thay đổi nào</p>
              <p className="text-xs text-slate-600">Khi Bác sĩ thêm, sửa, xóa hoặc dùng AI đổi lịch, nhật ký sẽ được tự động lưu lại ở đây.</p>
            </div>
          ) : (
            historyStack.map((item, index) => (
              <div
                key={item.id}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/90 rounded-xl p-3 flex items-start justify-between gap-3 transition-all group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(item.actionType)}
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {item.timestamp}
                    </span>
                    {index === 0 && (
                      <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800 font-bold uppercase">
                        Vừa xong
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-200 leading-snug">
                    {item.description}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    Snapshot: {item.snapshot.length} lịch hẹn
                  </p>
                </div>

                <button
                  onClick={() => onUndo(index + 1)}
                  className="bg-slate-800 hover:bg-indigo-600 hover:text-white border border-slate-700 text-indigo-300 text-xs px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 shadow-sm"
                  title={`Hoàn tác ngược lại ${index + 1} bước`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Trở về bước này</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Tự động lưu tới 50 trạng thái gần nhất</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-semibold transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
