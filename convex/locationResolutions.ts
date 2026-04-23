import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const listingLocationValidator = v.object({
  street: v.string(),
  city: v.string(),
  stateOrProvince: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

const requestedStrategyValidator = v.union(
  v.literal("auto"),
  v.literal("idealista_api"),
  v.literal("firecrawl"),
  v.literal("browser_worker")
);

const acquisitionMethodValidator = v.union(
  v.literal("url_parse"),
  v.literal("idealista_api"),
  v.literal("firecrawl"),
  v.literal("browser_worker")
);

const territoryAdapterValidator = v.union(
  v.literal("state_catastro"),
  v.literal("navarra_rtn"),
  v.literal("alava_catastro"),
  v.literal("bizkaia_catastro"),
  v.literal("gipuzkoa_catastro")
);

const locationResolutionResultStatusValidator = v.union(
  v.literal("exact_match"),
  v.literal("building_match"),
  v.literal("needs_confirmation"),
  v.literal("unresolved")
);

const sourceMetadataValidator = v.object({
  provider: v.literal("idealista"),
  externalListingId: v.string(),
  sourceUrl: v.string(),
});

const resolutionEvidenceValidator = v.object({
  reasonCodes: v.array(v.string()),
  matchedSignals: v.array(v.string()),
  discardedSignals: v.array(v.string()),
  candidateCount: v.number(),
  requestedStrategy: requestedStrategyValidator,
  actualAcquisitionMethod: v.optional(acquisitionMethodValidator),
  officialSource: v.string(),
  officialSourceUrl: v.optional(v.string()),
  territoryAdapter: v.optional(territoryAdapterValidator),
});

const resolutionCandidateValidator = v.object({
  id: v.string(),
  label: v.string(),
  parcelRef14: v.optional(v.string()),
  unitRef20: v.optional(v.string()),
  officialUrl: v.optional(v.string()),
  distanceMeters: v.optional(v.number()),
  score: v.number(),
  reasonCodes: v.array(v.string()),
  prefillLocation: v.optional(listingLocationValidator),
});

const resolveIdealistaLocationResultValidator = v.object({
  status: locationResolutionResultStatusValidator,
  requestedStrategy: requestedStrategyValidator,
  confidenceScore: v.number(),
  officialSource: v.string(),
  officialSourceUrl: v.optional(v.string()),
  territoryAdapter: v.optional(territoryAdapterValidator),
  resolverVersion: v.string(),
  resolvedAt: v.string(),
  resolvedAddressLabel: v.optional(v.string()),
  parcelRef14: v.optional(v.string()),
  unitRef20: v.optional(v.string()),
  prefillLocation: v.optional(listingLocationValidator),
  candidates: v.array(resolutionCandidateValidator),
  evidence: resolutionEvidenceValidator,
  sourceMetadata: sourceMetadataValidator,
  cacheExpiresAt: v.optional(v.string()),
});

const lookupArgsValidator = {
  provider: v.literal("idealista"),
  externalListingId: v.string(),
  requestedStrategy: requestedStrategyValidator,
  resolverVersion: v.string(),
};

export const getByLookup = query({
  args: lookupArgsValidator,
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locationResolutions")
      .withIndex("by_lookup", (q) =>
        q
          .eq("provider", args.provider)
          .eq("externalListingId", args.externalListingId)
          .eq("requestedStrategy", args.requestedStrategy)
          .eq("resolverVersion", args.resolverVersion)
      )
      .first();
  },
});

export const getBySourceUrl = query({
  args: {
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("locationResolutions")
      .withIndex("by_source_url", (q) => q.eq("sourceUrl", args.sourceUrl))
      .collect();

    return matches.sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null;
  },
});

export const claimLease = mutation({
  args: {
    ...lookupArgsValidator,
    sourceUrl: v.string(),
    leaseOwner: v.string(),
    leaseDurationMs: v.number(),
    defaultExpiresAt: v.number(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("locationResolutions")
      .withIndex("by_lookup", (q) =>
        q
          .eq("provider", args.provider)
          .eq("externalListingId", args.externalListingId)
          .eq("requestedStrategy", args.requestedStrategy)
          .eq("resolverVersion", args.resolverVersion)
      )
      .first();

    const nextLeaseExpiresAt = args.now + args.leaseDurationMs;

    if (!existing) {
      const id = await ctx.db.insert("locationResolutions", {
        provider: args.provider,
        externalListingId: args.externalListingId,
        sourceUrl: args.sourceUrl,
        requestedStrategy: args.requestedStrategy,
        resolverVersion: args.resolverVersion,
        leaseOwner: args.leaseOwner,
        leaseExpiresAt: nextLeaseExpiresAt,
        lastAttemptAt: args.now,
        expiresAt: args.defaultExpiresAt,
        createdAt: args.now,
        updatedAt: args.now,
      });

      return {
        kind: "acquired" as const,
        id,
      };
    }

    const hasFreshResult =
      Boolean(existing.result) && existing.expiresAt > args.now;

    if (hasFreshResult) {
      return {
        kind: "cached" as const,
        id: existing._id,
      };
    }

    const leaseIsActive =
      Boolean(existing.leaseOwner) &&
      Boolean(existing.leaseExpiresAt) &&
      existing.leaseExpiresAt! > args.now &&
      existing.leaseOwner !== args.leaseOwner;

    if (leaseIsActive) {
      return {
        kind: "in_flight" as const,
        id: existing._id,
      };
    }

    await ctx.db.patch(existing._id, {
      sourceUrl: args.sourceUrl,
      leaseOwner: args.leaseOwner,
      leaseExpiresAt: nextLeaseExpiresAt,
      lastAttemptAt: args.now,
      updatedAt: args.now,
    });

    return {
      kind: "acquired" as const,
      id: existing._id,
    };
  },
});

export const complete = mutation({
  args: {
    ...lookupArgsValidator,
    sourceUrl: v.string(),
    result: resolveIdealistaLocationResultValidator,
    normalizedSignals: v.optional(v.any()),
    expiresAt: v.number(),
    now: v.number(),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("locationResolutions")
      .withIndex("by_lookup", (q) =>
        q
          .eq("provider", args.provider)
          .eq("externalListingId", args.externalListingId)
          .eq("requestedStrategy", args.requestedStrategy)
          .eq("resolverVersion", args.resolverVersion)
      )
      .first();

    const patch = {
      sourceUrl: args.sourceUrl,
      resultStatus: args.result.status,
      result: args.result,
      normalizedSignals: args.normalizedSignals,
      leaseOwner: undefined,
      leaseExpiresAt: undefined,
      lastCompletedAt: args.now,
      expiresAt: args.expiresAt,
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
      updatedAt: args.now,
    };

    if (!existing) {
      const id = await ctx.db.insert("locationResolutions", {
        provider: args.provider,
        externalListingId: args.externalListingId,
        sourceUrl: args.sourceUrl,
        requestedStrategy: args.requestedStrategy,
        resolverVersion: args.resolverVersion,
        resultStatus: args.result.status,
        result: args.result,
        normalizedSignals: args.normalizedSignals,
        lastCompletedAt: args.now,
        expiresAt: args.expiresAt,
        errorCode: args.errorCode,
        errorMessage: args.errorMessage,
        createdAt: args.now,
        updatedAt: args.now,
      });

      return { id };
    }

    await ctx.db.patch(existing._id, patch);
    return { id: existing._id };
  },
});
