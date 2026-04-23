import type {
  IdealistaAcquisitionMethod,
  IdealistaSignals,
  LocalizaAcquisitionStrategy,
  ResolveIdealistaLocationCandidate,
  ResolveIdealistaLocationResult,
} from "@casedra/types";

export type LocalizaAdapterMethod = Exclude<
  LocalizaAcquisitionStrategy,
  "auto"
>;

export interface LocalizaAdapterInput {
  listingId: string;
  sourceUrl: string;
  signal?: AbortSignal;
}

export interface LocalizaAdapterOutput {
  signals: IdealistaSignals;
  matchedSignals: string[];
  discardedSignals: string[];
  reasonCodes: string[];
}

export interface LocalizaAdapter {
  method: LocalizaAdapterMethod;
  label: string;
  timeoutMs: number;
  isConfigured: () => boolean;
  acquireSignals: (
    input: LocalizaAdapterInput
  ) => Promise<LocalizaAdapterOutput>;
}

export interface LocalizaCachedResolutionRecord {
  _id: string;
  provider: "idealista";
  externalListingId: string;
  sourceUrl: string;
  requestedStrategy: LocalizaAcquisitionStrategy;
  resolverVersion: string;
  resultStatus?: ResolveIdealistaLocationResult["status"];
  result?: ResolveIdealistaLocationResult;
  normalizedSignals?: IdealistaSignals;
  leaseOwner?: string;
  leaseExpiresAt?: number;
  lastAttemptAt?: number;
  lastCompletedAt?: number;
  expiresAt: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalizaClaimLeaseResult {
  kind: "acquired" | "cached" | "in_flight";
  id: string;
}

export interface LocalizaResolutionContext {
  sourceMetadata: ResolveIdealistaLocationResult["sourceMetadata"];
  requestedStrategy: LocalizaAcquisitionStrategy;
  resolverVersion: string;
}

export type LocalizaTerritoryAdapter =
  | "state_catastro"
  | "navarra_rtn"
  | "alava_catastro"
  | "bizkaia_catastro"
  | "gipuzkoa_catastro";

export const officialSourceLabelByTerritory: Record<
  LocalizaTerritoryAdapter,
  string
> = {
  state_catastro: "Dirección General del Catastro",
  navarra_rtn: "Registro de la Riqueza Territorial de Navarra",
  alava_catastro: "Catastro de Alava",
  bizkaia_catastro: "Catastro de Bizkaia",
  gipuzkoa_catastro: "Catastro de Gipuzkoa",
};

export const officialSourceUrlByTerritory: Record<
  LocalizaTerritoryAdapter,
  string
> = {
  state_catastro: "https://ovc.catastro.meh.es/INSPIRE/wfsAD.aspx",
  navarra_rtn: "https://inspire.navarra.es/services/AD/wfs",
  alava_catastro:
    "https://geo.araba.eus/geoaraba/services/OGC_ARABA/WFS_Katastroa/MapServer/WFSServer",
  bizkaia_catastro:
    "https://geo.bizkaia.eus/arcgisserverinspire/rest/services/Catastro/Annex1/MapServer",
  gipuzkoa_catastro: "https://b5m.gipuzkoa.eus/ogc/wfs/gipuzkoa_wfs",
};

export interface LocalizaOfficialResolution {
  status: ResolveIdealistaLocationResult["status"];
  confidenceScore: number;
  officialSource: string;
  resolvedAddressLabel?: string;
  parcelRef14?: string;
  unitRef20?: string;
  prefillLocation?: ResolveIdealistaLocationResult["prefillLocation"];
  candidates: ResolveIdealistaLocationCandidate[];
  reasonCodes: string[];
  matchedSignals: string[];
  discardedSignals: string[];
  territoryAdapter: LocalizaTerritoryAdapter;
}

export const buildAdapterSignals = (
  input: LocalizaAdapterInput,
  acquisitionMethod: IdealistaAcquisitionMethod
): IdealistaSignals => ({
  provider: "idealista",
  listingId: input.listingId,
  sourceUrl: input.sourceUrl,
  acquisitionMethod,
  acquiredAt: new Date().toISOString(),
});
