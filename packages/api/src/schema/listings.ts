import { z } from "zod";

export const locationResolutionStatusSchema = z.enum([
	"exact_match",
	"building_match",
	"needs_confirmation",
	"unresolved",
	"manual_override",
]);

export const listingLocationSchema = z.object({
	street: z.string().min(1, "Street address is required"),
	city: z.string().min(1, "City is required"),
	stateOrProvince: z.string().min(1, "State or province is required"),
	postalCode: z.string().min(1, "Postal code is required"),
	country: z.string().min(1, "Country is required"),
});

export const listingDetailsSchema = z.object({
	priceUsd: z.number().nonnegative(),
	bedrooms: z.number().int().min(0),
	bathrooms: z.number().int().min(0),
	squareFeet: z.number().int().positive().optional(),
	lotSizeSqFt: z.number().int().positive().optional(),
	yearBuilt: z
		.number()
		.int()
		.min(1800)
		.max(new Date().getFullYear())
		.optional(),
	propertyType: z.enum([
		"single_family",
		"multi_family",
		"condo",
		"townhouse",
		"land",
		"commercial",
	]),
	description: z.string().min(1, "Listing description is required"),
});

export const listingMediaAssetSchema = z.object({
	url: z.string().url(),
	type: z.enum(["photo", "video", "floor_plan", "virtual_tour", "document"]),
	caption: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

export const listingSourceMetadataSchema = z.object({
	provider: z.literal("idealista"),
	externalListingId: z.string().min(1, "External listing id is required"),
	sourceUrl: z.string().url("Source URL must be a valid URL"),
});

export const listingLocationResolutionSchema = z.object({
	status: locationResolutionStatusSchema,
	confidenceScore: z.number().min(0).max(1),
	officialSource: z.string().min(1, "Official source is required"),
	officialSourceUrl: z.string().url().optional(),
	territoryAdapter: z
		.enum([
			"state_catastro",
			"navarra_rtn",
			"alava_catastro",
			"bizkaia_catastro",
			"gipuzkoa_catastro",
		])
		.optional(),
	requestedStrategy: z
		.enum(["auto", "idealista_api", "firecrawl", "browser_worker"])
		.optional(),
	actualAcquisitionMethod: z
		.enum(["url_parse", "idealista_api", "firecrawl", "browser_worker"])
		.optional(),
	parcelRef14: z.string().min(1).optional(),
	unitRef20: z.string().min(1).optional(),
	resolvedAddressLabel: z.string().min(1).optional(),
	resolverVersion: z.string().min(1, "Resolver version is required"),
	resolvedAt: z.string().datetime("Resolved date must be a valid ISO datetime"),
	reasonCodes: z.array(z.string().min(1)).default([]),
});

export const listingCreateInputSchema = z
	.object({
		title: z.string().min(1, "Listing title is required"),
		slug: z.string().min(1).optional(),
		sourceType: z.enum(["manual", "firecrawl", "idealista"]),
		sourceUrl: z.string().url().optional(),
		sourceMetadata: listingSourceMetadataSchema.optional(),
		locationResolution: listingLocationResolutionSchema.optional(),
		location: listingLocationSchema,
		details: listingDetailsSchema,
		media: z.array(listingMediaAssetSchema).default([]),
	})
	.superRefine((input, ctx) => {
		if (input.sourceType === "manual") {
			if (input.sourceUrl) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["sourceUrl"],
					message: "Manual listings cannot include a source URL",
				});
			}

			if (input.sourceMetadata) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["sourceMetadata"],
					message: "Manual listings cannot include source metadata",
				});
			}

			if (input.locationResolution) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["locationResolution"],
					message:
						"Manual listings cannot include location resolution metadata",
				});
			}

			return;
		}

		if (!input.sourceUrl) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["sourceUrl"],
				message: "Imported listings require a source URL",
			});
		}

		if (input.sourceType === "firecrawl") {
			if (input.sourceMetadata) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["sourceMetadata"],
					message:
						"Firecrawl listings cannot include Idealista source metadata",
				});
			}

			if (input.locationResolution) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["locationResolution"],
					message:
						"Only Idealista listings can include location resolution metadata",
				});
			}

			return;
		}

		if (input.locationResolution && !input.sourceMetadata) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["sourceMetadata"],
				message: "Idealista location resolution requires source metadata",
			});
		}

		if (
			input.sourceMetadata &&
			input.sourceUrl &&
			input.sourceMetadata.sourceUrl !== input.sourceUrl
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["sourceMetadata", "sourceUrl"],
				message: "Idealista source metadata must match the listing source URL",
			});
		}
	});

export const listingBatchCreateInputSchema = z.object({
	idempotencyKey: z.string().min(1, "Idempotency key is required"),
	listings: z
		.array(listingCreateInputSchema)
		.min(1, "At least one listing is required"),
});

export const listingFiltersSchema = z.object({
	status: z.enum(["draft", "active", "sold", "archived"]).optional(),
	search: z.string().optional(),
});

export const resolveIdealistaLocationInputSchema = z.object({
	url: z.string().url("Listing URL must be a valid URL"),
	strategy: z
		.enum(["auto", "idealista_api", "firecrawl", "browser_worker"])
		.default("auto"),
});
