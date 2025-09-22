import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const listings = defineTable({
  agentId: v.string(),
  title: v.string(),
  slug: v.string(),
  status: v.literal("draft")
    .or(v.literal("active"))
    .or(v.literal("sold"))
    .or(v.literal("archived")),
  sourceType: v.literal("manual").or(v.literal("firecrawl")),
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
      type: v.literal("photo")
        .or(v.literal("video"))
        .or(v.literal("floor_plan"))
        .or(v.literal("virtual_tour"))
        .or(v.literal("document")),
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
  kind: v.literal("social_graphic")
    .or(v.literal("flyer"))
    .or(v.literal("short_form_video"))
    .or(v.literal("property_description")),
  status: v.literal("pending").or(v.literal("completed")).or(v.literal("failed")),
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
