import { ConvexHttpClient } from "convex/browser";

import { env } from "@/env";

let convexClient: ConvexHttpClient | null = null;

export const getConvexClient = () => {
  if (!convexClient) {
    convexClient = new ConvexHttpClient(env.CONVEX_URL);
  }

  return convexClient;
};
