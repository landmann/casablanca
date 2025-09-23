import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";

import { appRouter } from "@casablanca/api";

import { createTRPCContext } from "@/server/api/context";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    router: appRouter,
    endpoint: "/api/trpc",
    req,
    createContext: (opts) => createTRPCContext(opts),
    onError({ error }) {
      console.error("TRPC Error", error);
    },
  });

export { handler as GET, handler as POST };
