import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  MessageCircle,
  Network,
  ShieldCheck,
  TimerReset,
  Workflow,
} from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@casablanca/ui";

const agenda = [
  {
    title: "Response audit",
    description:
      "Map where leads arrive, how long they wait, and where revenue is leaking today.",
    icon: TimerReset,
  },
  {
    title: "Workflow design",
    description:
      "Show how Casablanca handles first response, routing, takeover, and manager visibility.",
    icon: Workflow,
  },
  {
    title: "Rollout plan",
    description:
      "Define connection steps, proof memos, and what a first live office should look like.",
    icon: Network,
  },
] as const;

const prepChecklist = [
  "Channel mix: WhatsApp, portals, forwarding, website forms",
  "Current team structure and who owns inbound demand",
  "Approximate lead volume and speed-to-lead pain points",
  "Whether seller acquisition is already a priority",
] as const;

export const metadata: Metadata = {
  title: "Book a walkthrough | Casablanca",
  description:
    "See how Casablanca handles response control, inbox workflow, and seller-side proof for agency teams.",
};

export default function BookDemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-6rem] top-[-5rem] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(156,97,55,0.18),transparent_62%)] blur-3xl" />
          <div className="absolute right-[-5rem] top-0 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(232,223,204,0.92),transparent_64%)] blur-3xl" />
        </div>

        <header className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Casablanca
          </Link>
          <Button asChild variant="outline" className="rounded-full px-5 sm:px-6">
            <Link href="/masterplan">Open masterplan</Link>
          </Button>
        </header>

        <main className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-4 sm:px-8">
          <section className="grid gap-8 lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:items-start">
            <div className="max-w-3xl">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:px-4 sm:text-[11px] sm:tracking-[0.28em]">
                <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Live walkthrough
              </div>
              <h1 className="mt-6 max-w-4xl text-balance font-serif text-[3rem] font-normal leading-[1.02] text-foreground sm:text-[4.15rem] xl:text-[4.75rem]">
                See Casablanca in the context that matters:
                <br />
                real agency workflow.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                We will walk through inbound lead handling, routing, takeover, and weekly proof.
                The goal is not to show generic AI features. The goal is to map how Casablanca
                becomes a trusted operating layer inside an actual office.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {agenda.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-border/80 bg-background/92 p-5 shadow-[0_18px_60px_rgba(31,26,20,0.06)]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <p className="mt-4 text-lg font-semibold text-foreground">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <Card className="rounded-[28px] border-border/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.96),rgba(248,241,229,0.88))] shadow-[0_30px_90px_rgba(31,26,20,0.10)] sm:rounded-[30px]">
              <CardHeader className="space-y-4">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  Bring this
                </div>
                <div>
                  <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                    The best walkthrough starts with your actual operating mess.
                  </CardTitle>
                  <CardDescription className="mt-3 text-sm leading-6">
                    We can tailor the session if you arrive with a clear picture of where demand
                    comes from and where it gets lost.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {prepChecklist.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground/90"
                  >
                    {item}
                  </div>
                ))}
                <div className="rounded-2xl border border-border/80 bg-background px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Confidence before autonomy</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        We will show exactly how ownership, escalation, and human takeover stay
                        explicit inside the workflow.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mt-12 grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
            <Card className="rounded-[28px] border-border/80 bg-background/92 shadow-[0_24px_70px_rgba(31,26,20,0.07)] sm:rounded-[30px]">
              <CardHeader>
                <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                  Tell us what we should focus on
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6">
                  Share the basics and we will shape the walkthrough around your workflow and lead
                  volume, not a generic demo script.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Full name
                      <Input placeholder="Marta Ruiz" required />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Work email
                      <Input type="email" placeholder="marta@agency.com" required />
                    </label>
                  </div>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Agency or office name
                    <Input placeholder="Atico Chamberi" required />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Team size
                      <Input placeholder="8 agents" />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Main market
                      <Input placeholder="Madrid" />
                    </label>
                  </div>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    What should we review?
                    <Textarea
                      rows={5}
                      placeholder="Where leads arrive today, response bottlenecks, who owns inbox coverage, seller-acquisition goals..."
                      required
                    />
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:flex-nowrap">
                    <Button type="submit" size="lg" className="rounded-full px-7">
                      Request a session
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                      <Link
                        href="https://cal.com/product@casablanca.cloud/demo"
                        className="inline-flex items-center gap-2"
                      >
                        View calendar slots
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                  <p className="text-xs leading-6 text-muted-foreground">
                    Prefer email? Reach us directly at{" "}
                    <Link href="mailto:product@casablanca.cloud" className="underline">
                      product@casablanca.cloud
                    </Link>
                    .
                  </p>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-primary/25 bg-primary/10 sm:rounded-[30px]">
              <CardHeader>
                <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                  What you should expect from the session
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-foreground/75">
                  A narrower, more useful walkthrough than a normal proptech demo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "A concrete view of the first-response and handoff loop Casablanca is built to own.",
                  "A manager-level picture of weekly proof, SLA visibility, and account health.",
                  "An honest discussion of deployment friction, channel setup, and where trust can break.",
                  "A rollout plan for a first live office rather than a vague feature tour.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-primary/20 bg-background/94 px-4 py-4 text-sm leading-6 text-foreground/90"
                  >
                    {item}
                  </div>
                ))}
                <Button asChild variant="secondary" className="rounded-full px-6">
                  <Link href="mailto:product@casablanca.cloud" className="inline-flex items-center gap-2">
                    Email us directly
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
