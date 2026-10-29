import React, { useState } from 'react';
import { 
  Send, 
  MessageSquare, 
  Truck, 
  Wrench, 
  UserCheck, 
  SlidersHorizontal, 
  Radio, 
  Bell, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { TelegramMessage, TelegramRole, Incident, CompensationOption } from '../types';

interface TelegramBotPanelProps {
  messages: TelegramMessage[];
  activeRole: TelegramRole;
  onSelectRole: (role: TelegramRole) => void;
  activeIncidents: Incident[];
  onSendMessage: (role: TelegramRole, text: string) => void;
  onMechanicDecision: (incidentId: string, decision: 'roadside_repair' | 'evacuate_heavy') => void;
  onDispatcherChooseOption: (incidentId: string, optionId: string) => void;
  onChiefReallocateMechanic: (fromBaseId: string, toBaseId: string, mechanicId: string) => void;
}

export const TelegramBotPanel: React.FC<TelegramBotPanelProps> = ({
  messages,
  activeRole,
  onSelectRole,
  activeIncidents,
  onSendMessage,
  onMechanicDecision,
  onDispatcherChooseOption,
  onChiefReallocateMechanic,
}) => {
  const [inputText, setInputText] = useState('');

  // Filter messages for current role or general notifications
  const roleMessages = messages.filter((m) => m.role === activeRole || m.role === 'general_chat');

  // Count pending unread alerts per role
  const pendingTriageCount = activeIncidents.filter((i) => i.status === 'new_reported').length;
  const pendingCompensationCount = activeIncidents.filter((i) => i.status === 'evacuating_to_base').length;

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(activeRole, inputText.trim());
    setInputText('');
  };

  const rolesConfig: { id: TelegramRole; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dispatcher', label: 'Диспетчер', icon: <SlidersHorizontal className="w-3.5 h-3.5" />, badge: pendingCompensationCount },
    { id: 'linear_mechanic', label: 'Линейный мех.', icon: <Wrench className="w-3.5 h-3.5" />, badge: pendingTriageCount },
    { id: 'chief_mechanic', label: 'Главный мех.', icon: <UserCheck className="w-3.5 h-3.5" /> },
    { id: 'driver', label: 'Водитель / Патруль', icon: <Truck className="w-3.5 h-3.5" /> },
    { id: 'general_chat', label: 'Чат объекта', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-[#17212b] border border-slate-800 rounded-xl flex flex-col h-[760px] shadow-2xl overflow-hidden">
      {/* Telegram Header */}
      <div className="bg-[#242f3d] px-4 py-3 border-b border-[#1f2936] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#2AABEE] flex items-center justify-center font-bold text-white shadow-md">
            🤖
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Автодор-Бот (Контур М-12)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-[11px] text-slate-400">
              {activeRole === 'dispatcher' && 'Кабинет Диспетчера проекта'}
              {activeRole === 'linear_mechanic' && 'Линейный механик (дефектовка и приемка)'}
              {activeRole === 'chief_mechanic' && 'Главный механик (управление базами 74/130)'}
              {activeRole === 'driver' && 'Бортовой терминал: Водитель / Патруль'}
              {activeRole === 'general_chat' && 'Групповой чат проекта (Сводки для прорабов)'}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-[#2AABEE] bg-[#1e2c3a] px-2 py-1 rounded border border-[#2b3c4e]">
          v2.4 Online
        </div>
      </div>

      {/* Role Switcher Tabs (Telegram Channels) */}
      <div className="bg-[#0e1621] px-2 py-1.5 border-b border-[#17212b] flex items-center gap-1 overflow-x-auto select-none shrink-0">
        {rolesConfig.map((r) => {
          const isActive = activeRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRole(r.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 relative ${
                isActive
                  ? 'bg-[#2b5278] text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#182533]'
              }`}
            >
              {r.icon}
              <span>{r.label}</span>
              {r.badge !== undefined && r.badge > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-mono flex items-center justify-center font-bold animate-pulse">
                  {r.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0e1621]">
        {roleMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs p-6">
            <MessageSquare className="w-8 h-8 mb-2 text-slate-600" />
            <p>Нет сообщений в данном канале.</p>
            <p className="mt-1 text-[11px] text-slate-600">
              Используйте быстрые действия внизу или запустите демо-сценарий.
            </p>
          </div>
        ) : (
          roleMessages.map((msg) => (
            <div key={msg.id} className="space-y-1.5">
              {/* Message Header info */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
                <span className="text-amber-400 font-semibold">{msg.sender} · {msg.senderRoleLabel}</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Bubble Body */}
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed text-slate-100 max-w-[95%] shadow-md ${
                  msg.type === 'alert'
                    ? 'bg-rose-950/80 border border-rose-700/80 text-rose-100'
                    : msg.type === 'card'
                    ? 'bg-[#182533] border border-[#2b5278]'
                    : 'bg-[#182533] border border-[#202b36]'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Inline Action Keyboards */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                    {msg.actions.map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (act.actionKey === 'mechanic_roadside' && msg.incidentId) {
                            onMechanicDecision(msg.incidentId, 'roadside_repair');
                          } else if (act.actionKey === 'mechanic_evacuate' && msg.incidentId) {
                            onMechanicDecision(msg.incidentId, 'evacuate_heavy');
                          } else if (act.actionKey === 'dispatcher_pick_option' && msg.incidentId && act.payload?.optionId) {
                            onDispatcherChooseOption(msg.incidentId, act.payload.optionId);
                          } else if (act.actionKey === 'chief_reallocate' && act.payload) {
                            onChiefReallocateMechanic(act.payload.fromBaseId, act.payload.toBaseId, act.payload.mechanicId);
                          }
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-left transition-all flex items-center justify-between shadow-sm ${
                          act.danger
                            ? 'bg-red-600/90 hover:bg-red-500 text-white'
                            : act.primary
                            ? 'bg-[#2AABEE] hover:bg-[#229ed9] text-white'
                            : 'bg-[#242f3d] hover:bg-[#2c3848] text-slate-200 border border-slate-700'
                        }`}
                      >
                        <span>{act.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Role-Specific Quick Action Keyboard Dock */}
      <div className="bg-[#17212b] border-t border-[#202b36] p-2.5 space-y-2 shrink-0">
        {/* Driver / Patrol Shortcuts */}
        {activeRole === 'driver' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onSendMessage('driver', '🚨 Водитель самосвала КАМАЗ №402 (ПК 45): Пропала тяга двигателя, резкий скрежет в КПП. Стою на обочине.');
              }}
              className="py-1.5 px-2 bg-[#242f3d] hover:bg-[#2e3b4d] text-slate-200 rounded text-[11px] font-medium border border-slate-700 text-left truncate"
            >
              🔴 Сигнал: Поломка КАМАЗ №402 (ПК 45)
            </button>
            <button
              onClick={() => {
                onSendMessage('driver', '📻 Патрульный экипаж-2: Обнаружен SHACMAN №502 в слепой зоне на ПК 92. Вытек тосол, заклинило мост. Водитель ждет буксир.');
              }}
              className="py-1.5 px-2 bg-[#242f3d] hover:bg-[#2e3b4d] text-slate-200 rounded text-[11px] font-medium border border-slate-700 text-left truncate"
            >
              📻 Доклад патруля из слепой зоны (ПК 92)
            </button>
          </div>
        )}

        {/* Linear Mechanic Shortcuts */}
        {activeRole === 'linear_mechanic' && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Дефектовка поломок: легкие чинятся на линии, тяжелые — только на 74/130 км.</span>
          </div>
        )}

        {/* Chief Mechanic Shortcuts */}
        {activeRole === 'chief_mechanic' && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Контроль постов ремонта. Лимит: не более 2 машин на 1 мастера.</span>
          </div>
        )}

        {/* Dispatcher Shortcuts */}
        {activeRole === 'dispatcher' && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Выбор компенсаций простоя: резерв баз, донорство, тралы для экскаваторов.</span>
          </div>
        )}

        {/* Text Input Row */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Сообщение в бот от роли «${rolesConfig.find(r => r.id === activeRole)?.label}»...`}
            className="flex-1 bg-[#0e1621] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#2AABEE]"
          />
          <button
            onClick={handleSend}
            className="p-2 rounded-lg bg-[#2AABEE] hover:bg-[#229ed9] text-white transition-colors shrink-0 shadow"
            title="Отправить сообщение"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
