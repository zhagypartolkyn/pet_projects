import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Moon } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password — Blomi" },
      { name: "description", content: "Choose a new password for your Blomi account." },
    ],
    links: [{ rel: "canonical", href: "/reset-password" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
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
        <h1 className="font-display text-3xl">Set a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={6}
            className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            required
          />
          <button
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition disabled:opacity-60"
          >
            {loading ? "…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
