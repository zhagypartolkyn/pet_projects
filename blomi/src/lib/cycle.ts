// Cycle phase math based on standard reproductive biology.
// Luteal phase length is relatively constant (~14 days); ovulation ≈ cycle_length - 14.
export type Phase = "menstruation" | "follicular" | "ovulation" | "luteal";

export interface CycleInfo {
  lastPeriodStart: string; // yyyy-mm-dd
  cycleLength: number;
  periodLength: number;
}

const OVULATION_WINDOW = 2; // ±2 days around ovulation day

function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((db - da) / ms);
}

export function cycleDayFor(date: Date, info: CycleInfo): number {
  const start = new Date(info.lastPeriodStart + "T00:00:00");
  const diff = daysBetween(start, date);
  // wrap into current cycle (1-indexed)
  const mod = ((diff % info.cycleLength) + info.cycleLength) % info.cycleLength;
  return mod + 1;
}

export function phaseForDay(day: number, info: CycleInfo): Phase {
  const ovulation = Math.max(1, info.cycleLength - 14);
  if (day <= info.periodLength) return "menstruation";
  if (day >= ovulation - OVULATION_WINDOW && day <= ovulation + OVULATION_WINDOW) return "ovulation";
  if (day < ovulation - OVULATION_WINDOW) return "follicular";
  return "luteal";
}

export function phaseFor(date: Date, info: CycleInfo): Phase {
  return phaseForDay(cycleDayFor(date, info), info);
}

export const PHASE_META: Record<Phase, { label: string; color: string; hint: string; maxIntensity: number }> = {
  menstruation: {
    label: "Menstruation",
    color: "oklch(0.72 0.16 15)",
    hint: "Rest, gentle stretching, journaling. Avoid high-intensity plans.",
    maxIntensity: 1,
  },
  follicular: {
    label: "Follicular",
    color: "oklch(0.78 0.13 130)",
    hint: "Energy rising — great for creative work, learning, new projects.",
    maxIntensity: 3,
  },
  ovulation: {
    label: "Ovulation",
    color: "oklch(0.78 0.16 55)",
    hint: "Peak energy & confidence — pitch meetings, socializing, big workouts.",
    maxIntensity: 3,
  },
  luteal: {
    label: "Luteal",
    color: "oklch(0.7 0.11 300)",
    hint: "Wind-down phase — deep focus, admin, moderate exercise.",
    maxIntensity: 2,
  },
};

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month0: number): Date[] {
  const days: Date[] = [];
  const last = new Date(year, month0 + 1, 0).getDate();
  for (let i = 1; i <= last; i++) days.push(new Date(year, month0, i));
  return days;
}
