import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		agentId: v.string(),
		title: v.string(),
		slug: v.optional(v.string()),
		sourceType: v.union(v.literal("manual"), v.literal("firecrawl")),
		sourceUrl: v.optional(v.string()),
		location: v.object({
			street: v.string(),
			city: v.string(),
			stateOrProvince: v.string(),
			postalCode: v.string(),
			country: v.string(),
		}),
		details: v.object({
			priceUsd: v.number(),
			bedrooms: v.number(),
			bathrooms: v.number(),
			squareFeet: v.optional(v.number()),
			lotSizeSqFt: v.optional(v.number()),
			yearBuilt: v.optional(v.number()),
			propertyType: v.string(),
			description: v.string(),
		}),
		media: v.array(
			v.object({
				url: v.string(),
				type: v.union(
					v.literal("photo"),
					v.literal("video"),
					v.literal("floor_plan"),
					v.literal("virtual_tour"),
					v.literal("document"),
				),
				caption: v.optional(v.string()),
				tags: v.optional(v.array(v.string())),
			}),
		),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const slug =
			args.slug ??
			args.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)+/g, "")
				.concat(`-${now}`);

		const listingId = await ctx.db.insert("listings", {
			agentId: args.agentId,
			title: args.title,
			slug,
			status: "draft",
			sourceType: args.sourceType,
			sourceUrl: args.sourceUrl,
			location: args.location,
			details: args.details,
			media: args.media,
			createdAt: now,
			updatedAt: now,
		});

		return listingId;
	},
});

export const list = query({
	args: {
		status: v.optional(
			v.union(
				v.literal("draft"),
				v.literal("active"),
				v.literal("sold"),
				v.literal("archived"),
			),
		),
		search: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		let listingsQuery = ctx.db.query("listings");

		if (args.status) {
			listingsQuery = listingsQuery.filter((q) =>
				q.eq(q.field("status"), args.status!),
			);
		}

		const listings = await listingsQuery.collect();

		if (args.search) {
			const needle = args.search.toLowerCase();
			return listings.filter((listing) =>
				[listing.title, listing.details.description, listing.location.city]
					.filter(Boolean)
					.some((value) => value.toLowerCase().includes(needle)),
			);
		}

		return listings;
	},
});

export const listPublic = query({
	args: {
		status: v.optional(v.union(v.literal("active"), v.literal("sold"))),
		search: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		let listingsQuery = ctx.db.query("listings");

		if (args.status) {
			listingsQuery = listingsQuery.filter((q) =>
				q.eq(q.field("status"), args.status!),
			);
		}

		const listings = await listingsQuery.collect();

		const filtered = listings.filter((listing) => {
			if (args.search) {
				const needle = args.search.toLowerCase();
				return [
					listing.title,
					listing.details.description,
					listing.location.city,
				]
					.filter(Boolean)
					.some((value) => value.toLowerCase().includes(needle));
			}

			return true;
		});

		return filtered.map(({ agentId, ...rest }) => rest);
	},
});

export const byId = query({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		const listingId = ctx.db.normalizeId("listings", args.id);
		if (!listingId) {
			return null;
		}

		const listing = await ctx.db.get(listingId);
		return listing ?? null;
	},
});
