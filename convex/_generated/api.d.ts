/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agencies from "../agencies.js";
import type * as auth from "../auth.js";
import type * as listings from "../listings.js";
import type * as localizaGoldenLiveFixtures from "../localizaGoldenLiveFixtures.js";
import type * as localizaMarketObservations from "../localizaMarketObservations.js";
import type * as localizaMetrics from "../localizaMetrics.js";
import type * as locationResolutionLease from "../locationResolutionLease.js";
import type * as locationResolutions from "../locationResolutions.js";
import type * as media from "../media.js";
import type * as workflow from "../workflow.js";
import type * as workflowValidators from "../workflowValidators.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agencies: typeof agencies;
  auth: typeof auth;
  listings: typeof listings;
  localizaGoldenLiveFixtures: typeof localizaGoldenLiveFixtures;
  localizaMarketObservations: typeof localizaMarketObservations;
  localizaMetrics: typeof localizaMetrics;
  locationResolutionLease: typeof locationResolutionLease;
  locationResolutions: typeof locationResolutions;
  media: typeof media;
  workflow: typeof workflow;
  workflowValidators: typeof workflowValidators;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
