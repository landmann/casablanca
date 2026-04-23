import { agenciesRouter } from "./routers/agencies";
import { conversationsRouter } from "./routers/conversations";
import { listingsRouter } from "./routers/listings";
import { messagesRouter } from "./routers/messages";
import { reportingRouter } from "./routers/reporting";
import { router } from "./trpc";

export const appRouter = router({
	agencies: agenciesRouter,
	conversations: conversationsRouter,
	listings: listingsRouter,
	messages: messagesRouter,
	reporting: reportingRouter,
});

export type AppRouter = typeof appRouter;
