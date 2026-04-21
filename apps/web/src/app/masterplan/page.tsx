import Link from "next/link";
import { ArrowUpRight, BookOpenCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@casedra/ui";

import { DOCS, GROUP_ORDER } from "./docs";

export default function MasterPlanIndex() {
  const groupedDocs = GROUP_ORDER.map((group) => ({
    group,
    docs: DOCS.filter((doc) => doc.group === group),
  })).filter((entry) => entry.docs.length > 0);

  return (
    <div className="space-y-8">
      <article className="overflow-hidden rounded-[30px] border border-border/80 bg-background/95 shadow-[0_28px_90px_rgba(31,26,20,0.08)]">
        <div className="border-b border-border/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.88),rgba(255,251,242,0.98))] px-6 py-7 sm:px-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
            <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Full doc index
          </div>
          <h2 className="mt-4 font-serif text-4xl font-normal leading-tight text-foreground sm:text-5xl">
            Every repo-authored markdown document, one click away.
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            Start with the strategy stack or jump straight into repository setup and package docs.
            The same `/masterplan` surface now covers the company plan and the supporting documentation
            around it.
          </p>
        </div>
        <div className="grid gap-4 px-6 py-8 sm:px-10 lg:grid-cols-3">
          {[
            { label: "Total docs", value: `${DOCS.length}` },
            { label: "Strategy docs", value: `${DOCS.filter((doc) => doc.group === "Strategy").length}` },
            { label: "Project docs", value: `${DOCS.filter((doc) => doc.group !== "Strategy").length}` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-border/80 bg-secondary/45 p-5"
            >
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-3 font-serif text-4xl font-normal leading-none text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </article>

      {groupedDocs.map(({ group, docs }) => (
        <section key={group} className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                {group}
              </p>
              <h3 className="mt-2 font-serif text-3xl font-normal leading-tight text-foreground">
                {group === "Strategy"
                  ? "The company thesis and execution stack."
                  : group === "Repository"
                    ? "Repo-level instructions and working notes."
                    : "Package-specific reference docs."}
              </h3>
            </div>
            <span className="text-sm text-muted-foreground">{docs.length} docs</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {docs.map((doc) => (
              <Card
                key={doc.slug}
                className="rounded-[28px] border-border/80 bg-background/92 shadow-[0_24px_70px_rgba(31,26,20,0.07)]"
              >
                <CardHeader className="space-y-4">
                  <div className="inline-flex w-fit rounded-full border border-border bg-secondary/55 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    {doc.path}
                  </div>
                  <div>
                    <CardTitle className="font-serif text-[2rem] font-normal leading-tight">
                      {doc.title}
                    </CardTitle>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {doc.description}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link
                    href={`/masterplan/${doc.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-foreground"
                  >
                    Open document
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
