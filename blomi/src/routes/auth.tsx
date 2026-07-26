import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Moon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/cycle" });
  },
  head: () => ({
    meta: [
      { title: "Sign in or create your Blomi account" },
      {
        name: "description",
        content:
          "Sign in to Blomi or create a free account to start planning your month in tune with your menstrual cycle.",
      },
      { property: "og:title", content: "Sign in to Blomi" },
      {
        property: "og:description",
        content: "Access your cycle-aware monthly planner.",
      },
      { property: "og:url", content: "/auth" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: AuthPage,
});


function AuthPage() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a reset link.");
        setMode("in");
        return;
      }
      if (mode === "up") {

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Welcome to Blomi ✨");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      navigate({ to: "/cycle" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center justify-center gap-2">
        <Moon className="h-5 w-5 text-primary" />
        <span className="font-display text-2xl">Blomi</span>
      </div>
      <div className="glass-card rounded-3xl p-8">
        <h1 className="font-display text-3xl">
          {mode === "in" ? "Welcome back" : mode === "up" ? "Create your space" : "Reset your password"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "in"
            ? "Sign in to your monthly rhythm."
            : mode === "up"
            ? "Start tracking with intention."
            : "Enter your email and we'll send a reset link."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "up" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            required
          />
          {mode !== "forgot" && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              minLength={6}
              className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
          )}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition disabled:opacity-60"
          >
            {loading
              ? "…"
              : mode === "in"
              ? "Sign in"
              : mode === "up"
              ? "Create account"
              : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-center text-xs text-muted-foreground">
          {mode === "in" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="underline underline-offset-4"
            >
              Forgot password?
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="underline underline-offset-4"
          >
            {mode === "in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

      </div>
    </main>
  );
}
