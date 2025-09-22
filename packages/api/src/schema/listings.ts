import { z } from "zod";

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
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
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

export const listingCreateInputSchema = z.object({
  title: z.string().min(1, "Listing title is required"),
  slug: z.string().min(1).optional(),
  sourceType: z.enum(["manual", "firecrawl"]),
  sourceUrl: z.string().url().optional(),
  location: listingLocationSchema,
  details: listingDetailsSchema,
  media: z.array(listingMediaAssetSchema).default([]),
});

export const listingFiltersSchema = z.object({
  status: z.enum(["draft", "active", "sold", "archived"]).optional(),
  search: z.string().optional(),
});
