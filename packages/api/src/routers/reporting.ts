import { api } from "../convex";
import { responseMetricsInputSchema } from "../schema/workflow";
import { protectedProcedure, router } from "../trpc";
import { resolveCurrentAgency } from "../workflow";

export const reportingRouter = router({
	getInboxSummary: protectedProcedure.query(async ({ ctx }) => {
		await resolveCurrentAgency(ctx);
		return ctx.convex.query(api.workflow.getInboxSummary, {});
	}),
	getResponseMetrics: protectedProcedure
		.input(responseMetricsInputSchema.optional())
		.query(async ({ ctx, input }) => {
			await resolveCurrentAgency(ctx);
			return ctx.convex.query(api.workflow.getResponseMetrics, {
				days: input?.days,
			});
		}),
});
