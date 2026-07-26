import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeart, ListChecks, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const loc = useLocation();
  const tabs = [
    { to: "/plan", label: "Plan", icon: ListChecks },
    { to: "/cycle", label: "Cycle", icon: CalendarHeart },
    { to: "/profile", label: "Profile", icon: User },
  ] as const;

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-28 pt-6">
      <Outlet />
      <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(28rem,calc(100%-1.5rem))] items-center justify-around rounded-full border border-border/70 bg-card/85 p-1.5 shadow-2xl shadow-primary/15 backdrop-blur-xl">
        {tabs.map((t) => {
          const active = loc.pathname === t.to;
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full px-3 py-2 text-[11px] transition ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
