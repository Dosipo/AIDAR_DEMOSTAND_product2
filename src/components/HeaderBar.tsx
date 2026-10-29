import React from 'react';
import { ShieldAlert, Truck, Wrench, Users, RotateCcw, AlertTriangle, Clock } from 'lucide-react';
import { Incident } from '../types';

interface HeaderBarProps {
  activeIncidents: Incident[];
  totalVehicles: number;
  workingVehicles: number;
  totalWorksites: number;
  optimalWorksites: number;
  onOpenFleetDrawer: () => void;
  onOpenIncidentModal: () => void;
  onResetSimulation: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeIncidents,
  totalVehicles,
  workingVehicles,
  totalWorksites,
  optimalWorksites,
  onOpenFleetDrawer,
  onOpenIncidentModal,
  onResetSimulation,
}) => {
  const readinessPercent = Math.round((workingVehicles / totalVehicles) * 100);
  const activeSlaIncidents = activeIncidents.filter((i) => i.sla12hActive && i.status !== 'resolved');

  return (
    <header className="bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md px-6 py-3 sticky top-0 z-40">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/40">
            <Truck className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight uppercase">
                Трасса М-12 · Ситуационный центр диспетчеризации
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                ПК 0 – 145 км
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Холдинг «АвтодорСтрой»</span>
              <span>·</span>
              <span>Опорные базы тяжелого ремонта: ПК 74 и ПК 130</span>
              <span>·</span>
              <span>Ремонтная служба: 6 специалистов</span>
            </div>
          </div>
        </div>

        {/* High-Density Operational Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Readiness */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-400">Готовность парка:</span>
            <span className="font-mono font-bold text-sm text-emerald-400 tabular-nums">
              {readinessPercent}%
            </span>
            <span className="text-xs text-slate-500">
              ({workingVehicles}/{totalVehicles})
            </span>
          </div>

          {/* Links rhythm */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-400">Звенья в норме:</span>
            <span
              className={`font-mono font-bold text-sm tabular-nums ${
                optimalWorksites === totalWorksites ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {optimalWorksites}/{totalWorksites}
            </span>
          </div>

          {/* Active Incidents */}
          <div
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
              activeIncidents.length > 0
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="text-xs">Инциденты:</span>
            <span className="font-mono font-bold text-sm tabular-nums">
              {activeIncidents.length}
            </span>
          </div>

          {/* SLA 12h Alert pill if triggered */}
          {activeSlaIncidents.length > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-red-950 border border-red-700/80 text-red-200 flex items-center gap-2 animate-pulse">
              <Clock className="w-4 h-4 text-red-400 shrink-0" />
              <div className="text-xs font-mono leading-tight">
                <span className="font-bold text-white">SLA 12ч:</span> активен контроль дедлайна
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenFleetDrawer}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            title="Открыть список техники и распределение 6 механиков"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Механики & Парк</span>
          </button>

          <button
            onClick={onOpenIncidentModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>+ Поломка</span>
          </button>

          <button
            onClick={onResetSimulation}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Сбросить симуляцию к исходному состоянию"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
