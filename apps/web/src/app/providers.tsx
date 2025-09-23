"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { usePosthog } from "@/lib/posthog";
import { TRPCReactProvider } from "@/trpc/react";
import { ConvexClientProvider } from "./ConvexClientProvider";

export const Providers = ({ children }: { children: ReactNode }) => {
	usePosthog();

	return (
		<ConvexClientProvider>
			<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</ThemeProvider>
		</ConvexClientProvider>
	);
};
