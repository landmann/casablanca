"use client";

import { Button } from "@casedra/ui";
import { Show } from "@clerk/nextjs";
import { CalendarCheck, LogIn, MessageSquareText } from "lucide-react";
import Link from "next/link";

export function MarketingHeaderAuthCta({
	calendarHref,
}: {
	calendarHref: string;
}) {
	return (
		<div className="flex items-center gap-2 sm:gap-3">
			<Show when="signed-in">
				<Button
					asChild
					variant="ghost"
					className="rounded-full px-3 text-foreground active:scale-[0.96] sm:px-4"
				>
					<Link href="/app" className="inline-flex items-center gap-2">
						<MessageSquareText className="h-4 w-4" aria-hidden="true" />
						Bandeja
					</Link>
				</Button>
			</Show>
			<Show when="signed-out">
				<Button
					asChild
					variant="ghost"
					className="rounded-full px-3 text-foreground active:scale-[0.96] sm:px-4"
				>
					<Link href="/sign-in" className="inline-flex items-center gap-2">
						<LogIn className="h-4 w-4" aria-hidden="true" />
						Entrar
					</Link>
				</Button>
			</Show>
			<Button asChild className="rounded-full px-4 active:scale-[0.96] sm:px-6">
				<Link href={calendarHref} className="inline-flex items-center gap-2">
					<CalendarCheck className="h-4 w-4" aria-hidden="true" />
					Reservar demo
				</Link>
			</Button>
		</div>
	);
}
