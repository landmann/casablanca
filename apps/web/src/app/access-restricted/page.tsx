import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole, Mail, ShieldAlert } from "lucide-react";

import {
	getCurrentUserPrimaryEmailAddress,
	isAllowedAppUser,
} from "@/lib/app-access";

export const metadata: Metadata = {
	title: "Access Restricted | Casedra",
	description:
		"Casedra workspace access is currently limited to approved accounts.",
};

export default async function AccessRestrictedPage() {
	const user = await currentUser();

	if (user && isAllowedAppUser(user)) {
		redirect("/app");
	}

	const primaryEmailAddress = getCurrentUserPrimaryEmailAddress(user);

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-10">
				<div className="rounded-[32px] border border-border/70 bg-background/90 p-8 shadow-[0_24px_80px_rgba(31,26,20,0.08)] sm:p-10">
					<div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
						<LockKeyhole className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
						Private rollout
					</div>
					<h1 className="mt-6 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
						This workspace is currently limited to approved accounts.
					</h1>
					<p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
						Casedra is in a tightly controlled rollout. You can sign in, but only
						pre-approved email addresses can enter the app for now.
					</p>
					{primaryEmailAddress ? (
						<div className="mt-6 rounded-2xl border border-border/70 bg-muted/25 p-4 text-sm text-muted-foreground">
							<div className="flex items-center gap-2 text-foreground">
								<Mail className="h-4 w-4 text-primary" aria-hidden="true" />
								Signed in as {primaryEmailAddress}
							</div>
						</div>
					) : null}
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						{user ? (
							<SignOutButton>
								<button
									type="button"
									className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Sign out
								</button>
							</SignOutButton>
						) : (
							<Link
								href="/sign-in"
								className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Go to sign in
							</Link>
						)}
						<Link
							href="/"
							className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/35"
						>
							Back to site
						</Link>
					</div>
					<div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
						<ShieldAlert className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
						<p>
							Access is currently managed manually while the workspace rolls out to
							a very small set of accounts.
						</p>
					</div>
				</div>
			</div>
		</main>
	);
}
