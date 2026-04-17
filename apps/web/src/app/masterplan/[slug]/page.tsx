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
    title: `${doc.title} · Casablanca masterplan`,
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

  return <Markdown>{content}</Markdown>;
}
