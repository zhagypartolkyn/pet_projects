import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Moon, Sparkles, CalendarHeart } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/plan" });
  },
  head: () => ({
    meta: [
      { title: "Blomi — cycle-aware monthly planner for women" },
      {
        name: "description",
        content:
          "Blomi arranges your monthly to-do list around your menstrual cycle. Rest during menstruation, ship during follicular, shine during ovulation, focus during luteal.",
      },
      { property: "og:title", content: "Blomi — cycle-aware monthly planner for women" },
      {
        property: "og:description",
        content: "A monthly planner that syncs your tasks with your menstrual phases, powered by AI.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});


function Landing() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 md:px-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-primary" />
          <span className="font-display text-xl font-semibold tracking-tight">Blomi</span>
        </div>
        <Link
          to="/auth"
          className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm backdrop-blur"
        >
          Sign in
        </Link>
      </header>

      <section className="mt-20 grid items-center gap-14 md:mt-28 md:grid-cols-2">
        <div>
          <span className="phase-chip bg-secondary text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Cycle-aware planning
          </span>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] md:text-7xl">
            A month that <em className="text-primary">flows</em> with you.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Blomi arranges your to-do list around your menstrual cycle — rest during
            menstruation, ship during follicular, shine during ovulation, focus during luteal.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25"
            >
              Start planning
            </Link>
            <a
              href="#how"
              className="rounded-full border border-border bg-card/60 px-6 py-3 text-sm backdrop-blur"
            >
              How it works
            </a>
          </div>
        </div>

        <div className="glass-card relative aspect-square rounded-[2.5rem] p-6">
          <div className="grid h-full grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, i) => {
              const phase =
                i % 28 < 5
                  ? "bg-[oklch(0.86_0.09_15)]"
                  : i % 28 < 12
                    ? "bg-[oklch(0.86_0.09_130)]"
                    : i % 28 < 16
                      ? "bg-[oklch(0.86_0.11_55)]"
                      : "bg-[oklch(0.83_0.09_300)]";
              return <div key={i} className={`rounded-lg ${phase} opacity-90`} />;
            })}
          </div>
          <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-card/90 p-4 shadow-lg">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Today · Ovulation</p>
            <p className="font-display text-lg">Pitch to investor · Hike with friends</p>
          </div>
        </div>
      </section>

      <section id="how" className="mt-28 grid gap-4 md:grid-cols-3">
        {[
          { icon: CalendarHeart, title: "Track your cycle", body: "Enter your last period. We map the whole month." },
          { icon: Sparkles, title: "Brain-dump your month", body: "Meetings, trips, workouts — throw it all in." },
          { icon: Moon, title: "AI arranges it", body: "Each task lands on a day your body will thank you for." },
        ].map((s) => (
          <div key={s.title} className="glass-card rounded-3xl p-6">
            <s.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-display text-2xl">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </section>


      <footer className="mt-24 py-8 text-center text-xs text-muted-foreground">
        Made with care · Blomi
      </footer>
    </main>
  );
}
