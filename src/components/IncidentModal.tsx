import React, { useState } from 'react';
import { X, AlertTriangle, Radio, Truck, Check, HelpCircle } from 'lucide-react';
import { Vehicle, Worksite, IncidentSeverity, ReporterChannel } from '../types';
import { getNearestHeavyBase, isKmInBlindZone } from '../utils/rulesEngine';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  worksites: Worksite[];
  initialKm?: number;
  onSubmitIncident: (data: {
    vehicleId: string;
    km: number;
    severity: IncidentSeverity;
    reportedVia: ReporterChannel;
    symptoms: string;
  }) => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  worksites,
  initialKm,
  onSubmitIncident,
}) => {
  const workingVehicles = vehicles.filter((v) => v.status === 'working');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    workingVehicles[0]?.id || ''
  );
  const [km, setKm] = useState<number>(initialKm ?? 45);
  const [severity, setSeverity] = useState<IncidentSeverity>('heavy');
  const [reportedVia, setReportedVia] = useState<ReporterChannel>('driver_call');
  const [symptoms, setSymptoms] = useState<string>(
    'Резкий металлический стук в коробке передач, машина остановилась на обочине.'
  );

  if (!isOpen) return null;

  const blindZoneCheck = isKmInBlindZone(km);
  const nearestHeavyBase = getNearestHeavyBase(km);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) return;
    onSubmitIncident({
      vehicleId: selectedVehicleId,
      km,
      severity,
      reportedVia,
      symptoms,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Регистрация инцидента / поломки техники
              </h2>
              <p className="text-[11px] text-slate-400">
                Запуск алгоритма оперативной маршрутизации и компенсации
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Select Vehicle */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Выберите машину из парка:
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => {
                setSelectedVehicleId(e.target.value);
                const veh = vehicles.find((v) => v.id === e.target.value);
                if (veh) setKm(veh.locationKm);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
            >
              {workingVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.boardNumber} — {v.model} (ПК {v.locationKm})
                </option>
              ))}
            </select>
          </div>

          {/* Kilometer position */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-semibold">
                Километр трассы (Пикет):
              </label>
              <span className="font-mono text-amber-400 font-bold">
                ПК {km} км
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={145}
              value={km}
              onChange={(e) => setKm(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>0 км</span>
              <span>ПК 74 (База 1)</span>
              <span>ПК 130 (База 2)</span>
              <span>145 км</span>
            </div>
          </div>

          {/* Blind Zone Badge preview */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Статус покрытия связью:</span>
            {blindZoneCheck.inBlindZone ? (
              <span className="text-amber-400 font-bold flex items-center gap-1 font-mono">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                Слепая зона ({blindZoneCheck.label})
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Сотовая связь стабильна
              </span>
            )}
          </div>

          {/* Severity & Channel Split */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Характер поломки:
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="heavy">Тяжелая (ДВС / КПП / мост)</option>
                <option value="minor">Легкая (устранение на месте)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Канал фиксации:
              </label>
              <select
                value={reportedVia}
                onChange={(e) => setReportedVia(e.target.value as ReporterChannel)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="driver_call">Звонок водителя</option>
                <option value="patrol_report">Патрульный экипаж</option>
                <option value="passby_transport">Попутная техника</option>
              </select>
            </div>
          </div>

          {/* Nearest Base Calculation Preview */}
          {severity === 'heavy' && (
            <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/80 text-[11px] text-blue-200">
              <div className="font-semibold text-white mb-0.5">
                Автоматическая маршрутизация тяжелого ремонта (PRD 4.1):
              </div>
              <div>
                Ближайшая опорная база: <strong className="text-amber-300">ПК {nearestHeavyBase.baseKm}</strong> ({nearestHeavyBase.distanceKm} км). Буксировка ~{nearestHeavyBase.towingMinutes} мин.
              </div>
            </div>
          )}

          {/* Symptoms description */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Первичные признаки / симптомы:
            </label>
            <textarea
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg transition-colors shadow-sm"
            >
              Зафиксировать инцидент
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
