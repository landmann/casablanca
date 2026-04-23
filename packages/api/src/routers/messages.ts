import { api } from "../convex";
import {
	conversationIdSchema,
	createOutboundMessageInputSchema,
	createInternalNoteInputSchema,
} from "../schema/workflow";
import { protectedProcedure, router } from "../trpc";
import { mapWorkflowError, resolveCurrentAgency } from "../workflow";

export const messagesRouter = router({
	listByConversation: protectedProcedure
		.input(conversationIdSchema)
		.query(async ({ ctx, input }) => {
			await resolveCurrentAgency(ctx);

			try {
				return await ctx.convex.query(api.workflow.listMessagesByConversation, {
					conversationId: input.id,
				});
			} catch (error) {
				mapWorkflowError(error);
			}
		}),
	createOutbound: protectedProcedure
		.input(createOutboundMessageInputSchema)
		.mutation(async ({ ctx, input }) => {
			await resolveCurrentAgency(ctx);

			try {
				return await ctx.convex.mutation(api.workflow.createOutboundMessage, {
					conversationId: input.id,
					body: input.body,
					bodyFormat: input.bodyFormat,
				});
			} catch (error) {
				mapWorkflowError(error);
			}
		}),
	createInternalNote: protectedProcedure
		.input(createInternalNoteInputSchema)
		.mutation(async ({ ctx, input }) => {
			await resolveCurrentAgency(ctx);

			try {
				return await ctx.convex.mutation(api.workflow.createInternalNote, {
					conversationId: input.id,
					body: input.body,
					bodyFormat: input.bodyFormat,
				});
			} catch (error) {
				mapWorkflowError(error);
			}
		}),
});
