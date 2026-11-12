export interface VehicleInfo {
  id: string;
  make: string;
  model: string;
  year: number | string | null;
  registrationDate?: string | null;
  engine?: string;
  engineNumber?: string;
  chassisNumber?: string;
  transmission?: string;
  plateNumber?: string | null;
  currentMileageKm: number;
  latestServiceDate?: string | null;
  roadTaxExpiry?: string | null;
  insuranceExpiry?: string | null;
}

export interface PeriodicScheduleItem {
  id: string;
  name: string;
  category?: string;
  intervalKm: number;
  intervalMonths?: number | null;
  interval_months?: number | null;
  lastServicedKm: number | null;
  lastServicedDate?: string | null;
  last_serviced_date?: string | null;
  estimatedCostMyr: number | null;
  oemPartNumber?: string | null;
}

export interface MaintenanceRecord {
  id?: string;
  date: string;
  mileageKm: number | null;
  title: string;
  category?: string;
  mechanic?: string | null;
  costMyr: number | null;
  paidMyr: number | null;
  paymentMethod?: string;
  status?: string;
  notes?: string | null;
}

export interface FuelLog {
  id: string;
  date: string;
  mileageKm?: number;
  odometerKm?: number;
  liters: number;
  costMyr: number | null;
  grade?: string;
  fuelGrade?: string;
  fullTank?: boolean;
  station?: string | null;
  notes?: string | null;
}

export interface VehicleProfile {
  schemaVersion: string;
  lastUpdated: string;
  currency: string;
  vehicle: VehicleInfo;
  periodicSchedule: PeriodicScheduleItem[];
  maintenanceHistory: MaintenanceRecord[];
  fuelLogs?: FuelLog[];
}

export type ScheduleFilter = "all" | "active" | "pending" | "due";
export type DatePreset = "this-year" | "last-year" | "last-6m" | "all-time" | "custom";
export type DonutMode = "category" | "mechanic";
export type ThemeMode = "system" | "light" | "dark";
export type ItemConditionState = "good" | "soon" | "overdue" | "pending";

export interface ItemStatusResult {
  state: ItemConditionState;
  label: string;
  nextDueKm: number | null;
  nextDueDate: string | null;
  remainingKm: number | null;
  daysRemaining: number | null;
  drivenKm: number | null;
  progressPct: number;
  badgeClass: string;
  barColor: string;
  iconSvg: string;
  dueTrigger: "none" | "km" | "date" | "both";
}

export interface FuelEntryComputed extends FuelLog {
  kmL: number | null;
  distKm: number | null;
}

export interface FuelStats {
  avgKmL: number | null;
  latestKmL: number | null;
  totalDist: number;
  totalLiters: number;
  totalSpend: number;
  costPerKm: number | null;
  entries: FuelEntryComputed[];
}

export interface WelcomeTemplate {
  key: string;
  title: string;
  subtitle: string;
  desc: string;
  tags: string[];
}

export interface TemplatePreset {
  make: string;
  model: string;
  year: number;
  engine: string;
  trans: string;
  currency: string;
  mileage: number;
}

export interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

export interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}

declare global {
  interface Window {
    MOTOFOLIO_CONFIG?: {
      GOOGLE_CLIENT_ID?: string;
    };
    tailwind?: {
      config?: Record<string, unknown>;
    };
    _toastTimer?: ReturnType<typeof setTimeout>;
    openSettingsModal?: () => void;
    closeSettingsModal?: () => void;
    openDriveModal?: () => void;
    closeDriveModal?: () => void;
  }

  const google:
    | {
        accounts?: {
          oauth2?: {
            initTokenClient(config: {
              client_id: string;
              scope: string;
              callback: (resp: GoogleTokenResponse) => void | Promise<void>;
            }): GoogleTokenClient;
          };
        };
      }
    | undefined;
}
