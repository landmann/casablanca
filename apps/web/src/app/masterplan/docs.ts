export type MasterPlanDocGroup = "Strategy" | "Repository" | "Packages";

export type MasterPlanDoc = {
  slug: string;
  title: string;
  label: string;
  path: string;
  group: MasterPlanDocGroup;
  description: string;
};

export const DOCS: readonly MasterPlanDoc[] = [
  {
    slug: "read-first",
    path: "MASTER-PLAN/MASTERPLAN-3Y-REWRITE.md",
    title: "Read First",
    label: "Read first",
    group: "Strategy",
    description:
      "The shortest statement of the company thesis, operating sequence, and canonical gates.",
  },
  {
    slug: "ai-doctrine",
    path: "MASTER-PLAN/AI-DOCTRINE.md",
    title: "AI Doctrine",
    label: "AI doctrine",
    group: "Strategy",
    description:
      "How Casedra should build AI: embedded, trusted, evaluation-led, and hard to replace.",
  },
  {
    slug: "overview",
    path: "MASTER-PLAN/MASTERPLAN.md",
    title: "Masterplan",
    label: "Masterplan",
    group: "Strategy",
    description:
      "The full thesis, strategic endgame, expansion ladder, and competitive position.",
  },
  {
    slug: "research",
    path: "MASTER-PLAN/RESEARCH-FINDINGS.md",
    title: "Research Findings",
    label: "Research",
    group: "Strategy",
    description:
      "Durable market findings and the product, GTM, and hiring implications behind them.",
  },
  {
    slug: "competition",
    path: "MASTER-PLAN/COMPETITIVE-LANDSCAPE.md",
    title: "Competitive Landscape",
    label: "Competition",
    group: "Strategy",
    description:
      "Where the wedge is strongest, where the traps are, and what competitive set actually matters.",
  },
  {
    slug: "product",
    path: "MASTER-PLAN/PRODUCT-ROADMAP.md",
    title: "Product Roadmap",
    label: "Product",
    group: "Strategy",
    description:
      "Phase order, product boundaries, and the workflow surfaces Casedra should own first.",
  },
  {
    slug: "gtm",
    path: "MASTER-PLAN/GTM-ROADMAP.md",
    title: "GTM Roadmap",
    label: "GTM",
    group: "Strategy",
    description:
      "The audit-deploy-prove-expand motion for acquiring, onboarding, and expanding agencies.",
  },
  {
    slug: "finance",
    path: "MASTER-PLAN/FINANCIAL-MODEL.md",
    title: "Financial Model",
    label: "Finance",
    group: "Strategy",
    description:
      "Milestones, pricing assumptions, and the revenue logic behind the EUR1B strategic path.",
  },
  {
    slug: "build",
    path: "MASTER-PLAN/RESPONDE-BUILD-PLAN.md",
    title: "Responde Build Plan",
    label: "Build",
    group: "Strategy",
    description:
      "The technical build plan for Phase 0 and early Phase 1 around response, handoff, and trust.",
  },
  {
    slug: "operating-rhythm",
    path: "MASTER-PLAN/OPERATING-RHYTHM.md",
    title: "Operating Rhythm",
    label: "Operating",
    group: "Strategy",
    description:
      "The weekly company operating system, scorecard, escalation rules, and artifact stack.",
  },
  {
    slug: "execution-2026",
    path: "MASTER-PLAN/EXECUTION-PLAN-Q2-Q4-2026.md",
    title: "Execution Plan for Q2 to Q4 2026",
    label: "Execution 2026",
    group: "Strategy",
    description:
      "Quarter-by-quarter execution targets for proving the wedge and entering 2027 ready to scale.",
  },
  {
    slug: "agents",
    path: "AGENTS.md",
    title: "AGENTS Instructions",
    label: "AGENTS",
    group: "Repository",
    description:
      "Repository-level guidance for tools, brand rules, and project-specific working conventions.",
  },
  {
    slug: "readme",
    path: "README.md",
    title: "Repository README",
    label: "README",
    group: "Repository",
    description:
      "Top-level project overview and the quickest orientation to the repository itself.",
  },
  {
    slug: "setup",
    path: "SETUP.md",
    title: "Setup Guide",
    label: "Setup",
    group: "Repository",
    description:
      "Environment setup, dependencies, and local development instructions for the project.",
  },
  {
    slug: "todo",
    path: "TODO.md",
    title: "TODO",
    label: "TODO",
    group: "Repository",
    description:
      "The active implementation backlog and outstanding tasks tracked in the repository.",
  },
  {
    slug: "casedra-launch-checklist",
    path: "CASEDRA-LAUNCH-CHECKLIST.md",
    title: "Casedra Launch Checklist",
    label: "Launch",
    group: "Repository",
    description:
      "Brand, domain, and provider setup checklist for keeping the project aligned to Casedra.",
  },
  {
    slug: "web-readme",
    path: "apps/web/README.md",
    title: "Web App README",
    label: "apps/web README",
    group: "Packages",
    description:
      "Notes for the Next.js frontend package that serves the public and product surfaces.",
  },
  {
    slug: "convex-readme",
    path: "convex/README.md",
    title: "Convex README",
    label: "convex README",
    group: "Packages",
    description:
      "Backend runtime notes and documentation for the Convex portion of the project.",
  },
] as const;

export const GROUP_ORDER: readonly MasterPlanDocGroup[] = [
  "Strategy",
  "Repository",
  "Packages",
] as const;

export const DEFAULT_SLUG = DOCS[0].slug;

export const getDoc = (slug: string): MasterPlanDoc | undefined =>
  DOCS.find((doc) => doc.slug === slug);
