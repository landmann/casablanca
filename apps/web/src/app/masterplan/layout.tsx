import type { ReactNode } from "react";

import { MasterPlanTabs } from "./tabs";

export const metadata = {
  title: "Masterplan · Casablanca",
  description: "Internal strategy, research, and build plan for Casablanca.",
  robots: { index: false, follow: false },
};

export default function MasterPlanLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-6 pt-8 pb-0 sm:px-10">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Internal
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Casablanca masterplan
              </h1>
            </div>
          </div>
          <MasterPlanTabs />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">{children}</main>
    </div>
  );
}
