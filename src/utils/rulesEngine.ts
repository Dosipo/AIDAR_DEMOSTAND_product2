import { Vehicle, Worksite, RepairBase, Mechanic, CompensationOption, Incident } from '../types';
import { BLIND_ZONES } from '../data/initialData';

/**
 * Проверка нахождения километра в «слепой зоне» сотовой связи
 */
export function isKmInBlindZone(km: number): { inBlindZone: boolean; label?: string } {
  for (const zone of BLIND_ZONES) {
    if (km >= zone.startKm && km <= zone.endKm) {
      return { inBlindZone: true, label: zone.label };
    }
  }
  return { inBlindZone: false };
}

/**
 * Алгоритм 4.1 PRD: Выбор опорной базы тяжелого ремонта по формуле min(|km - 74|, |km - 130|)
 * Направление происходит безальтернативно, даже при занятости механиков.
 */
export function getNearestHeavyBase(km: number): {
  baseId: 'base_74' | 'base_130';
  baseKm: 74 | 130;
  baseName: string;
  distanceKm: number;
  towingMinutes: number;
} {
  const dist74 = Math.abs(km - 74);
  const dist130 = Math.abs(km - 130);

  if (dist74 <= dist130) {
    // Средняя скорость буксировки или аварийного хода 25-30 км/ч
    const minutes = Math.max(15, Math.round((dist74 / 30) * 60));
    return {
      baseId: 'base_74',
      baseKm: 74,
      baseName: 'Опорная база тяжелого ремонта ПК 74',
      distanceKm: dist74,
      towingMinutes: minutes,
    };
  } else {
    const minutes = Math.max(15, Math.round((dist130 / 30) * 60));
    return {
      baseId: 'base_130',
      baseKm: 130,
      baseName: 'Опорная база тяжелого ремонта ПК 130',
      distanceKm: dist130,
      towingMinutes: minutes,
    };
  }
}

/**
 * Алгоритм 4.2 PRD: Логистика гусеничной техники (бульдозеры, экскаваторы)
 * - Расстояние <= 5 км: Передвигается своим ходом (без трала)
 * - Расстояние > 5 км (до 100 км): Обязательное привлечение трала (погрузка 45м + ход + разгрузка 45м)
 */
export function calculateTrackedRelocation(distanceKm: number): {
  requiresTrawl: boolean;
  estimatedMinutes: number;
  logisticsText: string;
} {
  if (distanceKm <= 5) {
    // Скорость гусеничного хода ~5 км/ч
    const minutes = Math.max(15, Math.round((distanceKm / 5) * 60));
    return {
      requiresTrawl: false,
      estimatedMinutes: minutes,
      logisticsText: `Своим ходом (${distanceKm} км ≤ 5 км, трал не требуется, ~5 км/ч)`,
    };
  } else {
    // Трал: подача трала (~20-40 мин) + погрузка (45 мин) + перевозка (40 км/ч) + разгрузка (45 мин)
    const travelMinutes = Math.round((distanceKm / 40) * 60);
    const totalMinutes = 30 + 45 + travelMinutes + 45;
    return {
      requiresTrawl: true,
      estimatedMinutes: totalMinutes,
      logisticsText: `Перевозка тралом (${distanceKm} км > 5 км: подача 30 мин + погрузка 45 мин + переезд ${travelMinutes} мин + разгрузка 45 мин)`,
    };
  }
}

/**
 * Расчет времени хода колесной техники (своим ходом до 100 км)
 */
export function calculateWheeledRelocation(distanceKm: number): number {
  // Скорость колесного самосвала на объекте ~45 км/ч
  return Math.max(10, Math.round((distanceKm / 45) * 60));
}

/**
 * Генерация вариантов компенсации простоя технологического звена (до 100 км)
 */
export function generateCompensationOptions(
  incidentKm: number,
  brokenVehicle: Vehicle,
  worksite: Worksite,
  allVehicles: Vehicle[],
  allWorksites: Worksite[],
  allBases: RepairBase[]
): CompensationOption[] {
  const options: CompensationOption[] = [];

  // Вариант 1: Подача свободного самосвала из резерва баз (в радиусе <= 100 км)
  const reserveTrucks = allVehicles.filter(
    (v) => v.type === 'dump_truck' && v.status === 'reserve' && Math.abs(v.locationKm - incidentKm) <= 100
  );

  if (reserveTrucks.length > 0) {
    // Сортируем по ближайшему
    const sorted = [...reserveTrucks].sort(
      (a, b) => Math.abs(a.locationKm - incidentKm) - Math.abs(b.locationKm - incidentKm)
    );
    const best = sorted[0];
    const dist = Math.abs(best.locationKm - incidentKm);
    const time = calculateWheeledRelocation(dist);

    options.push({
      id: `opt_reserve_${best.id}`,
      title: `Подать резервный самосвал (${best.boardNumber})`,
      description: `Выезд с базы ПК ${best.locationKm}. Перегон своим ходом ${dist} км.`,
      type: 'reserve_truck',
      targetVehicleId: best.id,
      fromKm: best.locationKm,
      toKm: incidentKm,
      distanceKm: dist,
      estimatedMinutes: time,
      requiresTrawl: false,
      chassisType: 'wheeled',
      impactNote: `Восстанавливает нормальный ритм звена через ~${time} мин. Резерв базы сокращается.`,
    });
  }

  // Вариант 2: Балансировка / Снять самосвал со смежного участка-донора (в радиусе <= 100 км)
  const donorWorksites = allWorksites.filter(
    (ws) =>
      ws.id !== worksite.id &&
      ws.assignedTruckIds.length >= 4 && // участки с 4+ самосвалами
      Math.abs(ws.km - incidentKm) <= 100
  );

  if (donorWorksites.length > 0) {
    const donorWs = donorWorksites[0];
    const donorTruckId = donorWs.assignedTruckIds[donorWs.assignedTruckIds.length - 1];
    const donorTruck = allVehicles.find((v) => v.id === donorTruckId);
    if (donorTruck) {
      const dist = Math.abs(donorWs.km - incidentKm);
      const time = calculateWheeledRelocation(dist);

      options.push({
        id: `opt_donor_${donorTruck.id}`,
        title: `Перераспределить самосвал с участка ПК ${donorWs.km}`,
        description: `Снять ${donorTruck.boardNumber} с участка "${donorWs.name}". Перегон ${dist} км.`,
        type: 'donor_truck',
        targetVehicleId: donorTruck.id,
        fromKm: donorWs.km,
        toKm: incidentKm,
        distanceKm: dist,
        estimatedMinutes: time,
        requiresTrawl: false,
        chassisType: 'wheeled',
        impactNote: `На участке ПК ${donorWs.km} останется ${donorWs.assignedTruckIds.length - 1} самосвала (вывозка замедлится на 15%, но предотвратит полный простой экскаватора на ПК ${incidentKm}).`,
      });
    }
  }

  // Вариант 3: Передислокация погрузочного звена (экскаватора) на смежный фронт
  // Ищем ближайший смежный участок для объединения потоков
  const otherWorksites = allWorksites
    .filter((ws) => ws.id !== worksite.id && Math.abs(ws.km - incidentKm) <= 100)
    .sort((a, b) => Math.abs(a.km - incidentKm) - Math.abs(b.km - incidentKm));

  if (otherWorksites.length > 0) {
    const targetWs = otherWorksites[0];
    const dist = Math.abs(targetWs.km - incidentKm);
    const trackedCalc = calculateTrackedRelocation(dist);

    options.push({
      id: `opt_relocate_exc_${worksite.excavatorId}`,
      title: `Передислоцировать экскаватор на ПК ${targetWs.km}`,
      description: `Перемещение экскаватора с ПК ${incidentKm} на участок "${targetWs.name}". ${trackedCalc.logisticsText}.`,
      type: 'relocate_excavator',
      targetVehicleId: worksite.excavatorId,
      fromKm: incidentKm,
      toKm: targetWs.km,
      distanceKm: dist,
      estimatedMinutes: trackedCalc.estimatedMinutes,
      requiresTrawl: trackedCalc.requiresTrawl,
      chassisType: 'tracked',
      impactNote: trackedCalc.requiresTrawl
        ? `Требуется тяжелый трал с базы. Перемещение займет ~${Math.round(trackedCalc.estimatedMinutes / 60)} ч.`
        : `Близкий участок (расстояние ${dist} км ≤ 5 км). Перегон своим ходом без трала за ${trackedCalc.estimatedMinutes} мин.`,
    });
  }

  return options;
}

/**
 * Проверка загрузки опорной базы: если соотношение машин к линейным механикам > 2:1
 */
export function checkBaseOverload(
  base: RepairBase,
  allMechanics: Mechanic[],
  allVehicles: Vehicle[]
): {
  isOverloaded: boolean;
  queueCount: number;
  activeMechanicsCount: number;
  ratio: number;
  recommendation?: string;
} {
  const mechanicsAtBase = allMechanics.filter((m) => m.currentBaseId === base.id && m.role === 'linear');
  const brokenVehiclesAtBase = allVehicles.filter(
    (v) => (v.status === 'in_repair' || v.status === 'evacuating') && v.baseId === base.id
  );

  const queueCount = brokenVehiclesAtBase.length;
  const activeMechanicsCount = mechanicsAtBase.length;

  if (activeMechanicsCount === 0 && queueCount > 0) {
    return {
      isOverloaded: true,
      queueCount,
      activeMechanicsCount: 0,
      ratio: queueCount,
      recommendation: `Критично: на базе нет линейных механиков при очереди ${queueCount} ед. техники!`,
    };
  }

  const ratio = activeMechanicsCount > 0 ? queueCount / activeMechanicsCount : 0;
  const isOverloaded = ratio > 2.0;

  return {
    isOverloaded,
    queueCount,
    activeMechanicsCount,
    ratio: Number(ratio.toFixed(1)),
    recommendation: isOverloaded
      ? `Нагрузка базы превышает норматив (${ratio.toFixed(1)} ед. на 1 мастера > 2.0). Рекомендуется санкционировать передислокацию линейного механика с другой базы.`
      : undefined,
  };
}
