import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@casablanca/ui";

const quickActions = [
  {
    title: "Connect a live channel",
    description:
      "Set up WhatsApp or portal forwarding so real inbound demand lands in the workflow.",
    icon: MessageSquareText,
    cta: "Open channel setup",
    href: "/app/onboarding?step=brand",
  },
  {
    title: "Review routing rules",
    description:
      "Define who owns which leads, when AI can continue, and when handoff should happen.",
    icon: Workflow,
    cta: "Inspect routing",
    href: "#",
  },
  {
    title: "Prepare seller proof",
    description:
      "Turn response and conversion performance into a weekly pack for owner-facing conversations.",
    icon: LayoutDashboard,
    cta: "Generate proof pack",
    href: "#",
  },
  {
    title: "Coordinate rollout",
    description:
      "Track deployment status, at-risk accounts, and who needs training before go-live.",
    icon: Users,
    cta: "View rollout tasks",
    href: "mailto:product@casablanca.cloud",
  },
] as const;

const inboxQueue = [
  {
    contact: "Ana Garcia",
    source: "Idealista",
    state: "Awaiting agent",
    owner: "Marta Ruiz",
    summary: "Viewing request for a 2-bed in Chamberi. Budget already qualified.",
  },
  {
    contact: "Carlos Moreno",
    source: "WhatsApp",
    state: "Bot active",
    owner: "AI",
    summary: "Asking about availability and parking for a listing in Chamartin.",
  },
  {
    contact: "Lucia Vega",
    source: "Web valuation form",
    state: "New seller lead",
    owner: "Owner nurture queue",
    summary: "Requested valuation for a 3-bed flat and wants a meeting next week.",
  },
] as const;

const scorecard = [
  { label: "Median first response", value: "01:42", tone: "text-foreground" },
  { label: "Inbox weekly active", value: "81%", tone: "text-foreground" },
  { label: "Live channels connected", value: "14 / 16", tone: "text-foreground" },
  { label: "Trust incidents", value: "0", tone: "text-primary" },
] as const;

const workflowCards = [
  {
    title: "Response control",
    body:
      "Casablanca answered 92% of meaningful leads inside SLA this week and escalated only when local context was required.",
    footer: "Updated 12 minutes ago",
  },
  {
    title: "Manager visibility",
    body:
      "Two accounts need routing adjustments because weekend coverage dropped below target.",
    footer: "Needs review today",
  },
  {
    title: "Seller acquisition",
    body:
      "Five owner opportunities were created from proof-led follow-up and valuation capture flows.",
    footer: "Expansion wedge active",
  },
] as const;

const activityFeed = [
  {
    title: "Weekly proof memo delivered",
    description: "Atico Chamberi received their Monday review with SLA and recovery metrics.",
    timestamp: "09:12",
    icon: CheckCircle2,
  },
  {
    title: "Low-confidence handoff triggered",
    description: "Mortgage timing question escalated to Marta Ruiz with full conversation summary.",
    timestamp: "08:47",
    icon: AlertCircle,
  },
  {
    title: "New seller valuation request",
    description: "Lucia Vega entered via owner capture page and routed into nurture workflow.",
    timestamp: "08:31",
    icon: Sparkles,
  },
] as const;

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8rem] top-[-5rem] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(156,97,55,0.16),transparent_62%)] blur-3xl" />
          <div className="absolute right-[-8rem] top-0 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(232,223,204,0.92),transparent_64%)] blur-3xl" />
        </div>

        <header className="relative border-b border-border/80 bg-background/88 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px] sm:tracking-[0.24em]">
                <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Product preview
              </div>
              <div>
                <h1 className="font-serif text-[2.8rem] font-normal leading-tight text-foreground sm:text-[4rem]">
                  Agency command center
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                  A preview of Casablanca as the live workflow layer around inbound demand, team
                  routing, and seller-side proof. This is the product posture the public UI now points to.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <Button asChild className="rounded-full px-6">
                <Link href="/book-demo" className="inline-flex items-center gap-2">
                  Book a walkthrough
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Link
                href="/masterplan"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Read the planning stack
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-8 sm:px-8 sm:py-10">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Card
                  key={action.title}
                  className="rounded-[26px] border-border/80 bg-background/92 shadow-[0_18px_60px_rgba(31,26,20,0.06)]"
                >
                  <CardHeader className="space-y-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{action.title}</CardTitle>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button asChild variant="secondary" className="rounded-full px-5">
                      <Link href={action.href} className="inline-flex items-center gap-2">
                        {action.cta}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className="rounded-[28px] border-border/80 bg-background/92 shadow-[0_24px_70px_rgba(31,26,20,0.07)] sm:rounded-[30px]">
              <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                  <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                    Live inbox queue
                  </CardTitle>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    A single surface for buyer leads, seller capture, and human takeover.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="#">
                    Open inbox
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {inboxQueue.map((item) => (
                  <div
                    key={item.contact}
                    className="rounded-[24px] border border-border/80 bg-secondary/45 p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{item.contact}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                          {item.source}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        <span className="rounded-full border border-border bg-background px-3 py-1">
                          {item.state}
                        </span>
                        <span className="rounded-full border border-border bg-background px-3 py-1">
                          Owner: {item.owner}
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-foreground/90">{item.summary}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-primary/25 bg-primary/10 sm:rounded-[30px]">
              <CardHeader>
                <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                  Office scorecard
                </CardTitle>
                <p className="mt-2 text-sm leading-6 text-foreground/75">
                  The metrics that decide whether the workflow is healthy, trusted, and worth expanding.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {scorecard.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-primary/15 bg-background/94 px-4 py-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className={`mt-3 text-3xl font-semibold tracking-tight ${item.tone}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
            <Card className="rounded-[28px] border-border/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.96),rgba(248,241,229,0.88))] shadow-[0_24px_70px_rgba(31,26,20,0.07)] sm:rounded-[30px]">
              <CardHeader>
                <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                  Workflow highlights
                </CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The surfaces that make Casablanca feel like infrastructure rather than a novelty layer.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {workflowCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[24px] border border-border/80 bg-background px-5 py-5"
                  >
                    <p className="text-lg font-semibold text-foreground">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.body}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-primary">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {card.footer}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="rounded-[28px] border-border/80 bg-background/92 shadow-[0_24px_70px_rgba(31,26,20,0.07)] sm:rounded-[30px]">
                <CardHeader>
                  <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                    Recent activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activityFeed.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.title}
                        className="flex items-start gap-4 rounded-[22px] border border-border/80 bg-secondary/45 p-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                              {item.timestamp}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border-primary/25 bg-primary/10 sm:rounded-[30px]">
                <CardHeader>
                  <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                    Deployment checklist
                  </CardTitle>
                  <p className="mt-2 text-sm leading-6 text-foreground/75">
                    A reminder that rollout quality is part of the product, not a support afterthought.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "At least one live channel connected",
                    "Clear assignment and takeover rules agreed with the office",
                    "First proof memo scheduled for the next Monday review",
                    "Manager knows where to monitor SLA and account health",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[22px] border border-primary/15 bg-background/94 px-4 py-4 text-sm leading-6 text-foreground/90"
                    >
                      {item}
                    </div>
                  ))}
                  <Button asChild variant="secondary" className="rounded-full px-6">
                    <Link href="mailto:product@casablanca.cloud" className="inline-flex items-center gap-2">
                      Talk to the deployment team
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
