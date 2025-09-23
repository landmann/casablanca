import { router } from "./trpc";
import { listingsRouter } from "./routers/listings";

export const appRouter = router({
  listings: listingsRouter,
});

export type AppRouter = typeof appRouter;
