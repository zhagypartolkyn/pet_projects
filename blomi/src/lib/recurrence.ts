export type RepeatKind =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "annually"
  | "weekdays"
  | "custom";

export interface CustomRecurrence {
  every: number; // >= 1
  unit: "day" | "week" | "month" | "year";
  weekdays: number[]; // 0=Sun..6=Sat, only for unit="week"
}

const DAY_MS = 86400000;

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nthWeekdayOfMonth(d: Date): number {
  return Math.floor((d.getDate() - 1) / 7) + 1; // 1..5
}

/**
 * Generate occurrence dates for a recurrence rule, from `start` (inclusive) up
 * to `end` (inclusive). Falls back to 60 days from start when `deadlineDays` is
 * null. Hard cap of 366 occurrences.
 */
export function generateOccurrences(opts: {
  kind: RepeatKind;
  custom?: CustomRecurrence;
  start: Date;
  deadlineDays: number | null;
}): string[] {
  const { kind, custom, start } = opts;
  const windowDays = opts.deadlineDays ?? 60;
  const end = addDays(start, windowDays);
  const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endMs = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const totalDays = Math.floor((endMs - startMs) / DAY_MS);

  const out: string[] = [];
  const push = (d: Date) => {
    if (out.length >= 366) return;
    out.push(toDateStr(d));
  };

  if (kind === "none") {
    push(start);
    return out;
  }

  if (kind === "daily") {
    for (let i = 0; i <= totalDays; i++) push(addDays(start, i));
    return out;
  }

  if (kind === "weekdays") {
    for (let i = 0; i <= totalDays; i++) {
      const d = addDays(start, i);
      const w = d.getDay();
      if (w >= 1 && w <= 5) push(d);
    }
    return out;
  }

  if (kind === "weekly") {
    for (let i = 0; i <= totalDays; i += 7) push(addDays(start, i));
    return out;
  }

  if (kind === "monthly") {
    const targetDow = start.getDay();
    const targetNth = nthWeekdayOfMonth(start);
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor.getTime() <= endMs) {
      // find nth weekday
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const offset = (targetDow - first.getDay() + 7) % 7;
      const day = 1 + offset + (targetNth - 1) * 7;
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      if (d.getMonth() === cursor.getMonth() && d.getTime() >= startMs && d.getTime() <= endMs) {
        push(d);
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return out;
  }

  if (kind === "annually") {
    let year = start.getFullYear();
    while (true) {
      const d = new Date(year, start.getMonth(), start.getDate());
      if (d.getTime() > endMs) break;
      if (d.getTime() >= startMs) push(d);
      year++;
    }
    return out;
  }

  if (kind === "custom" && custom) {
    const every = Math.max(1, Math.floor(custom.every));
    if (custom.unit === "day") {
      for (let i = 0; i <= totalDays; i += every) push(addDays(start, i));
    } else if (custom.unit === "week") {
      const days = custom.weekdays.length > 0 ? custom.weekdays : [start.getDay()];
      // Anchor week = week of start (Sun-based)
      const anchor = addDays(start, -start.getDay());
      let weekOffset = 0;
      while (true) {
        const weekStart = addDays(anchor, weekOffset * 7);
        if (weekStart.getTime() > endMs && weekOffset > 0) break;
        if ((weekOffset % every) === 0) {
          for (const w of days) {
            const d = addDays(weekStart, w);
            if (d.getTime() >= startMs && d.getTime() <= endMs) push(d);
          }
        }
        weekOffset++;
        if (weekOffset > 400) break;
      }
      // sort
      out.sort();
    } else if (custom.unit === "month") {
      let m = 0;
      while (true) {
        const d = new Date(start.getFullYear(), start.getMonth() + m * every, start.getDate());
        if (d.getTime() > endMs) break;
        if (d.getTime() >= startMs) push(d);
        m++;
        if (m > 400) break;
      }
    } else if (custom.unit === "year") {
      let y = 0;
      while (true) {
        const d = new Date(start.getFullYear() + y * every, start.getMonth(), start.getDate());
        if (d.getTime() > endMs) break;
        if (d.getTime() >= startMs) push(d);
        y++;
        if (y > 100) break;
      }
    }
    return out;
  }

  push(start);
  return out;
}

/** Human label for the repeat kind, given today's date. */
export function repeatLabel(kind: RepeatKind, today: Date): string {
  const weekday = today.toLocaleDateString(undefined, { weekday: "long" });
  const nth = nthWeekdayOfMonth(today);
  const ordinal = ["first", "second", "third", "fourth", "fifth"][nth - 1] ?? `${nth}th`;
  const monthDay = today.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  switch (kind) {
    case "none": return "Does not repeat";
    case "daily": return "Daily";
    case "weekly": return `Weekly on ${weekday}`;
    case "monthly": return `Monthly on the ${ordinal} ${weekday}`;
    case "annually": return `Annually on ${monthDay}`;
    case "weekdays": return "Every weekday (Mon–Fri)";
    case "custom": return "Custom…";
  }
}

// ---- Intensity heuristic ----
const HIGH_HINTS = [
  "intense","sprint","marathon","heavy","hard","deep","deadline","urgent",
  "crunch","exam","launch","present","presentation","interview","long run",
  "workout","training","conference","move","moving","overhaul",
];
const LOW_HINTS = [
  "rest","relax","chill","light","gentle","stretch","nap","read","journal","meditate",
];

export function detectIntensityMismatch(
  title: string,
  description: string | null,
  intensity: number,
): { suggested: number; reason: string } | null {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  const hitsHigh = HIGH_HINTS.find((w) => text.includes(w));
  const hitsLow = LOW_HINTS.find((w) => text.includes(w));
  if (hitsHigh && intensity < 3) {
    return {
      suggested: 3,
      reason: `This sounds more intense than "${intensity === 1 ? "light" : "medium"}" — the word "${hitsHigh}" suggests high.`,
    };
  }
  if (hitsLow && intensity > 1) {
    return {
      suggested: 1,
      reason: `This sounds lighter than "${intensity === 3 ? "high" : "medium"}" — the word "${hitsLow}" suggests light.`,
    };
  }
  return null;
}
