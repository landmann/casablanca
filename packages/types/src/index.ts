export type ListingSourceType = "manual" | "firecrawl";

export interface ListingLocation {
  street: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
}

export interface ListingDetails {
  priceUsd: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  lotSizeSqFt?: number;
  yearBuilt?: number;
  propertyType: "single_family" | "multi_family" | "condo" | "townhouse" | "land" | "commercial";
  description: string;
}

export interface ListingMediaAsset {
  url: string;
  type: "photo" | "video" | "floor_plan" | "virtual_tour" | "document";
  caption?: string;
  tags?: string[];
}

export interface ListingRecord {
  id: string;
  agentId: string;
  title: string;
  slug: string;
  status: "draft" | "active" | "sold" | "archived";
  sourceType: ListingSourceType;
  sourceUrl?: string;
  location: ListingLocation;
  details: ListingDetails;
  media: ListingMediaAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface ListingCreateInput {
  title: string;
  slug?: string;
  sourceType: ListingSourceType;
  sourceUrl?: string;
  location: ListingLocation;
  details: ListingDetails;
  media: ListingMediaAsset[];
}

export type MediaGenerationKind = "social_graphic" | "flyer" | "short_form_video" | "property_description";

export interface MediaGenerationRequest {
  listingId: string;
  kind: MediaGenerationKind;
  promptOverrides?: Record<string, string>;
}

export interface MediaGenerationResult {
  id: string;
  listingId: string;
  kind: MediaGenerationKind;
  assetUrl: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}
