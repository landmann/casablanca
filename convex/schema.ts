import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
	agencyMembershipStatusValidator,
	agencyRoleValidator,
	agencyStatusValidator,
	channelStatusValidator,
	channelTypeValidator,
	contactKindValidator,
	conversationOwnerTypeValidator,
	conversationStateValidator,
	handoffTriggerValidator,
	leadKindValidator,
	leadStatusValidator,
	messageBodyFormatValidator,
	messageDirectionValidator,
	messageSenderTypeValidator,
	performancePeriodTypeValidator,
} from "./workflowValidators";

const listingLocationValidator = v.object({
	street: v.string(),
	city: v.string(),
	stateOrProvince: v.string(),
	postalCode: v.string(),
	country: v.string(),
});

const listingSourceMetadataValidator = v.object({
	provider: v.literal("idealista"),
	externalListingId: v.string(),
	sourceUrl: v.string(),
});

const localizaDossierImageValidator = v.object({
	imageUrl: v.string(),
	thumbnailUrl: v.optional(v.string()),
	sourcePortal: v.string(),
	sourceUrl: v.string(),
	observedAt: v.string(),
	lastVerifiedAt: v.optional(v.string()),
	sourcePublishedAt: v.optional(v.string()),
	caption: v.optional(v.string()),
});

const locationResolutionStatusValidator = v.union(
	v.literal("exact_match"),
	v.literal("building_match"),
	v.literal("needs_confirmation"),
	v.literal("unresolved"),
	v.literal("manual_override"),
);

const requestedStrategyValidator = v.union(
	v.literal("auto"),
	v.literal("idealista_api"),
	v.literal("firecrawl"),
	v.literal("browser_worker"),
);

const acquisitionMethodValidator = v.union(
	v.literal("url_parse"),
	v.literal("idealista_api"),
	v.literal("firecrawl"),
	v.literal("browser_worker"),
);

const territoryAdapterValidator = v.union(
	v.literal("state_catastro"),
	v.literal("navarra_rtn"),
	v.literal("alava_catastro"),
	v.literal("bizkaia_catastro"),
	v.literal("gipuzkoa_catastro"),
);

const listingLocationResolutionValidator = v.object({
	status: locationResolutionStatusValidator,
	confidenceScore: v.number(),
	officialSource: v.string(),
	officialSourceUrl: v.optional(v.string()),
	territoryAdapter: v.optional(territoryAdapterValidator),
	requestedStrategy: v.optional(requestedStrategyValidator),
	actualAcquisitionMethod: v.optional(acquisitionMethodValidator),
	parcelRef14: v.optional(v.string()),
	unitRef20: v.optional(v.string()),
	resolvedAddressLabel: v.optional(v.string()),
	resolverVersion: v.string(),
	resolvedAt: v.string(),
	candidateCount: v.optional(v.number()),
	reasonCodes: v.array(v.string()),
});

const localizaPropertyDossierValidator = v.object({
	listingSnapshot: v.object({
		title: v.optional(v.string()),
		leadImageUrl: v.optional(v.string()),
		askingPrice: v.optional(v.number()),
		currencyCode: v.optional(v.literal("EUR")),
		priceIncludesParking: v.optional(v.boolean()),
		areaM2: v.optional(v.number()),
		bedrooms: v.optional(v.number()),
		bathrooms: v.optional(v.number()),
		floorText: v.optional(v.string()),
		isExterior: v.optional(v.boolean()),
		hasElevator: v.optional(v.boolean()),
		sourcePortal: v.literal("idealista"),
		sourceUrl: v.string(),
	}),
	imageGallery: v.array(localizaDossierImageValidator),
	officialIdentity: v.object({
		proposedAddressLabel: v.optional(v.string()),
		street: v.optional(v.string()),
		number: v.optional(v.string()),
		staircase: v.optional(v.string()),
		floor: v.optional(v.string()),
		door: v.optional(v.string()),
		postalCode: v.optional(v.string()),
		municipality: v.optional(v.string()),
		province: v.optional(v.string()),
		parcelRef14: v.optional(v.string()),
		unitRef20: v.optional(v.string()),
		officialSource: v.string(),
		officialSourceUrl: v.optional(v.string()),
	}),
	publicHistory: v.array(
		v.object({
			observedAt: v.string(),
			askingPrice: v.optional(v.number()),
			currencyCode: v.optional(v.literal("EUR")),
			portal: v.string(),
			advertiserName: v.optional(v.string()),
			agencyName: v.optional(v.string()),
			sourceUrl: v.optional(v.string()),
			daysPublished: v.optional(v.number()),
		}),
	),
	duplicateGroup: v.object({
		count: v.number(),
		records: v.array(
			v.object({
				portal: v.string(),
				sourceUrl: v.optional(v.string()),
				advertiserName: v.optional(v.string()),
				agencyName: v.optional(v.string()),
				firstSeenAt: v.optional(v.string()),
				lastSeenAt: v.optional(v.string()),
				askingPrice: v.optional(v.number()),
			}),
		),
	}),
	publicationDurations: v.array(
		v.object({
			label: v.string(),
			kind: v.union(
				v.literal("advertiser"),
				v.literal("agency"),
				v.literal("portal"),
			),
			daysPublished: v.number(),
		}),
	),
	actions: v.object({
		reportDownloadUrl: v.optional(v.string()),
		valuationUrl: v.optional(v.string()),
	}),
});

const resolveLocationCandidateValidator = v.object({
	id: v.string(),
	label: v.string(),
	parcelRef14: v.optional(v.string()),
	unitRef20: v.optional(v.string()),
	officialUrl: v.optional(v.string()),
	distanceMeters: v.optional(v.number()),
	score: v.number(),
	reasonCodes: v.array(v.string()),
	prefillLocation: v.optional(listingLocationValidator),
});

const resolutionEvidenceValidator = v.object({
	reasonCodes: v.array(v.string()),
	matchedSignals: v.array(v.string()),
	discardedSignals: v.array(v.string()),
	candidateCount: v.number(),
	requestedStrategy: requestedStrategyValidator,
	actualAcquisitionMethod: v.optional(acquisitionMethodValidator),
	officialSource: v.string(),
	officialSourceUrl: v.optional(v.string()),
	territoryAdapter: v.optional(territoryAdapterValidator),
});

const resolveIdealistaLocationResultValidator = v.object({
	status: v.union(
		v.literal("exact_match"),
		v.literal("building_match"),
		v.literal("needs_confirmation"),
		v.literal("unresolved"),
	),
	requestedStrategy: requestedStrategyValidator,
	confidenceScore: v.number(),
	officialSource: v.string(),
	officialSourceUrl: v.optional(v.string()),
	territoryAdapter: v.optional(territoryAdapterValidator),
	resolverVersion: v.string(),
	resolvedAt: v.string(),
	resolvedAddressLabel: v.optional(v.string()),
	parcelRef14: v.optional(v.string()),
	unitRef20: v.optional(v.string()),
	prefillLocation: v.optional(listingLocationValidator),
	candidates: v.array(resolveLocationCandidateValidator),
	evidence: resolutionEvidenceValidator,
	sourceMetadata: listingSourceMetadataValidator,
	propertyDossier: v.optional(localizaPropertyDossierValidator),
	cacheExpiresAt: v.optional(v.string()),
});

const listings = defineTable({
	agentId: v.string(),
	title: v.string(),
	slug: v.string(),
	status: v.union(
		v.literal("draft"),
		v.literal("active"),
		v.literal("sold"),
		v.literal("archived"),
	),
	sourceType: v.union(
		v.literal("manual"),
		v.literal("firecrawl"),
		v.literal("idealista"),
	),
	sourceUrl: v.optional(v.string()),
	sourceMetadata: v.optional(listingSourceMetadataValidator),
	locationResolution: v.optional(listingLocationResolutionValidator),
	propertyDossier: v.optional(localizaPropertyDossierValidator),
	location: listingLocationValidator,
	displayAddressLabel: v.optional(v.string()),
	details: v.object({
		priceAmount: v.optional(v.number()),
		currencyCode: v.optional(v.union(v.literal("EUR"), v.literal("USD"))),
		bedrooms: v.number(),
		bathrooms: v.number(),
		interiorAreaSquareMeters: v.optional(v.number()),
		lotAreaSquareMeters: v.optional(v.number()),
		priceUsd: v.optional(v.number()),
		squareFeet: v.optional(v.number()),
		lotSizeSqFt: v.optional(v.number()),
		yearBuilt: v.optional(v.number()),
		propertyType: v.string(),
		description: v.string(),
	}),
	media: v.array(
		v.object({
			url: v.string(),
			type: v.union(
				v.literal("photo"),
				v.literal("video"),
				v.literal("floor_plan"),
				v.literal("virtual_tour"),
				v.literal("document"),
			),
			caption: v.optional(v.string()),
			tags: v.optional(v.array(v.string())),
		}),
	),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_agent", ["agentId"])
	.index("by_slug", ["slug"]);

const locationResolutions = defineTable({
	provider: v.literal("idealista"),
	externalListingId: v.string(),
	sourceUrl: v.string(),
	requestedStrategy: requestedStrategyValidator,
	resolverVersion: v.string(),
	resultStatus: v.optional(
		v.union(
			v.literal("exact_match"),
			v.literal("building_match"),
			v.literal("needs_confirmation"),
			v.literal("unresolved"),
		),
	),
	propertyHistoryKey: v.optional(v.string()),
	result: v.optional(resolveIdealistaLocationResultValidator),
	normalizedSignals: v.optional(v.any()),
	leaseOwner: v.optional(v.string()),
	leaseExpiresAt: v.optional(v.number()),
	lastAttemptAt: v.optional(v.number()),
	lastCompletedAt: v.optional(v.number()),
	expiresAt: v.number(),
	errorCode: v.optional(v.string()),
	errorMessage: v.optional(v.string()),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_lookup", [
		"provider",
		"externalListingId",
		"requestedStrategy",
		"resolverVersion",
	])
	.index("by_source_url", ["sourceUrl"])
	.index("by_property_history_key", ["propertyHistoryKey"])
	.index("by_expires_at", ["expiresAt"]);

const localizaMarketObservations = defineTable({
	observationKey: v.string(),
	propertyHistoryKey: v.string(),
	portal: v.string(),
	observedAt: v.string(),
	askingPrice: v.optional(v.number()),
	currencyCode: v.optional(v.literal("EUR")),
	advertiserName: v.optional(v.string()),
	agencyName: v.optional(v.string()),
	sourceUrl: v.optional(v.string()),
	daysPublished: v.optional(v.number()),
	firstSeenAt: v.optional(v.string()),
	lastSeenAt: v.optional(v.string()),
	provenanceLabel: v.string(),
	provenanceUrl: v.optional(v.string()),
	sourceRecordId: v.optional(v.string()),
	createdByUserId: v.string(),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_observation_key", ["observationKey"])
	.index("by_property_history_key", ["propertyHistoryKey"]);

const localizaLiveFixtureValidationStatus = v.union(
	v.literal("pending_official_validation"),
	v.literal("officially_validated"),
);

const localizaLiveFixtureExpectedStatus = v.union(
	v.literal("exact_match"),
	v.literal("building_match"),
	v.literal("needs_confirmation"),
	v.literal("unresolved"),
);

const localizaLiveFixtureSource = v.union(
	v.literal("seed"),
	v.literal("incident_auto_added"),
);

const localizaGoldenLiveFixtures = defineTable({
	fixtureId: v.string(),
	sourceUrl: v.string(),
	expectedStatus: localizaLiveFixtureExpectedStatus,
	territoryAdapter: territoryAdapterValidator,
	humanUnitResolvable: v.boolean(),
	expectedLocation: v.object({
		street: v.string(),
		city: v.string(),
		stateOrProvince: v.string(),
		country: v.string(),
		postalCode: v.optional(v.string()),
	}),
	validationStatus: localizaLiveFixtureValidationStatus,
	lastValidationRunAt: v.optional(v.string()),
	lastObservedStatus: v.optional(localizaLiveFixtureExpectedStatus),
	lastObservedTerritoryAdapter: v.optional(territoryAdapterValidator),
	lastObservedReasonCodes: v.optional(v.array(v.string())),
	observedAt: v.string(),
	validationNotes: v.string(),
	source: localizaLiveFixtureSource,
	incidentId: v.optional(v.id("localizaIncidents")),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_fixture_id", ["fixtureId"])
	.index("by_source_url", ["sourceUrl"])
	.index("by_validation_status", ["validationStatus"]);

const localizaIncidents = defineTable({
	kind: v.literal("false_positive_autofill"),
	severity: v.literal("sev1"),
	status: v.union(v.literal("open"), v.literal("resolved")),
	sourceUrl: v.string(),
	externalListingId: v.optional(v.string()),
	listingId: v.optional(v.id("listings")),
	resolverVersion: v.optional(v.string()),
	resultStatus: v.optional(
		v.union(
			v.literal("exact_match"),
			v.literal("building_match"),
			v.literal("needs_confirmation"),
			v.literal("unresolved"),
			v.literal("manual_override"),
		),
	),
	reportedByUserId: v.string(),
	resolvedByUserId: v.optional(v.string()),
	notes: v.optional(v.string()),
	resolutionNotes: v.optional(v.string()),
	createdAt: v.number(),
	updatedAt: v.number(),
	resolvedAt: v.optional(v.number()),
})
	.index("by_status_and_kind", ["status", "kind"])
	.index("by_source_url", ["sourceUrl"])
	.index("by_created_at", ["createdAt"]);

const listingCreateRequests = defineTable({
	agentId: v.string(),
	idempotencyKey: v.string(),
	listingIds: v.array(v.id("listings")),
	createdAt: v.number(),
	updatedAt: v.number(),
}).index("by_agent_and_key", ["agentId", "idempotencyKey"]);

const mediaJobs = defineTable({
	listingId: v.id("listings"),
	kind: v.union(
		v.literal("social_graphic"),
		v.literal("flyer"),
		v.literal("short_form_video"),
		v.literal("property_description"),
	),
	status: v.union(
		v.literal("pending"),
		v.literal("completed"),
		v.literal("failed"),
	),
	resultUrl: v.optional(v.string()),
	metadata: v.optional(v.any()),
	error: v.optional(v.string()),
	createdAt: v.number(),
	updatedAt: v.number(),
}).index("by_listing", ["listingId"]);

const agencies = defineTable({
	name: v.string(),
	slug: v.string(),
	country: v.string(),
	timezone: v.string(),
	status: agencyStatusValidator,
	createdAt: v.number(),
	updatedAt: v.number(),
}).index("by_slug", ["slug"]);

const agencyMemberships = defineTable({
	agencyId: v.id("agencies"),
	userId: v.string(),
	role: agencyRoleValidator,
	status: agencyMembershipStatusValidator,
	displayName: v.optional(v.string()),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_user", ["userId"])
	.index("by_agency", ["agencyId"])
	.index("by_agency_and_user", ["agencyId", "userId"]);

const channels = defineTable({
	agencyId: v.id("agencies"),
	type: channelTypeValidator,
	label: v.string(),
	status: channelStatusValidator,
	provider: v.string(),
	externalChannelId: v.optional(v.string()),
	config: v.optional(v.any()),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_agency", ["agencyId"])
	.index("by_agency_and_external_id", ["agencyId", "externalChannelId"]);

const contacts = defineTable({
	agencyId: v.id("agencies"),
	kind: contactKindValidator,
	fullName: v.optional(v.string()),
	phone: v.optional(v.string()),
	email: v.optional(v.string()),
	preferredLanguage: v.optional(v.string()),
	notes: v.optional(v.string()),
	createdAt: v.number(),
	updatedAt: v.number(),
}).index("by_agency", ["agencyId"]);

const leads = defineTable({
	agencyId: v.id("agencies"),
	contactId: v.optional(v.id("contacts")),
	channelId: v.optional(v.id("channels")),
	listingId: v.optional(v.id("listings")),
	kind: leadKindValidator,
	sourceType: channelTypeValidator,
	sourceLabel: v.string(),
	externalLeadId: v.optional(v.string()),
	status: leadStatusValidator,
	receivedAt: v.number(),
	rawPayload: v.optional(v.any()),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_agency", ["agencyId", "receivedAt"])
	.index("by_contact", ["contactId"])
	.index("by_external_lead", ["agencyId", "externalLeadId"]);

const conversations = defineTable({
	agencyId: v.id("agencies"),
	leadId: v.id("leads"),
	contactId: v.optional(v.id("contacts")),
	channelId: v.optional(v.id("channels")),
	listingId: v.optional(v.id("listings")),
	state: conversationStateValidator,
	ownerType: conversationOwnerTypeValidator,
	ownerUserId: v.optional(v.string()),
	version: v.number(),
	sourceType: channelTypeValidator,
	sourceLabel: v.string(),
	summary: v.optional(v.string()),
	nextRecommendedStep: v.optional(v.string()),
	firstResponseAt: v.optional(v.number()),
	lastInboundAt: v.optional(v.number()),
	lastOutboundAt: v.optional(v.number()),
	lastMessageAt: v.number(),
	reopenedAt: v.optional(v.number()),
	closedAt: v.optional(v.number()),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_agency", ["agencyId", "lastMessageAt"])
	.index("by_state", ["agencyId", "state", "lastMessageAt"])
	.index("by_owner", ["agencyId", "ownerType", "ownerUserId", "lastMessageAt"])
	.index("by_lead", ["leadId"])
	.index("by_channel", ["agencyId", "channelId", "lastMessageAt"]);

const messages = defineTable({
	agencyId: v.id("agencies"),
	conversationId: v.id("conversations"),
	direction: messageDirectionValidator,
	senderType: messageSenderTypeValidator,
	senderUserId: v.optional(v.string()),
	body: v.string(),
	bodyFormat: messageBodyFormatValidator,
	providerMessageId: v.optional(v.string()),
	externalEventId: v.optional(v.string()),
	dedupeKey: v.optional(v.string()),
	sentAt: v.number(),
	metadata: v.optional(v.any()),
	createdAt: v.number(),
})
	.index("by_conversation", ["conversationId", "sentAt", "createdAt"])
	.index("by_dedupe_key", ["agencyId", "dedupeKey"]);

const assignments = defineTable({
	agencyId: v.id("agencies"),
	conversationId: v.id("conversations"),
	assigneeUserId: v.string(),
	assignedByUserId: v.string(),
	reason: v.string(),
	active: v.boolean(),
	createdAt: v.number(),
	endedAt: v.optional(v.number()),
}).index("by_conversation", ["conversationId", "createdAt"]);

const handoffEvents = defineTable({
	agencyId: v.id("agencies"),
	conversationId: v.id("conversations"),
	fromOwnerType: conversationOwnerTypeValidator,
	fromUserId: v.optional(v.string()),
	toOwnerType: conversationOwnerTypeValidator,
	toUserId: v.optional(v.string()),
	trigger: handoffTriggerValidator,
	summarySnapshot: v.optional(v.string()),
	recommendation: v.optional(v.string()),
	createdAt: v.number(),
})
	.index("by_conversation", ["conversationId", "createdAt"])
	.index("by_agency", ["agencyId", "createdAt"]);

const performanceSnapshots = defineTable({
	agencyId: v.id("agencies"),
	periodType: performancePeriodTypeValidator,
	periodStart: v.number(),
	periodEnd: v.number(),
	conversationCount: v.number(),
	respondedConversationCount: v.number(),
	medianFirstResponseSeconds: v.optional(v.number()),
	responseCoveragePct: v.optional(v.number()),
	handoffRatePct: v.optional(v.number()),
	manualTakeoverRatePct: v.optional(v.number()),
	createdAt: v.number(),
}).index("by_agency_and_period", ["agencyId", "periodType", "periodStart"]);

export default defineSchema({
	agencies,
	agencyMemberships,
	assignments,
	channels,
	contacts,
	conversations,
	handoffEvents,
	listings,
	listingCreateRequests,
	localizaGoldenLiveFixtures,
	localizaIncidents,
	localizaMarketObservations,
	locationResolutions,
	leads,
	mediaJobs,
	messages,
	performanceSnapshots,
});
