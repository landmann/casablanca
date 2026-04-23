export type ListingSourceType = "manual" | "firecrawl" | "idealista";

export type LocationResolutionStatus =
	| "exact_match"
	| "building_match"
	| "needs_confirmation"
	| "unresolved"
	| "manual_override";

export interface ListingSourceMetadata {
	provider: "idealista";
	externalListingId: string;
	sourceUrl: string;
}

export interface ListingLocationResolution {
	status: LocationResolutionStatus;
	confidenceScore: number;
	officialSource: string;
	officialSourceUrl?: string;
	territoryAdapter?: LocalizaTerritoryAdapter;
	requestedStrategy?: LocalizaAcquisitionStrategy;
	actualAcquisitionMethod?: IdealistaAcquisitionMethod;
	parcelRef14?: string;
	unitRef20?: string;
	resolvedAddressLabel?: string;
	resolverVersion: string;
	resolvedAt: string;
	reasonCodes: string[];
}

export type IdealistaAcquisitionMethod =
	| "url_parse"
	| "idealista_api"
	| "firecrawl"
	| "browser_worker";

export type LocalizaAcquisitionStrategy =
	| "auto"
	| "idealista_api"
	| "firecrawl"
	| "browser_worker";

export type LocalizaTerritoryAdapter =
	| "state_catastro"
	| "navarra_rtn"
	| "alava_catastro"
	| "bizkaia_catastro"
	| "gipuzkoa_catastro";

export type LocalizaErrorCode =
	| "feature_disabled"
	| "invalid_url"
	| "unsupported_url"
	| "timeout"
	| "upstream_unavailable";

export type ResolveIdealistaLocationStatus = Exclude<
	LocationResolutionStatus,
	"manual_override"
>;

export interface IdealistaSignals {
	provider: "idealista";
	listingId: string;
	sourceUrl: string;
	title?: string;
	price?: number;
	propertyType?: "homes" | "offices" | "premises" | "garages" | "bedrooms";
	areaM2?: number;
	bedrooms?: number;
	bathrooms?: number;
	floorText?: string;
	portalHint?: string;
	neighborhood?: string;
	municipality?: string;
	province?: string;
	postalCodeHint?: string;
	approximateLat?: number;
	approximateLng?: number;
	mapPrecisionMeters?: number;
	listingText?: string;
	imageUrls?: string[];
	acquisitionMethod: IdealistaAcquisitionMethod;
	acquiredAt: string;
}

export interface ResolutionEvidence {
	reasonCodes: string[];
	matchedSignals: string[];
	discardedSignals: string[];
	candidateCount: number;
	requestedStrategy: LocalizaAcquisitionStrategy;
	actualAcquisitionMethod?: IdealistaAcquisitionMethod;
	officialSource: string;
	officialSourceUrl?: string;
	territoryAdapter?: LocalizaTerritoryAdapter;
}

export interface ResolveIdealistaLocationCandidate {
	id: string;
	label: string;
	parcelRef14?: string;
	unitRef20?: string;
	officialUrl?: string;
	distanceMeters?: number;
	score: number;
	reasonCodes: string[];
	prefillLocation?: ListingLocation;
}

export interface ResolveIdealistaLocationResult {
	status: ResolveIdealistaLocationStatus;
	requestedStrategy: LocalizaAcquisitionStrategy;
	confidenceScore: number;
	officialSource: string;
	officialSourceUrl?: string;
	territoryAdapter?: LocalizaTerritoryAdapter;
	resolverVersion: string;
	resolvedAt: string;
	resolvedAddressLabel?: string;
	parcelRef14?: string;
	unitRef20?: string;
	prefillLocation?: ListingLocation;
	candidates: ResolveIdealistaLocationCandidate[];
	evidence: ResolutionEvidence;
	sourceMetadata: ListingSourceMetadata;
	cacheExpiresAt?: string;
}

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
	propertyType:
		| "single_family"
		| "multi_family"
		| "condo"
		| "townhouse"
		| "land"
		| "commercial";
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
	sourceMetadata?: ListingSourceMetadata;
	locationResolution?: ListingLocationResolution;
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
	sourceMetadata?: ListingSourceMetadata;
	locationResolution?: ListingLocationResolution;
	location: ListingLocation;
	details: ListingDetails;
	media: ListingMediaAsset[];
}

export type BrandSourceType = "firecrawl" | "manual";

export interface BrandProfile {
	id: string;
	userId: string;
	companyName: string;
	website?: string;
	tagline?: string;
	voice?: string;
	primaryColorHex?: string;
	secondaryColorHex?: string;
	logoUrl?: string;
	sourceType: BrandSourceType;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface BrandCreateInput {
	companyName: string;
	website?: string;
	tagline?: string;
	voice?: string;
	primaryColorHex?: string;
	secondaryColorHex?: string;
	logoUrl?: string;
	sourceType: BrandSourceType;
	notes?: string;
}

export type MediaGenerationKind =
	| "social_graphic"
	| "flyer"
	| "short_form_video"
	| "property_description"
	| "email_copy"
	| "landing_page_section";

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

export type AIGenerationStatus =
	| "queued"
	| "running"
	| "succeeded"
	| "failed"
	| "cancelled";

export type AIGenerationProvider = "fal" | "runway" | "internal" | "manual";

export interface AIGenerationRecord {
	id: string;
	userId: string;
	workspaceId: string;
	listingId?: string;
	requestId?: string;
	provider: AIGenerationProvider;
	status: AIGenerationStatus;
	statusMessage?: string | null;
	mediaKey: string;
	generationParams?: Record<string, unknown> | null;
	kind: MediaGenerationKind;
	resultAssetUrl?: string | null;
	generationMethodName?: string | null;
	favorite?: boolean | null;
	tags?: string[];
	parentGenerationId?: string | null;
	createdAt: string;
	updatedAt: string;
	completedAt?: string | null;
	deletedAt?: string | null;
}

export interface AIGenerationCreateInput {
	userId: string;
	workspaceId: string;
	listingId?: string;
	requestId?: string;
	provider: AIGenerationProvider;
	mediaKey: string;
	kind: MediaGenerationKind;
	generationParams?: Record<string, unknown> | null;
	generationMethodName?: string | null;
	tags?: string[];
	parentGenerationId?: string | null;
}

export const agencyRoleValues = ["owner", "manager", "agent"] as const;
export type AgencyRole = (typeof agencyRoleValues)[number];

export const agencyStatusValues = ["active", "inactive"] as const;
export type AgencyStatus = (typeof agencyStatusValues)[number];

export const agencyMembershipStatusValues = [
	"active",
	"invited",
	"disabled",
] as const;
export type AgencyMembershipStatus =
	(typeof agencyMembershipStatusValues)[number];

export const channelTypeValues = [
	"whatsapp",
	"portal_email",
	"web_form",
	"manual",
] as const;
export type ChannelType = (typeof channelTypeValues)[number];

export const channelStatusValues = ["active", "paused", "disabled"] as const;
export type ChannelStatus = (typeof channelStatusValues)[number];

export const contactKindValues = ["buyer", "seller", "unknown"] as const;
export type ContactKind = (typeof contactKindValues)[number];

export const leadKindValues = [
	"buyer_inquiry",
	"seller_inquiry",
	"valuation_request",
	"other",
] as const;
export type LeadKind = (typeof leadKindValues)[number];

export const leadStatusValues = ["new", "active", "closed"] as const;
export type LeadStatus = (typeof leadStatusValues)[number];

export const conversationStateValues = [
	"new",
	"bot_active",
	"awaiting_human",
	"human_active",
	"closed",
] as const;
export type ConversationState = (typeof conversationStateValues)[number];

export const conversationOwnerTypeValues = [
	"unassigned",
	"ai",
	"human",
] as const;
export type ConversationOwnerType =
	(typeof conversationOwnerTypeValues)[number];

export const messageDirectionValues = [
	"inbound",
	"outbound",
	"internal",
] as const;
export type MessageDirection = (typeof messageDirectionValues)[number];

export const messageSenderTypeValues = [
	"lead",
	"ai",
	"user",
	"system",
] as const;
export type MessageSenderType = (typeof messageSenderTypeValues)[number];

export const messageBodyFormatValues = ["plain_text", "markdown"] as const;
export type MessageBodyFormat = (typeof messageBodyFormatValues)[number];

export const handoffTriggerValues = [
	"low_confidence",
	"lead_requested_human",
	"manual_takeover",
	"routing_rule",
	"manager_reassign",
	"other",
] as const;
export type HandoffTrigger = (typeof handoffTriggerValues)[number];

export const performancePeriodTypeValues = ["day", "week"] as const;
export type PerformancePeriodType =
	(typeof performancePeriodTypeValues)[number];
