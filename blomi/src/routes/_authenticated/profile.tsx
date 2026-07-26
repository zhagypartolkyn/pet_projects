import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LANGUAGES } from "@/lib/i18n";
import { toast } from "sonner";
import { ChevronDown, HelpCircle, LogOut, Moon, RefreshCw, Sun } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & settings — Blomi" },
      {
        name: "description",
        content:
          "Manage your Blomi profile: name, age, app language and light or dark mode. Reset your cycle and to-dos anytime.",
      },
      { property: "og:title", content: "Profile & settings — Blomi" },
      {
        property: "og:description",
        content: "Personalize Blomi — language, theme, and account.",
      },
      { property: "og:url", content: "/profile" },
    ],
    links: [{ rel: "canonical", href: "/profile" }],
  }),
  component: ProfilePage,
});


function ProfilePage() {
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: userEmail } = useQuery({
    queryKey: ["user-email"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.email ?? "",
  });

  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activityLevel, setActivityLevel] = useState("");
  const [cycleRegularity, setCycleRegularity] = useState("");
  const [cycleEnergyImpact, setCycleEnergyImpact] = useState("");
  const [workStyle, setWorkStyle] = useState("");
  const [healthOpen, setHealthOpen] = useState(false);
  // Draft copies edited only while the questionnaire is open.
  const [draftActivity, setDraftActivity] = useState("");
  const [draftRegularity, setDraftRegularity] = useState("");
  const [draftEnergy, setDraftEnergy] = useState("");
  const [draftWork, setDraftWork] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const pwMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const pwValid =
    newPassword.length >= 6 && newPassword === confirmPassword;

  async function changePassword() {
    if (!pwValid) {
      toast.error("Passwords don't match — please rewrite them");
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  }

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setAge(profile.age ?? "");
      setLanguage(profile.language ?? "en");
      setTheme((profile.theme as "light" | "dark") ?? "light");
      setActivityLevel(profile.activity_level ?? "");
      setCycleRegularity(profile.cycle_regularity ?? "");
      setCycleEnergyImpact(profile.cycle_energy_impact ?? "");
      setWorkStyle(profile.work_style ?? "");
    }
  }, [profile]);

  function applyTheme(t: "light" | "dark") {
    setTheme(t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("blomi-theme", t);
  }

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          age: age === "" ? null : Number(age),
          language,
          theme,
          activity_level: activityLevel || null,
          cycle_regularity: cycleRegularity || null,
          cycle_energy_impact: cycleEnergyImpact || null,
          work_style: workStyle || null,
        })
        .eq("user_id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  const resetAll = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error: delErr } = await supabase.from("todos").delete().eq("user_id", u.user.id);
      if (delErr) throw delErr;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          last_period_start: null,
          cycle_length: 28,
          period_length: 5,
        })
        .eq("user_id", u.user.id);
      if (profErr) throw profErr;
    },
    onSuccess: () => {
      toast.success("Everything reset — start fresh whenever you're ready");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to reset"),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Your account</p>
        <h1 className="font-display text-3xl">Profile</h1>
        <p className="mt-1 text-xs text-muted-foreground">{userEmail}</p>
      </header>

      <section className="glass-card space-y-4 rounded-3xl p-5">
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Age</span>
          <input
            type="number"
            min={10}
            max={80}
            value={age}
            onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Theme</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => applyTheme("light")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                theme === "light" ? "border-primary bg-primary/10" : "border-input bg-background/60"
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
            <button
              onClick={() => applyTheme("dark")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                theme === "dark" ? "border-primary bg-primary/10" : "border-input bg-background/60"
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
          </div>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </section>

      <section className="glass-card rounded-3xl p-5">
        <button
          type="button"
          onClick={() => {
            if (!healthOpen) {
              setDraftActivity(activityLevel);
              setDraftRegularity(cycleRegularity);
              setDraftEnergy(cycleEnergyImpact);
              setDraftWork(workStyle);
            }
            setHealthOpen((o) => !o);
          }}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg">Health & lifestyle</h2>
            <Popover>
              <PopoverTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Why we ask these questions"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground transition hover:text-foreground"
                >
                  <HelpCircle className="h-4 w-4" />
                </span>
              </PopoverTrigger>
              <PopoverContent className="text-sm" onClick={(e) => e.stopPropagation()}>
                <p className="font-medium">Personalising your AI planner</p>
                <p className="mt-1 text-muted-foreground">
                  Your answers help the AI calibrate what "high intensity" means
                  for you, how strictly to protect low-energy days, and how much
                  flexibility your work schedule allows — so the plan actually
                  fits your life.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition ${healthOpen ? "rotate-180" : ""}`}
          />
        </button>

        {healthOpen && (
          <div className="mt-4 space-y-4">
            <QuestionSelect
              label="Activity level"
              value={draftActivity}
              onChange={setDraftActivity}
              options={[
                "Very active (regular workouts)",
                "Moderately active",
                "Mostly sedentary",
                "It varies a lot",
              ]}
            />
            <QuestionSelect
              label="Cycle regularity"
              value={draftRegularity}
              onChange={setDraftRegularity}
              options={[
                "Pretty regular",
                "Irregular",
                "Not sure",
                "I'm not currently tracking a cycle",
              ]}
            />
            <QuestionSelect
              label="Does your period noticeably affect your energy / productivity?"
              value={draftEnergy}
              onChange={setDraftEnergy}
              options={["Yes, a lot", "Somewhat", "Not really", "Not sure yet"]}
            />
            <QuestionSelect
              label="Work style"
              value={draftWork}
              onChange={setDraftWork}
              options={[
                "Full-time job",
                "Part-time",
                "Freelance-flexible",
                "Student",
                "Not currently working",
              ]}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setHealthOpen(false)}
                className="flex-1 rounded-xl border border-input bg-background/60 py-3 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setActivityLevel(draftActivity);
                  setCycleRegularity(draftRegularity);
                  setCycleEnergyImpact(draftEnergy);
                  setWorkStyle(draftWork);
                  const { data: u } = await supabase.auth.getUser();
                  if (!u.user) return;
                  const { error } = await supabase
                    .from("profiles")
                    .update({
                      activity_level: draftActivity || null,
                      cycle_regularity: draftRegularity || null,
                      cycle_energy_impact: draftEnergy || null,
                      work_style: draftWork || null,
                    })
                    .eq("user_id", u.user.id);
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                  toast.success("Saved");
                  qc.invalidateQueries({ queryKey: ["profile"] });
                  setHealthOpen(false);
                }}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="glass-card space-y-3 rounded-3xl p-5">
        <h2 className="font-display text-lg">Change password</h2>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={`mt-1 w-full rounded-xl border bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring ${
              pwMismatch ? "border-destructive" : "border-input"
            }`}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Rewrite the new password"
            className={`mt-1 w-full rounded-xl border bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring ${
              pwMismatch ? "border-destructive" : "border-input"
            }`}
          />
        </label>
        {pwMismatch && (
          <p className="text-xs text-destructive">Passwords don't match — please rewrite them.</p>
        )}
        <button
          onClick={changePassword}
          disabled={pwLoading || !pwValid}
          className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-60"
        >
          {pwLoading ? "Updating…" : "Update password"}
        </button>
      </section>





      <section className="glass-card space-y-3 rounded-3xl p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg">Start from scratch</h2>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="What does resetting do?"
                className="text-muted-foreground transition hover:text-foreground"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="text-sm">
              <p className="font-medium">Reset my cycle & to-dos</p>
              <p className="mt-1 text-muted-foreground">
                Clears your saved period date and cycle lengths, and deletes every
                to-do you've added (in every month). Your account, name, language
                and theme stay. Use this if you want a clean slate.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 py-3 text-sm font-medium text-destructive"
            >
              <RefreshCw className="h-4 w-4" /> Reset my cycle & remove my to-dos
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start over from scratch?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all of your to-dos and clear your
                cycle info (last period, cycle length, period length). Your
                account and personal settings will stay. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => resetAll.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <button
        onClick={signOut}
        className="glass-card flex w-full items-center justify-center gap-2 rounded-2xl p-4 text-sm text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}

function QuestionSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(value === o ? "" : o)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              value === o
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

