import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, Files, FolderKanban } from "lucide-react";

import { DOCS } from "./docs";
import { MasterPlanTabs } from "./tabs";

export const metadata = {
  title: "Masterplan · Casedra",
  description:
    "Casedra strategy, operating docs, and repository markdowns in a single reading surface.",
  robots: { index: false, follow: false },
};

export default function MasterPlanLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(156,97,55,0.18),transparent_44%),radial-gradient(circle_at_top_right,rgba(232,223,204,0.88),transparent_42%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,251,242,0),rgba(255,251,242,0.92)_24%,rgba(255,251,242,1))]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-8 overflow-hidden rounded-[30px] border border-border/80 bg-background/92 p-6 shadow-[0_30px_90px_rgba(31,26,20,0.08)] backdrop-blur sm:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                <BookOpenText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Internal reading room
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl font-serif text-4xl font-normal leading-[1.02] text-foreground sm:text-5xl">
                  The Casedra plan stack, in one place.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Strategy, operating doctrine, execution plans, and project docs. This surface now
                  exposes the full authored markdown set behind the company thesis, not just the core
                  `MASTER-PLAN` folder.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  Back to homepage
                </Link>
                <Link
                  href="/book-demo"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-primary transition-colors hover:bg-primary/10"
                >
                  Book a walkthrough
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[24px] border border-border/70 bg-secondary/50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  <Files className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Coverage
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {DOCS.length} docs
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The full repo-authored markdown set surfaced inside `/masterplan`.
                </p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Primary stack
                </p>
                <p className="mt-3 font-serif text-2xl font-normal leading-tight text-foreground">
                  `Read First` to `Execution 2026`
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The strategy order stays intact while additional project docs sit alongside it.
                </p>
              </div>
              <div className="rounded-[24px] border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-primary">
                  <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
                  Reading mode
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground/90">
                  Start with the thesis, then move into doctrine, roadmap, GTM, finance, and execution.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-8 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <MasterPlanTabs />
          </aside>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
