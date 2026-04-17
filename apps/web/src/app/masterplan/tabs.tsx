"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { cn } from "@casablanca/ui";

import { DEFAULT_SLUG, DOCS } from "./docs";

export function MasterPlanTabs() {
  const segment = useSelectedLayoutSegment();
  const activeSlug = segment ?? DEFAULT_SLUG;

  return (
    <nav
      aria-label="Masterplan sections"
      className="-mx-2 mt-6 flex gap-1 overflow-x-auto pb-0"
    >
      {DOCS.map((doc) => {
        const isActive = doc.slug === activeSlug;
        return (
          <Link
            key={doc.slug}
            href={`/masterplan/${doc.slug}`}
            className={cn(
              "shrink-0 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {doc.title}
          </Link>
        );
      })}
    </nav>
  );
}
