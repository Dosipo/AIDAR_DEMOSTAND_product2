import React from 'react';
import { Play, Sparkles, CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { DemoScenarioId } from '../types';

interface DemoScenariosDockProps {
  currentScenario: DemoScenarioId;
  onRunScenario: (scenarioId: DemoScenarioId) => void;
  slaRemainingSeconds?: number;
  slaEscalationLevel?: 'normal' | 'warn_6h' | 'critical_10h';
}

export const DemoScenariosDock: React.FC<DemoScenariosDockProps> = ({
  currentScenario,
  onRunScenario,
  slaRemainingSeconds,
  slaEscalationLevel,
}) => {
  const formatSlaTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const scenarios: {
    id: DemoScenarioId;
    title: string;
    badge: string;
    desc: string;
    kpi: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'scenario_1',
      title: 'Сценарий 1: Сотовая связь',
      badge: 'PRD 5.1 (SLA 5 мин)',
      desc: 'Поломка КАМАЗ №402 на ПК 45 -> Маршрутизация на 74 км -> Мгновенный расчет подмены диспетчеру.',
      kpi: 'Точность базы min(|45-74|, |45-130|) = 74 км. Время ответа < 30 сек.',
      icon: <Play className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: 'scenario_2',
      title: 'Сценарий 2: Слепая зона',
      badge: 'PRD 5.2 (SLA 12 часов)',
      desc: 'Поломка SHACMAN №502 в слепой зоне ПК 92 -> Доклад патрулем -> Таймер дедлайна 12 часов.',
      kpi: 'Контроль жесткого регламента 12ч при отсутствии доступной техники.',
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: 'scenario_3',
      title: 'Сценарий 3: Перегрузка базы',
      badge: 'PRD 5.3 (Балансировка)',
      desc: 'Перегрузка базы 74 км (очередь > 2 ед./мастера) -> Алерт Главному механику -> Передислокация мастера.',
      kpi: 'Балансировка 6 специалистов между базами при пиковых сходах.',
      icon: <Flame className="w-3.5 h-3.5 text-rose-400" />,
    },
    {
      id: 'free_simulation',
      title: 'Свободный режим (Песочница)',
      badge: 'Тест формул & логистики',
      desc: 'Моделирование поломок на любых пикетах 0–145 км, проверка правила трала (5 км) и колесного хода.',
      kpi: 'Проверка правил трала (≤5 км vs >5 км) и радиуса 100 км.',
      icon: <Sparkles className="w-3.5 h-3.5 text-blue-400" />,
    },
  ];

  return (
    <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-4 shadow-2xl flex flex-col gap-3">
      {/* SLA Countdown Header if active */}
      {slaRemainingSeconds !== undefined && slaRemainingSeconds > 0 && (
        <div
          className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            slaEscalationLevel === 'critical_10h'
              ? 'bg-red-950/90 border-red-600 text-white animate-pulse'
              : slaEscalationLevel === 'warn_6h'
              ? 'bg-amber-950/80 border-amber-600 text-amber-200'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span>Worst-Case SLA: Контроль регламентного дедлайна 12 часов (PRD 4.3)</span>
                {slaEscalationLevel === 'critical_10h' && (
                  <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded font-bold uppercase">
                    Эскалация руководству холдинга (прошло 10+ часов)
                  </span>
                )}
                {slaEscalationLevel === 'warn_6h' && (
                  <span className="text-[10px] bg-amber-600 text-slate-950 px-2 py-0.5 rounded font-bold uppercase">
                    Предупреждение диспетчеру (прошло 6+ часов)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Инцидент в слепой зоне сотовой связи без свободного резерва колесной техники
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-slate-400">Осталось времени до решения:</div>
              <div className="font-mono text-xl font-bold text-amber-400 tracking-wider tabular-nums">
                {formatSlaTime(slaRemainingSeconds)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scenarios Button Grid */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
            Интерактивный запуск сценариев PRD
          </span>
          <span className="text-[11px] text-slate-500">
            (нажмите для автоматического прохождения ключевых сценариев)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {scenarios.map((sc) => {
          const isActive = currentScenario === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => onRunScenario(sc.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between text-left group ${
                isActive
                  ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    {sc.icon}
                    <span>{sc.title}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                    {sc.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {sc.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 truncate max-w-[170px]" title={sc.kpi}>
                  {sc.kpi}
                </span>
                <span className={`font-semibold flex items-center gap-1 ${
                  isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'
                }`}>
                  {isActive ? 'Активен' : 'Запустить'}
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
