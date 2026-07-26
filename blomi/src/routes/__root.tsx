import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card max-w-md rounded-3xl p-8 text-center">
        <h1 className="font-display text-3xl">Something wilted.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Refresh and we'll bloom again.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card rounded-3xl p-10 text-center">
        <h1 className="font-display text-6xl">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">This page wandered off with the moon.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">
          Home
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#f5d0e6" },
      { property: "og:site_name", content: "Blomi" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Blomi — cycle-aware monthly planner for women" },
      { property: "og:title", content: "Blomi — cycle-aware monthly planner for women" },
      { name: "twitter:title", content: "Blomi — cycle-aware monthly planner for women" },
      { name: "description", content: "Blomi arranges your monthly to-do list around your menstrual cycle. Rest during menses, ship during follicular, shine during ovulation, focus during luteal" },
      { property: "og:description", content: "Blomi arranges your monthly to-do list around your menstrual cycle. Rest during menses, ship during follicular, shine during ovulation, focus during luteal" },
      { name: "twitter:description", content: "Blomi arranges your monthly to-do list around your menstrual cycle. Rest during menses, ship during follicular, shine during ovulation, focus during luteal" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/98e93174-d5c1-4f63-b809-fdebdb36c6f7" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/98e93174-d5c1-4f63-b809-fdebdb36c6f7" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Blomi",
              description: "Cycle-aware monthly planner that helps women align tasks with their menstrual phases.",
            },
            {
              "@type": "WebSite",
              name: "Blomi",
              description: "A gentle monthly to-do list that syncs with your menstrual cycle.",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});


function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Apply persisted theme early
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("blomi-theme") : null;
    if (t === "dark") document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
