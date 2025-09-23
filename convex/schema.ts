import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const listings = defineTable({
  agentId: v.string(),
  title: v.string(),
  slug: v.string(),
  status: v.union(v.literal("draft"), v.literal("active"), v.literal("sold"), v.literal("archived")),
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
      type: v.union(v.literal("photo"), v.literal("video"), v.literal("floor_plan"), v.literal("virtual_tour"), v.literal("document")),
      caption: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    })
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_agent", ["agentId"])
  .index("by_slug", ["slug"]);

const mediaJobs = defineTable({
  listingId: v.id("listings"),
  kind: v.union(v.literal("social_graphic"), v.literal("flyer"), v.literal("short_form_video"), v.literal("property_description")),
  status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
  resultUrl: v.optional(v.string()),
  metadata: v.optional(v.any()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_listing", ["listingId"]);

export default defineSchema({
  listings,
  mediaJobs,
});
