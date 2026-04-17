export type MasterPlanDoc = {
  slug: string;
  title: string;
  filename: string;
};

export const DOCS: readonly MasterPlanDoc[] = [
  { slug: "overview", filename: "MASTERPLAN.md", title: "Masterplan" },
  { slug: "research", filename: "RESEARCH-FINDINGS.md", title: "Research findings" },
  { slug: "competition", filename: "COMPETITIVE-LANDSCAPE.md", title: "Competitive landscape" },
  { slug: "product", filename: "PRODUCT-ROADMAP.md", title: "Product roadmap" },
  { slug: "gtm", filename: "GTM-ROADMAP.md", title: "GTM roadmap" },
  { slug: "build", filename: "RESPONDE-BUILD-PLAN.md", title: "Build plan" },
  { slug: "finance", filename: "FINANCIAL-MODEL.md", title: "Financial model" },
] as const;

export const DEFAULT_SLUG = DOCS[0].slug;

export const getDoc = (slug: string): MasterPlanDoc | undefined =>
  DOCS.find((d) => d.slug === slug);
