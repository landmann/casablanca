"use client";

import type {
	AIGenerationRecord,
	BrandCreateInput,
	BrandSourceType,
	IdealistaAcquisitionMethod,
	ListingCreateInput,
	ListingLocationResolution,
	ListingSourceType,
	LocalizaAcquisitionStrategy,
	LocalizaTerritoryAdapter,
	MediaGenerationKind,
	ResolveIdealistaLocationResult,
} from "@casedra/types";
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Textarea,
} from "@casedra/ui";
import {
	AlertCircle,
	ArrowLeft,
	ArrowRight,
	Building2,
	CheckCircle2,
	Globe2,
	ListChecks,
	LoaderCircle,
	Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/env";
import { trpc } from "@/trpc/shared";

const stepOrder = ["brand", "listings", "review"] as const;
export type OnboardingStepKey = (typeof stepOrder)[number];

const propertyOptions: ListingCreateInput["details"]["propertyType"][] = [
	"single_family",
	"multi_family",
	"condo",
	"townhouse",
	"land",
	"commercial",
];

const defaultBrand: BrandCreateInput = {
	companyName: "",
	website: "",
	tagline: "",
	voice: "",
	primaryColorHex: "#0f172a",
	secondaryColorHex: "",
	logoUrl: "",
	sourceType: "firecrawl",
	notes: "",
};

type ListingDraft = {
	title: string;
	sourceType: ListingSourceType;
	sourceUrl: string;
	sourceMetadata?: ListingCreateInput["sourceMetadata"];
	locationResolution?: ListingLocationResolution;
	location: ListingCreateInput["location"];
	details: {
		priceUsd: string;
		bedrooms: string;
		bathrooms: string;
		squareFeet?: string;
		propertyType: ListingCreateInput["details"]["propertyType"];
		description: string;
	};
};

type PlannedGeneration = Pick<
	AIGenerationRecord,
	"kind" | "listingId" | "mediaKey"
> & {
	label: string;
};

const createListingDraft = (): ListingDraft => ({
	title: "",
	sourceType: "idealista",
	sourceUrl: "",
	location: {
		street: "",
		city: "",
		stateOrProvince: "",
		postalCode: "",
		country: "Spain",
	},
	details: {
		priceUsd: "",
		bedrooms: "",
		bathrooms: "",
		squareFeet: "",
		propertyType: propertyOptions[0],
		description: "",
	},
});

const generationTemplates: { kind: MediaGenerationKind; label: string }[] = [
	{ kind: "social_graphic", label: "Instagram carousel" },
	{ kind: "flyer", label: "Open house flyer" },
	{ kind: "short_form_video", label: "30s vertical video" },
	{ kind: "property_description", label: "Listing description" },
	{ kind: "email_copy", label: "Buyer nurture email" },
];

const brandTips: Record<BrandSourceType, string> = {
	firecrawl:
		"We will pull palette, messaging, and voice from your public site using Firecrawl.",
	manual:
		"Give us the essentials so Casedra can mirror your brand across every deliverable.",
};

const listingSourceOptions: Array<{
	value: ListingSourceType;
	label: string;
	icon: typeof Globe2;
}> = [
	{
		value: "idealista",
		label: "Use Idealista URL",
		icon: Globe2,
	},
	{
		value: "firecrawl",
		label: "Use URL import",
		icon: Globe2,
	},
	{
		value: "manual",
		label: "Enter manually",
		icon: Sparkles,
	},
];

const listingSourceCopy: Record<
	ListingSourceType,
	{
		description: string;
		urlLabel?: string;
		urlPlaceholder?: string;
		urlHint?: string;
	}
> = {
	idealista: {
		description:
			"Paste the Idealista link now. Localiza can try Auto first or let you force a specific acquisition method, while address entry stays editable.",
		urlLabel: "Idealista listing URL",
		urlPlaceholder: "https://www.idealista.com/inmueble/108926410/",
		urlHint:
			"Start with Auto, then retry with Firecrawl, Browser worker, or Idealista API when you need a different path.",
	},
	firecrawl: {
		description:
			"Use a public listing URL when you want URL-based intake without Idealista-specific handling.",
		urlLabel: "Public listing URL",
		urlPlaceholder: "https://www.fotocasa.es/...",
		urlHint:
			"Use any supported public listing page and keep the address fields editable.",
	},
	manual: {
		description:
			"Use manual mode when you already know the listing details and do not need URL-based intake.",
	},
};

const listingSourceDisplayCopy: Record<ListingSourceType, string> = {
	idealista: "Idealista",
	firecrawl: "URL import",
	manual: "Manual",
};

const localizaStatusCopy: Record<
	ResolveIdealistaLocationResult["status"] | "manual_override",
	{
		label: string;
		description: string;
	}
> = {
	exact_match: {
		label: "Exact match",
		description:
			"We found enough evidence to prefill the official address automatically.",
	},
	building_match: {
		label: "Building match",
		description:
			"We found the official building, but unit-level certainty is still limited.",
	},
	needs_confirmation: {
		label: "Needs confirmation",
		description:
			"We found promising official candidates, but the user must confirm one.",
	},
	unresolved: {
		label: "Unresolved",
		description:
			"We could not verify the exact location yet. Keep the pasted URL and enter the address manually.",
	},
	manual_override: {
		label: "Manual override",
		description:
			"The address was adjusted after a resolver suggestion, so the final saved listing should reflect a manual override.",
	},
};

const localizaStrategyOptions: Array<{
	value: LocalizaAcquisitionStrategy;
	label: string;
	description: string;
}> = [
	{
		value: "auto",
		label: "Auto",
		description:
			"Use the best available method first, then let the user retry explicitly if needed.",
	},
	{
		value: "firecrawl",
		label: "Firecrawl",
		description: "Rendered extraction path for user-submitted URLs.",
	},
	{
		value: "browser_worker",
		label: "Browser worker",
		description: "Browserbase-backed fallback for tough pages.",
	},
	{
		value: "idealista_api",
		label: "Idealista API",
		description: "Official Idealista path when credentials are available.",
	},
];

const localizaStrategyLabel: Record<LocalizaAcquisitionStrategy, string> = {
	auto: "Auto",
	idealista_api: "Idealista API",
	firecrawl: "Firecrawl",
	browser_worker: "Browser worker",
};

const localizaMethodLabel: Record<IdealistaAcquisitionMethod, string> = {
	url_parse: "URL parse fallback",
	idealista_api: "Idealista API",
	firecrawl: "Firecrawl",
	browser_worker: "Browser worker",
};

const localizaTerritoryLabel: Record<LocalizaTerritoryAdapter, string> = {
	state_catastro: "National Catastro",
	navarra_rtn: "Navarra",
	alava_catastro: "Álava",
	bizkaia_catastro: "Bizkaia",
	gipuzkoa_catastro: "Gipuzkoa",
};

const capturePosthogEvent = (
	event: string,
	properties: Record<string, unknown>,
) => {
	if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
		return;
	}

	posthog.capture(event, properties);
};

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "");
}

function computePlannedGenerations(
	listings: ListingCreateInput[],
): PlannedGeneration[] {
	return listings.flatMap((listing, listingIndex) => {
		const listingSlug =
			listing.slug && listing.slug.length > 0
				? listing.slug
				: slugify(listing.title);
		const listingId =
			listingSlug && listingSlug.length > 0
				? listingSlug
				: `listing-${listingIndex + 1}`;

		return generationTemplates.map((template) => ({
			kind: template.kind,
			label: template.label,
			listingId,
			mediaKey: `${listingId}-${template.kind}`,
		}));
	});
}

const buildLocationResolutionFromResult = (
	result: ResolveIdealistaLocationResult,
	overrides?: Partial<
		Pick<
			ListingLocationResolution,
			| "status"
			| "confidenceScore"
			| "parcelRef14"
			| "unitRef20"
			| "resolvedAddressLabel"
		>
	> & {
		extraReasonCodes?: string[];
	},
): ListingLocationResolution => ({
	status: overrides?.status ?? result.status,
	confidenceScore: overrides?.confidenceScore ?? result.confidenceScore,
	officialSource: result.officialSource,
	officialSourceUrl: result.officialSourceUrl,
	territoryAdapter: result.territoryAdapter,
	requestedStrategy: result.requestedStrategy,
	actualAcquisitionMethod: result.evidence.actualAcquisitionMethod,
	parcelRef14: overrides?.parcelRef14 ?? result.parcelRef14,
	unitRef20: overrides?.unitRef20 ?? result.unitRef20,
	resolvedAddressLabel:
		overrides?.resolvedAddressLabel ?? result.resolvedAddressLabel,
	resolverVersion: result.resolverVersion,
	resolvedAt: result.resolvedAt,
	reasonCodes: Array.from(
		new Set([
			...result.evidence.reasonCodes,
			...(overrides?.extraReasonCodes ?? []),
		]),
	),
});

const normalizeLocationValue = (value: string) =>
	value.trim().toLowerCase().replace(/\s+/g, " ");

const hasMaterialLocationChange = (
	previous: ListingCreateInput["location"],
	next: ListingCreateInput["location"],
) =>
	normalizeLocationValue(previous.street) !==
		normalizeLocationValue(next.street) ||
	normalizeLocationValue(previous.city) !== normalizeLocationValue(next.city) ||
	normalizeLocationValue(previous.stateOrProvince) !==
		normalizeLocationValue(next.stateOrProvince) ||
	normalizeLocationValue(previous.postalCode) !==
		normalizeLocationValue(next.postalCode) ||
	normalizeLocationValue(previous.country) !==
		normalizeLocationValue(next.country);

interface OnboardingFlowProps {
	initialStep: OnboardingStepKey;
}

export default function OnboardingFlow({ initialStep }: OnboardingFlowProps) {
	const router = useRouter();
	const normalizedStep = stepOrder.includes(initialStep)
		? initialStep
		: "brand";
	const [currentStep, setCurrentStep] =
		useState<OnboardingStepKey>(normalizedStep);
	const [brand, setBrand] = useState<BrandCreateInput>(defaultBrand);
	const [brandSource, setBrandSource] = useState<BrandSourceType>("firecrawl");
	const [listingDraft, setListingDraft] = useState<ListingDraft>(() =>
		createListingDraft(),
	);
	const [listings, setListings] = useState<ListingCreateInput[]>([]);
	const [localizaStrategy, setLocalizaStrategy] =
		useState<LocalizaAcquisitionStrategy>("auto");
	const [localizaResult, setLocalizaResult] =
		useState<ResolveIdealistaLocationResult | null>(null);
	const [localizaError, setLocalizaError] = useState<string | null>(null);
	const [selectedLocalizaCandidateId, setSelectedLocalizaCandidateId] =
		useState<string | null>(null);
	const [submissionError, setSubmissionError] = useState<string | null>(null);
	const [submissionIdempotencyKey, setSubmissionIdempotencyKey] = useState<
		string | null
	>(null);
	const hasTrackedLocalizaUrlPasteRef = useRef(false);
	const hasTrackedManualOverrideRef = useRef(false);

	const buildLocalizaAnalyticsPayload = (
		result: ResolveIdealistaLocationResult,
	) => ({
		status: result.status,
		requestedStrategy: result.requestedStrategy,
		actualAcquisitionMethod: result.evidence.actualAcquisitionMethod,
		officialSource: result.officialSource,
		officialSourceUrl: result.officialSourceUrl,
		territoryAdapter: result.territoryAdapter,
		externalListingId: result.sourceMetadata.externalListingId,
		candidateCount: result.candidates.length,
		confidenceScore: result.confidenceScore,
	});

	useEffect(() => {
		setCurrentStep(normalizedStep);
	}, [normalizedStep]);

	useEffect(() => {
		setBrand((prev) => ({ ...prev, sourceType: brandSource }));
	}, [brandSource]);

	useEffect(() => {
		if (listingDraft.sourceType !== "idealista") {
			return;
		}

		setListingDraft((prev) => ({
			...prev,
			location: {
				...prev.location,
				country: "Spain",
			},
		}));
	}, [listingDraft.sourceType]);

	useEffect(() => {
		setSubmissionIdempotencyKey(null);
	}, [listings]);

	const currentIndex = stepOrder.indexOf(currentStep);
	const isFirstStep = currentIndex === 0;
	const isLastStep = currentIndex === stepOrder.length - 1;

	const plannedGenerations = useMemo(
		() => computePlannedGenerations(listings),
		[listings],
	);

	const resolveIdealistaLocation =
		trpc.listings.resolveIdealistaLocation.useMutation({
			onSuccess: (result) => {
				hasTrackedManualOverrideRef.current = false;
				setLocalizaError(null);
				setLocalizaResult(result);
				setSelectedLocalizaCandidateId(null);
				setListingDraft((prev) => ({
					...prev,
					sourceMetadata: result.sourceMetadata,
					location:
						result.prefillLocation && result.status === "exact_match"
							? result.prefillLocation
							: prev.location,
					locationResolution:
						result.status === "exact_match" || result.status === "unresolved"
							? buildLocationResolutionFromResult(result)
							: undefined,
				}));
				capturePosthogEvent("localiza_resolve_result", {
					...buildLocalizaAnalyticsPayload(result),
					outcome:
						result.status === "unresolved" ? "unresolved" : "resolved",
				});
				capturePosthogEvent(
					result.status === "unresolved"
						? "localiza_resolve_unresolved"
						: "localiza_resolve_success",
					buildLocalizaAnalyticsPayload(result),
				);
			},
			onError: (error) => {
				hasTrackedManualOverrideRef.current = false;
				setLocalizaResult(null);
				setLocalizaError(error.message);
				setSelectedLocalizaCandidateId(null);
				setListingDraft((prev) => ({
					...prev,
					sourceMetadata: undefined,
					locationResolution: undefined,
				}));
				capturePosthogEvent("localiza_resolve_failed", {
					requestedStrategy: localizaStrategy,
					sourceType: listingDraft.sourceType,
					sourceUrlPresent: Boolean(listingDraft.sourceUrl.trim()),
					errorMessage: error.message,
				});
			},
		});

	const numberFormatter = useMemo(
		() =>
			new Intl.NumberFormat("es-ES", {
				maximumFractionDigits: 0,
			}),
		[],
	);

	const canContinue = useMemo(() => {
		if (currentStep === "brand") {
			if (brandSource === "firecrawl") {
				return Boolean(brand.website && brand.website.trim().length > 0);
			}
			return Boolean(
				brand.companyName &&
					brand.companyName.trim().length > 1 &&
					brand.tagline &&
					brand.tagline.trim().length > 3,
			);
		}

		if (currentStep === "listings") {
			return listings.length > 0;
		}

		return true;
	}, [
		brand.companyName,
		brand.tagline,
		brand.website,
		brandSource,
		currentStep,
		listings.length,
	]);

	const canAddListing = useMemo(() => {
		if (
			!listingDraft.title.trim() ||
			!listingDraft.location.street.trim() ||
			!listingDraft.location.city.trim() ||
			!listingDraft.location.stateOrProvince.trim() ||
			!listingDraft.location.postalCode.trim() ||
			!listingDraft.location.country.trim() ||
			!listingDraft.details.description.trim()
		) {
			return false;
		}

		if (listingDraft.sourceType === "manual") {
			return true;
		}

		return listingDraft.sourceUrl.trim().length > 0;
	}, [
		listingDraft.details.description,
		listingDraft.location.city,
		listingDraft.location.country,
		listingDraft.location.postalCode,
		listingDraft.location.stateOrProvince,
		listingDraft.location.street,
		listingDraft.sourceType,
		listingDraft.sourceUrl,
		listingDraft.title,
	]);

	const clearLocalizaDraftState = () => {
		hasTrackedLocalizaUrlPasteRef.current = false;
		hasTrackedManualOverrideRef.current = false;
		setLocalizaStrategy("auto");
		setLocalizaResult(null);
		setLocalizaError(null);
		setSelectedLocalizaCandidateId(null);
		setListingDraft((prev) => ({
			...prev,
			sourceMetadata: undefined,
			locationResolution: undefined,
		}));
	};

	const handleListingSourceTypeChange = (sourceType: ListingSourceType) => {
		hasTrackedLocalizaUrlPasteRef.current = false;
		hasTrackedManualOverrideRef.current = false;
		if (sourceType !== "idealista") {
			clearLocalizaDraftState();
		} else {
			setLocalizaStrategy("auto");
			setLocalizaResult(null);
			setLocalizaError(null);
			setSelectedLocalizaCandidateId(null);
		}

		setListingDraft((prev) => ({
			...prev,
			sourceType,
			sourceMetadata:
				sourceType === "idealista" ? prev.sourceMetadata : undefined,
			locationResolution:
				sourceType === "idealista" ? prev.locationResolution : undefined,
		}));
	};

	const handleListingSourceUrlChange = (value: string) => {
		const trimmedValue = value.trim();

		if (listingDraft.sourceType === "idealista") {
			if (trimmedValue && !hasTrackedLocalizaUrlPasteRef.current) {
				hasTrackedLocalizaUrlPasteRef.current = true;
				capturePosthogEvent("localiza_url_pasted", {
					requestedStrategy: localizaStrategy,
					sourceType: listingDraft.sourceType,
				});
			}

			if (!trimmedValue) {
				hasTrackedLocalizaUrlPasteRef.current = false;
			}
		}

		setLocalizaResult(null);
		setLocalizaError(null);
		setSelectedLocalizaCandidateId(null);
		setListingDraft((prev) => ({
			...prev,
			sourceUrl: value,
			sourceMetadata: undefined,
			locationResolution: undefined,
		}));
	};

	const handleLocalizaStrategyChange = (
		strategy: LocalizaAcquisitionStrategy,
	) => {
		hasTrackedManualOverrideRef.current = false;
		setLocalizaStrategy(strategy);
		setLocalizaResult(null);
		setLocalizaError(null);
		setSelectedLocalizaCandidateId(null);
		setListingDraft((prev) => ({
			...prev,
			sourceMetadata: undefined,
			locationResolution: undefined,
		}));
	};

	const handleLocationFieldChange = (
		key: keyof ListingCreateInput["location"],
		value: string,
	) => {
		setListingDraft((prev) => {
			const nextLocation = {
				...prev.location,
				[key]: value,
			};
			const shouldMarkManualOverride =
				Boolean(prev.locationResolution) &&
				prev.locationResolution?.status !== "manual_override" &&
				prev.locationResolution?.status !== "unresolved" &&
				hasMaterialLocationChange(prev.location, nextLocation);

			if (shouldMarkManualOverride && !hasTrackedManualOverrideRef.current) {
				hasTrackedManualOverrideRef.current = true;
				capturePosthogEvent("localiza_manual_override", {
					sourceType: prev.sourceType,
					locationResolutionStatus: prev.locationResolution?.status,
					requestedStrategy: prev.locationResolution?.requestedStrategy,
					officialSource: prev.locationResolution?.officialSource,
					territoryAdapter: prev.locationResolution?.territoryAdapter,
				});
			}

			return {
				...prev,
				location: nextLocation,
				locationResolution: shouldMarkManualOverride
					? {
							...prev.locationResolution!,
							status: "manual_override",
							reasonCodes: Array.from(
								new Set([
									...prev.locationResolution!.reasonCodes,
									"manual_address_override",
								]),
							),
						}
					: prev.locationResolution,
			};
		});
	};

	const handleResolveIdealistaLocation = async () => {
		if (listingDraft.sourceType !== "idealista") {
			return;
		}

		const url = listingDraft.sourceUrl.trim();
		if (!url) {
			setLocalizaError("Paste an Idealista listing URL first.");
			setLocalizaResult(null);
			return;
		}

		setLocalizaError(null);
		capturePosthogEvent("localiza_resolve_clicked", {
			requestedStrategy: localizaStrategy,
			sourceType: listingDraft.sourceType,
			sourceUrlPresent: true,
		});
		await resolveIdealistaLocation.mutateAsync({
			url,
			strategy: localizaStrategy,
		});
	};

	const handleApplyBuildingMatch = () => {
		if (
			!localizaResult ||
			localizaResult.status !== "building_match" ||
			!localizaResult.prefillLocation
		) {
			return;
		}

		setListingDraft((prev) => ({
			...prev,
			sourceMetadata: localizaResult.sourceMetadata,
			location: localizaResult.prefillLocation!,
			locationResolution: buildLocationResolutionFromResult(localizaResult, {
				status: "building_match",
				extraReasonCodes: ["building_match_accepted"],
			}),
		}));
		hasTrackedManualOverrideRef.current = false;
		capturePosthogEvent("localiza_building_match_accepted", {
			...buildLocalizaAnalyticsPayload(localizaResult),
			resolvedAddressLabel: localizaResult.resolvedAddressLabel,
		});
		setLocalizaResult((prev) =>
			prev
				? {
						...prev,
						evidence: {
							...prev.evidence,
							reasonCodes: Array.from(
								new Set([
									...prev.evidence.reasonCodes,
									"building_match_accepted",
								]),
							),
						},
					}
				: prev,
		);
	};

	const handleApplySelectedCandidate = () => {
		if (!localizaResult || localizaResult.status !== "needs_confirmation") {
			return;
		}

		const selectedCandidate = localizaResult.candidates.find(
			(candidate) => candidate.id === selectedLocalizaCandidateId,
		);

		if (!selectedCandidate?.prefillLocation) {
			return;
		}

		hasTrackedManualOverrideRef.current = false;
		capturePosthogEvent("localiza_candidate_confirmed", {
			...buildLocalizaAnalyticsPayload(localizaResult),
			selectedCandidateId: selectedCandidate.id,
			selectedCandidateLabel: selectedCandidate.label,
			selectedCandidateScore: selectedCandidate.score,
			selectedCandidateParcelRef14: selectedCandidate.parcelRef14,
			selectedCandidateHasPrefillLocation: Boolean(
				selectedCandidate.prefillLocation,
			),
		});
		setListingDraft((prev) => ({
			...prev,
			sourceMetadata: localizaResult.sourceMetadata,
			location: selectedCandidate.prefillLocation!,
			locationResolution: buildLocationResolutionFromResult(localizaResult, {
				status: "building_match",
				confidenceScore: selectedCandidate.score,
				parcelRef14: selectedCandidate.parcelRef14,
				unitRef20: selectedCandidate.unitRef20,
				resolvedAddressLabel: selectedCandidate.label,
				extraReasonCodes: ["user_confirmed_candidate"],
			}),
		}));
		setLocalizaResult((prev) =>
			prev
				? {
						...prev,
						status: "building_match",
						confidenceScore: selectedCandidate.score,
						resolvedAddressLabel: selectedCandidate.label,
						parcelRef14: selectedCandidate.parcelRef14,
						unitRef20: selectedCandidate.unitRef20,
						prefillLocation: selectedCandidate.prefillLocation,
						evidence: {
							...prev.evidence,
							reasonCodes: Array.from(
								new Set([
									...prev.evidence.reasonCodes,
									"user_confirmed_candidate",
								]),
							),
						},
					}
				: prev,
		);
	};

	const handleSelectLocalizaCandidate = (candidateId: string) => {
		setSelectedLocalizaCandidateId(candidateId);

		if (!localizaResult || localizaResult.status !== "needs_confirmation") {
			return;
		}

		const candidate = localizaResult.candidates.find(
			(entry) => entry.id === candidateId,
		);

		if (!candidate) {
			return;
		}

		capturePosthogEvent("localiza_candidate_selected", {
			...buildLocalizaAnalyticsPayload(localizaResult),
			selectedCandidateId: candidate.id,
			selectedCandidateLabel: candidate.label,
			selectedCandidateScore: candidate.score,
			selectedCandidateParcelRef14: candidate.parcelRef14,
			selectedCandidateHasPrefillLocation: Boolean(candidate.prefillLocation),
			selectedCandidateOfficialUrl: candidate.officialUrl,
		});
	};

	const goToStep = (step: OnboardingStepKey) => {
		setCurrentStep(step);
	};

	const createListingsBatch = trpc.listings.createBatch.useMutation();

	const goNext = () => {
		if (isLastStep) {
			return;
		}
		setCurrentStep(stepOrder[currentIndex + 1]);
	};

	const goPrevious = () => {
		if (isFirstStep) {
			return;
		}
		setCurrentStep(stepOrder[currentIndex - 1]);
	};

	const handleListingDraftChange = <K extends keyof ListingDraft>(
		key: K,
		value: ListingDraft[K],
	) => {
		setListingDraft((prev) => ({ ...prev, [key]: value }));
	};

	const resetListingDraft = () => {
		hasTrackedLocalizaUrlPasteRef.current = false;
		hasTrackedManualOverrideRef.current = false;
		setLocalizaStrategy("auto");
		setLocalizaResult(null);
		setLocalizaError(null);
		setSelectedLocalizaCandidateId(null);
		setListingDraft(createListingDraft());
	};

	const handleAddListing = () => {
		if (!canAddListing) {
			return;
		}

		const price = Number(listingDraft.details.priceUsd);
		const bedrooms = Number(listingDraft.details.bedrooms);
		const bathrooms = Number(listingDraft.details.bathrooms);
		const squareFeet = listingDraft.details.squareFeet
			? Number(listingDraft.details.squareFeet)
			: undefined;

		const slug = slugify(listingDraft.title);

		const listing: ListingCreateInput = {
			title: listingDraft.title.trim(),
			slug,
			sourceType: listingDraft.sourceType,
			sourceUrl: listingDraft.sourceUrl
				? listingDraft.sourceUrl.trim()
				: undefined,
			sourceMetadata: listingDraft.sourceMetadata,
			locationResolution: listingDraft.locationResolution,
			location: {
				street: listingDraft.location.street.trim(),
				city: listingDraft.location.city.trim(),
				stateOrProvince: listingDraft.location.stateOrProvince.trim(),
				postalCode: listingDraft.location.postalCode.trim(),
				country: listingDraft.location.country.trim(),
			},
			details: {
				priceUsd: Number.isFinite(price) ? price : 0,
				bedrooms: Number.isFinite(bedrooms) ? bedrooms : 0,
				bathrooms: Number.isFinite(bathrooms) ? bathrooms : 0,
				squareFeet: Number.isFinite(squareFeet ?? NaN) ? squareFeet : undefined,
				lotSizeSqFt: undefined,
				yearBuilt: undefined,
				propertyType: listingDraft.details.propertyType,
				description: listingDraft.details.description.trim(),
			},
			media: [],
		};

		setListings((prev) => [listing, ...prev]);
		resetListingDraft();
	};

	const handleCompleteOnboarding = async () => {
		if (listings.length === 0 || createListingsBatch.isPending) {
			return;
		}

		setSubmissionError(null);
		const idempotencyKey = submissionIdempotencyKey ?? crypto.randomUUID();

		if (!submissionIdempotencyKey) {
			setSubmissionIdempotencyKey(idempotencyKey);
		}

		try {
			await createListingsBatch.mutateAsync({
				idempotencyKey,
				listings: listings.map((listing) => ({
					...listing,
					location: {
						...listing.location,
						street: listing.location.street.trim(),
						city: listing.location.city.trim(),
						stateOrProvince: listing.location.stateOrProvince.trim(),
						postalCode: listing.location.postalCode.trim(),
						country: listing.location.country.trim(),
					},
					details: {
						...listing.details,
						description: listing.details.description.trim(),
					},
				})),
			});

			for (const listing of listings) {
				capturePosthogEvent("listing_created", {
					sourceType: listing.sourceType,
					hasLocationResolution: Boolean(listing.locationResolution),
					locationResolutionStatus: listing.locationResolution?.status,
					officialSource: listing.locationResolution?.officialSource,
					territoryAdapter: listing.locationResolution?.territoryAdapter,
					requestedStrategy: listing.locationResolution?.requestedStrategy,
					actualAcquisitionMethod:
						listing.locationResolution?.actualAcquisitionMethod,
				});
			}

			router.push("/app");
		} catch (error) {
			setSubmissionError(
				error instanceof Error
					? error.message
					: "We could not save your listings yet.",
			);
		}
	};

	return (
		<div className="min-h-screen bg-muted/30">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:px-12">
				<header className="flex flex-col gap-3">
					<span className="inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
						Onboarding
					</span>
					<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
						Set up your brand, listings, and media studio plan
					</h1>
					<p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
						We will tailor Casedra to your brokerage. Share your brand, add live
						listings, and preview the AI media plan we will generate for every
						property.
					</p>
				</header>

				<nav className="flex flex-wrap items-center gap-3">
					{stepOrder.map((step, index) => {
						const definition = stepDefinitions[step];
						const Icon = definition.icon;
						const isActive = currentStep === step;
						const isComplete = index < currentIndex;

						return (
							<button
								key={step}
								type="button"
								onClick={() => goToStep(step)}
								className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
									isActive
										? "border-primary bg-primary/10 text-primary"
										: isComplete
											? "border-primary/60 bg-primary/10 text-primary"
											: "border-border text-muted-foreground hover:text-foreground"
								}`}
							>
								<Icon className="h-4 w-4" aria-hidden="true" />
								<span>{definition.label}</span>
								{isComplete ? (
									<CheckCircle2
										className="h-4 w-4 text-primary"
										aria-hidden="true"
									/>
								) : null}
							</button>
						);
					})}
				</nav>

				<Card className="border-border/60 bg-background">
					<CardHeader className="space-y-2">
						<CardTitle>{stepDefinitions[currentStep].title}</CardTitle>
						<CardDescription>
							{stepDefinitions[currentStep].description}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-6 pt-0">
						{currentStep === "brand" ? (
							<>
								<div className="flex flex-col gap-2">
									<span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
										Brand intake mode
									</span>
									<div className="inline-flex w-full flex-col gap-2 rounded-lg border border-border p-2 sm:flex-row">
										{brandSourceOptions.map((source) => (
											<Button
												key={source.value}
												type="button"
												variant={
													brandSource === source.value ? "default" : "outline"
												}
												className="flex-1"
												onClick={() => setBrandSource(source.value)}
											>
												<source.icon
													className="mr-2 h-4 w-4"
													aria-hidden="true"
												/>
												{source.label}
											</Button>
										))}
									</div>
									<p className="text-sm text-muted-foreground">
										{brandTips[brandSource]}
									</p>
								</div>

								{brandSource === "firecrawl" ? (
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="sm:col-span-2">
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="brand-website"
											>
												Company website
											</label>
											<Input
												id="brand-website"
												placeholder="https://www.yourbrokerage.com"
												value={brand.website ?? ""}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														website: event.target.value,
													}))
												}
												className="mt-2"
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="brand-company-name"
											>
												Company name (optional override)
											</label>
											<Input
												id="brand-company-name"
												placeholder="Casedra Realty"
												value={brand.companyName}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														companyName: event.target.value,
													}))
												}
												className="mt-2"
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="brand-primary-color"
											>
												Primary brand color
											</label>
											<Input
												id="brand-primary-color"
												type="color"
												value={brand.primaryColorHex ?? "#0f172a"}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														primaryColorHex: event.target.value,
													}))
												}
												className="mt-2 h-10 w-32 p-1"
											/>
										</div>
										<div className="sm:col-span-2">
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="brand-notes"
											>
												Notes for our team
											</label>
											<Textarea
												id="brand-notes"
												placeholder="Share tone preferences, assets we should reference, or MLS constraints."
												value={brand.notes ?? ""}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														notes: event.target.value,
													}))
												}
												className="mt-2"
											/>
										</div>
									</div>
								) : (
									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="manual-company-name"
											>
												Company name
											</label>
											<Input
												id="manual-company-name"
												placeholder="Casedra Realty"
												value={brand.companyName}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														companyName: event.target.value,
													}))
												}
												className="mt-2"
												required
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="manual-tagline"
											>
												Tagline
											</label>
											<Input
												id="manual-tagline"
												placeholder="Boutique marketing for every listing"
												value={brand.tagline ?? ""}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														tagline: event.target.value,
													}))
												}
												className="mt-2"
												required
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="manual-website"
											>
												Website (optional)
											</label>
											<Input
												id="manual-website"
												placeholder="https://www.yourbrokerage.com"
												value={brand.website ?? ""}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														website: event.target.value,
													}))
												}
												className="mt-2"
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="manual-color"
											>
												Primary brand color
											</label>
											<Input
												id="manual-color"
												type="color"
												value={brand.primaryColorHex ?? "#0f172a"}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														primaryColorHex: event.target.value,
													}))
												}
												className="mt-2 h-10 w-32 p-1"
											/>
										</div>
										<div className="sm:col-span-2">
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="manual-voice"
											>
												Brand voice
											</label>
											<Textarea
												id="manual-voice"
												placeholder="Confident, knowledgeable, and concierge-level support for luxury buyers."
												value={brand.voice ?? ""}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														voice: event.target.value,
													}))
												}
												className="mt-2"
												required
											/>
										</div>
										<div className="sm:col-span-2">
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="manual-notes"
											>
												Notes for our team
											</label>
											<Textarea
												id="manual-notes"
												placeholder="MLS rules, brand guardrails, required disclosures, etc."
												value={brand.notes ?? ""}
												onChange={(event) =>
													setBrand((prev) => ({
														...prev,
														notes: event.target.value,
													}))
												}
												className="mt-2"
											/>
										</div>
									</div>
								)}
							</>
						) : null}

						{currentStep === "listings" ? (
							<div className="grid gap-6">
								<div className="rounded-lg border border-border/70 bg-muted/30 p-4">
									<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<h3 className="text-base font-semibold">
												Add listings to populate the studio
											</h3>
											<p className="text-sm text-muted-foreground">
												Each listing unlocks a tailored media plan. Start from
												an Idealista link, another public URL, or manual entry.
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											{listingSourceOptions.map((source) => (
												<Button
													key={source.value}
													type="button"
													variant={
														listingDraft.sourceType === source.value
															? "default"
															: "outline"
													}
													onClick={() =>
														handleListingSourceTypeChange(source.value)
													}
												>
													<source.icon
														className="mr-2 h-4 w-4"
														aria-hidden="true"
													/>
													{source.label}
												</Button>
											))}
										</div>
									</div>
									<p className="mt-3 text-sm text-muted-foreground">
										{listingSourceCopy[listingDraft.sourceType].description}
									</p>
								</div>

								<div className="grid gap-4 rounded-lg border border-border/60 bg-background p-4">
									<div>
										<label
											className="text-sm font-medium text-foreground"
											htmlFor="listing-title"
										>
											Listing name
										</label>
										<Input
											id="listing-title"
											placeholder="Prospect Heights Brownstone"
											value={listingDraft.title}
											onChange={(event) =>
												handleListingDraftChange("title", event.target.value)
											}
											className="mt-2"
										/>
									</div>

									{listingDraft.sourceType !== "manual" ? (
										<div>
											<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
												<div className="flex-1">
													<label
														className="text-sm font-medium text-foreground"
														htmlFor="listing-source-url"
													>
														{
															listingSourceCopy[listingDraft.sourceType]
																.urlLabel
														}
													</label>
													<Input
														id="listing-source-url"
														placeholder={
															listingSourceCopy[listingDraft.sourceType]
																.urlPlaceholder
														}
														value={listingDraft.sourceUrl}
														onChange={(event) =>
															handleListingSourceUrlChange(event.target.value)
														}
														className="mt-2"
													/>
												</div>
												{listingDraft.sourceType === "idealista" ? (
													<Button
														type="button"
														variant="outline"
														onClick={() =>
															void handleResolveIdealistaLocation()
														}
														disabled={
															resolveIdealistaLocation.isPending ||
															listingDraft.sourceUrl.trim().length === 0
														}
													>
														{resolveIdealistaLocation.isPending ? (
															<LoaderCircle
																className="mr-2 h-4 w-4 animate-spin"
																aria-hidden="true"
															/>
														) : null}
														Find exact location
													</Button>
												) : null}
											</div>
											{listingSourceCopy[listingDraft.sourceType].urlHint ? (
												<p className="mt-2 text-sm text-muted-foreground">
													{listingSourceCopy[listingDraft.sourceType].urlHint}
												</p>
											) : null}
											{listingDraft.sourceType === "idealista" ? (
												<div className="mt-4 space-y-2">
													<div className="flex items-center justify-between gap-3">
														<span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
															Acquisition strategy
														</span>
														<span className="text-xs text-muted-foreground">
															Default: Auto
														</span>
													</div>
													<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
														{localizaStrategyOptions.map((strategy) => (
															<button
																key={strategy.value}
																type="button"
																onClick={() =>
																	handleLocalizaStrategyChange(strategy.value)
																}
																className={`rounded-lg border p-3 text-left transition-colors ${
																	localizaStrategy === strategy.value
																		? "border-primary bg-primary/10 text-foreground"
																		: "border-border bg-background text-muted-foreground hover:text-foreground"
																}`}
															>
																<p className="text-sm font-medium text-foreground">
																	{strategy.label}
																</p>
																<p className="mt-1 text-xs">
																	{strategy.description}
																</p>
															</button>
														))}
													</div>
												</div>
											) : null}
										</div>
									) : null}

									{listingDraft.sourceType === "idealista" ? (
										<div className="rounded-lg border border-border/60 bg-muted/20 p-4">
											{resolveIdealistaLocation.isPending ? (
												<div className="flex items-start gap-3 text-sm">
													<LoaderCircle
														className="mt-0.5 h-4 w-4 animate-spin text-primary"
														aria-hidden="true"
													/>
													<div className="space-y-1">
														<p className="font-medium text-foreground">
															Parsing the Idealista URL, extracting listing
															signals, and routing the request to the matching
															official cadastre
														</p>
														<p className="text-muted-foreground">
															Data comes from the pasted Idealista listing plus
															the official Spanish cadastral services for the
															detected territory. Duplicate lookups are disabled
															while this request is in flight.
														</p>
													</div>
												</div>
											) : null}

											{!resolveIdealistaLocation.isPending && localizaError ? (
												<div className="flex items-start gap-3 text-sm">
													<AlertCircle
														className="mt-0.5 h-4 w-4 text-destructive"
														aria-hidden="true"
													/>
													<div className="space-y-1">
														<p className="font-medium text-foreground">
															Exact-location lookup could not start
														</p>
														<p className="text-muted-foreground">
															{localizaError}
														</p>
													</div>
												</div>
											) : null}

											{!resolveIdealistaLocation.isPending &&
											!localizaError &&
											listingDraft.locationResolution?.status ===
												"manual_override" ? (
												<div className="space-y-2 text-sm">
													<p className="font-medium text-foreground">
														{localizaStatusCopy.manual_override.label}
													</p>
													<p className="text-muted-foreground">
														{localizaStatusCopy.manual_override.description}
													</p>
												</div>
											) : null}

											{!resolveIdealistaLocation.isPending &&
											!localizaError &&
											localizaResult ? (
												<div className="space-y-3 text-sm">
													<div className="flex flex-wrap items-center gap-2">
														<span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
															{localizaStatusCopy[localizaResult.status].label}
														</span>
														<span className="text-xs text-muted-foreground">
															Source: {localizaResult.officialSource}
														</span>
														{localizaResult.territoryAdapter ? (
															<span className="text-xs text-muted-foreground">
																Territory:{" "}
																{
																	localizaTerritoryLabel[
																		localizaResult.territoryAdapter
																	]
																}
															</span>
														) : null}
														<span className="text-xs text-muted-foreground">
															Confidence:{" "}
															{Math.round(localizaResult.confidenceScore * 100)}
															%
														</span>
														<span className="text-xs text-muted-foreground">
															Strategy:{" "}
															{
																localizaStrategyLabel[
																	localizaResult.requestedStrategy
																]
															}
														</span>
														{localizaResult.evidence.actualAcquisitionMethod ? (
															<span className="text-xs text-muted-foreground">
																Method:{" "}
																{
																	localizaMethodLabel[
																		localizaResult.evidence
																			.actualAcquisitionMethod
																	]
																}
															</span>
														) : null}
													</div>
													<p className="text-muted-foreground">
														{
															localizaStatusCopy[localizaResult.status]
																.description
														}
													</p>
													{localizaResult.status === "unresolved" ? (
														<p className="text-muted-foreground">
															{localizaResult.requestedStrategy === "auto"
																? "Auto did not finish with a verified result yet. Try a specific method above or keep entering the address manually."
																: "This method did not finish with a verified result yet. Try another method above or keep entering the address manually."}
														</p>
													) : null}
													{localizaResult.resolvedAddressLabel ? (
														<p className="font-medium text-foreground">
															{localizaResult.resolvedAddressLabel}
														</p>
													) : null}
													{localizaResult.sourceMetadata.externalListingId ? (
														<p className="text-muted-foreground">
															Idealista ID:{" "}
															{localizaResult.sourceMetadata.externalListingId}
														</p>
													) : null}
													{localizaResult.officialSourceUrl ? (
														<p className="text-muted-foreground">
															Official service:{" "}
															<a
																href={localizaResult.officialSourceUrl}
																target="_blank"
																rel="noreferrer"
																className="text-primary underline underline-offset-4"
															>
																{localizaResult.officialSourceUrl}
															</a>
														</p>
													) : null}
													{localizaResult.evidence.reasonCodes.length > 0 ? (
														<p className="text-muted-foreground">
															Reason codes:{" "}
															{localizaResult.evidence.reasonCodes.join(", ")}
														</p>
													) : null}
													{localizaResult.status === "building_match" ? (
														<div className="flex flex-wrap gap-3 pt-1">
															<Button
																type="button"
																onClick={handleApplyBuildingMatch}
																disabled={!localizaResult.prefillLocation}
															>
																Use this building
															</Button>
															<p className="max-w-xl text-muted-foreground">
																We only apply this address after you confirm it
																because unit-level precision is not proven yet.
															</p>
														</div>
													) : null}
													{localizaResult.status === "needs_confirmation" &&
													localizaResult.candidates.length > 0 ? (
														<div className="space-y-3 pt-1">
															<div
																role="radiogroup"
																aria-label="Official location candidates"
																className="grid gap-3 sm:grid-cols-2"
															>
																{localizaResult.candidates.map((candidate) => (
																	<button
																		key={candidate.id}
																		type="button"
																		role="radio"
																		aria-checked={
																			selectedLocalizaCandidateId ===
																			candidate.id
																		}
																		onClick={() =>
																			handleSelectLocalizaCandidate(
																				candidate.id,
																			)
																		}
																		className={`rounded-md border p-3 text-left transition-colors ${
																			selectedLocalizaCandidateId ===
																			candidate.id
																				? "border-primary bg-primary/10"
																				: "border-border/70 bg-background"
																		}`}
																	>
																		<p className="font-medium text-foreground">
																			{candidate.label}
																		</p>
																		<p className="text-muted-foreground">
																			Score: {Math.round(candidate.score * 100)}
																			%
																		</p>
																		{candidate.parcelRef14 ? (
																			<p className="text-muted-foreground">
																				Parcel: {candidate.parcelRef14}
																			</p>
																		) : null}
																		{candidate.officialUrl ? (
																			<p>
																				<a
																					href={candidate.officialUrl}
																					target="_blank"
																					rel="noreferrer"
																					className="text-primary underline underline-offset-4"
																				>
																					Open official record
																				</a>
																			</p>
																		) : null}
																		{candidate.reasonCodes.length > 0 ? (
																			<p className="text-muted-foreground">
																				{candidate.reasonCodes.join(", ")}
																			</p>
																		) : null}
																	</button>
																))}
															</div>
															<div className="flex flex-wrap gap-3">
																<Button
																	type="button"
																	onClick={handleApplySelectedCandidate}
																	disabled={
																		!selectedLocalizaCandidateId ||
																		!localizaResult.candidates.find(
																			(candidate) =>
																				candidate.id ===
																				selectedLocalizaCandidateId,
																		)?.prefillLocation
																	}
																>
																	Use selected candidate
																</Button>
																<p className="max-w-xl text-muted-foreground">
																	{localizaResult.candidates.find(
																		(candidate) =>
																			candidate.id ===
																			selectedLocalizaCandidateId,
																	)?.prefillLocation
																		? "Candidate selection still requires a manual confirmation step before we apply the address fields."
																		: "This official candidate still needs viewer-backed confirmation. Open the official record above and keep filling the address manually below if we cannot prefill every field yet."}
																</p>
															</div>
														</div>
													) : null}
												</div>
											) : null}
										</div>
									) : null}

									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="listing-street"
											>
												Street address
											</label>
											<Input
												id="listing-street"
												placeholder="Calle de Alcalá 123"
												value={listingDraft.location.street}
												onChange={(event) =>
													handleLocationFieldChange(
														"street",
														event.target.value,
													)
												}
												className="mt-2"
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="listing-city"
											>
												City
											</label>
											<Input
												id="listing-city"
												placeholder="Madrid"
												value={listingDraft.location.city}
												onChange={(event) =>
													handleLocationFieldChange("city", event.target.value)
												}
												className="mt-2"
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="listing-state"
											>
												State / Province
											</label>
											<Input
												id="listing-state"
												placeholder="Madrid"
												value={listingDraft.location.stateOrProvince}
												onChange={(event) =>
													handleLocationFieldChange(
														"stateOrProvince",
														event.target.value,
													)
												}
												className="mt-2"
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="listing-postal"
											>
												Postal code
											</label>
											<Input
												id="listing-postal"
												placeholder="28009"
												value={listingDraft.location.postalCode}
												onChange={(event) =>
													handleLocationFieldChange(
														"postalCode",
														event.target.value,
													)
												}
												className="mt-2"
											/>
										</div>
									</div>

									<div>
										<label
											className="text-sm font-medium text-foreground"
											htmlFor="listing-price"
										>
											Listing price
										</label>
										<Input
											id="listing-price"
											type="number"
											min="0"
											placeholder="2350000"
											value={listingDraft.details.priceUsd}
											onChange={(event) =>
												setListingDraft((prev) => ({
													...prev,
													details: {
														...prev.details,
														priceUsd: event.target.value,
													},
												}))
											}
											className="mt-2"
										/>
									</div>

									<div className="grid gap-4 sm:grid-cols-3">
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="listing-beds"
											>
												Beds
											</label>
											<Input
												id="listing-beds"
												type="number"
												min="0"
												placeholder="4"
												value={listingDraft.details.bedrooms}
												onChange={(event) =>
													setListingDraft((prev) => ({
														...prev,
														details: {
															...prev.details,
															bedrooms: event.target.value,
														},
													}))
												}
												className="mt-2"
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="listing-baths"
											>
												Baths
											</label>
											<Input
												id="listing-baths"
												type="number"
												min="0"
												placeholder="3"
												value={listingDraft.details.bathrooms}
												onChange={(event) =>
													setListingDraft((prev) => ({
														...prev,
														details: {
															...prev.details,
															bathrooms: event.target.value,
														},
													}))
												}
												className="mt-2"
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor="listing-sqft"
											>
												Interior size (optional)
											</label>
											<Input
												id="listing-sqft"
												type="number"
												min="0"
												placeholder="3200"
												value={listingDraft.details.squareFeet ?? ""}
												onChange={(event) =>
													setListingDraft((prev) => ({
														...prev,
														details: {
															...prev.details,
															squareFeet: event.target.value,
														},
													}))
												}
												className="mt-2"
											/>
										</div>
									</div>

									<div>
										<label
											className="text-sm font-medium text-foreground"
											htmlFor="listing-property-type"
										>
											Property type
										</label>
										<select
											id="listing-property-type"
											value={listingDraft.details.propertyType}
											onChange={(event) =>
												setListingDraft((prev) => ({
													...prev,
													details: {
														...prev.details,
														propertyType: event.target
															.value as ListingCreateInput["details"]["propertyType"],
													},
												}))
											}
											className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											{propertyOptions.map((option) => (
												<option key={option} value={option}>
													{propertyTypeCopy[option]}
												</option>
											))}
										</select>
									</div>

									<div>
										<label
											className="text-sm font-medium text-foreground"
											htmlFor="listing-description"
										>
											Marketing highlights
										</label>
										<Textarea
											id="listing-description"
											placeholder="Exterior corner flat with balcony, lift access, and strong natural light."
											value={listingDraft.details.description}
											onChange={(event) =>
												setListingDraft((prev) => ({
													...prev,
													details: {
														...prev.details,
														description: event.target.value,
													},
												}))
											}
											className="mt-2"
										/>
									</div>

									<div className="flex justify-end">
										<Button
											type="button"
											onClick={handleAddListing}
											disabled={!canAddListing}
										>
											Add listing
										</Button>
									</div>
								</div>

								{listings.length > 0 ? (
									<div className="grid gap-4">
										<h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
											Listings queued for the studio
										</h3>
										<div className="grid gap-4 md:grid-cols-2">
											{listings.map((listing) => (
												<Card key={listing.slug} className="border-border/60">
													<CardHeader className="pb-2">
														<CardTitle className="text-base font-semibold">
															{listing.title}
														</CardTitle>
														<CardDescription className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
															<span>
																{listingSourceDisplayCopy[listing.sourceType]}
															</span>
															<span
																className="h-1 w-1 rounded-full bg-muted-foreground"
																aria-hidden="true"
															/>
															<span>
																{propertyTypeCopy[listing.details.propertyType]}
															</span>
														</CardDescription>
													</CardHeader>
													<CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
														<p>
															{listing.location.city},{" "}
															{listing.location.stateOrProvince}
														</p>
														<p className="font-medium text-foreground">
															{numberFormatter.format(listing.details.priceUsd)}
														</p>
														{listing.sourceUrl ? (
															<p className="truncate text-xs">
																{listing.sourceUrl}
															</p>
														) : null}
														{listing.locationResolution ? (
															<>
																<p className="text-xs uppercase tracking-[0.2em]">
																	{
																		localizaStatusCopy[
																			listing.locationResolution.status
																		].label
																	}
																</p>
																<p className="text-xs">
																	Source:{" "}
																	{listing.locationResolution.officialSource}
																</p>
																{listing.locationResolution.territoryAdapter ? (
																	<p className="text-xs">
																		Territory:{" "}
																		{
																			localizaTerritoryLabel[
																				listing.locationResolution
																					.territoryAdapter
																			]
																		}
																	</p>
																) : null}
																{listing.locationResolution
																	.requestedStrategy ? (
																	<p className="text-xs">
																		Strategy:{" "}
																		{
																			localizaStrategyLabel[
																				listing.locationResolution
																					.requestedStrategy
																			]
																		}
																	</p>
																) : null}
															</>
														) : null}
														<p>
															{listing.details.bedrooms} bd ·{" "}
															{listing.details.bathrooms} ba
														</p>
													</CardContent>
												</Card>
											))}
										</div>
									</div>
								) : null}
							</div>
						) : null}

						{currentStep === "review" ? (
							<div className="grid gap-6">
								<div className="grid gap-4 rounded-lg border border-primary/40 bg-primary/5 p-6 sm:grid-cols-[1.5fr_1fr]">
									<div className="space-y-2">
										<h3 className="text-lg font-semibold">Brand snapshot</h3>
										<p className="text-sm text-muted-foreground">
											We will sync these settings to every media prompt and
											campaign workflow.
										</p>
										<ul className="space-y-1 text-sm text-muted-foreground">
											<li>
												<span className="font-medium text-foreground">
													Company:
												</span>{" "}
												{brand.companyName || "Pending Firecrawl"}
											</li>
											<li>
												<span className="font-medium text-foreground">
													Website:
												</span>{" "}
												{brand.website || "—"}
											</li>
											<li>
												<span className="font-medium text-foreground">
													Tagline:
												</span>{" "}
												{brand.tagline || "—"}
											</li>
											<li>
												<span className="font-medium text-foreground">
													Voice:
												</span>{" "}
												{brand.voice ||
													(brandSource === "firecrawl"
														? "Will derive from site"
														: "—")}
											</li>
										</ul>
									</div>
									<div className="flex flex-col gap-3 rounded-md border border-primary/40 bg-background p-4 text-sm">
										<span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
											Brand color
										</span>
										<div
											className="h-16 w-full rounded-md border"
											style={{
												backgroundColor: brand.primaryColorHex || "#0f172a",
											}}
										/>
										<p className="text-xs text-muted-foreground">
											We will apply this across graphics, type treatments, and
											UI accents.
										</p>
									</div>
								</div>

								<div className="grid gap-4 rounded-lg border border-border/60 bg-background p-6">
									<div className="flex flex-col gap-1">
										<h3 className="text-lg font-semibold">Listings in scope</h3>
										<p className="text-sm text-muted-foreground">
											{listings.length > 0
												? `${listings.length} listing${listings.length > 1 ? "s" : ""} ready for generation`
												: "Add listings to generate tailored media."}
										</p>
									</div>
									<div className="grid gap-3 md:grid-cols-2">
										{listings.map((listing) => (
											<div
												key={listing.slug}
												className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm"
											>
												<p className="font-semibold text-foreground">
													{listing.title}
												</p>
												<p className="text-muted-foreground">
													{numberFormatter.format(listing.details.priceUsd)}
													{" · "}
													{listing.details.bedrooms} bd ·{" "}
													{listing.details.bathrooms} ba
												</p>
												<p className="text-muted-foreground">
													{listing.location.city},{" "}
													{listing.location.stateOrProvince}
												</p>
												{listing.sourceUrl ? (
													<p className="truncate text-xs text-muted-foreground">
														{listing.sourceUrl}
													</p>
												) : null}
												{listing.locationResolution ? (
													<>
														<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
															{
																localizaStatusCopy[
																	listing.locationResolution.status
																].label
															}
														</p>
														<p className="text-xs text-muted-foreground">
															Source:{" "}
															{listing.locationResolution.officialSource}
														</p>
														{listing.locationResolution.territoryAdapter ? (
															<p className="text-xs text-muted-foreground">
																Territory:{" "}
																{
																	localizaTerritoryLabel[
																		listing.locationResolution
																			.territoryAdapter
																	]
																}
															</p>
														) : null}
														{listing.locationResolution.requestedStrategy ? (
															<p className="text-xs text-muted-foreground">
																Strategy:{" "}
																{
																	localizaStrategyLabel[
																		listing.locationResolution.requestedStrategy
																	]
																}
															</p>
														) : null}
													</>
												) : null}
											</div>
										))}
									</div>
								</div>

								<div className="grid gap-4 rounded-lg border border-primary/40 bg-primary/5 p-6">
									<div className="flex flex-col gap-1">
										<h3 className="text-lg font-semibold">AI media roadmap</h3>
										<p className="text-sm text-muted-foreground">
											Casedra will generate, track, and store assets using the
											schema we designed for the studio.
										</p>
									</div>
									<div className="grid gap-3 md:grid-cols-2">
										{plannedGenerations.map((generation) => (
											<div
												key={`${generation.listingId}-${generation.kind}`}
												className="flex flex-col gap-2 rounded-md border border-dashed border-primary/40 bg-background p-4 text-sm"
											>
												<span className="font-semibold text-foreground">
													{generation.label}
												</span>
												<p className="text-muted-foreground">
													Media key:{" "}
													<span className="font-mono text-xs">
														{generation.mediaKey}
													</span>
												</p>
												<p className="text-muted-foreground">
													Linked listing: {generation.listingId}
												</p>
											</div>
										))}
									</div>
									<p className="text-xs text-muted-foreground">
										Stored as `AIGenerationRecord` entries with status
										transitions (queued → running → succeeded) and Fal.ai job
										metadata.
									</p>
								</div>
								{submissionError ? (
									<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
										{submissionError}
									</div>
								) : null}
							</div>
						) : null}
					</CardContent>
				</Card>

				<div className="flex flex-col justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
					<div className="flex gap-2">
						{!isFirstStep ? (
							<Button type="button" variant="ghost" onClick={goPrevious}>
								<ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
								Back
							</Button>
						) : null}
						{currentStep !== "brand" ? (
							<Button
								type="button"
								variant="ghost"
								onClick={() => goToStep("brand")}
							>
								Jump to brand
							</Button>
						) : null}
						{currentStep === "review" ? (
							<Button
								type="button"
								variant="ghost"
								onClick={() => goToStep("listings")}
							>
								Jump to listings
							</Button>
						) : null}
					</div>
					<div className="flex gap-3">
						{!isLastStep ? (
							<Button
								type="button"
								size="lg"
								onClick={goNext}
								disabled={!canContinue}
							>
								Continue
								<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
							</Button>
						) : (
							<Button
								type="button"
								size="lg"
								className="inline-flex items-center gap-2"
								onClick={() => void handleCompleteOnboarding()}
								disabled={
									createListingsBatch.isPending || listings.length === 0
								}
							>
								{createListingsBatch.isPending ? (
									<LoaderCircle
										className="h-4 w-4 animate-spin"
										aria-hidden="true"
									/>
								) : (
									<Sparkles className="h-4 w-4" aria-hidden="true" />
								)}
								Save listings and enter the studio
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

const propertyTypeCopy: Record<
	ListingCreateInput["details"]["propertyType"],
	string
> = {
	single_family: "Single family",
	multi_family: "Multi family",
	condo: "Condo",
	townhouse: "Townhouse",
	land: "Land",
	commercial: "Commercial",
};

const brandSourceOptions: Array<{
	value: BrandSourceType;
	label: string;
	icon: typeof Building2;
}> = [
	{
		value: "firecrawl",
		label: "Crawl my website",
		icon: Globe2,
	},
	{
		value: "manual",
		label: "Enter brand details",
		icon: Building2,
	},
];

const stepDefinitions: Record<
	OnboardingStepKey,
	{
		label: string;
		title: string;
		description: string;
		icon: typeof Building2;
	}
> = {
	brand: {
		label: "Brand",
		title: "Capture your brand identity",
		description:
			"Give Casedra your brand voice, palette, and tone so we can populate prompts, templates, and approvals.",
		icon: Building2,
	},
	listings: {
		label: "Listings",
		title: "Queue listings for automation",
		description:
			"Every listing you add will get a tailored AI media roadmap and collateral package.",
		icon: ListChecks,
	},
	review: {
		label: "Review",
		title: "Review and launch",
		description:
			"Confirm the intake and jump into the studio to start generating assets.",
		icon: Sparkles,
	},
};
