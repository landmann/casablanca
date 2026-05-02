import type { CasedraContext } from "@casedra/api";
import { createContext as createCasedraContext } from "@casedra/api";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import { isAllowedAppUser } from "@/lib/app-access";
import { getOptionalConvexAuthToken } from "@/server/convexAuth";
import { createConvexClient } from "@/server/convexClient";
import { createLocalizaService } from "@/server/localiza/service";
import { generateMediaFromFal } from "@/server/media";

export const createTRPCContext = async (
	_opts: FetchCreateContextFnOptions,
): Promise<CasedraContext> => {
	void _opts;
	const { getToken, userId, sessionId } = await auth();
	const user = userId ? await currentUser() : null;
	const isAllowedUser = isAllowedAppUser(user);
	const session =
		userId && isAllowedUser ? { userId, sessionId: sessionId ?? null } : null;
	const convexAuthToken =
		userId && isAllowedUser ? await getOptionalConvexAuthToken(getToken) : null;

	const convex = createConvexClient(convexAuthToken);

	return createCasedraContext({
		convex,
		session,
		fal: {
			generateMedia: (request) => generateMediaFromFal(convex, request),
		},
		localiza: createLocalizaService({ convex }),
	});
};
