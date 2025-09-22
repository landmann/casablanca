import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  listingCreateInputSchema,
  listingFiltersSchema,
} from "../schema/listings";
import { mediaGenerationRequestSchema } from "../schema/media";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const listingsRouter = router({
  create: protectedProcedure
    .input(listingCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const listingId = await ctx.convex.mutation("listings:create", {
        agentId: ctx.session.user.id,
        ...input,
      });

      return { id: listingId };
    }),
  list: protectedProcedure
    .input(listingFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      const listings = await ctx.convex.query("listings:list", input ?? {});
      return listings;
    }),
  byId: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "Listing id is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      const listing = await ctx.convex.query("listings:byId", input);

      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }

      return listing;
    }),
  generateMedia: protectedProcedure
    .input(mediaGenerationRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.fal.generateMedia(input);
      return result;
    }),
});

export const listingsPublicRouter = router({
  listPublic: publicProcedure
    .input(listingFiltersSchema.optional())
    .query(async ({ ctx, input }) => ctx.convex.query("listings:listPublic", input ?? {})),
});
