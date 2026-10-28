export interface User { id: string; name: string; phone: string; region: string; role: string }
export interface Farm { id: string; name: string; totalArea: number; soilType: string }
export type SensorType = 'START_0M' | 'MID_5M' | 'END_10M';
export type ValveMode = 'AUTO' | 'MANUAL';

export interface SensorReading {
  sensorId: string; sensorType: SensorType; positionM: number; status: 'ONLINE' | 'OFFLINE' | 'LOW_BATTERY';
  batteryLevel: number; signalQuality: number; moisture: number | null; temperature: number | null; timestamp: string | null;
}
export interface ValveState { valveOpen: boolean; valveMode: ValveMode; valveOpenedAt: string | null }
export interface SensorSnapshot {
  farm: { id: string; name: string; flowRateLpm: number } & ValveState;
  thresholds: { OPEN_BELOW: number; FIELD_CAPACITY: number };
  sensors: SensorReading[];
}
export interface ValveEvent { id: string; action: 'OPEN' | 'CLOSE'; reason: string; litres: number | null; createdAt: string }
export interface HistoryPoint { t: number; START_0M?: number; MID_5M?: number; END_10M?: number }

export interface Remedy { id: string; remedyName: string; targetPest: string; category: 'PEST' | 'DISEASE'; ingredients: string[]; preparation: string[]; dosage: string; timing: string; safety: string }
export interface Fertilizer { id: string; name: string; summary: string; ingredients: string[]; steps: string[]; applicationRate: string; curingDays: number; benefits: string[] }
export interface CropOption { key: string; name: string; durationDays: number }

export type CropStage = 'SOWING' | 'GERMINATION' | 'VEGETATIVE' | 'FLOWERING' | 'HARVEST';
export const STAGES: CropStage[] = ['SOWING', 'GERMINATION', 'VEGETATIVE', 'FLOWERING', 'HARVEST'];
export interface Portfolio { id: string; cropName: string; variety: string; sowingDate: string; status: CropStage; totalWaterUsed: number; farm: { id: string; name: string; totalArea?: number }; records?: FarmRecord[] }
export interface FarmRecord { id: string; date: string; stage: CropStage; activity: string; expense: number; income: number; waterLitres: number; notes: string | null }
export interface Audit {
  financial: { totalExpense: number; totalIncome: number; netProfit: number; expenseByStage: { stage: CropStage; expense: number }[] };
  water: { dripLitres: number; floodBaselineLitres: number; savedLitres: number; savedPercent: number; costSaved: number; costPerKilolitre: number; cropProgressPercent: number; assumption: string };
}
