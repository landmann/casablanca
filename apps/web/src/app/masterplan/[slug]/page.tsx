import { notFound } from "next/navigation";

import { DOCS, getDoc } from "../docs";
import { Markdown } from "../markdown";
import { readDocContent } from "../read-doc";

export const dynamicParams = false;

export async function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return {};
  return {
    title: `${doc.title} · Casedra masterplan`,
    robots: { index: false, follow: false },
  };
}

export default async function MasterPlanDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const content = readDocContent(doc);

  return (
    <article className="overflow-hidden rounded-[30px] border border-border/80 bg-background/95 shadow-[0_28px_90px_rgba(31,26,20,0.08)]">
      <div className="border-b border-border/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.88),rgba(255,251,242,0.98))] px-6 py-7 sm:px-10">
        <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <span className="rounded-full border border-border bg-secondary/60 px-3 py-1">
            {doc.group}
          </span>
          <span className="rounded-full border border-border bg-background px-3 py-1">
            {doc.path}
          </span>
        </div>
        <h1 className="mt-4 font-serif text-4xl font-normal leading-tight text-foreground sm:text-5xl">
          {doc.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          {doc.description}
        </p>
      </div>

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <Markdown>{content}</Markdown>
      </div>
    </article>
  );
}
