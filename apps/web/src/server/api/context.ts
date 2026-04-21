import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "@clerk/nextjs/server";

import type { CasedraContext } from "@casedra/api";
import { createContext as createCasedraContext } from "@casedra/api";

import { generateMediaFromFal } from "@/server/media";
import { getConvexClient } from "@/server/convexClient";

export const createTRPCContext = async (
	_opts: FetchCreateContextFnOptions,
): Promise<CasedraContext> => {
	void _opts;
	const { userId, sessionId } = await auth();
	const session = userId ? { userId, sessionId: sessionId ?? null } : null;

	return createCasedraContext({
		convex: getConvexClient(),
		session,
		fal: {
			generateMedia: generateMediaFromFal,
		},
	});
};
