import { z } from "zod";

export const mediaGenerationRequestSchema = z.object({
  listingId: z.string().min(1, "Listing id is required"),
  kind: z.enum([
    "social_graphic",
    "flyer",
    "short_form_video",
    "property_description",
  ]),
  promptOverrides: z.record(z.string()).optional(),
});
