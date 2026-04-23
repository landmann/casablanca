"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@casedra/ui";

export function MarketingHeaderAuthCta({ calendarHref }: { calendarHref: string }) {
	return (
		<div className="flex items-center gap-3">
			<Show when="signed-in">
				<Button asChild variant="ghost" className="rounded-full px-4 text-foreground">
					<Link href="/app">Abrir inbox</Link>
				</Button>
			</Show>
			<Show when="signed-out">
				<Button asChild variant="ghost" className="rounded-full px-4 text-foreground">
					<Link href="/sign-in">Iniciar sesión</Link>
				</Button>
			</Show>
			<Button asChild className="rounded-full px-5 sm:px-6">
				<Link href={calendarHref}>Ver huecos disponibles</Link>
			</Button>
		</div>
	);
}
