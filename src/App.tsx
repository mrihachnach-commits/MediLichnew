import React, { useState, useEffect } from 'react';
import { ScheduleEvent, ChatMessage, PriorityLevel, EventCategory, AppSettings, DEFAULT_APP_SETTINGS, HistoryEntry } from './types';
import { INITIAL_EVENTS } from './data/initialData';
import { Navbar } from './components/Navbar';
import { CalendarView } from './components/CalendarView';
import { EisenhowerMatrix } from './components/EisenhowerMatrix';
import { SmartAnalytics } from './components/SmartAnalytics';
import { ChatbotWidget } from './components/ChatbotWidget';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { processChatRequest } from './lib/aiService';
import { 
  subscribeToEvents,
  subscribeToSettings,
  createEvent, 
  updateEvent as fsUpdateEvent, 
  deleteEvent as fsDeleteEvent, 
  saveUserSettings,
  getUserDoc,
  markUserSeeded
} from './lib/firestoreUtils';

export default function App() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'matrix' | 'analytics'>('calendar');
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>([]);

  const addToHistory = (type: HistoryEntry['actionType'], description: string) => {
    const newEntry: HistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      actionType: type,
      description,
      snapshot: [...events]
    };
    setHistoryStack(prev => [newEntry, ...prev].slice(0, 50));
  };

  const handleUndo = async (steps: number = 1) => {
    if (historyStack.length === 0) return;
    
    const targetIndex = steps - 1;
    if (targetIndex < 0 || targetIndex >= historyStack.length) return;
    
    const snapshot = historyStack[targetIndex].snapshot;
    
    // Sync back to Firestore in real-time
    if (user) {
      try {
        const snapshotIds = new Set(snapshot.map(e => e.id));
        const currentIds = new Set(events.map(e => e.id));
        
        // 1. Delete events added since snapshot
        const addedEvents = events.filter(e => !snapshotIds.has(e.id));
        for (const e of addedEvents) {
          await fsDeleteEvent(user.uid, e.id);
        }
        
        // 2. Re-create events deleted since snapshot
        const deletedEvents = snapshot.filter(e => !currentIds.has(e.id));
        for (const e of deletedEvents) {
          await createEvent(user.uid, e);
        }
        
        // 3. Restore events modified since snapshot
        const commonEvents = snapshot.filter(e => currentIds.has(e.id));
        for (const orig of commonEvents) {
          const curr = events.find(e => e.id === orig.id);
          if (curr && JSON.stringify(orig) !== JSON.stringify(curr)) {
            await fsUpdateEvent(user.uid, orig.id, orig);
          }
        }
      } catch (err) {
        console.error("Error syncing undo to Firestore:", err);
      }
    }
    
    setEvents(snapshot);
    setHistoryStack(prev => prev.slice(steps));
    addToHistory('undo', `Đã hoàn tác ${steps} bước`);
  };
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Xin chào Bác sĩ! Em là Trợ lý AI Quản lý Lịch & Công việc Chuyên biệt. Bác sĩ cần em thêm, dời lịch hay sắp xếp công việc ưu tiên Eisenhower không ạ?`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleResetChat = () => {
    setChatMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `Xin chào Bác sĩ! Em đã khởi động lại phiên trò chuyện. Bác sĩ cần em thêm, dời lịch hay sắp xếp công việc ưu tiên Eisenhower không ạ?`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const [currentBaseDate, setCurrentBaseDate] = useState<string>('2026-08-10');

  // Real-time synchronization with Firestore for Events & Settings
  useEffect(() => {
    if (!user) return;

    let isSeeding = false;

    // Real-time listener for user's schedule events
    const unsubscribeEvents = subscribeToEvents(user.uid, async (fsEvents) => {
      if (fsEvents && fsEvents.length > 0) {
        setEvents(fsEvents as ScheduleEvent[]);
      } else if (!isSeeding) {
        isSeeding = true;
        try {
          const userDoc = await getUserDoc(user.uid);
          if (!userDoc?.hasBeenSeeded) {
            for (const event of INITIAL_EVENTS) {
              await createEvent(user.uid, event);
            }
            await markUserSeeded(user.uid);
          } else {
            setEvents([]);
          }
        } catch (err) {
          console.error("Error seeding default events to Firestore:", err);
        }
      }
    });

    // Real-time listener for user settings
    const unsubscribeSettings = subscribeToSettings(user.uid, (fsSettings) => {
      if (fsSettings) {
        setSettings(fsSettings);
      } else {
        saveUserSettings(user.uid, DEFAULT_APP_SETTINGS);
      }
    });

    return () => {
      unsubscribeEvents();
      unsubscribeSettings();
    };
  }, [user]);

  // Web Speech API Voice Recognition
  useEffect(() => {
    let recognition: any = null;
    if (isVoiceActive) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) handleSendMessage(transcript);
          setIsVoiceActive(false);
        };
        recognition.onerror = () => setIsVoiceActive(false);
        recognition.onend = () => setIsVoiceActive(false);
        recognition.start();
      } else {
        alert('Trình duyệt không hỗ trợ nhận diện giọng nói!');
        setIsVoiceActive(false);
      }
    }
    return () => recognition?.abort();
  }, [isVoiceActive]);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (user) {
      await saveUserSettings(user.uid, newSettings);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Handle Add Event
  const handleAddEvent = async (newEventData: Partial<ScheduleEvent>) => {
    if (user) {
      const created = await createEvent(user.uid, newEventData);
      if (created) {
        addToHistory('add', `Đã thêm mới lịch hẹn: ${created.title}`);
        setEvents((prev) => {
          if (prev.some((e) => e.id === created.id)) return prev;
          return [...prev, created as ScheduleEvent];
        });
      }
    }
  };

  // Handle Update Event
  const handleUpdateEvent = async (id: string, updates: Partial<ScheduleEvent>) => {
    const target = events.find(e => e.id === id);
    if (target) {
      addToHistory('update', `Đã chỉnh sửa: ${target.title}`);
    }
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );

    if (user) {
      await fsUpdateEvent(user.uid, id, updates);
    }
  };

  // Handle Delete Event
  const handleDeleteEvent = async (id: string) => {
    const target = events.find(e => e.id === id);
    if (target) {
      addToHistory('delete', `Đã xóa: ${target.title}`);
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (user) {
      await fsDeleteEvent(user.uid, id);
    }
  };

  // Send Message to Gemini AI Assistant
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatOpen(true);
    setIsAiLoading(true);

    try {
      const data = await processChatRequest({
        message: text,
        history: chatMessages.slice(-6),
        systemInstruction: settings.systemInstruction,
        learnedPrompt: settings.learnedPrompt,
        learnedMemories: settings.learnedMemories,
        aiProvider: settings.aiProvider,
        aiModel: settings.aiModel,
        geminiApiKey: settings.geminiApiKey,
        shopaikeyApiKey: settings.shopaikeyApiKey,
        shopaikeyBaseUrl: settings.shopaikeyBaseUrl,
        currentEvents: events,
        currentBaseDate: currentBaseDate,
      });

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Em đã ghi nhận ý kiến của Bác sĩ.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        functionCalled: data.executedCall,
      };

      setChatMessages((prev) => [...prev, aiMsg]);

      // Update learned memories if returned
      if (data.updatedLearnedMemories && data.updatedLearnedMemories.length !== settings.learnedMemories?.length) {
        const newSettings = {
          ...settings,
          learnedMemories: data.updatedLearnedMemories,
          learnedPrompt: data.updatedLearnedPrompt || settings.learnedPrompt,
        };
        handleSaveSettings(newSettings);
      }

      // Handle function calling results locally
      if (data.executedCall && user) {
        const { name, args, result } = data.executedCall;
        console.log("AI Chatbot Executed Tool:", name, "args:", args, "result:", result);

        // Helper to remove Vietnamese tones for case-insensitive and accent-insensitive matching
        const removeVietnameseTones = (str: string): string => {
          if (!str) return '';
          return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase();
        };

        const matchesKeyword = (source: string, kw: string): boolean => {
          if (!kw) return false;
          return removeVietnameseTones(source).includes(removeVietnameseTones(kw));
        };
        
        if (name === 'tao_lich_hen') {
          // Normalizer for dates
          const normalizeDateStr = (dateStr: string, currentBaseDateStr: string): string => {
            if (!dateStr) return '';
            let normalized = dateStr.trim().replace(/\//g, '-');
            const dmyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
            const ymdPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
            const dmPattern = /^(\d{1,2})-(\d{1,2})$/;
            if (ymdPattern.test(normalized)) {
              const parts = normalized.split('-');
              return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
            if (dmyPattern.test(normalized)) {
              const parts = normalized.split('-');
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            if (dmPattern.test(normalized)) {
              const parts = normalized.split('-');
              const y = currentBaseDateStr.split('-')[0] || '2026';
              return `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            return dateStr;
          };

          const baseDateStr = currentBaseDate || '2026-08-10';
          let finalDate = args.date ? normalizeDateStr(args.date, baseDateStr) : '';
          let finalDayOfWeek = args.dayOfWeek !== undefined ? Number(args.dayOfWeek) : undefined;

          if (finalDate) {
            const parts = finalDate.split('-');
            const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            if (!isNaN(dateObj.getTime())) {
              finalDayOfWeek = dateObj.getDay();
            }
          } else if (finalDayOfWeek !== undefined) {
            const parts = baseDateStr.split('-');
            const baseDateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
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
            finalDate = '2026-08-11';
            finalDayOfWeek = 2;
          }

          // Robust reconstruction in case result.createdEvent is undefined
          const eventToCreate = result?.createdEvent || {
            id: `evt-${Date.now()}`,
            title: args.title || 'Lịch mới',
            category: args.category || 'hospital',
            categoryLabel: settings.categoryLabels[args.category as EventCategory] || args.category || 'Bệnh viện',
            priority: args.priority || 'P2',
            priorityName: settings.prioritySettings[args.priority as PriorityLevel]?.name || args.priority || 'Quan trọng (P2)',
            dayOfWeek: finalDayOfWeek,
            date: finalDate,
            startTime: args.startTime || '19:30',
            endTime: args.endTime || '21:30',
            location: args.location || 'Bệnh viện Nội tiết TƯ',
            description: args.description || 'Được tạo tự động bởi Trợ lý AI',
            bufferMinutes: args.bufferMinutes || 45,
            isIntervention: args.isIntervention || false,
            repeat: 'weekly',
            completed: false,
          };

          const newEvent = { ...eventToCreate, userId: user.uid };
          const created = await createEvent(user.uid, newEvent);
          if (created) {
            addToHistory('add', `Chatbot đã thêm lịch: ${created.title}`);
            setEvents(prev => {
              if (prev.some(e => e.id === created.id)) return prev;
              return [...prev, created as ScheduleEvent];
            });
          }
        } else if (name === 'dieu_chinh_lich_hen') {
          const kw = (args.titleKeyword || '').toLowerCase();
          const targetEvtId = args.eventId;
          const toUpdate = events.filter((e) =>
            (targetEvtId && e.id === targetEvtId) || (kw && matchesKeyword(e.title, kw))
          );

          for (const evt of toUpdate) {
            const updates: Partial<ScheduleEvent> = {};
            if (args.newTitle) updates.title = args.newTitle;
            if (args.newDate) updates.date = args.newDate;
            if (args.newDayOfWeek !== undefined) updates.dayOfWeek = Number(args.newDayOfWeek);
            if (args.newStartTime) updates.startTime = args.newStartTime;
            if (args.newEndTime) updates.endTime = args.newEndTime;
            if (args.newLocation) updates.location = args.newLocation;
            if (args.newPriority) {
              updates.priority = args.newPriority;
              updates.priorityName = settings.prioritySettings[args.newPriority as PriorityLevel]?.name || args.newPriority;
            }
            if (args.newCategory) {
              updates.category = args.newCategory;
              updates.categoryLabel = settings.categoryLabels[args.newCategory as EventCategory] || args.newCategory;
            }
            if (args.newDescription) updates.description = args.newDescription;

            await handleUpdateEvent(evt.id, updates);
          }
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

          const sourceEvents = events.filter((evt) => {
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
              if (!matchesKeyword(evt.title, titleKw)) return false;
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

          for (const tDate of targetDates) {
            const tDayOfWeek = getDayOfWeekFromDate(tDate);
            for (const sEvt of sourceEvents) {
              const newCloned: ScheduleEvent = {
                ...sEvt,
                id: `evt-copy-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                date: tDate,
                dayOfWeek: tDayOfWeek,
              };
              await handleAddEvent(newCloned);
            }
          }
          addToHistory('copy', `Chatbot đã sao chép ${sourceEvents.length} công việc sang ${targetDates.length} ngày`);
        } else if (name === 'xoa_lich_hen') {
          const kw = (args.titleKeyword || '').toLowerCase();
          const toDelete = events.filter(e => matchesKeyword(e.title, kw));
          for (const evt of toDelete) {
            await handleDeleteEvent(evt.id);
          }
        } else if (name === 'hoan_tac_thao_tac') {
          await handleUndo(args.steps || 1);
        } else if (name === 'cap_nhat_uu_tien') {
          const kw = (args.eventTitleKeyword || '').toLowerCase();
          const priority = args.newPriority;
          const toUpdate = events.filter(e => matchesKeyword(e.title, kw));
          for (const evt of toUpdate) {
            await handleUpdateEvent(evt.id, { priority, priorityName: priority });
          }
        } else if (name === 'ghi_nho_thoi_quen') {
          const memory = args.memoryText || args.habitDescription || '';
          if (memory) {
            const updatedMemories = [memory, ...(settings.learnedMemories || [])];
            const newSettings = {
              ...settings,
              learnedMemories: updatedMemories,
              learnedPrompt: updatedMemories.map(m => `- ${m}`).join('\n')
            };
            handleSaveSettings(newSettings);
          }
        }
      }

    } catch (err) {
      console.error('Chat error', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Web Speech API Voice Recognition (Removed Duplicate)
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        isVoiceActive={isVoiceActive}
        onToggleVoice={() => setIsVoiceActive((prev) => !prev)}
        historyCount={historyStack.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onUndo={() => handleUndo(1)}
      />

      {/* Main Body with Split View Layout when Chat is Open */}
      <div className="flex-1 flex relative w-full overflow-x-hidden">
        {/* Mobile & Tablet backdrop when chat is open */}
        {isChatOpen && (
          <div
            onClick={() => setIsChatOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs xl:hidden z-40 transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Main Web Content - Shrinks/shifts to the left only on extra-large desktop when AI assistant is open */}
        <div
          className={`flex-1 transition-all duration-300 ease-in-out min-w-0 flex flex-col ${
            isChatOpen ? 'mr-0 xl:mr-[420px]' : 'mr-0'
          }`}
        >
          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            {activeTab === 'calendar' && (
              <CalendarView
                events={events}
                settings={settings}
                onAddEvent={handleAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                onQuickAskAI={(prompt) => handleSendMessage(prompt)}
                onBaseDateChange={(date) => {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  const dd = String(date.getDate()).padStart(2, '0');
                  setCurrentBaseDate(`${yyyy}-${mm}-${dd}`);
                }}
              />
            )}

            {activeTab === 'matrix' && (
              <EisenhowerMatrix
                events={events}
                settings={settings}
                onUpdatePriority={(id, newPriority) => handleUpdateEvent(id, { priority: newPriority })}
                onToggleComplete={(id, completed) => handleUpdateEvent(id, { completed })}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            )}

            {activeTab === 'analytics' && <SmartAnalytics events={events} settings={settings} />}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800/60 bg-[#0F172A]/80 py-4 px-6 text-center text-xs text-slate-400">
            <p>
              {settings.siteTitle} • {settings.doctorTitle} • {settings.hospitalName} • Quản lý Lịch & Ma trận Eisenhower
            </p>
          </footer>
        </div>

        {/* AI Assistant Chatbot Panel - Positioned on the Right Side */}
        <ChatbotWidget
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onReset={handleResetChat}
          isLoading={isAiLoading}
          isVoiceActive={isVoiceActive}
          onToggleVoice={() => setIsVoiceActive((prev) => !prev)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          learnedMemoriesCount={settings.learnedMemories?.length || 5}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
      
      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyStack={historyStack}
        onUndo={handleUndo}
        onClearHistory={() => setHistoryStack([])}
      />
    </div>
  );
}

