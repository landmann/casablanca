import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import type { CasablancaContext } from "@casablanca/api";
import { createContext as createCasablancaContext } from "@casablanca/api";

import { generateMediaFromFal } from "@/server/media";
import { getConvexClient } from "@/server/convexClient";

export const createTRPCContext = async (
  _opts: FetchCreateContextFnOptions
): Promise<CasablancaContext> => {
  void _opts;
  // TODO: Wire BetterAuth session extraction when routes are ready.
  const session = null;

  return createCasablancaContext({
    convex: getConvexClient(),
    session,
    fal: {
      generateMedia: generateMediaFromFal,
    },
  });
};
