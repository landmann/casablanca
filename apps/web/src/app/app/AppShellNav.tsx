"use client";

import { cn } from "@casedra/ui";
import { UserButton } from "@clerk/nextjs";
import { MapPinned, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{
		href: "/app/inbox",
		label: "Bandeja",
		icon: MessageSquareText,
	},
	{
		href: "/app/localiza",
		label: "Localiza",
		icon: MapPinned,
	},
] as const;

export function AppShellNav() {
	const pathname = usePathname();

	if (pathname === "/app/localiza" || pathname.startsWith("/app/localiza/")) {
		return null;
	}

	return (
		<header className="sticky top-0 z-30 border-b border-border/80 bg-background/92 backdrop-blur">
			<div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
				<Link
					href="/app/inbox"
					className="inline-flex min-h-10 items-center gap-3"
					aria-label="Casedra"
				>
					<span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background font-serif text-lg shadow-sm">
						C
					</span>
					<span className="hidden text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground sm:inline">
						Casedra
					</span>
				</Link>

				<nav className="flex flex-1 justify-center" aria-label="App">
					<div className="inline-flex rounded-full border border-border bg-secondary/55 p-1">
						{navItems.map((item) => {
							const Icon = item.icon;
							const active =
								pathname === item.href || pathname.startsWith(`${item.href}/`);

							return (
								<Link
									key={item.href}
									href={item.href}
									aria-label={item.label}
									aria-current={active ? "page" : undefined}
									className={cn(
										"inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-full px-2 text-sm font-medium transition-[background-color,color,box-shadow,transform] active:scale-[0.96] sm:px-4",
										active
											? "bg-primary text-primary-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<Icon className="h-4 w-4" aria-hidden="true" />
									<span className="hidden sm:inline">{item.label}</span>
								</Link>
							);
						})}
					</div>
				</nav>

				<UserButton />
			</div>
		</header>
	);
}
