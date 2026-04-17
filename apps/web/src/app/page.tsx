import Link from "next/link";
import {
  ArrowRight,
  MonitorPlay,
  Palette,
  Sparkles,
  Workflow,
} from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@casablanca/ui";

const studioRoute = "/app/onboarding";
const demoRoute = "/book-demo";

const coreFeatures = [
  {
    title: "Listing-aware media studio",
    description:
      "Upload assets or crawl MLS listings with Firecrawl, then generate tailored visuals, video scripts, and copy in seconds.",
    icon: <Sparkles className="h-6 w-6" aria-hidden="true" />, 
  },
  {
    title: "Repeatable campaign recipes",
    description:
      "Package social posts, email announcements, landing pages, and printable collateral into reusable playbooks per property type.",
    icon: <Palette className="h-6 w-6" aria-hidden="true" />, 
  },
  {
    title: "Fal-powered automation",
    description:
      "Use fal.ai to spin up visuals, storyboards, and marketing copy tuned to each property's unique story.",
    icon: <MonitorPlay className="h-6 w-6" aria-hidden="true" />, 
  },
];

const roadmap = [
  {
    title: "Lead capture & nurture",
    description:
      "Collect inquiries from landing pages, autosegment buyers vs. sellers, and trigger nurture journeys.",
  },
  {
    title: "Referral and team routing",
    description:
      "Reward agent referrals, automate assignments, and keep your network activated across markets.",
  },
  {
    title: "Transaction room integrations",
    description:
      "Sync key deal milestones from your preferred transaction platform to coordinate marketing and outreach.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative isolate overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-24 text-center sm:gap-12 sm:px-12 lg:pt-32">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Real-estate media that ships itself
            </span>
            <h1 className="text-balance font-serif text-5xl font-normal leading-[1.05] sm:text-6xl lg:text-7xl">
              Casablanca blends media production and CRM workflows so your listings hit the market fully armed.
            </h1>
            <p className="text-balance text-base text-muted-foreground sm:text-lg">
              Centralize listing data, spin up on-brand marketing in minutes, and extend every campaign with AI-native automations.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link
                href={{ pathname: studioRoute }}
                className="inline-flex items-center gap-2"
              >
                Launch studio <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link
                href={{ pathname: demoRoute }}
                className="inline-flex items-center gap-2"
              >
                Book a walkthrough
              </Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {coreFeatures.map((feature) => (
              <Card key={feature.title} className="h-full text-left">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3 text-primary">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 sm:px-12 lg:grid-cols-[1fr_320px] lg:gap-12">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Coming next
            </span>
            <h2 className="max-w-2xl font-serif text-4xl font-normal leading-tight lg:text-5xl">
              We are laying the plumbing for a modern referral-ready CRM that understands listings.
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground">
              Casablanca will grow into the full command center for real estate pros: import lead pipelines, automate nurture sequences, track referral revenue, and sync every buyer or seller touchpoint with the media assets that sparked conversion.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {roadmap.map((item) => (
                <Card key={item.title} className="border-dashed">
                  <CardHeader className="space-y-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Workflow className="h-4 w-4 text-primary" aria-hidden="true" />
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
          <Card className="h-fit border-primary/30 bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                What we will tackle with you
              </CardTitle>
              <CardDescription>
                Help us prioritize CRM workflows, automations, and integrations that will move your brokerage faster.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
              <p className="leading-relaxed">
                Share your stack, your MLS requirements, and the collateral you create the most. Casablanca is built to flex into your team&apos;s daily rhythm.
              </p>
              <Button asChild variant="secondary">
                <Link href="mailto:product@casablanca.cloud" className="inline-flex items-center gap-2">
                  Collaborate with us <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
