import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const enqueue = mutation({
	args: {
		listingId: v.id("listings"),
		kind: v.union(
			v.literal("social_graphic"),
			v.literal("flyer"),
			v.literal("short_form_video"),
			v.literal("property_description"),
		),
		metadata: v.optional(v.record(v.string(), v.any())),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const mediaJobId = await ctx.db.insert("mediaJobs", {
			listingId: args.listingId,
			kind: args.kind,
			status: "pending",
			metadata: args.metadata,
			createdAt: now,
			updatedAt: now,
		});

		return mediaJobId;
	},
});

export const complete = mutation({
	args: {
		mediaJobId: v.id("mediaJobs"),
		status: v.union(v.literal("completed"), v.literal("failed")),
		resultUrl: v.optional(v.string()),
		metadata: v.optional(v.record(v.string(), v.any())),
		error: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.mediaJobId, {
			status: args.status,
			resultUrl: args.resultUrl,
			metadata: args.metadata,
			error: args.error,
			updatedAt: Date.now(),
		});
	},
});

export const listForListing = query({
	args: {
		listingId: v.id("listings"),
	},
	handler: async (ctx, args) => {
		return ctx.db
			.query("mediaJobs")
			.withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
			.collect();
	},
});
