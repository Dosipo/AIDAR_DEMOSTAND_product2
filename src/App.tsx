import React, { useState, useEffect } from 'react';
import { 
  INITIAL_BASES, 
  INITIAL_MECHANICS, 
  INITIAL_VEHICLES, 
  INITIAL_WORKSITES, 
  INITIAL_MESSAGES 
} from './data/initialData';
import { 
  Vehicle, 
  Worksite, 
  RepairBase, 
  Mechanic, 
  Incident, 
  TelegramMessage, 
  TelegramRole, 
  DemoScenarioId,
  IncidentSeverity,
  ReporterChannel
} from './types';
import { 
  getNearestHeavyBase, 
  isKmInBlindZone, 
  generateCompensationOptions, 
  checkBaseOverload,
  calculateTrackedRelocation
} from './utils/rulesEngine';
import { HeaderBar } from './components/HeaderBar';
import { LinearHighwayMap } from './components/LinearHighwayMap';
import { TelegramBotPanel } from './components/TelegramBotPanel';
import { DemoScenariosDock } from './components/DemoScenariosDock';
import { FleetMechanicsDrawer } from './components/FleetMechanicsDrawer';
import { IncidentModal } from './components/IncidentModal';

export default function App() {
  // State
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [worksites, setWorksites] = useState<Worksite[]>(INITIAL_WORKSITES);
  const [bases, setBases] = useState<RepairBase[]>(INITIAL_BASES);
  const [mechanics, setMechanics] = useState<Mechanic[]>(INITIAL_MECHANICS);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [telegramMessages, setTelegramMessages] = useState<TelegramMessage[]>(INITIAL_MESSAGES);
  const [activeRole, setActiveRole] = useState<TelegramRole>('dispatcher');
  const [currentScenario, setCurrentScenario] = useState<DemoScenarioId>('scenario_1');

  // Modals & Drawers
  const [isFleetDrawerOpen, setIsFleetDrawerOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [modalInitialKm, setModalInitialKm] = useState<number | undefined>(undefined);

  // SLA 12-hour simulation countdown
  const [slaRemainingSeconds, setSlaRemainingSeconds] = useState<number | undefined>(undefined);
  const [slaEscalationLevel, setSlaEscalationLevel] = useState<'normal' | 'warn_6h' | 'critical_10h'>('normal');

  // Timer loop for SLA
  useEffect(() => {
    if (slaRemainingSeconds === undefined || slaRemainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setSlaRemainingSeconds((prev) => {
        if (!prev || prev <= 1) return 0;
        const next = prev - 1;
        if (next <= 7200) {
          setSlaEscalationLevel('critical_10h');
        } else if (next <= 21600) {
          setSlaEscalationLevel('warn_6h');
        } else {
          setSlaEscalationLevel('normal');
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [slaRemainingSeconds]);

  // Operational metrics
  const totalVehicles = vehicles.length;
  const workingVehicles = vehicles.filter((v) => v.status === 'working' || v.status === 'reserve').length;
  const totalWorksites = worksites.length;
  const optimalWorksites = worksites.filter((ws) => {
    const brokenTrucks = vehicles.filter((v) => ws.assignedTruckIds.includes(v.id) && v.status !== 'working');
    return brokenTrucks.length === 0;
  }).length;

  const activeIncidentsList = incidents.filter((i) => i.status !== 'resolved');

  // Helper to add Telegram message
  const addTelegramMessage = (msg: Omit<TelegramMessage, 'id' | 'timestamp'>) => {
    const newMsg: TelegramMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      ...msg,
    };
    setTelegramMessages((prev) => [...prev, newMsg]);
  };

  // Run Scenario 1: Breakdown with cell connection (PRD 5.1)
  const runScenario1 = () => {
    setCurrentScenario('scenario_1');
    setSlaRemainingSeconds(undefined);

    // Reset relevant vehicle
    const targetTruckId = 'trk_45_2'; // КАМАЗ №402 on ПК 45
    const targetWsId = 'ws_45';
    const nearestBase = getNearestHeavyBase(45); // Base 74

    setVehicles((prev) =>
      prev.map((v) => (v.id === targetTruckId ? { ...v, status: 'evacuating', baseId: nearestBase.baseId } : v))
    );

    const targetTruck = vehicles.find((v) => v.id === targetTruckId)!;
    const ws = worksites.find((w) => w.id === targetWsId)!;

    const incidentId = `inc_sc1_${Date.now()}`;
    const options = generateCompensationOptions(45, targetTruck, ws, vehicles, worksites, bases);

    const newIncident: Incident = {
      id: incidentId,
      timestamp: Date.now(),
      vehicleId: targetTruckId,
      vehicleBoard: 'КАМАЗ №402',
      vehicleType: 'dump_truck',
      worksiteId: targetWsId,
      worksiteName: ws.name,
      km: 45,
      isBlindZone: false,
      reportedVia: 'driver_call',
      reportedBy: 'Водитель Николаев А.В.',
      initialSymptoms: 'Отказ КПП, блокировка ведущего моста на 45 км.',
      severity: 'heavy',
      decision: 'evacuate_heavy',
      targetBaseKm: nearestBase.baseKm,
      targetBaseId: nearestBase.baseId,
      status: 'evacuating_to_base',
      options,
      sla12hActive: false,
    };

    setIncidents([newIncident]);
    setSelectedIncidentId(incidentId);

    // Messages
    addTelegramMessage({
      role: 'driver',
      sender: 'Водитель (КАМАЗ №402)',
      senderRoleLabel: 'Бортовой сигнал',
      text: '🚨 Поломка на ПК 45 (Участок 1). Выбило передачу, сильный скрежет в мосту. Машина обездвижена на обочине. Требуется буксировка.',
      type: 'alert',
      incidentId,
    });

    addTelegramMessage({
      role: 'linear_mechanic',
      sender: 'Линейный механик (Ковалев Д.П.)',
      senderRoleLabel: 'Дефектовка',
      text: `🔧 Первичный осмотр: поломка тяжелая (редуктор моста/КПП). На месте отремонтировать невозможно.\n\n📍 Безальтернативное назначение по правилу PRD 4.1:\nmin(|45 - 74| = 29 км, |45 - 130| = 85 км) ➔ Опорная база ПК 74.\nМашина отправлена на буксире на ПК 74. Мгновенно формируем компенсацию для звена.`,
      type: 'text',
      incidentId,
    });

    // Dispatcher gets compensation options card
    addTelegramMessage({
      role: 'dispatcher',
      sender: 'Система Компенсации Простоев',
      senderRoleLabel: 'Бот-Диспетчер',
      text: `📋 ИНЦИДЕНТ: Сход самосвала КАМАЗ №402 на ПК 45.\nТехнологическое звено (экскаватор Komatsu PC300 + бульдозер CAT D6) под угрозой простоя!\n\nПредлагаемые варианты компенсации (радиус ≤ 100 км):`,
      type: 'card',
      incidentId,
      actions: options.map((opt, idx) => ({
        label: `Вариант ${idx + 1}: ${opt.title} (~${opt.estimatedMinutes} мин)`,
        actionKey: 'dispatcher_pick_option',
        payload: { optionId: opt.id },
        primary: idx === 0,
      })),
    });

    addTelegramMessage({
      role: 'general_chat',
      sender: 'Диспетчерская служба',
      senderRoleLabel: 'Сводка смены',
      text: '⚠️ Участок 1 (ПК 45): Сход КАМАЗ №402. Направлен на опорную базу ПК 74. Диспетчер выбирает компенсирующий сценарий в течение 5 минут.',
      type: 'text',
    });

    setActiveRole('dispatcher');
  };

  // Run Scenario 2: Breakdown in Blind Zone with 12h SLA (PRD 5.2)
  const runScenario2 = () => {
    setCurrentScenario('scenario_2');
    const targetTruckId = 'trk_92_2'; // SHACMAN №502 on ПК 92 (Blind Zone)
    const targetWsId = 'ws_92';
    const nearestBase = getNearestHeavyBase(92); // Base 74 (|92-74|=18 < |92-130|=38)

    setVehicles((prev) =>
      prev.map((v) => (v.id === targetTruckId ? { ...v, status: 'evacuating', baseId: nearestBase.baseId } : v))
    );

    const targetTruck = vehicles.find((v) => v.id === targetTruckId)!;
    const ws = worksites.find((w) => w.id === targetWsId)!;
    const incidentId = `inc_sc2_${Date.now()}`;

    // Worst case: no reserve dump trucks within 100 km available!
    const newIncident: Incident = {
      id: incidentId,
      timestamp: Date.now(),
      vehicleId: targetTruckId,
      vehicleBoard: 'SHACMAN №502',
      vehicleType: 'dump_truck',
      worksiteId: targetWsId,
      worksiteName: ws.name,
      km: 92,
      isBlindZone: true,
      reportedVia: 'patrol_report',
      reportedBy: 'Патрульный экипаж-2 (УАЗ Патриот)',
      initialSymptoms: 'Заклинило ведущий мост в слепой зоне ПК 92. Водитель ожидал патруль 1 час 15 мин.',
      severity: 'heavy',
      decision: 'evacuate_heavy',
      targetBaseKm: nearestBase.baseKm,
      targetBaseId: nearestBase.baseId,
      status: 'sla_12h_countdown',
      options: [],
      sla12hActive: true,
      slaStartTime: Date.now(),
      slaRemainingSeconds: 43200, // 12 hours
      slaEscalationLevel: 'normal',
    };

    setIncidents([newIncident]);
    setSelectedIncidentId(incidentId);
    setSlaRemainingSeconds(43200); // 12h in seconds
    setSlaEscalationLevel('normal');

    addTelegramMessage({
      role: 'driver',
      sender: 'Патрульный экипаж-2',
      senderRoleLabel: 'Доклад из зоны связи',
      text: '📻 Доклад патруля: При объезде слепой зоны ПК 88–104 на ПК 92 обнаружен обездвиженный самосвал SHACMAN №502. Связи на точке нет. Водитель ждал помощи 1.2 ч. Передали координаты при выезде в зону связи на ПК 80.',
      type: 'alert',
      incidentId,
    });

    addTelegramMessage({
      role: 'dispatcher',
      sender: 'Контроль Регламента SLA 12 часов',
      senderRoleLabel: 'Системный таймер',
      text: `🚨 ВНИМАНИЕ: Инцидент в слепой зоне (ПК 92). В радиусе 100 км свободных резервных самосвалов нет!\n\nСогласно PRD 4.3 (Worst-Case SLA):\nЗапущен жесткий обратный отсчет дедлайна принятия управленческого решения: 12:00:00.\n• Отметка 6ч: Предупреждение о необходимости аренды сторонней техники\n• Отметка 10ч: Эскалация руководству холдинга для смены графика работ.`,
      type: 'alert',
      incidentId,
      actions: [
        {
          label: '⚡ Симулировать прохождение 6 часов (Алерт диспетчеру)',
          actionKey: 'simulate_6h',
          primary: true,
        },
        {
          label: '⚡ Симулировать прохождение 10 часов (Эскалация руководству)',
          actionKey: 'simulate_10h',
          danger: true,
        },
      ],
    });

    addTelegramMessage({
      role: 'general_chat',
      sender: 'Диспетчер проекта',
      senderRoleLabel: 'Служебное уведомление',
      text: '⚠️ Участок 2 (ПК 92, слепая зона): Самосвал SHACMAN №502 выбыл. Запущен 12-часовой регламент согласования внешней техники/смежных ресурсов.',
      type: 'text',
    });

    setActiveRole('dispatcher');
  };

  // Run Scenario 3: Base Overload & Mechanics Rebalancing (PRD 5.3)
  const runScenario3 = () => {
    setCurrentScenario('scenario_3');
    setSlaRemainingSeconds(undefined);

    // Overload Base 74 by assigning 3 broken vehicles and leaving only 1 linear mechanic there
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === 'trk_45_1' || v.id === 'trk_45_2' || v.id === 'trk_14_1') {
          return { ...v, status: 'in_repair', baseId: 'base_74' };
        }
        return v;
      })
    );

    // Move linear mechanics so Base 74 has only 1 linear mechanic, Base 130 has 3
    setMechanics((prev) =>
      prev.map((m) => {
        if (m.id === 'mech_l1') return { ...m, currentBaseId: 'base_74' };
        if (m.id === 'mech_l2') return { ...m, currentBaseId: 'base_130' };
        if (m.id === 'mech_l3') return { ...m, currentBaseId: 'base_130' };
        if (m.id === 'mech_l4') return { ...m, currentBaseId: 'base_130' };
        return m;
      })
    );

    addTelegramMessage({
      role: 'chief_mechanic',
      sender: 'Система Балансировки Баз',
      senderRoleLabel: 'Авто-мониторинг',
      text: `⚠️ КРИТИЧЕСКАЯ НАГРУЗКА БАЗЫ ПК 74!\nВ очереди на капитальный ремонт: 3 единицы техники.\nЛинейных мастеров на базе: 1 специалист (Ковалев Д.П.).\n\nСоотношение: 3.0 ед./мастера > норматива 2.0!\n\nПредложение: Санкционировать передислокацию свободного линейного механика Семенова А.В. с базы ПК 130 на базу ПК 74 (расстояние 56 км, переезд ~50 мин).`,
      type: 'alert',
      actions: [
        {
          label: '⚡ Санкционировать передислокацию механика Семенова А.В. на ПК 74',
          actionKey: 'chief_reallocate',
          payload: { fromBaseId: 'base_130', toBaseId: 'base_74', mechanicId: 'mech_l3' },
          primary: true,
        },
      ],
    });

    addTelegramMessage({
      role: 'general_chat',
      sender: 'Главный механик Иванов В.С.',
      senderRoleLabel: 'Ремонтная служба',
      text: '📢 Внимание: На базе ПК 74 высокая концентрация агрегатных ремонтов. Инициирована балансировка специалистов между базами.',
      type: 'text',
    });

    setActiveRole('chief_mechanic');
  };

  // Handle Linear Mechanic Decision
  const handleMechanicDecision = (incidentId: string, decision: 'roadside_repair' | 'evacuate_heavy') => {
    const inc = incidents.find((i) => i.id === incidentId);
    if (!inc) return;

    if (decision === 'roadside_repair') {
      setIncidents((prev) =>
        prev.map((i) => (i.id === incidentId ? { ...i, status: 'resolved', decision: 'roadside_repair' } : i))
      );
      setVehicles((prev) =>
        prev.map((v) => (v.id === inc.vehicleId ? { ...v, status: 'minor_issue' } : v))
      );

      addTelegramMessage({
        role: 'linear_mechanic',
        sender: 'Линейный механик',
        senderRoleLabel: 'Решение по осмотру',
        text: `🛠 Решение: Легкая неисправность (патрубок интеркулера / предохранитель). Выезжаю на ПК ${inc.km} для ремонта на месте. Замена звена не требуется. Ожидаемый простой: 35–45 мин.`,
        type: 'text',
      });
      addTelegramMessage({
        role: 'general_chat',
        sender: 'Ремонтная служба',
        senderRoleLabel: 'Сводка смены',
        text: `✅ Поломка на ПК ${inc.km} квалифицирована как легкая. Механик на линии, звено вернется в нормальный ритм в течение 45 минут.`,
        type: 'text',
      });
    } else {
      const nearestBase = getNearestHeavyBase(inc.km);
      const veh = vehicles.find((v) => v.id === inc.vehicleId)!;
      const ws = worksites.find((w) => w.id === inc.worksiteId)!;
      const options = generateCompensationOptions(inc.km, veh, ws, vehicles, worksites, bases);

      setIncidents((prev) =>
        prev.map((i) =>
          i.id === incidentId
            ? {
                ...i,
                decision: 'evacuate_heavy',
                targetBaseKm: nearestBase.baseKm,
                targetBaseId: nearestBase.baseId,
                status: 'evacuating_to_base',
                options,
              }
            : i
        )
      );

      setVehicles((prev) =>
        prev.map((v) => (v.id === inc.vehicleId ? { ...v, status: 'evacuating', baseId: nearestBase.baseId } : v))
      );

      addTelegramMessage({
        role: 'linear_mechanic',
        sender: 'Линейный механик',
        senderRoleLabel: 'Решение по осмотру',
        text: `🚨 Решение: Поломка тяжелая! Безальтернативно направляем на базу ПК ${nearestBase.baseKm} (буксировка ${nearestBase.distanceKm} км, ~${nearestBase.towingMinutes} мин). Запущен расчет подмены для диспетчера.`,
        type: 'text',
      });

      addTelegramMessage({
        role: 'dispatcher',
        sender: 'Система Компенсации Простоев',
        senderRoleLabel: 'Бот-Диспетчер',
        text: `📋 КАРТОЧКА ДИСПЕТЧЕРА: Эвакуация ${inc.vehicleBoard} с ПК ${inc.km}.\nВыберите вариант компенсации для непрерывности вывозки грунта:`,
        type: 'card',
        incidentId,
        actions: options.map((opt, idx) => ({
          label: `Вариант ${idx + 1}: ${opt.title} (~${opt.estimatedMinutes} мин)`,
          actionKey: 'dispatcher_pick_option',
          payload: { optionId: opt.id },
          primary: idx === 0,
        })),
      });

      setActiveRole('dispatcher');
    }
  };

  // Handle Dispatcher Choosing Option
  const handleDispatcherChooseOption = (incidentId: string, optionId: string) => {
    const inc = incidents.find((i) => i.id === incidentId);
    if (!inc) return;
    const option = inc.options.find((o) => o.id === optionId);
    if (!option) return;

    // Apply compensation
    if (option.type === 'reserve_truck') {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === option.targetVehicleId
            ? { ...v, status: 'in_transit', worksiteId: inc.worksiteId, locationKm: inc.km }
            : v
        )
      );
      setWorksites((prev) =>
        prev.map((ws) =>
          ws.id === inc.worksiteId
            ? { ...ws, assignedTruckIds: [...ws.assignedTruckIds, option.targetVehicleId] }
            : ws
        )
      );
    } else if (option.type === 'donor_truck') {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === option.targetVehicleId
            ? { ...v, status: 'in_transit', worksiteId: inc.worksiteId, locationKm: inc.km }
            : v
        )
      );
      setWorksites((prev) =>
        prev.map((ws) => {
          if (ws.assignedTruckIds.includes(option.targetVehicleId)) {
            return {
              ...ws,
              assignedTruckIds: ws.assignedTruckIds.filter((id) => id !== option.targetVehicleId),
            };
          }
          if (ws.id === inc.worksiteId) {
            return { ...ws, assignedTruckIds: [...ws.assignedTruckIds, option.targetVehicleId] };
          }
          return ws;
        })
      );
    } else if (option.type === 'relocate_excavator') {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === option.targetVehicleId
            ? {
                ...v,
                status: 'in_transit',
                locationKm: option.toKm,
                statusNote: option.requiresTrawl ? 'Перевозка на трале' : 'Своим ходом',
              }
            : v
        )
      );
    }

    // Resolve incident
    setIncidents((prev) =>
      prev.map((i) =>
        i.id === incidentId
          ? { ...i, status: 'resolved', chosenOptionId: optionId, resolvedAt: Date.now() }
          : i
      )
    );

    addTelegramMessage({
      role: 'dispatcher',
      sender: 'Диспетчер проекта',
      senderRoleLabel: 'Утверждение решения',
      text: `✅ УТВЕРЖДЕНО: "${option.title}".\n${option.description}\n⏱ Расчетное время прибытия: ~${option.estimatedMinutes} мин.\n${option.impactNote}`,
      type: 'text',
    });

    addTelegramMessage({
      role: 'general_chat',
      sender: 'Диспетчерская служба',
      senderRoleLabel: 'Оповещение прораба',
      text: `📢 Прорабу участка ${inc.worksiteName}: На замену выбывшей техники направлен ${option.title}. Расчетное время восстановления ритма вывозки: ~${option.estimatedMinutes} мин.`,
      type: 'text',
    });
  };

  // Chief Mechanic Reallocate Specialist
  const handleChiefReallocateMechanic = (fromBaseId: string, toBaseId: string, mechanicId: string) => {
    const mech = mechanics.find((m) => m.id === mechanicId);
    const targetBase = bases.find((b) => b.id === toBaseId);
    if (!mech || !targetBase) return;

    setMechanics((prev) =>
      prev.map((m) => (m.id === mechanicId ? { ...m, currentBaseId: toBaseId } : m))
    );

    addTelegramMessage({
      role: 'chief_mechanic',
      sender: 'Главный механик',
      senderRoleLabel: 'Приказ по ремонтной службе',
      text: `✅ ПЕРЕДИСЛОКАЦИЯ САНКЦИОНИРОВАНА: Линейный механик ${mech.fullName} переведен на ${targetBase.name} (ПК ${targetBase.km}). Нагрузка постов сбалансирована до нормативных значений (≤ 2.0 ед./мастера).`,
      type: 'text',
    });

    addTelegramMessage({
      role: 'general_chat',
      sender: 'Главный механик',
      senderRoleLabel: 'Ремонтная служба',
      text: `ℹ️ Линейный механик ${mech.fullName} прибывает на базу ПК ${targetBase.km} для усиления агрегатного ремонта.`,
      type: 'text',
    });
  };

  // Custom Incident Creation
  const handleCreateCustomIncident = (data: {
    vehicleId: string;
    km: number;
    severity: IncidentSeverity;
    reportedVia: ReporterChannel;
    symptoms: string;
  }) => {
    const veh = vehicles.find((v) => v.id === data.vehicleId);
    if (!veh) return;
    const ws = worksites.find((w) => w.id === veh.worksiteId) || worksites[0];
    const isBlind = isKmInBlindZone(data.km).inBlindZone;
    const nearestBase = getNearestHeavyBase(data.km);

    const incidentId = `inc_custom_${Date.now()}`;
    const options = generateCompensationOptions(data.km, veh, ws, vehicles, worksites, bases);

    const newInc: Incident = {
      id: incidentId,
      timestamp: Date.now(),
      vehicleId: veh.id,
      vehicleBoard: veh.boardNumber,
      vehicleType: veh.type,
      worksiteId: ws.id,
      worksiteName: ws.name,
      km: data.km,
      isBlindZone: isBlind,
      reportedVia: data.reportedVia,
      reportedBy:
        data.reportedVia === 'driver_call'
          ? `Водитель (${veh.boardNumber})`
          : data.reportedVia === 'patrol_report'
          ? 'Патрульный экипаж'
          : 'Попутная дорожная техника',
      initialSymptoms: data.symptoms,
      severity: data.severity,
      decision: data.severity === 'heavy' ? 'evacuate_heavy' : 'roadside_repair',
      targetBaseKm: data.severity === 'heavy' ? nearestBase.baseKm : undefined,
      targetBaseId: data.severity === 'heavy' ? nearestBase.baseId : undefined,
      status: data.severity === 'heavy' ? 'evacuating_to_base' : 'new_reported',
      options,
      sla12hActive: isBlind && options.length === 0,
      slaRemainingSeconds: isBlind && options.length === 0 ? 43200 : undefined,
    };

    setIncidents((prev) => [newInc, ...prev]);
    setSelectedIncidentId(incidentId);

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === veh.id
          ? {
              ...v,
              status: data.severity === 'heavy' ? 'evacuating' : 'minor_issue',
              baseId: data.severity === 'heavy' ? nearestBase.baseId : null,
            }
          : v
      )
    );

    addTelegramMessage({
      role: 'driver',
      sender: newInc.reportedBy,
      senderRoleLabel: 'Сигнал поломки',
      text: `🚨 Зафиксирован инцидент на ПК ${data.km}: ${veh.boardNumber}. ${data.symptoms}`,
      type: 'alert',
      incidentId,
    });

    if (data.severity === 'heavy') {
      addTelegramMessage({
        role: 'dispatcher',
        sender: 'Система Компенсации Простоев',
        senderRoleLabel: 'Бот-Диспетчер',
        text: `📋 ИНЦИДЕНТ: Тяжелая поломка ${veh.boardNumber} на ПК ${data.km}.\nМаршрутизация: Опорная база ПК ${nearestBase.baseKm}.\nВыберите вариант компенсации для участка "${ws.name}":`,
        type: 'card',
        incidentId,
        actions: options.map((opt, idx) => ({
          label: `Вариант ${idx + 1}: ${opt.title} (~${opt.estimatedMinutes} мин)`,
          actionKey: 'dispatcher_pick_option',
          payload: { optionId: opt.id },
          primary: idx === 0,
        })),
      });
      setActiveRole('dispatcher');
    } else {
      addTelegramMessage({
        role: 'linear_mechanic',
        sender: 'Линейный механик',
        senderRoleLabel: 'Запрос на дефектовку',
        text: `🔧 Заявлена легкая поломка на ПК ${data.km} (${veh.boardNumber}). Выберите действие:`,
        type: 'card',
        incidentId,
        actions: [
          {
            label: '🛠 Выезд на дорогу (устранение на месте)',
            actionKey: 'mechanic_roadside',
            primary: true,
          },
          {
            label: '🚨 Направить на опорную базу 74/130 км',
            actionKey: 'mechanic_evacuate',
            danger: true,
          },
        ],
      });
      setActiveRole('linear_mechanic');
    }
  };

  // Reset Simulation
  const handleResetSimulation = () => {
    setVehicles(INITIAL_VEHICLES);
    setWorksites(INITIAL_WORKSITES);
    setBases(INITIAL_BASES);
    setMechanics(INITIAL_MECHANICS);
    setIncidents([]);
    setSelectedIncidentId(null);
    setTelegramMessages(INITIAL_MESSAGES);
    setSlaRemainingSeconds(undefined);
    setSlaEscalationLevel('normal');
    setCurrentScenario('free_simulation');
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* Top Bar Contract with Operational KPI metrics */}
      <HeaderBar
        activeIncidents={activeIncidentsList}
        totalVehicles={totalVehicles}
        workingVehicles={workingVehicles}
        totalWorksites={totalWorksites}
        optimalWorksites={optimalWorksites}
        onOpenFleetDrawer={() => setIsFleetDrawerOpen(true)}
        onOpenIncidentModal={() => {
          setModalInitialKm(45);
          setIsIncidentModalOpen(true);
        }}
        onResetSimulation={handleResetSimulation}
      />

      {/* Main Command Center Layout: Map Canvas + Telegram Bot Side Panel */}
      <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-[1720px] mx-auto w-full">
        {/* Left Column (8 of 12 cols): Linear Map & Scenarios */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5">
          {/* Linear Highway Map */}
          <LinearHighwayMap
            worksites={worksites}
            bases={bases}
            vehicles={vehicles}
            mechanics={mechanics}
            activeIncidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
            onTriggerIncidentAtKm={(km) => {
              setModalInitialKm(km);
              setIsIncidentModalOpen(true);
            }}
          />

          {/* Scenarios Dock with SLA 12h countdown */}
          <DemoScenariosDock
            currentScenario={currentScenario}
            onRunScenario={(id) => {
              if (id === 'scenario_1') runScenario1();
              else if (id === 'scenario_2') runScenario2();
              else if (id === 'scenario_3') runScenario3();
              else handleResetSimulation();
            }}
            slaRemainingSeconds={slaRemainingSeconds}
            slaEscalationLevel={slaEscalationLevel}
          />
        </div>

        {/* Right Column (4-5 of 12 cols): Telegram Bot Channels */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
          <TelegramBotPanel
            messages={telegramMessages}
            activeRole={activeRole}
            onSelectRole={(role) => setActiveRole(role)}
            activeIncidents={incidents}
            onSendMessage={(role, text) => {
              addTelegramMessage({
                role,
                sender:
                  role === 'driver'
                    ? 'Водитель / Патруль'
                    : role === 'linear_mechanic'
                    ? 'Линейный механик'
                    : role === 'chief_mechanic'
                    ? 'Главный механик'
                    : role === 'dispatcher'
                    ? 'Диспетчер'
                    : 'Участник смены',
                senderRoleLabel: 'Ручной ввод',
                text,
                type: 'text',
              });
            }}
            onMechanicDecision={handleMechanicDecision}
            onDispatcherChooseOption={handleDispatcherChooseOption}
            onChiefReallocateMechanic={handleChiefReallocateMechanic}
          />
        </div>
      </main>

      {/* Fleet & Mechanics Drawer */}
      <FleetMechanicsDrawer
        isOpen={isFleetDrawerOpen}
        onClose={() => setIsFleetDrawerOpen(false)}
        mechanics={mechanics}
        vehicles={vehicles}
        bases={bases}
        worksites={worksites}
        onMoveMechanic={(mechId, baseId) => {
          handleChiefReallocateMechanic('', baseId, mechId);
        }}
        onTriggerVehicleBreakdown={(vehicleId) => {
          const veh = vehicles.find((v) => v.id === vehicleId);
          if (veh) {
            handleCreateCustomIncident({
              vehicleId,
              km: veh.locationKm,
              severity: 'heavy',
              reportedVia: 'driver_call',
              symptoms: `Поломка ${veh.boardNumber} на ПК ${veh.locationKm}. Выход из строя силовой передачи.`,
            });
            setIsFleetDrawerOpen(false);
          }
        }}
      />

      {/* Incident Modal */}
      <IncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        vehicles={vehicles}
        worksites={worksites}
        initialKm={modalInitialKm}
        onSubmitIncident={handleCreateCustomIncident}
      />
    </div>
  );
}
