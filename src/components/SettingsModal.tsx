import React, { useState } from 'react';
import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  DEFAULT_DOCTOR_SYSTEM_INSTRUCTION,
  DEFAULT_LEARNED_MEMORIES,
  EventCategory,
  PriorityLevel,
} from '../types';
import {
  Sliders,
  Save,
  RotateCcw,
  X,
  Building2,
  User,
  Tag,
  ShieldAlert,
  Check,
  Bot,
  Brain,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { AVAILABLE_COLORS } from './CalendarView';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  if (!isOpen) return null;

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const slug = 'cat_' + Date.now();
    setFormData({
      ...formData,
      categoryLabels: {
        ...(formData.categoryLabels || {}),
        [slug]: newCategoryName.trim(),
      },
    });
    setNewCategoryName('');
  };

  const handleUpdateCategoryLabel = (key: string, label: string) => {
    setFormData({
      ...formData,
      categoryLabels: {
        ...(formData.categoryLabels || {}),
        [key]: label,
      },
    });
  };

  const handleUpdateCategoryColor = (key: string, color: string) => {
    setFormData({
      ...formData,
      categoryColors: {
        ...(formData.categoryColors || {}),
        [key]: color,
      },
    });
  };

  const handleDeleteCategory = (key: string) => {
    const updated = { ...(formData.categoryLabels || {}) };
    delete updated[key];
    
    const updatedColors = { ...(formData.categoryColors || {}) };
    delete updatedColors[key];
    
    setFormData({
      ...formData,
      categoryLabels: updated,
      categoryColors: updatedColors,
    });
  };

  const handleResetCategories = () => {
    setFormData({
      ...formData,
      categoryLabels: DEFAULT_APP_SETTINGS.categoryLabels,
    });
  };

  const currentMemories = formData.learnedMemories || DEFAULT_LEARNED_MEMORIES;

  const handleAddMemory = () => {
    if (!newMemoryInput.trim()) return;
    const updated = [newMemoryInput.trim(), ...currentMemories];
    setFormData({
      ...formData,
      learnedMemories: updated,
      learnedPrompt: updated.map((m) => `- ${m}`).join('\n'),
    });
    setNewMemoryInput('');
  };

  const handleDeleteMemory = (index: number) => {
    const updated = currentMemories.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      learnedMemories: updated,
      learnedPrompt: updated.map((m) => `- ${m}`).join('\n'),
    });
  };

  const handleResetMemories = () => {
    setFormData({
      ...formData,
      learnedMemories: DEFAULT_LEARNED_MEMORIES,
      learnedPrompt: DEFAULT_LEARNED_MEMORIES.map((m) => `- ${m}`).join('\n'),
    });
  };

  const handleReset = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục lại cài đặt mặc định ban đầu không?')) {
      setFormData(DEFAULT_APP_SETTINGS);
      onSaveSettings(DEFAULT_APP_SETTINGS);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl w-full max-w-2xl p-5 md:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-950/90 border border-indigo-800/80 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base md:text-lg">
                Cài Đặt Hệ Thống & Tùy Chỉnh Tên Nhãn
              </h3>
              <p className="text-xs text-slate-400">
                Chỉnh sửa tên ứng dụng, tên bệnh viện, nhãn phân nhóm, mức ưu tiên P1-P4
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5 flex-1 overflow-y-auto pr-1 text-xs scrollbar-thin">
          {/* SECTION 1: Thông tin thương hiệu & Website */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 text-indigo-300">
              <Building2 className="w-4 h-4 text-indigo-400" />
              1. Tên Website & Thông Tin Đơn Vị
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tên Website / Ứng Dụng</label>
                <input
                  type="text"
                  required
                  value={formData.siteTitle}
                  onChange={(e) => setFormData({ ...formData, siteTitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Xưng Danh Bác Sĩ / Người Dùng</label>
                <input
                  type="text"
                  required
                  value={formData.doctorTitle}
                  onChange={(e) => setFormData({ ...formData, doctorTitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tên Bệnh Viện / Đơn Vị Công Tác</label>
                <input
                  type="text"
                  required
                  value={formData.hospitalName}
                  onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Thời Gian Đệm Mặc Định (Phút)</label>
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={formData.defaultBufferMinutes}
                  onChange={(e) => setFormData({ ...formData, defaultBufferMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Mô Tả Tiêu Đề Phụ</label>
              <input
                type="text"
                value={formData.appDescription}
                onChange={(e) => setFormData({ ...formData, appDescription: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Domain / URL Website Tùy Chỉnh</label>
              <input
                type="text"
                placeholder="https://medilich.vercel.app"
                value={formData.appDomain || 'https://medilich.vercel.app'}
                onChange={(e) => setFormData({ ...formData, appDomain: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div>
              <label className="block text-slate-300 font-medium mb-1">Email Nhận Tóm Tắt Lịch (Configured Email)</label>
              <input
                type="email"
                placeholder="bacsi@gmail.com"
                value={formData.notificationEmail || ''}
                onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="border-t border-slate-800/60 pt-3 space-y-3 col-span-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Cài đặt Email SMTP (Tùy chọn - Để gửi mail thật)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={formData.smtpHost || ''}
                    onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">SMTP Port</label>
                  <input
                    type="number"
                    placeholder="587"
                    value={formData.smtpPort !== undefined ? formData.smtpPort : ''}
                    onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">SMTP Username (Email)</label>
                  <input
                    type="text"
                    placeholder="example@gmail.com"
                    value={formData.smtpUser || ''}
                    onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">SMTP Password / App Password</label>
                  <input
                    type="password"
                    placeholder="Mật khẩu ứng dụng"
                    value={formData.smtpPass || ''}
                    onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1.5: Cấu Hình API Trợ Lý AI */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 text-indigo-300">
              <Bot className="w-4 h-4 text-indigo-400" />
              Cấu Hình Nguồn API Trợ Lý AI
            </h4>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="aiProvider"
                  value="gemini"
                  checked={formData.aiProvider === 'gemini'}
                  onChange={() => setFormData({ ...formData, aiProvider: 'gemini' })}
                  className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-800 focus:ring-indigo-500"
                />
                Google Gemini API
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="aiProvider"
                  value="shopaikey"
                  checked={formData.aiProvider === 'shopaikey'}
                  onChange={() => setFormData({ ...formData, aiProvider: 'shopaikey' })}
                  className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-800 focus:ring-indigo-500"
                />
                ShopAIKey API
              </label>
            </div>

            {formData.aiProvider === 'gemini' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1">Google Gemini API Key</label>
                <input
                  type="password"
                  placeholder="AIza..."
                  value={formData.geminiApiKey || ''}
                  onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
              </div>
            )}

            {formData.aiProvider === 'shopaikey' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">ShopAIKey API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={formData.shopaikeyApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, shopaikeyApiKey: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">API Base URL</label>
                  <input
                    type="text"
                    placeholder="https://api.shopaikey.com/v1"
                    value={formData.shopaikeyBaseUrl || ''}
                    onChange={(e) => setFormData({ ...formData, shopaikeyBaseUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">Tên Model AI</label>
              <input
                type="text"
                placeholder="gemini-1.5-flash"
                value={formData.aiModel || ''}
                onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-500 mt-1">Gợi ý: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash</p>
            </div>
          </div>

          {/* SECTION 2: Tùy Chỉnh Danh Mục Công Việc (Categories Dynamic) */}
          <div className="space-y-3.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 text-indigo-300">
                  <Tag className="w-4 h-4 text-indigo-400" />
                  2. Tùy Chỉnh Danh Mục Công Việc (Categories)
                </h4>
                <span className="bg-indigo-950 text-indigo-300 border border-indigo-800/80 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {Object.keys(formData.categoryLabels || {}).length} Danh Mục
                </span>
              </div>

              <button
                type="button"
                onClick={handleResetCategories}
                className="text-[10px] text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                title="Khôi phục danh mục mặc định ban đầu"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset Mặc Định</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Bác sĩ có thể tự do thêm danh mục mới, chỉnh sửa tên hoặc xóa bớt danh mục theo nhu cầu công việc thực tế.
            </p>

            {/* Form Add New Category */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                placeholder="Nhập tên danh mục mới muốn thêm (VD: Nghiên cứu khoa học, Hội thảo)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 shrink-0 transition-all shadow-md shadow-indigo-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Mới</span>
              </button>
            </div>

            {/* Category Items List */}
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {Object.entries(formData.categoryLabels || {}).map(([catKey, catLabel]) => {
                const currentColor = formData.categoryColors?.[catKey] || 'indigo';
                const currentTheme = AVAILABLE_COLORS[currentColor] || AVAILABLE_COLORS['indigo'];
                
                return (
                  <div
                    key={catKey}
                    className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl focus-within:border-indigo-500/80 transition-all"
                  >
                    <div className="relative">
                      <select
                        value={currentColor}
                        onChange={(e) => handleUpdateCategoryColor(catKey, e.target.value)}
                        className={`appearance-none w-6 h-6 rounded-full cursor-pointer border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 focus:ring-indigo-500 ${currentTheme.dotBg} border-slate-800`}
                        title="Chọn màu"
                        style={{ color: 'transparent' }}
                      >
                        {Object.keys(AVAILABLE_COLORS).map(colorKey => (
                          <option key={colorKey} value={colorKey} className="text-black bg-white">
                            {colorKey}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <input
                      type="text"
                      value={catLabel}
                      onChange={(e) => handleUpdateCategoryLabel(catKey, e.target.value)}
                      className="flex-1 bg-transparent text-slate-100 text-xs font-medium focus:outline-none px-1"
                      placeholder="Tên danh mục..."
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(catKey)}
                      className="text-slate-500 hover:text-rose-400 p-1 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                      title="Xóa danh mục này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Tùy Chỉnh Ma Trận Ưu Tiên P1 - P4 */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 text-indigo-300">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              3. Tùy Chỉnh Tiêu Đề Ma Trận Ưu Tiên Eisenhower (P1 - P4)
            </h4>

            {(['P1', 'P2', 'P3', 'P4'] as PriorityLevel[]).map((pKey) => {
              const item = formData.prioritySettings[pKey];
              const badgeColors = {
                P1: 'bg-rose-950 text-rose-300 border-rose-800',
                P2: 'bg-purple-950 text-purple-300 border-purple-800',
                P3: 'bg-slate-800 text-slate-300 border-slate-700',
                P4: 'bg-amber-950 text-amber-300 border-amber-800',
              };

              return (
                <div key={pKey} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColors[pKey]}`}>
                      {pKey}
                    </span>
                    <span className="font-bold text-slate-200 text-xs">Chỉnh sửa {pKey}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Tên hiển thị {pKey}</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            prioritySettings: {
                              ...formData.prioritySettings,
                              [pKey]: { ...item, name: e.target.value },
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Mô tả phụ {pKey}</label>
                      <input
                        type="text"
                        value={item.subtitle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            prioritySettings: {
                              ...formData.prioritySettings,
                              [pKey]: { ...item, subtitle: e.target.value },
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECTION 4: System Instruction - Prompt Chính Dành Cho Gemini AI Assistant */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-indigo-900/60">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 text-indigo-300">
                <Bot className="w-4 h-4 text-indigo-400" />
                4. Prompt Chính (System Instruction Chuyên Môn Ban Đầu)
              </h4>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    systemInstruction: DEFAULT_DOCTOR_SYSTEM_INSTRUCTION,
                  })
                }
                className="text-[10px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ml-auto"
                title="Khôi phục câu lệnh chỉ dẫn hệ thống ban đầu"
              >
                <RotateCcw className="w-3 h-3 text-indigo-400" />
                <span>Reset Prompt Chính</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Đây là câu lệnh chỉ dẫn quy định vai trò chuyên môn, phong cách xưng hô (xưng "Em", gọi "Bác sĩ"), quy tắc Eisenhower và logic gọi hàm tự động.
            </p>

            <div>
              <textarea
                rows={7}
                value={formData.systemInstruction ?? DEFAULT_DOCTOR_SYSTEM_INSTRUCTION}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    systemInstruction: e.target.value,
                  })
                }
                placeholder="Nhập chỉ dẫn hệ thống chính (System Instruction) cho AI Assistant..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
              />
            </div>
          </div>

          {/* SECTION 5: Prompt Phụ - Bộ Nhớ Ký Ức AI Tự Học & Tổng Hợp Tự Động */}
          <div className="space-y-3.5 bg-slate-950/60 p-3.5 rounded-xl border border-purple-900/60">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 text-purple-300">
                  <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                  5. Prompt Phụ (Ký Ức AI Tự Học & Tổng Hợp Tự Động Từ Hội Thoại)
                </h4>
                <span className="bg-purple-950 text-purple-300 border border-purple-800/80 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  {currentMemories.length} Ký Ức Tích Lũy
                </span>
              </div>

              <button
                type="button"
                onClick={handleResetMemories}
                className="text-[10px] text-purple-300 hover:text-purple-200 bg-purple-950/80 hover:bg-purple-900 border border-purple-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ml-auto"
                title="Khôi phục danh sách ký ước tự học về mặc định ban đầu"
              >
                <RotateCcw className="w-3 h-3 text-purple-400" />
                <span>Mẫu Ký Ức Ban Đầu</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Khi Bác sĩ yêu cầu ghi nhớ hoặc lưu lại thói quen (VD: <i>"Hãy ghi nhớ giờ làm việc của anh là 7h30 - 12h..."</i>), AI sẽ phân tích và bổ sung vào <b>Prompt Phụ</b> bên dưới để ghi nhận cho các lần trao đổi tiếp theo.
            </p>

            {/* Manual Add New Memory Form */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMemoryInput}
                onChange={(e) => setNewMemoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMemory();
                  }
                }}
                placeholder="Nhập thói quen hoặc khung giờ mới (VD: Làm việc tại bv thời gian là 7h30-12h và chiều là 13h30-16h30)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={handleAddMemory}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shrink-0 transition-all shadow-md shadow-purple-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Ký Ức</span>
              </button>
            </div>

            {/* List of active learned memories */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {currentMemories.length === 0 ? (
                <div className="p-3 text-center text-slate-500 text-xs italic bg-slate-900/50 rounded-xl border border-slate-800">
                  Chưa có ký ước tự học nào. Bạn có thể tự thêm hoặc nhắn tin với Chatbot AI để tự động tích lũy!
                </div>
              ) : (
                currentMemories.map((mem, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-800/80 flex items-start justify-between gap-2 transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 mt-1 shrink-0"></span>
                      <span className="text-slate-200 text-xs font-medium leading-relaxed">{mem}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                      title="Xóa ký ước này khỏi Prompt Phụ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Editable Full Prompt Phụ Textarea */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-purple-300 mb-1">
                Xem & Chỉnh sửa Văn bản Prompt Phụ Đầy Đủ (Dynamic Learned System Context):
              </label>
              <textarea
                rows={4}
                value={
                  formData.learnedPrompt ||
                  currentMemories.map((m) => `- ${m}`).join('\n')
                }
                onChange={(e) => {
                  const val = e.target.value;
                  const lines = val
                    .split('\n')
                    .map((l) => l.replace(/^- /, '').trim())
                    .filter(Boolean);
                  setFormData({
                    ...formData,
                    learnedPrompt: val,
                    learnedMemories: lines,
                  });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-300 text-xs font-mono leading-relaxed focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-y"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi Phục Mặc Định</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Đóng
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Đã Lưu Cài Đặt!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Cài Đặt Tùy Chỉnh</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
