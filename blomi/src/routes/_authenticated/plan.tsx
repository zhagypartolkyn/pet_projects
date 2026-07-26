import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState, useEffect } from "react";
import { generateMonthlyPlan } from "@/lib/plan.functions";
import { daysInMonth, monthKey, phaseFor, toDateStr, PHASE_META, type CycleInfo, type Phase } from "@/lib/cycle";
import {
  generateOccurrences,
  repeatLabel,
  detectIntensityMismatch,
  type RepeatKind,
  type CustomRecurrence,
} from "@/lib/recurrence";
import { Plus, Sparkles, Trash2, Check, Pencil, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Your monthly plan — Blomi" },
      {
        name: "description",
        content:
          "Brain-dump your month and let Blomi's AI schedule each task on a day that fits your current menstrual phase.",
      },
      { property: "og:title", content: "Your monthly plan — Blomi" },
      {
        property: "og:description",
        content: "Cycle-aware AI planner for your month's meetings, workouts and travel.",
      },
      { property: "og:url", content: "/plan" },
    ],
    links: [{ rel: "canonical", href: "/plan" }],
  }),
  component: PlanPage,
});

interface Todo {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  intensity: number;
  priority: string;
  scheduled_date: string | null;
  phase: string | null;
  month: string;
  done: boolean;
  deadline_days: number | null;
  created_at: string;
}

const CATEGORIES = ["rest", "focus", "office work", "physical work", "meeting", "social", "travel", "workout", "other"];

const PRIORITIES = ["high", "medium", "low"] as const;
const INTENSITY_LABELS: Record<number, string> = { 1: "light", 2: "medium", 3: "high" };

function PhaseDot({ phase }: { phase: Phase }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: PHASE_META[phase].color }}
      title={PHASE_META[phase].label}
    />
  );
}

/** A compact filter dropdown that shows ONLY its label until clicked. */
function FilterDropdown({
  label,
  options,
  onSelect,
}: {
  label: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        <div className="max-h-64 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onSelect(o.value);
                setOpen(false);
              }}
              className="block w-full rounded-md px-3 py-1.5 text-left text-xs capitalize hover:bg-muted"
            >
              {o.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PlanPage() {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const month = monthKey(cursor);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: todos = [] } = useQuery({
    queryKey: ["todos", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("month", month)
        .order("scheduled_date", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Todo[];
    },
  });

  const cycleInfo: CycleInfo | null = useMemo(() => {
    if (!profile?.last_period_start) return null;
    return {
      lastPeriodStart: profile.last_period_start,
      cycleLength: profile.cycle_length,
      periodLength: profile.period_length,
    };
  }, [profile]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [intensity, setIntensity] = useState(2);
  const [priority, setPriority] = useState<string>("medium");
  const [deadlineDays, setDeadlineDays] = useState<number | "">("");
  const [repeat, setRepeat] = useState<RepeatKind>("none");
  const [customRec, setCustomRec] = useState<CustomRecurrence>({
    every: 1,
    unit: "week",
    weekdays: [new Date().getDay()],
  });
  const [customDeadline, setCustomDeadline] = useState<number | "">("");
  const [customOpen, setCustomOpen] = useState(false);

  const addTodo = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const start = new Date();
      const dead =
        repeat === "custom"
          ? customDeadline === ""
            ? null
            : Number(customDeadline)
          : deadlineDays === ""
            ? null
            : Number(deadlineDays);
      const dates: (string | null)[] =
        repeat === "none"
          ? [null]
          : generateOccurrences({
              kind: repeat,
              custom: customRec,
              start,
              deadlineDays: dead,
            });
      const rows = dates.map((d) => {
        const rowMonth = d ? d.slice(0, 7) : month;
        const phase = d && cycleInfo ? phaseFor(new Date(d + "T00:00:00"), cycleInfo) : null;
        return {
          user_id: u.user!.id,
          title,
          description: description || null,
          category,
          intensity,
          priority,
          deadline_days: repeat === "none" ? dead : null,
          month: rowMonth,
          scheduled_date: d,
          phase,
        };
      });
      const { error } = await supabase.from("todos").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      const mismatch = detectIntensityMismatch(title, description, intensity);
      if (count > 1) toast.success(`Added ${count} occurrences`);
      if (mismatch) {
        toast.message("Heads up — check the intensity", { description: mismatch.reason });
      }
      setTitle("");
      setDescription("");
      setCategory("other");
      setIntensity(2);
      setPriority("medium");
      setDeadlineDays("");
      setRepeat("none");
      qc.invalidateQueries({ queryKey: ["todos", month] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleDone = useMutation({
    mutationFn: async (t: Todo) => {
      const { error } = await supabase.from("todos").update({ done: !t.done }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos", month] }),
  });

  const removeTodo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos", month] }),
  });

  const updateTodo = useMutation({
    mutationFn: async (patch: { id: string } & Partial<Todo>) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("todos").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos", month] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const planFn = useServerFn(generateMonthlyPlan);
  const generate = useMutation({
    mutationFn: async () => planFn({ data: { month } }),
    onSuccess: (r) => {
      toast.success(`Planned ${r.assigned} tasks with your cycle`);
      qc.invalidateQueries({ queryKey: ["todos", month] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI planning failed"),
  });

  const days = daysInMonth(cursor.getFullYear(), cursor.getMonth());
  const byDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      if (!t.scheduled_date) continue;
      const arr = map.get(t.scheduled_date) ?? [];
      arr.push(t);
      map.set(t.scheduled_date, arr);
    }
    return map;
  }, [todos]);

  const unscheduled = todos.filter((t) => !t.scheduled_date);
  const today = toDateStr(new Date());

  // Day dialog state
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [dayTitle, setDayTitle] = useState("");
  const [dayCategory, setDayCategory] = useState("other");
  const [dayIntensity, setDayIntensity] = useState(2);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editIntensity, setEditIntensity] = useState(2);
  const [editPriority, setEditPriority] = useState<string>("medium");
  const [editDeadlineDays, setEditDeadlineDays] = useState<number | "">("");

  // Scheduled-list dialog
  const [scheduledOpen, setScheduledOpen] = useState(false);

  useEffect(() => {
    if (!openDate) {
      setDayTitle("");
      setEditingId(null);
    }
  }, [openDate]);

  const dayItems = openDate ? (byDate.get(openDate) ?? []) : [];
  const openDatePhase: Phase | null =
    openDate && cycleInfo ? phaseFor(new Date(openDate + "T00:00:00"), cycleInfo) : null;

  function startEdit(t: Todo) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditCategory(t.category ?? "other");
    setEditIntensity(t.intensity);
    setEditPriority(t.priority ?? "medium");
    setEditDeadlineDays(t.deadline_days ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    await updateTodo.mutateAsync({
      id: editingId,
      title: editTitle,
      category: editCategory,
      intensity: editIntensity,
      priority: editPriority,
      deadline_days: editDeadlineDays === "" ? null : Number(editDeadlineDays),
    });
    setEditingId(null);
  }

  async function addForDay() {
    if (!openDate || !dayTitle) return;
    const phase = openDatePhase;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("todos").insert({
      user_id: u.user.id,
      title: dayTitle,
      category: dayCategory,
      intensity: dayIntensity,
      month,
      scheduled_date: openDate,
      phase,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setDayTitle("");
    qc.invalidateQueries({ queryKey: ["todos", month] });
  }

  const scheduledDates = useMemo(() => {
    const scheduled = todos.filter((t) => t.scheduled_date);
    return Array.from(new Set(scheduled.map((t) => t.scheduled_date!))).sort();
  }, [todos]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Your month</p>
        <h1 className="font-display text-3xl">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h1>
      </header>

      {/* Task entry */}
      <section className="glass-card space-y-3 rounded-3xl p-5">
        <h2 className="font-display text-lg">Add a task for this month</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting with an investor, hiking with friends, travel…"
          className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Small details (optional)"
          rows={1}
          className="w-full resize-y rounded-xl border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-h-[2.5rem] max-h-60"
        />

        {/* Selected values summary */}
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>
            Category: <span className="capitalize text-foreground">{category}</span>
          </span>
          <span>
            · Intensity: <span className="capitalize text-foreground">{INTENSITY_LABELS[intensity]}</span>
          </span>
          <span>
            · Priority: <span className="capitalize text-foreground">{priority}</span>
          </span>
          <span>
            · Deadline: <span className="text-foreground">{deadlineDays === "" ? "none" : `${deadlineDays}d`}</span>
          </span>
          <span>
            · Repeat: <span className="text-foreground">{repeatLabel(repeat, new Date())}</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterDropdown
            label="Category"
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            onSelect={(v) => setCategory(v)}
          />
          <FilterDropdown
            label="Intensity"
            options={[
              { value: "1", label: "light" },
              { value: "2", label: "medium" },
              { value: "3", label: "high" },
            ]}
            onSelect={(v) => setIntensity(Number(v))}
          />
          <FilterDropdown
            label="Priority"
            options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            onSelect={(v) => setPriority(v)}
          />
          <FilterDropdown
            label="Deadline"
            options={[
              { value: "", label: "none" },
              ...Array.from({ length: 60 }, (_, i) => i + 1).map((d) => ({
                value: String(d),
                label: `${d} ${d === 1 ? "day" : "days"}`,
              })),
            ]}
            onSelect={(v) => setDeadlineDays(v === "" ? "" : Number(v))}
          />
          <FilterDropdown
            label={`Repeat: ${repeatLabel(repeat, new Date())}`}
            options={(["none", "daily", "weekly", "monthly", "annually", "weekdays", "custom"] as RepeatKind[]).map(
              (k) => ({
                value: k,
                label: repeatLabel(k, new Date()),
              }),
            )}
            onSelect={(v) => {
              const k = v as RepeatKind;
              setRepeat(k);
              if (k === "custom") setCustomOpen(true);
            }}
          />
          <button
            disabled={!title || addTodo.isPending}
            onClick={() => addTodo.mutate()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        <button
          disabled={!cycleInfo || todos.length === 0 || generate.isPending}
          onClick={() => generate.mutate()}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {generate.isPending ? "Planning with your cycle…" : "Plan my month with AI"}
        </button>
        {!cycleInfo && (
          <p className="text-center text-xs text-muted-foreground">Set your cycle info in the Cycle tab first.</p>
        )}
      </section>

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Not yet scheduled</h3>
          <ul className="space-y-2">
            {unscheduled.map((t) => (
              <li key={t.id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                <button
                  aria-label={t.done ? "Mark as not done" : "Mark as done"}
                  onClick={() => toggleDone.mutate(t)}
                  className={`grid h-6 w-6 place-items-center rounded-full border ${
                    t.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {t.done && <Check className="h-3.5 w-3.5" />}
                </button>
                <div className="flex-1">
                  <p className={`text-sm ${t.done ? "line-through opacity-60" : ""}`}>{t.title}</p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  {t.category}
                </span>
                <button
                  aria-label="Delete task"
                  onClick={() => removeTodo.mutate(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Calendar */}
      <section className="glass-card rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <div className="flex gap-1 rounded-full border border-border bg-card/70 p-1">
            <button
              aria-label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded-full px-3 py-1 text-sm text-muted-foreground hover:bg-muted"
            >
              ‹
            </button>
            <button
              aria-label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded-full px-3 py-1 text-sm text-muted-foreground hover:bg-muted"
            >
              ›
            </button>
          </div>
        </div>
        {!cycleInfo ? (
          <p className="text-sm text-muted-foreground">Add your cycle info to color the calendar with your phases.</p>
        ) : (
          <>
            <p className="mb-2 text-[11px] text-muted-foreground">Tap any day to add or edit tasks.</p>
            <div className="grid grid-cols-7 gap-1.5 text-[11px]">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="pb-1 text-center text-muted-foreground">
                  {d}
                </div>
              ))}
              {Array.from({ length: days[0].getDay() }).map((_, i) => (
                <div key={"pad" + i} />
              ))}
              {days.map((d) => {
                const key = toDateStr(d);
                const phase = phaseFor(d, cycleInfo);
                const items = byDate.get(key) ?? [];
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOpenDate(key)}
                    className={`min-h-16 rounded-xl border p-1.5 text-left transition hover:brightness-110 ${
                      isToday ? "border-primary" : "border-transparent"
                    }`}
                    style={{ background: `color-mix(in oklab, ${PHASE_META[phase].color} 22%, transparent)` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{d.getDate()}</span>
                      <PhaseDot phase={phase} />
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {items.slice(0, 2).map((t) => (
                        <div key={t.id} className="truncate rounded bg-card/80 px-1 py-0.5 text-[10px]">
                          {t.title}
                        </div>
                      ))}
                      {items.length > 2 && <div className="text-[10px] text-muted-foreground">+{items.length - 2}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
              {(Object.keys(PHASE_META) as Phase[]).map((p) => (
                <div key={p} className="flex items-center gap-2 rounded-lg bg-card/70 px-2 py-1.5">
                  <span className="h-3 w-3 rounded-full" style={{ background: PHASE_META[p].color }} />
                  <span className="capitalize">{PHASE_META[p].label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Scheduled — single collapsible button that opens a dialog */}
      {cycleInfo && scheduledDates.length > 0 && (
        <button
          type="button"
          onClick={() => setScheduledOpen(true)}
          className="glass-card flex w-full items-center justify-between rounded-2xl p-4 text-left hover:bg-muted/30"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Scheduled</p>
            <p className="text-sm">
              {scheduledDates.length} {scheduledDates.length === 1 ? "day" : "days"} planned this month
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <Dialog open={scheduledOpen} onOpenChange={setScheduledOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Scheduled days</DialogTitle>
            <DialogDescription>Tap a day to see, edit or add its tasks.</DialogDescription>
          </DialogHeader>
          <ul className="mt-3 space-y-2">
            {scheduledDates.map((date) => {
              const items = todos.filter((t) => t.scheduled_date === date);
              const d = new Date(date + "T00:00:00");
              const phase = cycleInfo ? phaseFor(d, cycleInfo) : null;
              return (
                <li key={date}>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduledOpen(false);
                      setOpenDate(date);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left transition hover:bg-muted/40"
                  >
                    <div className="flex w-14 flex-col items-center">
                      <span className="font-display text-lg leading-none">{d.getDate()}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {d.toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1">
                      {items.map((t) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${
                              t.priority === "high"
                                ? "bg-rose-500"
                                : t.priority === "low"
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                            }`}
                          />
                          <span className={`text-sm ${t.done ? "line-through opacity-60" : ""}`}>{t.title}</span>
                          {t.category && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                              {t.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {phase && <PhaseDot phase={phase} />}
                    <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">{items.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Day editor */}
      <Dialog open={!!openDate} onOpenChange={(o) => !o && setOpenDate(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {openDate &&
                new Date(openDate + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
            </DialogTitle>
            <DialogDescription>
              {openDatePhase ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: PHASE_META[openDatePhase].color }}
                  />
                  <span className="capitalize">{PHASE_META[openDatePhase].label} phase</span>
                  <span className="text-muted-foreground">— {PHASE_META[openDatePhase].hint}</span>
                </span>
              ) : (
                "Add or edit tasks for this day."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3">
            {dayItems.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet for this day.</p>}
            {dayItems.map((t) =>
              editingId === t.id ? (
                <div key={t.id} className="space-y-2 rounded-2xl border border-border p-3">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>
                      Category: <span className="capitalize text-foreground">{editCategory}</span>
                    </span>
                    <span>
                      · Intensity: <span className="capitalize text-foreground">{INTENSITY_LABELS[editIntensity]}</span>
                    </span>
                    <span>
                      · Priority: <span className="capitalize text-foreground">{editPriority}</span>
                    </span>
                    <span>
                      · Deadline:{" "}
                      <span className="text-foreground">
                        {editDeadlineDays === "" ? "none" : `${editDeadlineDays}d`}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FilterDropdown
                      label="Category"
                      options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                      onSelect={(v) => setEditCategory(v)}
                    />
                    <FilterDropdown
                      label="Intensity"
                      options={[
                        { value: "1", label: "light" },
                        { value: "2", label: "medium" },
                        { value: "3", label: "high" },
                      ]}
                      onSelect={(v) => setEditIntensity(Number(v))}
                    />
                    <FilterDropdown
                      label="Priority"
                      options={PRIORITIES.map((p) => ({ value: p, label: p }))}
                      onSelect={(v) => setEditPriority(v)}
                    />
                    <FilterDropdown
                      label="Deadline"
                      options={[
                        { value: "", label: "none" },
                        ...Array.from({ length: 60 }, (_, i) => i + 1).map((d) => ({
                          value: String(d),
                          label: `${d} ${d === 1 ? "day" : "days"}`,
                        })),
                      ]}
                      onSelect={(v) => setEditDeadlineDays(v === "" ? "" : Number(v))}
                    />
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-full px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                  <button
                    aria-label={t.done ? "Mark as not done" : "Mark as done"}
                    onClick={() => toggleDone.mutate(t)}
                    className={`grid h-6 w-6 place-items-center rounded-full border ${
                      t.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {t.done && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${t.done ? "line-through opacity-60" : ""}`}>{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.category} · intensity {t.intensity} · {t.priority}
                      {t.deadline_days != null &&
                        (() => {
                          const base = t.created_at ? new Date(t.created_at) : new Date();
                          const deadline = new Date(base);
                          deadline.setDate(deadline.getDate() + t.deadline_days);
                          return (
                            <>
                              {" "}
                              · deadline {deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" })} (
                              {t.deadline_days}d)
                            </>
                          );
                        })()}
                    </p>
                  </div>
                  <button
                    aria-label="Edit task"
                    onClick={() => startEdit(t)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Delete task"
                    onClick={() => removeTodo.mutate(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            )}

            <div className="space-y-2 rounded-2xl bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Add to this day</p>
              <input
                value={dayTitle}
                onChange={(e) => setDayTitle(e.target.value)}
                placeholder="New task…"
                className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span>
                  Category: <span className="capitalize text-foreground">{dayCategory}</span>
                </span>
                <span>
                  · Intensity: <span className="capitalize text-foreground">{INTENSITY_LABELS[dayIntensity]}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterDropdown
                  label="Category"
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  onSelect={(v) => setDayCategory(v)}
                />
                <FilterDropdown
                  label="Intensity"
                  options={[
                    { value: "1", label: "light" },
                    { value: "2", label: "medium" },
                    { value: "3", label: "high" },
                  ]}
                  onSelect={(v) => setDayIntensity(Number(v))}
                />
                <button
                  disabled={!dayTitle}
                  onClick={addForDay}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom recurrence */}
      <Dialog
        open={customOpen}
        onOpenChange={(o) => {
          setCustomOpen(o);
          if (!o && repeat === "custom" && customRec.unit === "week" && customRec.weekdays.length === 0) {
            // avoid a broken recurrence with no days selected
            setRepeat("none");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Custom recurrence</DialogTitle>
            <DialogDescription>Set your own repeat rhythm.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Repeat every</span>
              <input
                type="number"
                min={1}
                max={99}
                value={customRec.every}
                onChange={(e) => setCustomRec({ ...customRec, every: Math.max(1, Number(e.target.value) || 1) })}
                className="w-16 rounded-lg border border-input bg-background/60 px-2 py-1.5 text-center text-sm"
              />
              <select
                value={customRec.unit}
                onChange={(e) => setCustomRec({ ...customRec, unit: e.target.value as CustomRecurrence["unit"] })}
                className="rounded-lg border border-input bg-background/60 px-2 py-1.5 text-sm"
              >
                <option value="day">day{customRec.every > 1 ? "s" : ""}</option>
                <option value="week">week{customRec.every > 1 ? "s" : ""}</option>
                <option value="month">month{customRec.every > 1 ? "s" : ""}</option>
                <option value="year">year{customRec.every > 1 ? "s" : ""}</option>
              </select>
            </div>

            {customRec.unit === "week" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Repeat on</p>
                <div className="flex flex-wrap gap-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((letter, idx) => {
                    const active = customRec.weekdays.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? customRec.weekdays.filter((w) => w !== idx)
                            : [...customRec.weekdays, idx].sort();
                          setCustomRec({ ...customRec, weekdays: next });
                        }}
                        className={`grid h-9 w-9 place-items-center rounded-full text-xs font-medium transition ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "border border-input bg-background/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ends by{" "}
                <span className="text-[11px]">(reuses the deadline filter — up to 60 days; defaults to 60)</span>
              </p>
              <FilterDropdown
                label={`Deadline: ${customDeadline === "" ? "60 days (default)" : `${customDeadline}d`}`}
                options={[
                  { value: "", label: "No deadline (60 days default)" },
                  ...Array.from({ length: 60 }, (_, i) => i + 1).map((d) => ({
                    value: String(d),
                    label: `${d} ${d === 1 ? "day" : "days"}`,
                  })),
                ]}
                onSelect={(v) => setCustomDeadline(v === "" ? "" : Number(v))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(false);
                  setRepeat("none");
                }}
                className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                disabled={customRec.unit === "week" && customRec.weekdays.length === 0}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
