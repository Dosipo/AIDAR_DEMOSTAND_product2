import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Truck, 
  Wrench, 
  Building2, 
  Phone, 
  ShieldAlert, 
  MapPin, 
  ArrowRightLeft, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Mechanic, Vehicle, RepairBase, Worksite } from '../types';

interface FleetMechanicsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mechanics: Mechanic[];
  vehicles: Vehicle[];
  bases: RepairBase[];
  worksites: Worksite[];
  onMoveMechanic: (mechanicId: string, targetBaseId: string) => void;
  onTriggerVehicleBreakdown: (vehicleId: string) => void;
}

export const FleetMechanicsDrawer: React.FC<FleetMechanicsDrawerProps> = ({
  isOpen,
  onClose,
  mechanics,
  vehicles,
  bases,
  worksites,
  onMoveMechanic,
  onTriggerVehicleBreakdown,
}) => {
  const [activeTab, setActiveTab] = useState<'mechanics' | 'fleet' | 'bases'>('mechanics');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filteredVehicles = vehicles.filter((v) => {
    if (vehicleFilter === 'all') return true;
    if (vehicleFilter === 'dump_truck') return v.type === 'dump_truck';
    if (vehicleFilter === 'tracked') return v.chassisType === 'tracked';
    if (vehicleFilter === 'broken') return v.status !== 'working' && v.status !== 'reserve';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wide">
                Реестр ресурсов: 6 Механиков, Парк техники & Базы
              </h2>
              <p className="text-xs text-slate-400">
                Дорожно-строительный линейный объект М-12 (0 – 145 км)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('mechanics')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'mechanics'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Штат механиков (Всего 6 специалистов)</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'fleet'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Парк техники ({vehicles.length} ед.)</span>
          </button>

          <button
            onClick={() => setActiveTab('bases')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'bases'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Ремонтные базы (ПК 74, ПК 130, малые базы)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: 6 MECHANICS */}
          {activeTab === 'mechanics' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <Users className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Регламент распределения 6 механиков:</strong> 2 Главных механика (руководят базами ПК 74 и ПК 130) + 4 линейных механика. При превышении нагрузки (&gt; 2 неисправных машин на 1 специалиста) Главный механик санкционирует оперативную передислокацию линейного мастера между базами.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mechanics.map((mech) => {
                  const base = bases.find((b) => b.id === mech.currentBaseId);
                  const isChief = mech.role === 'chief';

                  return (
                    <div
                      key={mech.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between ${
                        isChief
                          ? 'bg-blue-950/20 border-blue-800/80'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                              isChief
                                ? 'bg-blue-900/80 text-blue-200 border border-blue-700'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {isChief ? 'Главный механик' : 'Линейный механик'}
                          </span>
                          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            На смене
                          </span>
                        </div>

                        <div className="font-bold text-sm text-white mb-1">
                          {mech.fullName}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-2 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{mech.phone}</span>
                        </div>

                        <div className="text-xs text-slate-300 p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Текущая дислокация:</span>
                          <strong className="text-amber-300 font-mono">
                            {base?.name} (ПК {base?.km})
                          </strong>
                        </div>
                      </div>

                      {/* Reallocate Control for linear mechanics */}
                      {!isChief && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">Передислокация:</span>
                          <div className="flex items-center gap-1">
                            {bases
                              .filter((b) => b.id !== mech.currentBaseId && b.isHeavyBase)
                              .map((targetBase) => (
                                <button
                                  key={targetBase.id}
                                  onClick={() => onMoveMechanic(mech.id, targetBase.id)}
                                  className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors flex items-center gap-1"
                                >
                                  <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                                  <span>На ПК {targetBase.km}</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FLEET */}
          {activeTab === 'fleet' && (
            <div className="space-y-4">
              {/* Filter chips */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Фильтр:</span>
                {[
                  { id: 'all', label: 'Вся техника' },
                  { id: 'dump_truck', label: 'Самосвалы (колесные)' },
                  { id: 'tracked', label: 'Экскаваторы & Бульдозеры (гусеничные)' },
                  { id: 'broken', label: 'В ремонте / сошедшие' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setVehicleFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      vehicleFilter === f.id
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Table of Fleet */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Борт / Модель</th>
                      <th className="px-4 py-3">Тип шасси</th>
                      <th className="px-4 py-3">Дислокация</th>
                      <th className="px-4 py-3">Статус</th>
                      <th className="px-4 py-3 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/40 font-mono">
                    {filteredVehicles.map((v) => {
                      const isWorking = v.status === 'working';
                      const isBroken = v.status !== 'working' && v.status !== 'reserve';

                      return (
                        <tr key={v.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-white">{v.boardNumber}</div>
                            <div className="text-[11px] text-slate-400 font-sans">{v.model}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                v.chassisType === 'tracked'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800'
                              }`}
                            >
                              {v.chassisType === 'tracked' ? 'Гусеничный (трал >5км)' : 'Колесный (до 100км)'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">
                            ПК {v.locationKm} км
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isWorking
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : v.status === 'reserve'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {v.status === 'working' && 'В работе'}
                              {v.status === 'reserve' && 'Резерв на базе'}
                              {v.status === 'minor_issue' && 'Легкая поломка'}
                              {v.status === 'evacuating' && 'Эвакуация'}
                              {v.status === 'in_repair' && 'В ремонте'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {isWorking && (
                              <button
                                onClick={() => onTriggerVehicleBreakdown(v.id)}
                                className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 text-[10px] rounded border border-red-800 transition-colors font-sans"
                              >
                                Заявить поломку
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BASES */}
          {activeTab === 'bases' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bases.map((base) => {
                const assignedMechs = mechanics.filter((m) => m.currentBaseId === base.id);
                const brokenAtBase = vehicles.filter((v) => v.baseId === base.id && v.status !== 'working');

                return (
                  <div
                    key={base.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between ${
                      base.isHeavyBase
                        ? 'bg-slate-950/80 border-blue-900/80 shadow-md shadow-blue-950/20'
                        : 'bg-slate-950/50 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                            base.isHeavyBase
                              ? 'bg-blue-900 text-blue-200 border border-blue-700'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {base.isHeavyBase ? 'Опорная база тяжелого ремонта' : 'Малая база отстоя'}
                        </span>
                        <span className="font-mono text-sm text-amber-400 font-bold">
                          ПК {base.km} км
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-2">{base.name}</h3>

                      <div className="space-y-2 text-xs text-slate-300">
                        <div className="flex justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400">Вместимость постов ремонта:</span>
                          <span className="font-mono text-white font-bold">{base.capacity} ед.</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400">Линейных мастеров на базе:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {assignedMechs.filter((m) => m.role === 'linear').length} чел.
                          </span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-400">Машин в ремонте/очереди:</span>
                          <span className="font-mono text-rose-400 font-bold">
                            {brokenAtBase.length} ед.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                      {base.isHeavyBase ? (
                        <span>
                          Капитальный ремонт агрегатов (ДВС, КПП, мосты, гидравлика). Выбор по формуле: min(|km - 74|, |km - 130|).
                        </span>
                      ) : (
                        <span>Отстой резервных самосвалов, мелкое регламентное ТО.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
