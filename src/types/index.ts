/**
 * Core Data Models & Types for Road Construction Downtime Prevention System
 */

export type ChassisType = 'wheeled' | 'tracked';

export type VehicleType = 'dump_truck' | 'excavator' | 'bulldozer' | 'patrol_car' | 'trawl';

export type VehicleStatus = 
  | 'working'        // На линии в работе
  | 'minor_issue'    // Легкая поломка (осмотр на месте)
  | 'evacuating'     // Эвакуация на опорную базу
  | 'in_repair'      // На ремонте на базе
  | 'reserve'        // Исправна в резерве
  | 'in_transit';    // В пути (на перегоне / на трале)

export interface Vehicle {
  id: string;
  boardNumber: string; // Номер борта (напр. "КАМАЗ №402", "CAT D6 №12")
  model: string;
  type: VehicleType;
  chassisType: ChassisType;
  locationKm: number;
  worksiteId: string | null; // ID участка или null (если на базе/в резерве)
  baseId?: string | null;    // ID базы, если приписан или находится там
  status: VehicleStatus;
  statusNote?: string;
  assignedToIncidentId?: string;
}

export type WorksiteStatus = 'optimal' | 'bottleneck' | 'idle_halted';

export interface Worksite {
  id: string;
  name: string; // Напр. "Участок 1 (Выемка ПК 45)"
  km: number;
  inCellCoverage: boolean; // Есть ли сотовая связь
  excavatorId: string;
  bulldozerId: string;
  assignedTruckIds: string[];
  status: WorksiteStatus;
  statusDetail?: string;
}

export interface RepairBase {
  id: string;
  name: string;
  km: number; // 74 и 130 - опорные базы тяжелого ремонта; 25 и 102 - малые базы
  isHeavyBase: boolean;
  assignedMechanicIds: string[];
  vehicleQueueIds: string[];
  capacity: number; // Вместимость постов
}

export type MechanicRole = 'chief' | 'linear';

export interface Mechanic {
  id: string;
  fullName: string;
  role: MechanicRole;
  currentBaseId: string;
  phone: string;
  status: 'available' | 'busy_repair' | 'traveling_to_base' | 'field_visit';
}

export type IncidentSeverity = 'minor' | 'heavy';
export type ReporterChannel = 'driver_call' | 'patrol_report' | 'passby_transport';
export type IncidentResolutionStatus = 
  | 'new_reported'
  | 'mechanic_triaged'
  | 'evacuating_to_base'
  | 'compensation_active'
  | 'sla_12h_countdown'
  | 'resolved';

export interface CompensationOption {
  id: string;
  title: string;
  description: string;
  type: 'reserve_truck' | 'donor_truck' | 'relocate_excavator';
  targetVehicleId: string;
  fromKm: number;
  toKm: number;
  distanceKm: number;
  estimatedMinutes: number;
  requiresTrawl: boolean;
  chassisType: ChassisType;
  impactNote: string;
}

export interface Incident {
  id: string;
  timestamp: number;
  vehicleId: string;
  vehicleBoard: string;
  vehicleType: VehicleType;
  worksiteId: string;
  worksiteName: string;
  km: number;
  isBlindZone: boolean;
  reportedVia: ReporterChannel;
  reportedBy: string;
  initialSymptoms: string;
  severity?: IncidentSeverity;
  decision?: 'roadside_repair' | 'evacuate_heavy';
  targetBaseKm?: number; // 74 or 130 if heavy
  targetBaseId?: string;
  status: IncidentResolutionStatus;
  options: CompensationOption[];
  chosenOptionId?: string;
  // SLA
  sla12hActive: boolean;
  slaStartTime?: number;
  slaRemainingSeconds?: number;
  slaEscalationLevel?: 'normal' | 'warn_6h' | 'critical_10h';
  resolvedAt?: number;
}

export type TelegramRole = 'general_chat' | 'driver' | 'linear_mechanic' | 'chief_mechanic' | 'dispatcher';

export interface TelegramMessage {
  id: string;
  role: TelegramRole;
  sender: string;
  senderRoleLabel: string;
  timestamp: string;
  text: string;
  type: 'text' | 'card' | 'alert' | 'system';
  incidentId?: string;
  actions?: {
    label: string;
    actionKey: string;
    payload?: any;
    primary?: boolean;
    danger?: boolean;
  }[];
}

export type DemoScenarioId = 'scenario_1' | 'scenario_2' | 'scenario_3' | 'free_simulation';
