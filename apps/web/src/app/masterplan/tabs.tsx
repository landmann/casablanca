"use client";

import { cn } from "@casedra/ui";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { DOCS, GROUP_ORDER } from "./docs";

export function MasterPlanTabs() {
	const segment = useSelectedLayoutSegment();
	const activeSlug = segment ?? null;
	const groupedDocs = GROUP_ORDER.map((group) => ({
		group,
		docs: DOCS.filter((doc) => doc.group === group),
	})).filter((entry) => entry.docs.length > 0);

	return (
		<nav
			aria-label="Masterplan sections"
			className="overflow-hidden rounded-[28px] border border-border/80 bg-background/92 shadow-[0_24px_70px_rgba(31,26,20,0.07)] backdrop-blur"
		>
			<div className="border-b border-border/80 px-5 py-5">
				<p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
					Navigation
				</p>
				<p className="mt-2 text-sm leading-6 text-muted-foreground">
					Strategy first, then repository and package docs.
				</p>
			</div>

			<div className="max-h-[calc(100vh-9rem)] space-y-6 overflow-y-auto px-4 py-5">
				{groupedDocs.map(({ group, docs }) => (
					<div key={group}>
						<div className="mb-3 flex items-center justify-between px-2">
							<p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
								{group}
							</p>
							<span className="text-xs text-muted-foreground">
								{docs.length}
							</span>
						</div>
						<div className="space-y-1.5">
							{docs.map((doc) => {
								const isActive = activeSlug === doc.slug;

								return (
									<Link
										key={doc.slug}
										href={`/masterplan/${doc.slug}`}
										className={cn(
											"group block rounded-2xl border px-4 py-3 transition-[background-color,border-color,box-shadow,transform] active:scale-[0.96]",
											isActive
												? "border-primary/30 bg-primary/5 shadow-[0_12px_28px_rgba(156,97,55,0.08)]"
												: "border-transparent bg-secondary/45 hover:border-border hover:bg-background",
										)}
									>
										<div className="flex items-start gap-3">
											<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition-colors group-hover:text-primary">
												<ChevronRight
													className="h-3.5 w-3.5"
													aria-hidden="true"
												/>
											</div>
											<div className="min-w-0">
												<p
													className={cn(
														"text-sm font-medium leading-5",
														isActive ? "text-foreground" : "text-foreground/90",
													)}
												>
													{doc.label}
												</p>
												<p className="mt-1 text-xs leading-5 text-muted-foreground">
													{doc.description}
												</p>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</nav>
	);
}
