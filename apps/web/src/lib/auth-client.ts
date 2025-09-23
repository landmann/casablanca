import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { ComponentProps } from "react";

type ProviderProps = ComponentProps<typeof ConvexBetterAuthProvider>;
type AuthClientInstance = ProviderProps["authClient"];

export const authClient: AuthClientInstance = createAuthClient({
	plugins: [convexClient()],
});
