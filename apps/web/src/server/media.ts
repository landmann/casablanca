import { config, run } from "@fal-ai/serverless-client";

import type {
  MediaGenerationRequest,
  MediaGenerationResult,
} from "@casablanca/types";

import { env } from "@/env";
import { getConvexClient } from "./convexClient";

config({
  credentials: () => env.FAL_KEY,
});

type ConvexListing = {
  _id: string;
  title: string;
  details: {
    priceUsd: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    description: string;
  };
  location: {
    city: string;
    stateOrProvince: string;
  };
  media: Array<{
    url: string;
    type: string;
  }>;
};

const MODEL_BY_KIND: Record<MediaGenerationRequest["kind"], string> = {
  social_graphic: "fal-ai/flux-pro/v1.1",
  flyer: "fal-ai/flux-pro/v1.1",
  short_form_video: "fal-ai/runway-gen3",
  property_description: "fal-ai/llama-3.1-70b-instruct",
};

type FalRunInput = {
  prompt: string;
  image_size?: string;
};

type FalGenerationResponse = {
  request_id?: string;
  image?: { url?: string };
  images?: Array<{ url?: string } | undefined>;
  output?: Array<
    | { url?: string }
    | {
        content?: Array<{ url?: string } | undefined>;
      }
  >;
  result?: {
    image?: { url?: string };
  };
};

const buildPrompt = (listing: ConvexListing, kind: MediaGenerationRequest["kind"]) => {
  const base = `${listing.title} located in ${listing.location.city}, ${listing.location.stateOrProvince}. ${listing.details.bedrooms} bedrooms, ${listing.details.bathrooms} bathrooms, ${listing.details.squareFeet ?? "unknown"} square feet. ${listing.details.description}`;

  switch (kind) {
    case "social_graphic":
      return `Create a square social media graphic showcasing the property: ${base}`;
    case "flyer":
      return `Design a printable flyer layout highlighting amenities for: ${base}`;
    case "short_form_video":
      return `Storyboard a 30-second real estate teaser video for: ${base}`;
    case "property_description":
      return `Write an SEO-friendly property description: ${base}`;
    default:
      return base;
  }
};

const extractAssetUrl = (response: FalGenerationResponse): string | undefined => {
  return (
    response?.image?.url ||
    response?.images?.[0]?.url ||
    response?.output?.[0]?.content?.[0]?.url ||
    response?.output?.[0]?.url ||
    response?.result?.image?.url ||
    undefined
  );
};

export const generateMediaFromFal = async (
  request: MediaGenerationRequest
): Promise<MediaGenerationResult> => {
  const convex = getConvexClient();
  const listing = (await convex.query("listings:byId", { id: request.listingId })) as
    | ConvexListing
    | null;

  if (!listing) {
    throw new Error("Listing not found");
  }

  const model = MODEL_BY_KIND[request.kind];
  const promptOverride =
    request.promptOverrides?.prompt ?? request.promptOverrides?.[request.kind];
  const prompt = promptOverride ?? buildPrompt(listing, request.kind);

  const response = await run<FalRunInput, FalGenerationResponse>(model, {
    input: {
      prompt,
      image_size: request.kind === "social_graphic" ? "square" : undefined,
    },
  });

  const assetUrl = extractAssetUrl(response) ?? "";

  return {
    id: response?.request_id ?? `fal-${Date.now()}`,
    listingId: request.listingId,
    kind: request.kind,
    assetUrl,
    metadata: {
      prompt,
      model,
      response,
    },
    createdAt: new Date().toISOString(),
  };
};
