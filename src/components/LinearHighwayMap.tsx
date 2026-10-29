import React, { useState } from 'react';
import { 
  Wrench, 
  Radio, 
  RadioTower, 
  Truck, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  MapPin, 
  Info,
  Clock,
  Shield
} from 'lucide-react';
import { Vehicle, Worksite, RepairBase, Incident, Mechanic } from '../types';
import { BLIND_ZONES, HIGHWAY_LENGTH_KM } from '../data/initialData';
import { getNearestHeavyBase, isKmInBlindZone } from '../utils/rulesEngine';

interface LinearHighwayMapProps {
  worksites: Worksite[];
  bases: RepairBase[];
  vehicles: Vehicle[];
  mechanics: Mechanic[];
  activeIncidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  onTriggerIncidentAtKm: (km: number) => void;
}

export const LinearHighwayMap: React.FC<LinearHighwayMapProps> = ({
  worksites,
  bases,
  vehicles,
  mechanics,
  activeIncidents,
  selectedIncidentId,
  onSelectIncident,
  onTriggerIncidentAtKm,
}) => {
  const [hoveredKm, setHoveredKm] = useState<number | null>(null);
  const [inspectedKm, setInspectedKm] = useState<number | null>(null);

  // Helper to calculate percentage along the 145 km line
  const kmToPercent = (km: number) => (km / HIGHWAY_LENGTH_KM) * 100;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-6">
      {/* Header of Map */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Интерактивный линейный профиль трассы (0 – 145 км)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Привязка рабочих участков, слепых зон сотовой связи и маршрутизация на опорные базы 74 и 130 км
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50"></span>
            <span>Слепая зона связи</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Опорная база (74/130 км)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Рабочее звено</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Инцидент / Поломка</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Highway Canvas / Strip */}
      <div className="relative pt-12 pb-14 px-4 select-none">
        {/* Clickable Highway Track Bar */}
        <div 
          className="relative h-4 bg-slate-800 rounded-full cursor-crosshair overflow-visible border border-slate-700/80 shadow-inner"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickedKm = Math.round((clickX / rect.width) * HIGHWAY_LENGTH_KM);
            setInspectedKm(Math.max(0, Math.min(HIGHWAY_LENGTH_KM, clickedKm)));
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const km = Math.round((clickX / rect.width) * HIGHWAY_LENGTH_KM);
            setHoveredKm(Math.max(0, Math.min(HIGHWAY_LENGTH_KM, km)));
          }}
          onMouseLeave={() => setHoveredKm(null)}
        >
          {/* Asphalt center dashed line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[1px] border-b border-dashed border-slate-600/60 pointer-events-none"></div>

          {/* Shaded Blind Zones */}
          {BLIND_ZONES.map((zone, idx) => {
            const leftPct = kmToPercent(zone.startKm);
            const widthPct = kmToPercent(zone.endKm - zone.startKm);
            return (
              <div
                key={idx}
                className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500/30 via-red-500/20 to-amber-500/30 border-x border-amber-500/50 backdrop-blur-[1px] pointer-events-none"
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={`${zone.label}: сотовая связь отсутствует`}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-600/60 text-[10px] text-amber-300 font-mono flex items-center gap-1 whitespace-nowrap shadow-sm">
                  <RadioTower className="w-2.5 h-2.5 text-amber-400" />
                  <span>Слепая зона ({zone.startKm}–{zone.endKm} км)</span>
                </div>
              </div>
            );
          })}

          {/* Evacuation Routing Vector Lines for Active Incidents */}
          {activeIncidents.map((incident) => {
            if (incident.status === 'resolved' || !incident.targetBaseKm) return null;
            const fromPct = kmToPercent(incident.km);
            const toPct = kmToPercent(incident.targetBaseKm);
            const minPct = Math.min(fromPct, toPct);
            const widthPct = Math.abs(toPct - fromPct);

            return (
              <div
                key={`route_${incident.id}`}
                className="absolute -top-3 h-1 bg-rose-500/80 rounded-full animate-pulse pointer-events-none shadow-sm shadow-rose-500"
                style={{ left: `${minPct}%`, width: `${widthPct}%` }}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-rose-300 bg-rose-950/90 px-1 py-0.2 rounded border border-rose-800 whitespace-nowrap">
                  Эвакуация ➔ ПК {incident.targetBaseKm}
                </div>
              </div>
            );
          })}

          {/* Heavy Bases Pins (74 km & 130 km) */}
          {bases.filter(b => b.isHeavyBase).map((base) => {
            const leftPct = kmToPercent(base.km);
            const baseMechs = mechanics.filter(m => m.currentBaseId === base.id);
            const brokenCount = vehicles.filter(v => (v.status === 'in_repair' || v.status === 'evacuating') && v.baseId === base.id).length;
            const isOverloaded = baseMechs.filter(m => m.role === 'linear').length > 0 && 
              (brokenCount / baseMechs.filter(m => m.role === 'linear').length) > 2.0;

            return (
              <div
                key={base.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group"
                style={{ left: `${leftPct}%` }}
              >
                {/* Pin button */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-125 shadow-lg ${
                  isOverloaded 
                    ? 'bg-red-600 border-white text-white animate-bounce' 
                    : 'bg-blue-600 border-white text-white'
                }`}>
                  <Wrench className="w-3.5 h-3.5" />
                </div>

                {/* Base Tooltip Card */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 p-2 rounded-lg bg-slate-950/95 border border-blue-500/50 shadow-2xl text-[11px] pointer-events-none opacity-90 group-hover:opacity-100 z-30">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>{base.name}</span>
                    <span className="font-mono text-blue-400">ПК {base.km}</span>
                  </div>
                  <div className="text-slate-400 mt-1 flex items-center justify-between">
                    <span>Посты ремонта:</span>
                    <span className="text-white font-mono">{brokenCount}/{base.capacity}</span>
                  </div>
                  <div className="text-slate-400 flex items-center justify-between">
                    <span>Линейные механики:</span>
                    <span className="text-emerald-400 font-mono">
                      {baseMechs.filter(m => m.role === 'linear').length} чел.
                    </span>
                  </div>
                  {isOverloaded && (
                    <div className="mt-1 text-[10px] text-red-300 bg-red-950/80 px-1 py-0.5 rounded border border-red-800">
                      ⚠️ Очередь &gt; 2 ед./мастера!
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Intermediate Bases (25 km & 102 km) */}
          {bases.filter(b => !b.isHeavyBase).map((base) => {
            const leftPct = kmToPercent(base.km);
            const reserveCount = vehicles.filter(v => v.baseId === base.id && v.status === 'reserve').length;

            return (
              <div
                key={base.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group"
                style={{ left: `${leftPct}%` }}
              >
                <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-400 flex items-center justify-center hover:scale-125 transition-transform">
                  <span className="text-[8px] font-mono font-bold text-slate-200">М</span>
                </div>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 hidden group-hover:block p-1.5 rounded bg-slate-950 border border-slate-700 text-[10px] whitespace-nowrap z-30 shadow-lg">
                  <div className="font-bold text-slate-200">{base.name}</div>
                  <div className="text-slate-400">Резервных машин: <span className="text-amber-400 font-mono">{reserveCount}</span></div>
                </div>
              </div>
            );
          })}

          {/* Worksites Pins */}
          {worksites.map((ws) => {
            const leftPct = kmToPercent(ws.km);
            const hasActiveIncident = activeIncidents.some(i => i.worksiteId === ws.id && i.status !== 'resolved');
            const trucksCount = ws.assignedTruckIds.length;

            return (
              <div
                key={ws.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group cursor-pointer"
                style={{ left: `${leftPct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectedKm(ws.km);
                }}
              >
                {/* Visual Pin */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-125 shadow-md ${
                  hasActiveIncident
                    ? 'bg-rose-600 border-white text-white animate-pulse'
                    : 'bg-emerald-600 border-white text-white'
                }`}>
                  <Truck className="w-2.5 h-2.5" />
                </div>

                {/* Worksite Label Badge */}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 whitespace-nowrap shadow-sm">
                  {ws.name.split(' (')[0]} · <span className="text-amber-400">ПК {ws.km}</span>
                </div>
              </div>
            );
          })}

          {/* Active Incidents Pins */}
          {activeIncidents.filter(i => i.status !== 'resolved').map((incident) => {
            const leftPct = kmToPercent(incident.km);
            const isSelected = selectedIncidentId === incident.id;

            return (
              <div
                key={incident.id}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 cursor-pointer ${
                  isSelected ? 'scale-125' : ''
                }`}
                style={{ left: `${leftPct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectIncident(incident.id);
                  setInspectedKm(incident.km);
                }}
              >
                <div className="w-6 h-6 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-white shadow-lg animate-bounce">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-rose-950 border border-rose-600 text-[10px] font-mono text-rose-200 whitespace-nowrap shadow-md">
                  {incident.vehicleBoard}
                </div>
              </div>
            );
          })}

          {/* Inspected Marker Indicator */}
          {inspectedKm !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-2 border-amber-400 border-dashed pointer-events-none z-20 animate-spin"
              style={{ left: `${kmToPercent(inspectedKm)}%` }}
            />
          )}
        </div>

        {/* Pickets Kilometer Axis Numbers */}
        <div className="relative mt-4 flex justify-between text-[11px] font-mono text-slate-500 px-1">
          {[0, 15, 30, 45, 60, 74, 90, 105, 120, 130, 145].map((km) => (
            <div 
              key={km} 
              className="flex flex-col items-center cursor-pointer hover:text-slate-300"
              onClick={() => setInspectedKm(km)}
            >
              <div className="w-[1px] h-2 bg-slate-700 mb-1"></div>
              <span>ПК {km}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Picket Inspector Card (Shown when user clicks or hovers highway) */}
      {inspectedKm !== null && (
        <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-mono">
                  Пикет ПК {inspectedKm} км
                </span>
                {isKmInBlindZone(inspectedKm).inBlindZone ? (
                  <span className="text-xs font-mono text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-red-400" />
                    Слепая зона связи
                  </span>
                ) : (
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400" />
                    Сотовая связь стабильна
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Ближайшая база тяжелого ремонта: <strong className="text-blue-300 font-mono">ПК {getNearestHeavyBase(inspectedKm).baseKm}</strong> ({getNearestHeavyBase(inspectedKm).distanceKm} км, буксировка ~{getNearestHeavyBase(inspectedKm).towingMinutes} мин)
                </span>
                <span>·</span>
                <span>
                  Формула PRD 4.1: min(|{inspectedKm} - 74| = {Math.abs(inspectedKm - 74)}, |{inspectedKm} - 130| = {Math.abs(inspectedKm - 130)}) = <strong>ПК {getNearestHeavyBase(inspectedKm).baseKm}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onTriggerIncidentAtKm(inspectedKm)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Смоделировать поломку на ПК {inspectedKm}</span>
            </button>
            <button
              onClick={() => setInspectedKm(null)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Worksite Fleet Links Grid (High density cards) */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Технологические звенья техники на объекте (Экскаватор + Бульдозер + Самосвалы)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {worksites.map((ws) => {
            const excavator = vehicles.find((v) => v.id === ws.excavatorId);
            const bulldozer = vehicles.find((v) => v.id === ws.bulldozerId);
            const activeTrucks = vehicles.filter((v) => ws.assignedTruckIds.includes(v.id) && v.status === 'working');
            const brokenTrucks = vehicles.filter((v) => ws.assignedTruckIds.includes(v.id) && v.status !== 'working');
            const hasIncident = brokenTrucks.length > 0;

            return (
              <div
                key={ws.id}
                className={`p-3 rounded-lg border transition-all ${
                  hasIncident
                    ? 'bg-rose-950/20 border-rose-800/80 shadow-md shadow-rose-950/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-xs text-white truncate" title={ws.name}>
                    {ws.name.split(' (')[0]}
                  </div>
                  <span className="font-mono text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60">
                    ПК {ws.km}
                  </span>
                </div>

                {/* Connection Status */}
                <div className="flex items-center gap-1 text-[11px] mb-2.5">
                  {ws.inCellCoverage ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Связь есть
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Слепая зона (рация/патруль)
                    </span>
                  )}
                </div>

                {/* Machine Fleet inside link */}
                <div className="space-y-1.5 text-[11px] border-t border-slate-800/80 pt-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Экскаватор:</span>
                    <span className="font-mono text-white truncate max-w-[140px]" title={excavator?.model}>
                      {excavator?.boardNumber.split(' (')[0]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Бульдозер:</span>
                    <span className="font-mono text-white truncate max-w-[140px]" title={bulldozer?.model}>
                      {bulldozer?.boardNumber.split(' (')[0]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Самосвалы в звене:</span>
                    <span className="font-mono tabular-nums">
                      <strong className={brokenTrucks.length > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {activeTrucks.length}
                      </strong>
                      <span className="text-slate-500">/{ws.assignedTruckIds.length} ед.</span>
                    </span>
                  </div>
                </div>

                {/* Link Status Pill */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Состояние звена:</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      hasIncident
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {hasIncident ? 'Простой / Сход машины' : 'Ритмичная работа'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
