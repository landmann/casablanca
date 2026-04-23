import type { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

import type {
  IdealistaSignals,
  LocalizaAcquisitionStrategy,
  ResolveIdealistaLocationResult,
} from "@casedra/types";

import { resolveStateCatastro } from "./catastro-state";
import { browserWorkerAdapter } from "./browser-worker-adapter";
import { firecrawlAdapter } from "./firecrawl-adapter";
import { idealistaApiAdapter } from "./idealista-adapter";
import { LocalizaServiceError } from "./errors";
import type {
  LocalizaAdapter,
  LocalizaAdapterMethod,
  LocalizaAdapterOutput,
  LocalizaCachedResolutionRecord,
  LocalizaClaimLeaseResult,
  LocalizaOfficialResolution,
  LocalizaResolutionContext,
  LocalizaTerritoryAdapter,
} from "./types";
import {
  officialSourceLabelByTerritory,
  officialSourceUrlByTerritory,
} from "./types";

export const LOCALIZA_RESOLVER_VERSION = "localiza-bootstrap-2026-04-23.2";

const IDEALISTA_HOSTS = new Set(["idealista.com", "www.idealista.com"]);
const IDEALISTA_LISTING_PATH = /^\/inmueble\/(\d+)\/?$/;
const OVERALL_DEADLINE_MS = 10_000;
const IN_FLIGHT_POLL_INTERVAL_MS = 300;
const LEASE_DURATION_MS = 12_000;
const UNRESOLVED_CACHE_TTL_MS = 30 * 1000;
const SUCCESS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const autoStrategyOrder: LocalizaAdapterMethod[] = [
  "idealista_api",
  "firecrawl",
  "browser_worker",
];

const adapterRegistry: Record<LocalizaAdapterMethod, LocalizaAdapter> = {
  idealista_api: idealistaApiAdapter,
  firecrawl: firecrawlAdapter,
  browser_worker: browserWorkerAdapter,
};

const getLocationResolutionByLookupRef = makeFunctionReference<
  "query",
  {
    provider: "idealista";
    externalListingId: string;
    requestedStrategy: LocalizaAcquisitionStrategy;
    resolverVersion: string;
  },
  LocalizaCachedResolutionRecord | null
>("locationResolutions:getByLookup");

const claimLocationResolutionLeaseRef = makeFunctionReference<
  "mutation",
  {
    provider: "idealista";
    externalListingId: string;
    sourceUrl: string;
    requestedStrategy: LocalizaAcquisitionStrategy;
    resolverVersion: string;
    leaseOwner: string;
    leaseDurationMs: number;
    defaultExpiresAt: number;
    now: number;
  },
  LocalizaClaimLeaseResult
>("locationResolutions:claimLease");

const completeLocationResolutionRef = makeFunctionReference<
  "mutation",
  {
    provider: "idealista";
    externalListingId: string;
    sourceUrl: string;
    requestedStrategy: LocalizaAcquisitionStrategy;
    resolverVersion: string;
    result: ResolveIdealistaLocationResult;
    normalizedSignals?: IdealistaSignals;
    expiresAt: number;
    now: number;
    errorCode?: string;
    errorMessage?: string;
  },
  { id: string }
>("locationResolutions:complete");

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const withTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string,
) => {
  const abortController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    return await operation(abortController.signal);
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new Error(`${label}_timeout`);
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const dedupe = (values: string[]) =>
  Array.from(new Set(values.filter(Boolean)));

const buildCacheExpiryIso = (expiresAt: number) =>
  new Date(expiresAt).toISOString();

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown Localiza error.";

const logLocalizaEvent = (
  level: "info" | "warn" | "error",
  event: string,
  payload: Record<string, unknown>,
) => {
  const serialized = JSON.stringify({
    scope: "localiza",
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  });

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
};

const getOfficialSourceDetails = (
  territoryAdapter?: LocalizaTerritoryAdapter,
) => ({
  officialSource: territoryAdapter
    ? officialSourceLabelByTerritory[territoryAdapter]
    : "Pending official cadastral verification",
  officialSourceUrl: territoryAdapter
    ? officialSourceUrlByTerritory[territoryAdapter]
    : undefined,
  territoryAdapter,
});

const getCadastreFailureDetails = (error: unknown) => {
  const message = getErrorMessage(error);
  const territoryAdapter = (
    [
      "state_catastro",
      "navarra_rtn",
      "alava_catastro",
      "bizkaia_catastro",
      "gipuzkoa_catastro",
    ] as const
  ).find((adapter) => message.startsWith(`${adapter}_`));

  return {
    reasonCode: territoryAdapter ? message : "state_catastro_failed",
    ...getOfficialSourceDetails(territoryAdapter),
  };
};

const isFreshCachedResult = (
  record: LocalizaCachedResolutionRecord | null,
  now: number,
): record is LocalizaCachedResolutionRecord & {
  result: ResolveIdealistaLocationResult;
} => record !== null && Boolean(record.result) && record.expiresAt > now;

const buildSourceMetadata = (input: {
  externalListingId: string;
  sourceUrl: string;
}) => ({
  provider: "idealista" as const,
  externalListingId: input.externalListingId,
  sourceUrl: input.sourceUrl,
});

const buildUnresolvedResult = (input: {
  context: LocalizaResolutionContext;
  reasonCodes: string[];
  matchedSignals: string[];
  discardedSignals?: string[];
  actualAcquisitionMethod?: ResolveIdealistaLocationResult["evidence"]["actualAcquisitionMethod"];
  resolvedAt: string;
  officialSource?: string;
  officialSourceUrl?: string;
  territoryAdapter?: LocalizaTerritoryAdapter;
  confidenceScore?: number;
  candidates?: ResolveIdealistaLocationResult["candidates"];
  resolvedAddressLabel?: string;
  parcelRef14?: string;
  unitRef20?: string;
  prefillLocation?: ResolveIdealistaLocationResult["prefillLocation"];
}): ResolveIdealistaLocationResult => ({
  status: "unresolved",
  requestedStrategy: input.context.requestedStrategy,
  confidenceScore: input.confidenceScore ?? 0,
  officialSource:
    input.officialSource ?? "Pending official cadastral verification",
  officialSourceUrl: input.officialSourceUrl,
  territoryAdapter: input.territoryAdapter,
  resolverVersion: input.context.resolverVersion,
  resolvedAt: input.resolvedAt,
  resolvedAddressLabel: input.resolvedAddressLabel,
  parcelRef14: input.parcelRef14,
  unitRef20: input.unitRef20,
  prefillLocation: input.prefillLocation,
  candidates: input.candidates ?? [],
  evidence: {
    reasonCodes: dedupe(input.reasonCodes),
    matchedSignals: dedupe(input.matchedSignals),
    discardedSignals: dedupe(input.discardedSignals ?? []),
    candidateCount: input.candidates?.length ?? 0,
    requestedStrategy: input.context.requestedStrategy,
    actualAcquisitionMethod: input.actualAcquisitionMethod,
    officialSource:
      input.officialSource ?? "Pending official cadastral verification",
    officialSourceUrl: input.officialSourceUrl,
    territoryAdapter: input.territoryAdapter,
  },
  sourceMetadata: input.context.sourceMetadata,
});

const buildResultFromOfficialResolution = (input: {
  context: LocalizaResolutionContext;
  officialResolution: LocalizaOfficialResolution;
  actualAcquisitionMethod: ResolveIdealistaLocationResult["evidence"]["actualAcquisitionMethod"];
  adapterReasonCodes: string[];
  adapterMatchedSignals: string[];
  adapterDiscardedSignals: string[];
  resolvedAt: string;
}): ResolveIdealistaLocationResult => {
  const officialSourceDetails = getOfficialSourceDetails(
    input.officialResolution.territoryAdapter,
  );
  const mergedReasonCodes = dedupe([
    "listing_id_parsed",
    ...input.adapterReasonCodes,
    ...input.officialResolution.reasonCodes,
  ]);
  const mergedMatchedSignals = dedupe([
    "idealista_listing_id",
    ...input.adapterMatchedSignals,
    ...input.officialResolution.matchedSignals,
  ]);
  const mergedDiscardedSignals = dedupe([
    ...input.adapterDiscardedSignals,
    ...input.officialResolution.discardedSignals,
  ]);

  if (input.officialResolution.status === "unresolved") {
    return buildUnresolvedResult({
      context: input.context,
      reasonCodes: mergedReasonCodes,
      matchedSignals: mergedMatchedSignals,
      discardedSignals: mergedDiscardedSignals,
      actualAcquisitionMethod: input.actualAcquisitionMethod,
      resolvedAt: input.resolvedAt,
      officialSource: input.officialResolution.officialSource,
      officialSourceUrl: officialSourceDetails.officialSourceUrl,
      territoryAdapter: input.officialResolution.territoryAdapter,
      confidenceScore: input.officialResolution.confidenceScore,
      candidates: input.officialResolution.candidates,
      resolvedAddressLabel: input.officialResolution.resolvedAddressLabel,
      parcelRef14: input.officialResolution.parcelRef14,
      unitRef20: input.officialResolution.unitRef20,
      prefillLocation: input.officialResolution.prefillLocation,
    });
  }

  return {
    status: input.officialResolution.status,
    requestedStrategy: input.context.requestedStrategy,
    confidenceScore: input.officialResolution.confidenceScore,
    officialSource: input.officialResolution.officialSource,
    officialSourceUrl: officialSourceDetails.officialSourceUrl,
    territoryAdapter: input.officialResolution.territoryAdapter,
    resolverVersion: input.context.resolverVersion,
    resolvedAt: input.resolvedAt,
    resolvedAddressLabel: input.officialResolution.resolvedAddressLabel,
    parcelRef14: input.officialResolution.parcelRef14,
    unitRef20: input.officialResolution.unitRef20,
    prefillLocation: input.officialResolution.prefillLocation,
    candidates: input.officialResolution.candidates,
    evidence: {
      reasonCodes: mergedReasonCodes,
      matchedSignals: mergedMatchedSignals,
      discardedSignals: mergedDiscardedSignals,
      candidateCount: input.officialResolution.candidates.length,
      requestedStrategy: input.context.requestedStrategy,
      actualAcquisitionMethod: input.actualAcquisitionMethod,
      officialSource: input.officialResolution.officialSource,
      officialSourceUrl: officialSourceDetails.officialSourceUrl,
      territoryAdapter: input.officialResolution.territoryAdapter,
    },
    sourceMetadata: input.context.sourceMetadata,
  };
};

const attachCacheExpiry = (
  result: ResolveIdealistaLocationResult,
  expiresAt: number,
): ResolveIdealistaLocationResult => ({
  ...result,
  cacheExpiresAt: buildCacheExpiryIso(expiresAt),
});

const buildCadastreFailureResult = (input: {
  context: LocalizaResolutionContext;
  adapterOutput: {
    signals: IdealistaSignals;
    matchedSignals: string[];
    discardedSignals: string[];
    reasonCodes: string[];
  };
  error: unknown;
  resolvedAt: string;
}) => {
  const cadastreFailure = getCadastreFailureDetails(input.error);

  return {
    result: buildUnresolvedResult({
      context: input.context,
      reasonCodes: [
        "listing_id_parsed",
        ...input.adapterOutput.reasonCodes,
        "official_cadastre_failed",
        cadastreFailure.reasonCode,
      ],
      matchedSignals: [
        ...input.adapterOutput.matchedSignals,
        "official_source_attempted",
      ],
      discardedSignals: [
        ...input.adapterOutput.discardedSignals,
        ...(cadastreFailure.territoryAdapter
          ? [cadastreFailure.territoryAdapter]
          : []),
      ],
      actualAcquisitionMethod: input.adapterOutput.signals.acquisitionMethod,
      resolvedAt: input.resolvedAt,
      officialSource: cadastreFailure.officialSource,
      officialSourceUrl: cadastreFailure.officialSourceUrl,
      territoryAdapter: cadastreFailure.territoryAdapter,
    }),
    normalizedSignals: input.adapterOutput.signals,
    errorCode: "official_cadastre_failed",
    errorMessage: getErrorMessage(input.error),
  };
};

const normalizeIdealistaUrl = (value: string) => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new LocalizaServiceError(
      "invalid_url",
      "Enter a valid Idealista listing URL.",
    );
  }

  if (!IDEALISTA_HOSTS.has(parsedUrl.hostname)) {
    throw new LocalizaServiceError(
      "unsupported_url",
      "Use a listing URL from idealista.com.",
    );
  }

  const match = parsedUrl.pathname.match(IDEALISTA_LISTING_PATH);

  if (!match) {
    throw new LocalizaServiceError(
      "unsupported_url",
      "Use an Idealista property URL in the /inmueble/<id>/ format.",
    );
  }

  return {
    externalListingId: match[1],
    sourceUrl: `${parsedUrl.protocol}//${parsedUrl.host}/inmueble/${match[1]}/`,
  };
};

const resolveStrategySequence = (
  requestedStrategy: LocalizaAcquisitionStrategy,
): LocalizaAdapterMethod[] =>
  requestedStrategy === "auto" ? autoStrategyOrder : [requestedStrategy];

const getResultCacheTtlMs = (
  status: ResolveIdealistaLocationResult["status"],
) => (status === "unresolved" ? UNRESOLVED_CACHE_TTL_MS : SUCCESS_CACHE_TTL_MS);

const loadCachedRecord = async (
  convex: ConvexHttpClient,
  context: LocalizaResolutionContext,
) =>
  await convex.query(getLocationResolutionByLookupRef, {
    provider: context.sourceMetadata.provider,
    externalListingId: context.sourceMetadata.externalListingId,
    requestedStrategy: context.requestedStrategy,
    resolverVersion: context.resolverVersion,
  });

const persistResult = async (input: {
  convex: ConvexHttpClient;
  context: LocalizaResolutionContext;
  result: ResolveIdealistaLocationResult;
  normalizedSignals?: IdealistaSignals;
  now: number;
  expiresAt: number;
  errorCode?: string;
  errorMessage?: string;
}) => {
  const resultWithCache = attachCacheExpiry(input.result, input.expiresAt);

  await input.convex.mutation(completeLocationResolutionRef, {
    provider: input.context.sourceMetadata.provider,
    externalListingId: input.context.sourceMetadata.externalListingId,
    sourceUrl: input.context.sourceMetadata.sourceUrl,
    requestedStrategy: input.context.requestedStrategy,
    resolverVersion: input.context.resolverVersion,
    result: resultWithCache,
    normalizedSignals: input.normalizedSignals,
    expiresAt: input.expiresAt,
    now: input.now,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
  });

  return resultWithCache;
};

const waitForInFlightResolution = async (input: {
  convex: ConvexHttpClient;
  context: LocalizaResolutionContext;
  deadlineAt: number;
}) => {
  while (Date.now() < input.deadlineAt) {
    const cachedRecord = await loadCachedRecord(input.convex, input.context);

    if (isFreshCachedResult(cachedRecord, Date.now())) {
      return attachCacheExpiry(cachedRecord.result, cachedRecord.expiresAt);
    }

    await sleep(IN_FLIGHT_POLL_INTERVAL_MS);
  }

  return null;
};

const resolveSignalsViaAdapters = async (input: {
  context: LocalizaResolutionContext;
  sourceUrl: string;
  externalListingId: string;
  deadlineAt: number;
}) => {
  const strategySequence = resolveStrategySequence(
    input.context.requestedStrategy,
  );
  const adapterFailureCodes: string[] = [];

  for (const strategy of strategySequence) {
    const adapter = adapterRegistry[strategy];

    if (!adapter.isConfigured()) {
      adapterFailureCodes.push(`${strategy}_not_configured`);
      logLocalizaEvent("warn", "adapter_not_configured", {
        externalListingId: input.externalListingId,
        requestedStrategy: input.context.requestedStrategy,
        attemptedAdapter: strategy,
        resolverVersion: input.context.resolverVersion,
      });

      if (input.context.requestedStrategy !== "auto") {
        return {
          result: buildUnresolvedResult({
            context: input.context,
            reasonCodes: [
              "listing_id_parsed",
              "selected_strategy_not_configured",
              `${strategy}_not_configured`,
            ],
            matchedSignals: ["idealista_listing_id"],
            discardedSignals: [strategy],
            resolvedAt: new Date().toISOString(),
          }),
          normalizedSignals: undefined,
          errorCode: "adapter_not_configured",
          errorMessage: `${strategy} is not configured in this environment.`,
        };
      }

      continue;
    }

    let adapterOutput: LocalizaAdapterOutput;

    try {
      logLocalizaEvent("info", "adapter_started", {
        externalListingId: input.externalListingId,
        requestedStrategy: input.context.requestedStrategy,
        attemptedAdapter: strategy,
        resolverVersion: input.context.resolverVersion,
      });
      adapterOutput = await withTimeout(
        (signal) =>
          adapter.acquireSignals({
            listingId: input.externalListingId,
            sourceUrl: input.sourceUrl,
            signal,
          }),
        adapter.timeoutMs,
        adapter.method,
      );
      logLocalizaEvent("info", "adapter_completed", {
        externalListingId: input.externalListingId,
        requestedStrategy: input.context.requestedStrategy,
        attemptedAdapter: strategy,
        acquisitionMethod: adapterOutput.signals.acquisitionMethod,
        hasCoordinates:
          adapterOutput.signals.approximateLat !== undefined &&
          adapterOutput.signals.approximateLng !== undefined,
        hasMunicipality: Boolean(adapterOutput.signals.municipality),
        hasProvince: Boolean(adapterOutput.signals.province),
        hasPostalCode: Boolean(adapterOutput.signals.postalCodeHint),
        resolverVersion: input.context.resolverVersion,
      });
    } catch (error) {
      adapterFailureCodes.push(`${strategy}_failed`);
      logLocalizaEvent("warn", "adapter_failed", {
        externalListingId: input.externalListingId,
        requestedStrategy: input.context.requestedStrategy,
        attemptedAdapter: strategy,
        errorMessage: getErrorMessage(error),
        resolverVersion: input.context.resolverVersion,
      });

      if (input.context.requestedStrategy !== "auto") {
        return {
          result: buildUnresolvedResult({
            context: input.context,
            reasonCodes: [
              "listing_id_parsed",
              "selected_strategy_failed",
              `${strategy}_failed`,
            ],
            matchedSignals: ["idealista_listing_id"],
            discardedSignals: [strategy],
            resolvedAt: new Date().toISOString(),
          }),
          normalizedSignals: undefined,
          errorCode: "adapter_failed",
          errorMessage: getErrorMessage(error),
        };
      }

      continue;
    }

    const remainingDeadlineMs = input.deadlineAt - Date.now();

    if (remainingDeadlineMs <= 0) {
      return {
        result: buildUnresolvedResult({
          context: input.context,
          reasonCodes: [
            "listing_id_parsed",
            ...adapterOutput.reasonCodes,
            "resolver_deadline_exceeded",
          ],
          matchedSignals: adapterOutput.matchedSignals,
          discardedSignals: adapterOutput.discardedSignals,
          actualAcquisitionMethod: adapterOutput.signals.acquisitionMethod,
          resolvedAt: new Date().toISOString(),
        }),
        normalizedSignals: adapterOutput.signals,
        errorCode: "resolver_deadline_exceeded",
        errorMessage:
          "The resolver deadline was exceeded before official matching.",
      };
    }

    let officialResolution: LocalizaOfficialResolution;

    try {
      logLocalizaEvent("info", "cadastre_resolution_started", {
        externalListingId: input.externalListingId,
        requestedStrategy: input.context.requestedStrategy,
        acquisitionMethod: adapterOutput.signals.acquisitionMethod,
        resolverVersion: input.context.resolverVersion,
      });
      officialResolution = await withTimeout(
        (signal) =>
          resolveStateCatastro({
            signals: adapterOutput.signals,
            signal,
          }),
        remainingDeadlineMs,
        "state_catastro",
      );
    } catch (error) {
      const cadastreFailure = getCadastreFailureDetails(error);
      logLocalizaEvent("error", "cadastre_resolution_failed", {
        externalListingId: input.externalListingId,
        requestedStrategy: input.context.requestedStrategy,
        acquisitionMethod: adapterOutput.signals.acquisitionMethod,
        territoryAdapter: cadastreFailure.territoryAdapter,
        officialSource: cadastreFailure.officialSource,
        officialSourceUrl: cadastreFailure.officialSourceUrl,
        errorMessage: getErrorMessage(error),
        resolverVersion: input.context.resolverVersion,
      });
      return buildCadastreFailureResult({
        context: input.context,
        adapterOutput,
        error,
        resolvedAt: new Date().toISOString(),
      });
    }

    const resolvedAt = new Date().toISOString();
    const result = buildResultFromOfficialResolution({
      context: input.context,
      officialResolution,
      actualAcquisitionMethod: adapterOutput.signals.acquisitionMethod,
      adapterReasonCodes: adapterOutput.reasonCodes,
      adapterMatchedSignals: adapterOutput.matchedSignals,
      adapterDiscardedSignals: adapterOutput.discardedSignals,
      resolvedAt,
    });

    logLocalizaEvent("info", "cadastre_resolution_completed", {
      externalListingId: input.externalListingId,
      requestedStrategy: input.context.requestedStrategy,
      acquisitionMethod: adapterOutput.signals.acquisitionMethod,
      territoryAdapter: officialResolution.territoryAdapter,
      officialSource: result.officialSource,
      officialSourceUrl: result.officialSourceUrl,
      status: result.status,
      candidateCount: result.candidates.length,
      confidenceScore: result.confidenceScore,
      resolverVersion: input.context.resolverVersion,
    });

    return {
      result,
      normalizedSignals: adapterOutput.signals,
      errorCode:
        officialResolution.status === "unresolved"
          ? "official_resolution_unresolved"
          : undefined,
      errorMessage:
        officialResolution.status === "unresolved"
          ? "Official cadastral matching did not produce a verified result."
          : undefined,
    };
  }

  logLocalizaEvent("warn", "resolver_no_adapter_available", {
    externalListingId: input.externalListingId,
    requestedStrategy: input.context.requestedStrategy,
    adapterFailureCodes,
    resolverVersion: input.context.resolverVersion,
  });

  return {
    result: buildUnresolvedResult({
      context: input.context,
      reasonCodes:
        input.context.requestedStrategy === "auto"
          ? [
              "listing_id_parsed",
              "auto_no_configured_or_successful_adapter",
              ...adapterFailureCodes,
            ]
          : ["listing_id_parsed", "selected_strategy_not_configured"],
      matchedSignals: ["idealista_listing_id"],
      resolvedAt: new Date().toISOString(),
    }),
    normalizedSignals: undefined,
    errorCode:
      input.context.requestedStrategy === "auto"
        ? "no_adapter_available"
        : "adapter_not_configured",
    errorMessage:
      input.context.requestedStrategy === "auto"
        ? "No Localiza acquisition adapter could complete this request."
        : "The selected Localiza acquisition adapter is not configured.",
  };
};

export const resolveIdealistaLocation = async (input: {
  convex: ConvexHttpClient;
  url: string;
  strategy: LocalizaAcquisitionStrategy;
}) => {
  const normalized = normalizeIdealistaUrl(input.url);
  const now = Date.now();
  const deadlineAt = now + OVERALL_DEADLINE_MS;
  const context: LocalizaResolutionContext = {
    sourceMetadata: buildSourceMetadata(normalized),
    requestedStrategy: input.strategy ?? "auto",
    resolverVersion: LOCALIZA_RESOLVER_VERSION,
  };

  logLocalizaEvent("info", "resolver_started", {
    externalListingId: context.sourceMetadata.externalListingId,
    requestedStrategy: context.requestedStrategy,
    resolverVersion: context.resolverVersion,
  });

  const cachedRecord = await loadCachedRecord(input.convex, context);

  if (isFreshCachedResult(cachedRecord, now)) {
    logLocalizaEvent("info", "resolver_cache_hit", {
      externalListingId: context.sourceMetadata.externalListingId,
      requestedStrategy: context.requestedStrategy,
      resolverVersion: context.resolverVersion,
      status: cachedRecord.result.status,
      officialSource: cachedRecord.result.officialSource,
      officialSourceUrl: cachedRecord.result.officialSourceUrl,
      territoryAdapter: cachedRecord.result.territoryAdapter,
    });
    return attachCacheExpiry(cachedRecord.result, cachedRecord.expiresAt);
  }

  const leaseOwner = crypto.randomUUID();
  const leaseResult = await input.convex.mutation(
    claimLocationResolutionLeaseRef,
    {
      provider: context.sourceMetadata.provider,
      externalListingId: context.sourceMetadata.externalListingId,
      sourceUrl: context.sourceMetadata.sourceUrl,
      requestedStrategy: context.requestedStrategy,
      resolverVersion: context.resolverVersion,
      leaseOwner,
      leaseDurationMs: LEASE_DURATION_MS,
      defaultExpiresAt: now + UNRESOLVED_CACHE_TTL_MS,
      now,
    },
  );

  if (leaseResult.kind === "cached") {
    const cachedAfterLease = await loadCachedRecord(input.convex, context);

    if (isFreshCachedResult(cachedAfterLease, Date.now())) {
      logLocalizaEvent("info", "resolver_cache_hit_after_lease", {
        externalListingId: context.sourceMetadata.externalListingId,
        requestedStrategy: context.requestedStrategy,
        resolverVersion: context.resolverVersion,
        status: cachedAfterLease.result.status,
        officialSource: cachedAfterLease.result.officialSource,
        officialSourceUrl: cachedAfterLease.result.officialSourceUrl,
        territoryAdapter: cachedAfterLease.result.territoryAdapter,
      });
      return attachCacheExpiry(
        cachedAfterLease.result,
        cachedAfterLease.expiresAt,
      );
    }
  }

  if (leaseResult.kind === "in_flight") {
    logLocalizaEvent("info", "resolver_waiting_for_in_flight_result", {
      externalListingId: context.sourceMetadata.externalListingId,
      requestedStrategy: context.requestedStrategy,
      resolverVersion: context.resolverVersion,
    });
    const inFlightResult = await waitForInFlightResolution({
      convex: input.convex,
      context,
      deadlineAt,
    });

    if (inFlightResult) {
      logLocalizaEvent("info", "resolver_reused_in_flight_result", {
        externalListingId: context.sourceMetadata.externalListingId,
        requestedStrategy: context.requestedStrategy,
        resolverVersion: context.resolverVersion,
        status: inFlightResult.status,
        officialSource: inFlightResult.officialSource,
        officialSourceUrl: inFlightResult.officialSourceUrl,
        territoryAdapter: inFlightResult.territoryAdapter,
      });
      return inFlightResult;
    }

    logLocalizaEvent("warn", "resolver_in_flight_wait_timed_out", {
      externalListingId: context.sourceMetadata.externalListingId,
      requestedStrategy: context.requestedStrategy,
      resolverVersion: context.resolverVersion,
    });
    return buildUnresolvedResult({
      context,
      reasonCodes: [
        "listing_id_parsed",
        "in_flight_lease_wait_timeout",
        "resolver_deadline_exceeded",
      ],
      matchedSignals: ["idealista_listing_id"],
      resolvedAt: new Date().toISOString(),
    });
  }

  const adapterResolution = await resolveSignalsViaAdapters({
    context,
    sourceUrl: context.sourceMetadata.sourceUrl,
    externalListingId: context.sourceMetadata.externalListingId,
    deadlineAt,
  });

  const expiresAt =
    Date.now() + getResultCacheTtlMs(adapterResolution.result.status);

  const persistedResult = await persistResult({
    convex: input.convex,
    context,
    result: adapterResolution.result,
    normalizedSignals: adapterResolution.normalizedSignals,
    now: Date.now(),
    expiresAt,
    errorCode: adapterResolution.errorCode,
    errorMessage: adapterResolution.errorMessage,
  });

  logLocalizaEvent("info", "resolver_completed", {
    externalListingId: context.sourceMetadata.externalListingId,
    requestedStrategy: context.requestedStrategy,
    resolverVersion: context.resolverVersion,
    status: persistedResult.status,
    officialSource: persistedResult.officialSource,
    officialSourceUrl: persistedResult.officialSourceUrl,
    territoryAdapter: persistedResult.territoryAdapter,
    actualAcquisitionMethod: persistedResult.evidence.actualAcquisitionMethod,
    candidateCount: persistedResult.candidates.length,
    confidenceScore: persistedResult.confidenceScore,
    cacheExpiresAt: persistedResult.cacheExpiresAt,
  });

  return persistedResult;
};
