import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import {
  cycleDayFor,
  daysInMonth,
  PHASE_META,
  phaseFor,
  toDateStr,
  type CycleInfo,
  type Phase,
} from "@/lib/cycle";
import { toast } from "sonner";
import { Droplet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PHASE_EXPLAIN: Record<Phase, { summary: string; effects: string[] }> = {
  menstruation: {
    summary:
      "Days 1–~5. The uterine lining sheds. Estrogen and progesterone are at their lowest.",
    effects: [
      "Energy and stamina are low — prioritize rest",
      "Pain sensitivity is higher, immunity slightly lower",
      "Mood can dip; introspection and journaling feel natural",
      "Best for: gentle stretching, planning, reflection",
    ],
  },
  follicular: {
    summary:
      "From end of period until ovulation. Estrogen rises as follicles mature in the ovaries.",
    effects: [
      "Energy, mood and focus climb steadily",
      "Skin and cognition feel sharper",
      "Great for learning, creative work, starting projects",
      "Body tolerates harder workouts well",
    ],
  },
  ovulation: {
    summary:
      "Mid-cycle (~day 14 in a 28-day cycle). An egg is released; estrogen peaks and testosterone rises.",
    effects: [
      "Peak energy, confidence and verbal fluency",
      "Best window for pitches, socializing, big presentations",
      "Highest tolerance for intense exercise",
      "Libido and sociability at their highest",
    ],
  },
  luteal: {
    summary:
      "From ovulation to next period (~2 weeks). Progesterone dominates; estrogen dips then falls.",
    effects: [
      "Energy gradually winds down — great for deep focus and admin",
      "Appetite and body temperature rise slightly",
      "PMS symptoms possible in the last few days",
      "Prefer moderate exercise, avoid over-scheduling",
    ],
  },
};

export const Route = createFileRoute("/_authenticated/cycle")({
  head: () => ({
    meta: [
      { title: "Cycle tracker & phase calendar — Blomi" },
      {
        name: "description",
        content:
          "Track your menstrual cycle and see menstruation, follicular, ovulation and luteal phases across your month.",
      },
      { property: "og:title", content: "Cycle tracker & phase calendar — Blomi" },
      {
        property: "og:description",
        content: "Visualize your four menstrual phases and know exactly where you are today.",
      },
      { property: "og:url", content: "/cycle" },
    ],
    links: [{ rel: "canonical", href: "/cycle" }],
  }),
  component: CyclePage,
});


function CyclePage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [lastPeriod, setLastPeriod] = useState("");
  const [cycleLen, setCycleLen] = useState(28);
  const [periodLen, setPeriodLen] = useState(5);

  useEffect(() => {
    if (profile) {
      setLastPeriod(profile.last_period_start ?? "");
      setCycleLen(profile.cycle_length ?? 28);
      setPeriodLen(profile.period_length ?? 5);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({
          last_period_start: lastPeriod || null,
          cycle_length: cycleLen,
          period_length: periodLen,
        })
        .eq("user_id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cycle updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [phaseOpen, setPhaseOpen] = useState(false);

  const info: CycleInfo | null = lastPeriod
    ? { lastPeriodStart: lastPeriod, cycleLength: cycleLen, periodLength: periodLen }
    : null;

  const today = new Date();
  const currentPhase: Phase | null = info ? phaseFor(today, info) : null;
  const currentDay = info ? cycleDayFor(today, info) : null;

  const days = useMemo(() => daysInMonth(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const todayStr = toDateStr(today);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Cycle tracker</p>
        <h1 className="font-display text-3xl">Your rhythm</h1>
      </header>

      {!info && (
        <div className="glass-card rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
          <p className="font-medium">Enter your cycle info to enable your to-do list</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Once you save the first day of your last period, the Plan tab can schedule tasks around each phase.
          </p>
        </div>
      )}


      {info && currentPhase && (
        <button
          type="button"
          onClick={() => setPhaseOpen(true)}
          className="glass-card block w-full rounded-3xl p-6 text-left transition hover:brightness-105"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${PHASE_META[currentPhase].color} 30%, transparent), color-mix(in oklab, var(--card) 92%, transparent))`,
          }}
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground">You are in</p>
          <div className="mt-1 flex items-baseline gap-3">
            <h2 className="font-display text-4xl">{PHASE_META[currentPhase].label} phase</h2>
            <span className="text-sm text-muted-foreground">day {currentDay}</span>
          </div>
          <p className="mt-3 text-sm">{PHASE_META[currentPhase].hint}</p>
          <p className="mt-2 text-[11px] uppercase tracking-widest text-primary/80">
            Tap to learn about each phase →
          </p>
        </button>
      )}

      <Dialog open={phaseOpen} onOpenChange={setPhaseOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">The four phases</DialogTitle>
            <DialogDescription>
              How your body shifts across a cycle and what each phase feels like.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-5">
            {(Object.keys(PHASE_EXPLAIN) as Phase[]).map((p) => (
              <div key={p} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: PHASE_META[p].color }}
                  />
                  <h3 className="font-display text-lg">{PHASE_META[p].label} phase</h3>
                </div>
                <p className="text-sm text-muted-foreground">{PHASE_EXPLAIN[p].summary}</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {PHASE_EXPLAIN[p].effects.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>


      <section className="glass-card space-y-4 rounded-3xl p-5">
        <h2 className="font-display text-lg">Your cycle info</h2>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            First day of your last period
          </span>
          <input
            type="date"
            value={lastPeriod}
            max={todayStr}
            onChange={(e) => setLastPeriod(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Cycle length</span>
            <input
              type="number"
              min={20}
              max={45}
              value={cycleLen}
              onChange={(e) => setCycleLen(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Period length</span>
            <input
              type="number"
              min={2}
              max={10}
              value={periodLen}
              onChange={(e) => setPeriodLen(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !lastPeriod}
          className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </section>

      <section className="glass-card rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <div className="flex gap-1 rounded-full border border-border bg-card/70 p-1">
            <button
              aria-label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded-full px-3 py-1 text-sm text-muted-foreground"
            >
              ‹
            </button>
            <button
              aria-label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded-full px-3 py-1 text-sm text-muted-foreground"
            >
              ›
            </button>

          </div>
        </div>

        {!info ? (
          <p className="text-sm text-muted-foreground">Save your cycle info to see phases across the month.</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5 text-[11px]">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="pb-1 text-center text-muted-foreground">
                  {d}
                </div>
              ))}
              {Array.from({ length: days[0].getDay() }).map((_, i) => (
                <div key={"p" + i} />
              ))}
              {days.map((d) => {
                const key = toDateStr(d);
                const phase = phaseFor(d, info);
                const isToday = key === todayStr;
                return (
                  <div
                    key={key}
                    className={`grid h-11 place-items-center rounded-xl text-sm font-medium ${
                      isToday ? "ring-2 ring-primary" : ""
                    }`}
                    style={{
                      background: `color-mix(in oklab, ${PHASE_META[phase].color} 35%, transparent)`,
                    }}
                    title={PHASE_META[phase].label}
                  >
                    {d.getDate()}
                    {phase === "menstruation" && (
                      <Droplet className="absolute -mt-6 ml-6 h-2.5 w-2.5 text-[oklch(0.5_0.2_15)]" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
              {(Object.keys(PHASE_META) as Phase[]).map((p) => (
                <div key={p} className="flex items-center gap-2 rounded-lg bg-card/70 px-2 py-1.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: PHASE_META[p].color }}
                  />
                  <span className="capitalize">{PHASE_META[p].label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
