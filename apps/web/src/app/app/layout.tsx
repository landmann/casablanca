import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isAllowedAppUser } from "@/lib/app-access";
import { AppShellNav } from "./AppShellNav";

export default async function AppLayout({ children }: { children: ReactNode }) {
	const user = await currentUser();

	if (!user) {
		redirect("/sign-in");
	}

	if (!isAllowedAppUser(user)) {
		redirect("/access-restricted");
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AppShellNav />
			{children}
		</div>
	);
}
