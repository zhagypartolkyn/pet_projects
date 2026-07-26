import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

type Phase = "menstruation" | "follicular" | "ovulation" | "luteal";
type Priority = "high" | "medium" | "low";
type Category =
  | "rest"
  | "focus"
  | "office_work"
  | "physical_work"
  | "meeting"
  | "social"
  | "travel"
  | "workout"
  | "other";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  intensity: number; // 1..3
  priority: string; // high/medium/low
  deadline_days: number | null;
}

interface CycleInfo {
  lastPeriodStart: string;
  cycleLength: number;
  periodLength: number;
}

// --- date helpers ---
function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      ms,
  );
}

function phaseOn(date: Date, info: CycleInfo): Phase {
  const start = new Date(info.lastPeriodStart + "T00:00:00");
  const diff = daysBetween(start, date);
  const mod = ((diff % info.cycleLength) + info.cycleLength) % info.cycleLength;
  const day = mod + 1;
  const ov = Math.max(1, info.cycleLength - 14);
  if (day <= info.periodLength) return "menstruation";
  if (day >= ov - 2 && day <= ov + 2) return "ovulation";
  if (day < ov - 2) return "follicular";
  return "luteal";
}

function daysOfMonth(month: string): Date[] {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const out: Date[] = [];
  for (let d = 1; d <= last; d++) out.push(new Date(y, m - 1, d));
  return out;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// --- scheduler tables (adapted from cycleTaskScheduler.ts, 4-phase variant) ---
const INTENSITY_WEIGHT: Record<number, number> = { 1: 1, 2: 2, 3: 3 };
const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

const PHASE_ENERGY_BUDGET: Record<Phase, number> = {
  menstruation: 3,
  follicular: 6,
  ovulation: 7,
  luteal: 5,
};

const PHASE_MAX_INTENSITY: Record<Phase, number> = {
  menstruation: 1,
  follicular: 3,
  ovulation: 3,
  luteal: 2,
};

const CATEGORY_PHASE_FIT: Record<Category, Record<Phase, number>> = {
  rest:          { menstruation: 2,   follicular: 1,   ovulation: 0.5, luteal: 1.5 },
  focus:         { menstruation: 1.5, follicular: 2,   ovulation: 1.5, luteal: 2 },
  office_work:   { menstruation: 1,   follicular: 2,   ovulation: 1.5, luteal: 1.5 },
  physical_work: { menstruation: 0.5, follicular: 1.5, ovulation: 2,   luteal: 1 },
  meeting:       { menstruation: 1,   follicular: 2,   ovulation: 2,   luteal: 1 },
  social:        { menstruation: 0.5, follicular: 1.5, ovulation: 2,   luteal: 0.5 },
  travel:        { menstruation: 0.5, follicular: 1.5, ovulation: 2,   luteal: 1 },
  workout:       { menstruation: 0.5, follicular: 1.5, ovulation: 2,   luteal: 1 },
  other:         { menstruation: 1,   follicular: 1,   ovulation: 1,   luteal: 1 },
};

interface DayInfo {
  date: string;
  offsetFromStart: number;
  phase: Phase;
}

function scoreAssignment(todo: Todo, day: DayInfo, dayLoads: number[]): number {
  const budget = PHASE_ENERGY_BUDGET[day.phase];
  const used = dayLoads[day.offsetFromStart] ?? 0;
  const remaining = budget - used;
  const taskWeight = INTENSITY_WEIGHT[todo.intensity] ?? 2;

  if (todo.intensity > PHASE_MAX_INTENSITY[day.phase]) return -Infinity;
  if (taskWeight > remaining) return -Infinity;

  const cat = (todo.category ?? "other") as Category;
  const categoryFit = CATEGORY_PHASE_FIT[cat]?.[day.phase] ?? 1;
  const loadBalanceBonus = remaining / budget;
  const soonBonus = (1 / (day.offsetFromStart + 1)) * 0.3;

  return categoryFit * 3 + loadBalanceBonus + soonBonus;
}

export const generateMonthlyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("last_period_start, cycle_length, period_length")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile?.last_period_start) throw new Error("Set your cycle info first.");

    const info: CycleInfo = {
      lastPeriodStart: profile.last_period_start as string,
      cycleLength: profile.cycle_length,
      periodLength: profile.period_length,
    };

    const { data: todosRaw, error: tErr } = await supabase
      .from("todos")
      .select("id, title, description, category, intensity, priority, deadline_days")
      .eq("user_id", userId)
      .eq("month", data.month);
    if (tErr) throw new Error(tErr.message);
    const todos = (todosRaw ?? []) as Todo[];
    if (todos.length === 0) return { assigned: 0 };

    // Build day map for the month
    const monthDays = daysOfMonth(data.month);
    const days: DayInfo[] = monthDays.map((d, i) => ({
      date: toDateStr(d),
      offsetFromStart: i,
      phase: phaseOn(d, info),
    }));
    const phaseByDate = new Map(days.map((d) => [d.date, d.phase]));

    // Sort tasks: soonest deadline, then highest priority, then highest intensity
    const sorted = [...todos].sort((a, b) => {
      const ad = a.deadline_days ?? Infinity;
      const bd = b.deadline_days ?? Infinity;
      if (ad !== bd) return ad - bd;
      const pw = (PRIORITY_WEIGHT[b.priority as Priority] ?? 2) - (PRIORITY_WEIGHT[a.priority as Priority] ?? 2);
      if (pw !== 0) return pw;
      return b.intensity - a.intensity;
    });

    const dayLoads = new Array(days.length).fill(0);
    const assignments = new Map<string, string>();

    for (const todo of sorted) {
      const maxOffset = todo.deadline_days ?? days.length - 1;
      const candidates = days.filter((d) => d.offsetFromStart <= maxOffset);

      let bestDay: DayInfo | null = null;
      let bestScore = -Infinity;
      for (const day of candidates) {
        const score = scoreAssignment(todo, day, dayLoads);
        if (score > bestScore) {
          bestScore = score;
          bestDay = day;
        }
      }

      // Fallback: pick the least-loaded phase-safe day; else least-loaded overall
      if (!bestDay) {
        const phaseSafe = candidates.filter((d) => todo.intensity <= PHASE_MAX_INTENSITY[d.phase]);
        const pool = phaseSafe.length > 0 ? phaseSafe : candidates;
        if (pool.length === 0) continue;
        bestDay = pool.reduce((min, d) =>
          (dayLoads[d.offsetFromStart] ?? 0) < (dayLoads[min.offsetFromStart] ?? 0) ? d : min
        , pool[0]);
      }

      dayLoads[bestDay.offsetFromStart] += INTENSITY_WEIGHT[todo.intensity] ?? 2;
      assignments.set(todo.id, bestDay.date);
    }

    let updated = 0;
    for (const [id, date] of assignments) {
      const { error } = await supabase
        .from("todos")
        .update({ scheduled_date: date, phase: phaseByDate.get(date)! })
        .eq("id", id)
        .eq("user_id", userId);
      if (!error) updated++;
    }

    return { assigned: updated };
  });
