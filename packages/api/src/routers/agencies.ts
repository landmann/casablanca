import { api } from "../convex";
import { protectedProcedure, router } from "../trpc";
import { resolveCurrentAgency } from "../workflow";

export const agenciesRouter = router({
	createDefaultAgencyForUser: protectedProcedure.mutation(async ({ ctx }) =>
		ctx.convex.mutation(api.agencies.createDefaultAgencyForUser, {}),
	),
	getCurrentAgency: protectedProcedure.query(async ({ ctx }) => {
		return resolveCurrentAgency(ctx);
	}),
	listMemberships: protectedProcedure.query(async ({ ctx }) => {
		await resolveCurrentAgency(ctx);
		return ctx.convex.query(api.agencies.listMemberships, {});
	}),
});
