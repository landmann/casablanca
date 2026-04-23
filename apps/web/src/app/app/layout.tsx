import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isAllowedAppUser } from "@/lib/app-access";

export default async function AppLayout({
	children,
}: {
	children: ReactNode;
}) {
	const user = await currentUser();

	if (!user) {
		redirect("/sign-in");
	}

	if (!isAllowedAppUser(user)) {
		redirect("/access-restricted");
	}

	return children;
}
