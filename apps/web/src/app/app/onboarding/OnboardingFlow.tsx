"use client";

import type {
	AIGenerationRecord,
	BrandCreateInput,
	BrandSourceType,
	ListingCreateInput,
	ListingLocationResolution,
	ListingSourceType,
	LocalizaAcquisitionStrategy,
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
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { env } from "@/env";
import {
	type AvailableLocalizaStrategy,
	buildLocalizaStrategyOptions,
	getPreferredLocalizaStrategy,
} from "@/lib/localiza-strategies";
import { trpc } from "@/trpc/shared";
import { LocalizaPropertyReport } from "../localiza/LocalizaPropertyReport";
import {
	buildClearedLocationDraft,
	canAddListingDraft,
	clearLocationAfterFailedResolve,
	hasLocalizaLinkedDraftState,
} from "./localiza-draft-state";

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
	propertyDossier?: ListingCreateInput["propertyDossier"];
	location: ListingCreateInput["location"];
	details: {
		priceAmount: string;
		currencyCode: ListingCreateInput["details"]["currencyCode"];
		bedrooms: string;
		bathrooms: string;
		interiorAreaSquareMeters?: string;
		propertyType: ListingCreateInput["details"]["propertyType"];
		description: string;
	};
};

type PlannedGeneration = Pick<
	AIGenerationRecord,
	"kind" | "listingId" | "mediaKey"
> & {
	label: string;
	listingTitle: string;
};

type SavedListingSummary = ListingCreateInput & {
	id: string;
};

type LocalizaCandidate = ResolveIdealistaLocationResult["candidates"][number];

const createListingDraft = (initialSourceUrl = ""): ListingDraft => ({
	title: "",
	sourceType: "idealista",
	sourceUrl: initialSourceUrl,
	location: {
		street: "",
		city: "",
		stateOrProvince: "",
		postalCode: "",
		country: "Spain",
	},
	details: {
		priceAmount: "",
		currencyCode: "EUR",
		bedrooms: "",
		bathrooms: "",
		interiorAreaSquareMeters: "",
		propertyType: propertyOptions[0],
		description: "",
	},
});

const generationTemplates: { kind: MediaGenerationKind; label: string }[] = [
	{ kind: "social_graphic", label: "Carrusel de Instagram" },
	{ kind: "flyer", label: "Folleto de visita" },
	{ kind: "short_form_video", label: "Vídeo vertical de 30 s" },
	{ kind: "property_description", label: "Descripción del anuncio" },
	{ kind: "email_copy", label: "Correo de seguimiento para comprador" },
];

const brandTips: Record<BrandSourceType, string> = {
	firecrawl: "Pega tu web. Casedra leerá lo básico: nombre, color y tono.",
	manual: "Escribe lo esencial para que Casedra use la marca correcta.",
};

const listingSourceOptions: Array<{
	value: ListingSourceType;
	label: string;
	icon: typeof Globe2;
}> = [
	{
		value: "idealista",
		label: "Pegar Idealista",
		icon: Globe2,
	},
	{
		value: "firecrawl",
		label: "Pegar otro enlace",
		icon: Globe2,
	},
	{
		value: "manual",
		label: "Escribir a mano",
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
			"Pega el enlace de Idealista. Casedra buscará la dirección y la dejará editable.",
		urlLabel: "URL del anuncio de Idealista",
		urlPlaceholder: "https://www.idealista.com/inmueble/108926410/",
		urlHint: "Usa Automático. Si no encuentra la dirección, rellénala a mano.",
	},
	firecrawl: {
		description:
			"Pega un enlace público del inmueble. Si falta algo, lo podrás editar.",
		urlLabel: "URL pública del anuncio",
		urlPlaceholder: "https://www.fotocasa.es/...",
		urlHint: "Casedra leerá la página y tú revisarás los campos.",
	},
	manual: {
		description: "Escribe los datos del inmueble directamente.",
	},
};

const listingSourceDisplayCopy: Record<ListingSourceType, string> = {
	idealista: "Idealista",
	firecrawl: "Otro enlace",
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
		label: "Dirección encontrada",
		description: "Hemos rellenado la dirección. Revísala antes de guardar.",
	},
	building_match: {
		label: "Edificio encontrado",
		description:
			"Hemos encontrado el edificio. Confirma el piso o completa lo que falte.",
	},
	needs_confirmation: {
		label: "Elige una dirección",
		description: "Hemos encontrado varias opciones. Elige la correcta.",
	},
	unresolved: {
		label: "No encontrada",
		description:
			"No hemos podido confirmar la ubicación. Escribe la dirección a mano.",
	},
	manual_override: {
		label: "Editada a mano",
		description:
			"La dirección se cambió manualmente. Se guardará tal como aparece.",
	},
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

const parseOptionalPositiveInteger = (value?: string) => {
	if (!value?.trim()) {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

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
			listingTitle: listing.title,
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
	candidateCount: result.evidence.candidateCount,
	reasonCodes: Array.from(
		new Set([
			...result.evidence.reasonCodes,
			...(overrides?.extraReasonCodes ?? []),
		]),
	),
});

const buildDossierWithOfficialLocation = (
	dossier: ListingCreateInput["propertyDossier"],
	input: {
		location?: ListingCreateInput["location"];
		proposedAddressLabel?: string;
		parcelRef14?: string;
		unitRef20?: string;
	},
) =>
	dossier
		? {
				...dossier,
				officialIdentity: {
					...dossier.officialIdentity,
					proposedAddressLabel:
						input.proposedAddressLabel ??
						dossier.officialIdentity.proposedAddressLabel,
					street: input.location?.street ?? dossier.officialIdentity.street,
					postalCode:
						input.location?.postalCode ?? dossier.officialIdentity.postalCode,
					municipality:
						input.location?.city ?? dossier.officialIdentity.municipality,
					province:
						input.location?.stateOrProvince ??
						dossier.officialIdentity.province,
					parcelRef14:
						input.parcelRef14 ?? dossier.officialIdentity.parcelRef14,
					unitRef20: input.unitRef20 ?? dossier.officialIdentity.unitRef20,
				},
			}
		: undefined;

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

const formatListingAddress = (listing: ListingCreateInput) =>
	listing.displayAddressLabel ||
	listing.locationResolution?.resolvedAddressLabel ||
	[
		listing.location.street,
		listing.location.city,
		listing.location.stateOrProvince,
		listing.location.postalCode,
	]
		.filter(Boolean)
		.join(", ");

interface OnboardingFlowProps {
	initialStep: OnboardingStepKey;
	availableLocalizaStrategies: AvailableLocalizaStrategy[];
	initialSourceUrl?: string;
	initialLocalizaCandidateId?: string;
}

export default function OnboardingFlow({
	initialStep,
	availableLocalizaStrategies,
	initialSourceUrl = "",
	initialLocalizaCandidateId = "",
}: OnboardingFlowProps) {
	const router = useRouter();
	const normalizedStep = stepOrder.includes(initialStep)
		? initialStep
		: "brand";
	const [currentStep, setCurrentStep] =
		useState<OnboardingStepKey>(normalizedStep);
	const [brand, setBrand] = useState<BrandCreateInput>(defaultBrand);
	const [brandSource, setBrandSource] = useState<BrandSourceType>("firecrawl");
	const [listingDraft, setListingDraft] = useState<ListingDraft>(() =>
		createListingDraft(initialSourceUrl),
	);
	const [listings, setListings] = useState<ListingCreateInput[]>([]);
	const [savedListings, setSavedListings] = useState<SavedListingSummary[]>([]);
	const [localizaStrategy, setLocalizaStrategy] =
		useState<LocalizaAcquisitionStrategy>("auto");
	const [localizaResult, setLocalizaResult] =
		useState<ResolveIdealistaLocationResult | null>(null);
	const [localizaError, setLocalizaError] = useState<string | null>(null);
	const [isLocalizaResolving, setIsLocalizaResolving] = useState(false);
	const [selectedLocalizaCandidateId, setSelectedLocalizaCandidateId] =
		useState<string | null>(null);
	const [submissionError, setSubmissionError] = useState<string | null>(null);
	const [submissionIdempotencyKey, setSubmissionIdempotencyKey] = useState<
		string | null
	>(null);
	const hasTrackedLocalizaUrlPasteRef = useRef(false);
	const hasTrackedManualOverrideRef = useRef(false);
	const initialLocalizaCandidateIdRef = useRef(
		initialLocalizaCandidateId.trim() || null,
	);
	const shouldAutoResolveInitialSourceRef = useRef(
		Boolean(initialSourceUrl.trim()),
	);
	const localizaRequestSequenceRef = useRef(0);
	const activeLocalizaRequestRef = useRef<number | null>(null);
	const onboardingFieldId = useId();
	const fieldId = (suffix: string) => `${onboardingFieldId}-${suffix}`;

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

	const currentIndex = stepOrder.indexOf(currentStep);
	const isFirstStep = currentIndex === 0;
	const isLastStep = currentIndex === stepOrder.length - 1;

	const plannedGenerations = useMemo(
		() => computePlannedGenerations(listings),
		[listings],
	);

	const resolveIdealistaLocation =
		trpc.listings.resolveIdealistaLocation.useMutation();

	const formatListingPrice = (details: ListingCreateInput["details"]) =>
		new Intl.NumberFormat("es-ES", {
			style: "currency",
			currency: details.currencyCode,
			maximumFractionDigits: 0,
		}).format(details.priceAmount);
	const localizaStrategyOptions = useMemo(
		() => buildLocalizaStrategyOptions(availableLocalizaStrategies),
		[availableLocalizaStrategies],
	);
	const hasConfiguredLocalizaStrategy = localizaStrategyOptions.length > 0;

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
		return canAddListingDraft(listingDraft, isLocalizaResolving);
	}, [isLocalizaResolving, listingDraft]);

	const clearActiveLocalizaRequest = () => {
		activeLocalizaRequestRef.current = null;
		setIsLocalizaResolving(false);
	};

	const clearLocalizaDraftState = () => {
		hasTrackedLocalizaUrlPasteRef.current = false;
		hasTrackedManualOverrideRef.current = false;
		clearActiveLocalizaRequest();
		setLocalizaStrategy("auto");
		setLocalizaResult(null);
		setLocalizaError(null);
		setSelectedLocalizaCandidateId(null);
		setListingDraft((prev) => ({
			...prev,
			sourceMetadata: undefined,
			locationResolution: undefined,
			propertyDossier: undefined,
		}));
	};

	const handleListingSourceTypeChange = (sourceType: ListingSourceType) => {
		if (sourceType === listingDraft.sourceType) {
			return;
		}

		initialLocalizaCandidateIdRef.current = null;
		shouldAutoResolveInitialSourceRef.current = false;
		hasTrackedLocalizaUrlPasteRef.current = false;
		hasTrackedManualOverrideRef.current = false;
		clearActiveLocalizaRequest();
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
			sourceUrl: "",
			sourceMetadata: undefined,
			locationResolution: undefined,
			propertyDossier: undefined,
			location: hasLocalizaLinkedDraftState(prev)
				? buildClearedLocationDraft(sourceType, prev.location.country)
				: sourceType === "idealista"
					? {
							...prev.location,
							country: prev.location.country.trim() || "Spain",
						}
					: prev.location,
		}));
	};

	const handleListingSourceUrlChange = (value: string) => {
		initialLocalizaCandidateIdRef.current = null;
		shouldAutoResolveInitialSourceRef.current = false;
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

		clearActiveLocalizaRequest();
		setLocalizaResult(null);
		setLocalizaError(null);
		setSelectedLocalizaCandidateId(null);
		setListingDraft((prev) => ({
			...prev,
			sourceUrl: value,
			sourceMetadata: undefined,
			locationResolution: undefined,
			propertyDossier: undefined,
			location: hasLocalizaLinkedDraftState(prev)
				? buildClearedLocationDraft(prev.sourceType, prev.location.country)
				: prev.location,
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
				locationResolution: (() => {
					if (!shouldMarkManualOverride || !prev.locationResolution) {
						return prev.locationResolution;
					}

					return {
						...prev.locationResolution,
						status: "manual_override",
						reasonCodes: Array.from(
							new Set([
								...prev.locationResolution.reasonCodes,
								"manual_address_override",
							]),
						),
					};
				})(),
			};
		});
	};

	const handleResolveIdealistaLocation = async () => {
		if (listingDraft.sourceType !== "idealista") {
			return;
		}

		if (activeLocalizaRequestRef.current !== null) {
			return;
		}

		const url = listingDraft.sourceUrl.trim();
		const requestedStrategy =
			getPreferredLocalizaStrategy(
				localizaStrategy,
				availableLocalizaStrategies,
			) ?? localizaStrategy;
		const sourceType = listingDraft.sourceType;
		if (!url) {
			clearActiveLocalizaRequest();
			setLocalizaError("Pega primero una URL de anuncio de Idealista.");
			setLocalizaResult(null);
			return;
		}

		if (!hasConfiguredLocalizaStrategy) {
			clearActiveLocalizaRequest();
			setLocalizaError(
				"La búsqueda de ubicación exacta no está configurada en este entorno. Sigue introduciendo la dirección manualmente.",
			);
			setLocalizaResult(null);
			return;
		}

		if (requestedStrategy !== localizaStrategy) {
			setLocalizaStrategy(requestedStrategy);
		}

		const requestId = localizaRequestSequenceRef.current + 1;
		localizaRequestSequenceRef.current = requestId;
		activeLocalizaRequestRef.current = requestId;
		setIsLocalizaResolving(true);
		setLocalizaError(null);
		capturePosthogEvent("localiza_resolve_clicked", {
			requestedStrategy,
			sourceType,
			sourceUrlPresent: true,
		});
		try {
			const result = await resolveIdealistaLocation.mutateAsync({
				url,
				strategy: requestedStrategy,
			});

			// Ignora respuestas del resolver para solicitudes sustituidas o canceladas.
			if (activeLocalizaRequestRef.current !== requestId) {
				return;
			}

			hasTrackedManualOverrideRef.current = false;
			clearActiveLocalizaRequest();
			setLocalizaError(null);
			setLocalizaResult(result);
			setSelectedLocalizaCandidateId(
				result.status === "needs_confirmation"
					? (result.candidates.find(
							(candidate) =>
								candidate.id === initialLocalizaCandidateIdRef.current,
						)?.id ?? null)
					: null,
			);
			setListingDraft((prev) => ({
				...prev,
				sourceUrl: result.sourceMetadata.sourceUrl,
				sourceMetadata: result.sourceMetadata,
				propertyDossier: result.propertyDossier,
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
				outcome: result.status === "unresolved" ? "unresolved" : "resolved",
			});
			capturePosthogEvent(
				result.status === "unresolved"
					? "localiza_resolve_unresolved"
					: "localiza_resolve_success",
				buildLocalizaAnalyticsPayload(result),
			);
		} catch (error) {
			if (activeLocalizaRequestRef.current !== requestId) {
				return;
			}

			hasTrackedManualOverrideRef.current = false;
			clearActiveLocalizaRequest();
			setLocalizaResult(null);
			setLocalizaError(
				"No pudimos comprobar la dirección. Escríbela a mano y continúa.",
			);
			setSelectedLocalizaCandidateId(null);
			setListingDraft((prev) => ({
				...prev,
				sourceMetadata: undefined,
				locationResolution: undefined,
				propertyDossier: undefined,
				location: clearLocationAfterFailedResolve(prev),
			}));
			capturePosthogEvent("localiza_resolve_failed", {
				requestedStrategy,
				sourceType,
				sourceUrlPresent: true,
				errorMessage:
					error instanceof Error
						? error.message
						: "La búsqueda de ubicación exacta no pudo terminar.",
			});
		}
	};

	const handleApplyBuildingMatch = () => {
		if (
			!localizaResult ||
			localizaResult.status !== "building_match" ||
			!localizaResult.prefillLocation
		) {
			return;
		}

		const prefillLocation = localizaResult.prefillLocation;
		setListingDraft((prev) => ({
			...prev,
			sourceMetadata: localizaResult.sourceMetadata,
			propertyDossier: buildDossierWithOfficialLocation(
				localizaResult.propertyDossier,
				{
					location: prefillLocation,
					proposedAddressLabel: localizaResult.resolvedAddressLabel,
					parcelRef14: localizaResult.parcelRef14,
					unitRef20: localizaResult.unitRef20,
				},
			),
			location: prefillLocation,
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
						propertyDossier: buildDossierWithOfficialLocation(
							prev.propertyDossier,
							{
								location: prefillLocation,
								proposedAddressLabel: prev.resolvedAddressLabel,
								parcelRef14: prev.parcelRef14,
								unitRef20: prev.unitRef20,
							},
						),
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

	const applyLocalizaCandidate = (
		localizaResultToApply: ResolveIdealistaLocationResult,
		selectedCandidate: LocalizaCandidate,
	) => {
		if (!selectedCandidate.prefillLocation) {
			return false;
		}

		const candidatePrefillLocation = selectedCandidate.prefillLocation;
		hasTrackedManualOverrideRef.current = false;
		capturePosthogEvent("localiza_candidate_confirmed", {
			...buildLocalizaAnalyticsPayload(localizaResultToApply),
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
			sourceMetadata: localizaResultToApply.sourceMetadata,
			propertyDossier: buildDossierWithOfficialLocation(
				localizaResultToApply.propertyDossier,
				{
					location: candidatePrefillLocation,
					proposedAddressLabel: selectedCandidate.label,
					parcelRef14: selectedCandidate.parcelRef14,
					unitRef20: selectedCandidate.unitRef20,
				},
			),
			location: candidatePrefillLocation,
			locationResolution: buildLocationResolutionFromResult(
				localizaResultToApply,
				{
					status: "building_match",
					confidenceScore: selectedCandidate.score,
					parcelRef14: selectedCandidate.parcelRef14,
					unitRef20: selectedCandidate.unitRef20,
					resolvedAddressLabel: selectedCandidate.label,
					extraReasonCodes: ["user_confirmed_candidate"],
				},
			),
		}));
		setLocalizaResult((prev) => {
			const resultToUpdate = prev ?? localizaResultToApply;

			return {
				...resultToUpdate,
				status: "building_match",
				confidenceScore: selectedCandidate.score,
				resolvedAddressLabel: selectedCandidate.label,
				parcelRef14: selectedCandidate.parcelRef14,
				unitRef20: selectedCandidate.unitRef20,
				prefillLocation: selectedCandidate.prefillLocation,
				propertyDossier: buildDossierWithOfficialLocation(
					resultToUpdate.propertyDossier,
					{
						location: selectedCandidate.prefillLocation,
						proposedAddressLabel: selectedCandidate.label,
						parcelRef14: selectedCandidate.parcelRef14,
						unitRef20: selectedCandidate.unitRef20,
					},
				),
				evidence: {
					...resultToUpdate.evidence,
					reasonCodes: Array.from(
						new Set([
							...resultToUpdate.evidence.reasonCodes,
							"user_confirmed_candidate",
						]),
					),
				},
			};
		});

		return true;
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

		void applyLocalizaCandidate(localizaResult, selectedCandidate);
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: One-shot URL handoff is guarded by refs so it cannot re-run on callback identity changes.
	useEffect(() => {
		if (
			!shouldAutoResolveInitialSourceRef.current ||
			currentStep !== "listings" ||
			!hasConfiguredLocalizaStrategy ||
			isLocalizaResolving ||
			localizaResult ||
			!listingDraft.sourceUrl.trim()
		) {
			return;
		}

		shouldAutoResolveInitialSourceRef.current = false;
		void handleResolveIdealistaLocation();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		currentStep,
		hasConfiguredLocalizaStrategy,
		isLocalizaResolving,
		listingDraft.sourceUrl,
		localizaResult,
	]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: The candidate id is consumed exactly once and then cleared.
	useEffect(() => {
		const initialCandidateId = initialLocalizaCandidateIdRef.current;

		if (
			!initialCandidateId ||
			!localizaResult ||
			localizaResult.status !== "needs_confirmation"
		) {
			return;
		}

		const selectedCandidate = localizaResult.candidates.find(
			(candidate) => candidate.id === initialCandidateId,
		);

		if (!selectedCandidate) {
			initialLocalizaCandidateIdRef.current = null;
			return;
		}

		setSelectedLocalizaCandidateId(selectedCandidate.id);

		applyLocalizaCandidate(localizaResult, selectedCandidate);
		initialLocalizaCandidateIdRef.current = null;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [localizaResult]);

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
		initialLocalizaCandidateIdRef.current = null;
		shouldAutoResolveInitialSourceRef.current = false;
		hasTrackedLocalizaUrlPasteRef.current = false;
		hasTrackedManualOverrideRef.current = false;
		clearActiveLocalizaRequest();
		setLocalizaStrategy("auto");
		setLocalizaResult(null);
		setLocalizaError(null);
		setSelectedLocalizaCandidateId(null);
		setListingDraft(createListingDraft());
	};

	const handleAddListing = () => {
		if (isLocalizaResolving || !canAddListing) {
			return;
		}

		const priceAmount = Number(listingDraft.details.priceAmount);
		const bedrooms = Number(listingDraft.details.bedrooms);
		const bathrooms = Number(listingDraft.details.bathrooms);
		const interiorAreaSquareMeters = parseOptionalPositiveInteger(
			listingDraft.details.interiorAreaSquareMeters,
		);
		const sourceMetadata = listingDraft.sourceMetadata;
		const fallbackManualResolution =
			listingDraft.sourceType === "idealista" &&
			sourceMetadata &&
			localizaResult &&
			localizaResult.sourceMetadata.sourceUrl === sourceMetadata.sourceUrl
				? buildLocationResolutionFromResult(localizaResult, {
						status: "manual_override",
						extraReasonCodes: ["manual_address_override", "suggestion_skipped"],
					})
				: undefined;
		const locationResolution =
			listingDraft.locationResolution ?? fallbackManualResolution;
		const propertyDossier = sourceMetadata
			? (listingDraft.propertyDossier ?? localizaResult?.propertyDossier)
			: undefined;

		const slug = slugify(listingDraft.title);

		const listing: ListingCreateInput = {
			title: listingDraft.title.trim(),
			slug,
			sourceType: listingDraft.sourceType,
			sourceUrl: listingDraft.sourceUrl
				? listingDraft.sourceUrl.trim()
				: undefined,
			sourceMetadata,
			locationResolution,
			propertyDossier,
			location: {
				street: listingDraft.location.street.trim(),
				city: listingDraft.location.city.trim(),
				stateOrProvince: listingDraft.location.stateOrProvince.trim(),
				postalCode: listingDraft.location.postalCode.trim(),
				country: listingDraft.location.country.trim(),
			},
			details: {
				priceAmount: Number.isFinite(priceAmount) ? priceAmount : 0,
				currencyCode: listingDraft.details.currencyCode,
				bedrooms: Number.isFinite(bedrooms) ? bedrooms : 0,
				bathrooms: Number.isFinite(bathrooms) ? bathrooms : 0,
				interiorAreaSquareMeters,
				lotAreaSquareMeters: undefined,
				yearBuilt: undefined,
				propertyType: listingDraft.details.propertyType,
				description: listingDraft.details.description.trim(),
			},
			media: [],
		};

		setSubmissionIdempotencyKey(null);
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
			const createResult = await createListingsBatch.mutateAsync({
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

			setSavedListings(
				listings.map((listing, index) => ({
					...listing,
					id: String(createResult.ids[index] ?? `${index}`),
				})),
			);
			setListings([]);
			setSubmissionIdempotencyKey(null);
		} catch (error) {
			setSubmissionError(
				error instanceof Error
					? error.message
					: "Todavía no hemos podido guardar tus inmuebles.",
			);
		}
	};

	if (savedListings.length > 0) {
		return (
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:px-12">
					<header className="flex flex-col gap-3">
						<span className="inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
							Guardado
						</span>
						<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
							Inmuebles listos para revisar.
						</h1>
						<p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
							La dirección, la fuente y el resultado de Localiza quedan visibles
							antes de ir a la bandeja.
						</p>
					</header>

					<div className="grid gap-4">
						{savedListings.map((listing) => (
							<Card key={listing.id} className="border-border/70">
								<CardHeader>
									<CardTitle className="text-lg">{listing.title}</CardTitle>
									<CardDescription>
										{listingSourceDisplayCopy[listing.sourceType]} ·{" "}
										{propertyTypeCopy[listing.details.propertyType]}
									</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-3 text-sm text-muted-foreground">
									<p className="font-medium text-foreground">
										{formatListingAddress(listing)}
									</p>
									{listing.sourceUrl ? (
										<p className="break-all text-xs">{listing.sourceUrl}</p>
									) : null}
									{listing.locationResolution ? (
										<div className="grid gap-2 rounded-md border border-border/70 p-3">
											<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
												{
													localizaStatusCopy[listing.locationResolution.status]
														.label
												}
											</p>
											<p>
												Fuente oficial:{" "}
												<span className="font-medium text-foreground">
													{listing.locationResolution.officialSource}
												</span>
											</p>
											{listing.locationResolution.resolvedAddressLabel ? (
												<p>
													Dirección revisada:{" "}
													<span className="font-medium text-foreground">
														{listing.locationResolution.resolvedAddressLabel}
													</span>
												</p>
											) : null}
											{listing.sourceMetadata?.externalListingId ? (
												<p>
													Referencia de Idealista:{" "}
													{listing.sourceMetadata.externalListingId}
												</p>
											) : null}
										</div>
									) : (
										<p className="rounded-md border border-border/70 p-3">
											Dirección escrita a mano.
										</p>
									)}
									{listing.propertyDossier ? (
										<LocalizaPropertyReport
											dossier={listing.propertyDossier}
											showNavigation={false}
											className="shadow-none"
										/>
									) : null}
								</CardContent>
							</Card>
						))}
					</div>

					<div className="flex flex-wrap gap-3">
						<Button type="button" onClick={() => router.push("/app/inbox")}>
							Ir a la bandeja
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-muted/30">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:px-12">
				<header className="flex flex-col gap-3">
					<span className="inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
						Primer ajuste
					</span>
					<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
						Configura marca e inmuebles.
					</h1>
					<p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
						Da a Casedra lo justo para trabajar con tu tono, tus propiedades y
						tu equipo.
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
										Marca
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
												htmlFor={fieldId("brand-website")}
											>
												Sitio web de la empresa
											</label>
											<Input
												id={fieldId("brand-website")}
												placeholder="https://www.tuagencia.com"
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
												htmlFor={fieldId("brand-company-name")}
											>
												Nombre de la empresa
											</label>
											<Input
												id={fieldId("brand-company-name")}
												placeholder="Inmobiliaria Casedra"
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
												htmlFor={fieldId("brand-primary-color")}
											>
												Color principal
											</label>
											<Input
												id={fieldId("brand-primary-color")}
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
												htmlFor={fieldId("brand-notes")}
											>
												Notas para nuestro equipo
											</label>
											<Textarea
												id={fieldId("brand-notes")}
												placeholder="Tono, referencias y límites que debamos respetar."
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
												htmlFor={fieldId("manual-company-name")}
											>
												Nombre de la empresa
											</label>
											<Input
												id={fieldId("manual-company-name")}
												placeholder="Inmobiliaria Casedra"
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
												htmlFor={fieldId("manual-tagline")}
											>
												Eslogan
											</label>
											<Input
												id={fieldId("manual-tagline")}
												placeholder="Marketing boutique para cada inmueble"
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
												htmlFor={fieldId("manual-website")}
											>
												Sitio web (opcional)
											</label>
											<Input
												id={fieldId("manual-website")}
												placeholder="https://www.tuagencia.com"
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
												htmlFor={fieldId("manual-color")}
											>
												Color principal
											</label>
											<Input
												id={fieldId("manual-color")}
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
												htmlFor={fieldId("manual-voice")}
											>
												Voz de marca
											</label>
											<Textarea
												id={fieldId("manual-voice")}
												placeholder="Seguro, experto y con atención de alto nivel para compradores de lujo."
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
												htmlFor={fieldId("manual-notes")}
											>
												Notas para nuestro equipo
											</label>
											<Textarea
												id={fieldId("manual-notes")}
												placeholder="Límites de marca, avisos obligatorios o referencias que debamos seguir."
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
												Añade tus inmuebles
											</h3>
											<p className="text-sm text-muted-foreground">
												Pega un enlace o escribe los datos a mano. Todo se puede
												revisar antes de guardar.
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
											htmlFor={fieldId("listing-title")}
										>
											Nombre del inmueble
										</label>
										<Input
											id={fieldId("listing-title")}
											placeholder="Ático en Chamberí"
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
														htmlFor={fieldId("listing-source-url")}
													>
														{
															listingSourceCopy[listingDraft.sourceType]
																.urlLabel
														}
													</label>
													<Input
														id={fieldId("listing-source-url")}
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
															!hasConfiguredLocalizaStrategy ||
															isLocalizaResolving ||
															listingDraft.sourceUrl.trim().length === 0
														}
													>
														{isLocalizaResolving ? (
															<LoaderCircle
																className="mr-2 h-4 w-4 animate-spin"
																aria-hidden="true"
															/>
														) : null}
														Buscar ubicación exacta
													</Button>
												) : null}
											</div>
											{listingSourceCopy[listingDraft.sourceType].urlHint ? (
												<p className="mt-2 text-sm text-muted-foreground">
													{listingSourceCopy[listingDraft.sourceType].urlHint}
												</p>
											) : null}
										</div>
									) : null}

									{listingDraft.sourceType === "idealista" ? (
										<div className="rounded-lg border border-border/60 bg-muted/20 p-4">
											{!hasConfiguredLocalizaStrategy ? (
												<div className="flex items-start gap-3 text-sm">
													<AlertCircle
														className="mt-0.5 h-4 w-4 text-muted-foreground"
														aria-hidden="true"
													/>
													<div className="space-y-1">
														<p className="font-medium text-foreground">
															La búsqueda de ubicación exacta no está disponible
															aquí
														</p>
														<p className="text-muted-foreground">
															Deja la URL de Idealista como referencia y escribe
															la dirección a mano.
														</p>
													</div>
												</div>
											) : null}

											{hasConfiguredLocalizaStrategy && isLocalizaResolving ? (
												<div className="flex items-start gap-3 text-sm">
													<LoaderCircle
														className="mt-0.5 h-4 w-4 animate-spin text-primary"
														aria-hidden="true"
													/>
													<div className="space-y-1">
														<p className="font-medium text-foreground">
															Buscando la dirección del anuncio
														</p>
														<p className="text-muted-foreground">
															Estamos leyendo el enlace y comprobando la
															ubicación. Mientras tanto, no hace falta pulsar de
															nuevo.
														</p>
													</div>
												</div>
											) : null}

											{hasConfiguredLocalizaStrategy &&
											!isLocalizaResolving &&
											localizaError ? (
												<div className="flex items-start gap-3 text-sm">
													<AlertCircle
														className="mt-0.5 h-4 w-4 text-destructive"
														aria-hidden="true"
													/>
													<div className="space-y-1">
														<p className="font-medium text-foreground">
															La búsqueda de ubicación exacta no pudo empezar
														</p>
														<p className="text-muted-foreground">
															{localizaError}
														</p>
													</div>
												</div>
											) : null}

											{hasConfiguredLocalizaStrategy &&
											!isLocalizaResolving &&
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

											{hasConfiguredLocalizaStrategy &&
											!isLocalizaResolving &&
											!localizaError &&
											localizaResult ? (
												<div className="space-y-3 text-sm">
													<div className="flex flex-wrap items-center gap-2">
														<span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
															{localizaStatusCopy[localizaResult.status].label}
														</span>
														<span className="text-xs text-muted-foreground">
															Seguridad:{" "}
															{Math.round(localizaResult.confidenceScore * 100)}
															%
														</span>
													</div>
													<p className="text-muted-foreground">
														{
															localizaStatusCopy[localizaResult.status]
																.description
														}
													</p>
													{localizaResult.status === "unresolved" ? (
														<p className="text-muted-foreground">
															Todavía no encontramos una dirección segura.
															Escribe la dirección a mano.
														</p>
													) : null}
													{localizaResult.resolvedAddressLabel ? (
														<p className="font-medium text-foreground">
															{localizaResult.resolvedAddressLabel}
														</p>
													) : null}
													{localizaResult.sourceMetadata.externalListingId ? (
														<p className="text-muted-foreground">
															Referencia de Idealista:{" "}
															{localizaResult.sourceMetadata.externalListingId}
														</p>
													) : null}
													{localizaResult.officialSourceUrl ? (
														<p className="text-muted-foreground">
															Registro oficial:{" "}
															<a
																href={localizaResult.officialSourceUrl}
																target="_blank"
																rel="noreferrer"
																className="text-primary underline underline-offset-4"
															>
																Abrir registro
															</a>
														</p>
													) : null}
													{localizaResult.status === "building_match" ? (
														<div className="flex flex-wrap gap-3 pt-1">
															<Button
																type="button"
																onClick={handleApplyBuildingMatch}
																disabled={!localizaResult.prefillLocation}
															>
																Usar este edificio
															</Button>
															<p className="max-w-xl text-muted-foreground">
																Usaremos el edificio. Revisa el piso o puerta
																antes de guardar.
															</p>
														</div>
													) : null}
													{localizaResult.status === "needs_confirmation" &&
													localizaResult.candidates.length > 0 ? (
														<div className="space-y-3 pt-1">
															<fieldset className="grid gap-3 sm:grid-cols-2">
																<legend className="sr-only">
																	Opciones de dirección
																</legend>
																{localizaResult.candidates.map((candidate) => (
																	<label
																		key={candidate.id}
																		className={`rounded-md border p-3 text-left transition-colors ${
																			selectedLocalizaCandidateId ===
																			candidate.id
																				? "border-primary bg-primary/10"
																				: "border-border/70 bg-background"
																		}`}
																	>
																		<input
																			type="radio"
																			name="localiza-candidate"
																			value={candidate.id}
																			checked={
																				selectedLocalizaCandidateId ===
																				candidate.id
																			}
																			onChange={() =>
																				handleSelectLocalizaCandidate(
																					candidate.id,
																				)
																			}
																			className="sr-only"
																		/>
																		<p className="font-medium text-foreground">
																			{candidate.label}
																		</p>
																		<p className="text-muted-foreground">
																			Seguridad:{" "}
																			{Math.round(candidate.score * 100)}%
																		</p>
																		{candidate.officialUrl ? (
																			<p>
																				<a
																					href={candidate.officialUrl}
																					target="_blank"
																					rel="noreferrer"
																					className="text-primary underline underline-offset-4"
																				>
																					Abrir registro
																				</a>
																			</p>
																		) : null}
																	</label>
																))}
															</fieldset>
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
																	Usar dirección seleccionada
																</Button>
																<p className="max-w-xl text-muted-foreground">
																	{localizaResult.candidates.find(
																		(candidate) =>
																			candidate.id ===
																			selectedLocalizaCandidateId,
																	)?.prefillLocation
																		? "Revisa la selección antes de aplicar la dirección."
																		: "Abre el registro oficial y escribe la dirección a mano si no estás seguro."}
																</p>
															</div>
														</div>
													) : null}
													{localizaResult.propertyDossier ? (
														<LocalizaPropertyReport
															dossier={localizaResult.propertyDossier}
															result={localizaResult}
															showNavigation={false}
															className="mt-5 shadow-none"
														/>
													) : null}
												</div>
											) : null}
										</div>
									) : null}

									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<label
												className="text-sm font-medium text-foreground"
												htmlFor={fieldId("listing-street")}
											>
												Dirección
											</label>
											<Input
												id={fieldId("listing-street")}
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
												htmlFor={fieldId("listing-city")}
											>
												Ciudad
											</label>
											<Input
												id={fieldId("listing-city")}
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
												htmlFor={fieldId("listing-state")}
											>
												Comunidad / Provincia
											</label>
											<Input
												id={fieldId("listing-state")}
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
												htmlFor={fieldId("listing-postal")}
											>
												Código postal
											</label>
											<Input
												id={fieldId("listing-postal")}
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
											htmlFor={fieldId("listing-price")}
										>
											Precio del inmueble (EUR)
										</label>
										<Input
											id={fieldId("listing-price")}
											type="number"
											min="0"
											placeholder="2350000"
											value={listingDraft.details.priceAmount}
											onChange={(event) =>
												setListingDraft((prev) => ({
													...prev,
													details: {
														...prev.details,
														priceAmount: event.target.value,
														currencyCode: "EUR",
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
												htmlFor={fieldId("listing-beds")}
											>
												Dormitorios
											</label>
											<Input
												id={fieldId("listing-beds")}
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
												htmlFor={fieldId("listing-baths")}
											>
												Baños
											</label>
											<Input
												id={fieldId("listing-baths")}
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
												htmlFor={fieldId("listing-interior-area")}
											>
												Superficie interior en m² (opcional)
											</label>
											<Input
												id={fieldId("listing-interior-area")}
												type="number"
												min="1"
												step="1"
												placeholder="110"
												value={
													listingDraft.details.interiorAreaSquareMeters ?? ""
												}
												onChange={(event) =>
													setListingDraft((prev) => ({
														...prev,
														details: {
															...prev.details,
															interiorAreaSquareMeters: event.target.value,
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
											htmlFor={fieldId("listing-property-type")}
										>
											Tipo de inmueble
										</label>
										<select
											id={fieldId("listing-property-type")}
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
											htmlFor={fieldId("listing-description")}
										>
											Puntos destacados de marketing
										</label>
										<Textarea
											id={fieldId("listing-description")}
											placeholder="Piso exterior en esquina con balcón, ascensor y mucha luz natural."
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
											Añadir inmueble
										</Button>
									</div>
								</div>

								{listings.length > 0 ? (
									<div className="grid gap-4">
										<h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
											Inmuebles listos para la bandeja
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
															{formatListingPrice(listing.details)}
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
																<p className="text-xs">Dirección revisada</p>
															</>
														) : null}
														<p>
															{listing.details.bedrooms} hab ·{" "}
															{listing.details.bathrooms} baños
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
										<h3 className="text-lg font-semibold">Resumen de marca</h3>
										<p className="text-sm text-muted-foreground">
											Usaremos estos datos en cada pieza que prepare Casedra.
										</p>
										<ul className="space-y-1 text-sm text-muted-foreground">
											<li>
												<span className="font-medium text-foreground">
													Empresa:
												</span>{" "}
												{brand.companyName || "Pendiente"}
											</li>
											<li>
												<span className="font-medium text-foreground">
													Sitio web:
												</span>{" "}
												{brand.website || "—"}
											</li>
											<li>
												<span className="font-medium text-foreground">
													Eslogan:
												</span>{" "}
												{brand.tagline || "—"}
											</li>
											<li>
												<span className="font-medium text-foreground">
													Voz:
												</span>{" "}
												{brand.voice ||
													(brandSource === "firecrawl"
														? "Se derivará del sitio"
														: "—")}
											</li>
										</ul>
									</div>
									<div className="flex flex-col gap-3 rounded-md border border-primary/40 bg-background p-4 text-sm">
										<span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
											Color de marca
										</span>
										<div
											className="h-16 w-full rounded-md border"
											style={{
												backgroundColor: brand.primaryColorHex || "#0f172a",
											}}
										/>
										<p className="text-xs text-muted-foreground">
											Lo aplicaremos en piezas, textos y acentos visuales.
										</p>
									</div>
								</div>

								<div className="grid gap-4 rounded-lg border border-border/60 bg-background p-6">
									<div className="flex flex-col gap-1">
										<h3 className="text-lg font-semibold">
											Inmuebles incluidos
										</h3>
										<p className="text-sm text-muted-foreground">
											{listings.length > 0
												? `${listings.length} inmueble${listings.length > 1 ? "s" : ""} listo${listings.length > 1 ? "s" : ""} para generar`
												: "Añade inmuebles para generar medios a medida."}
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
													{formatListingPrice(listing.details)}
													{" · "}
													{listing.details.bedrooms} hab ·{" "}
													{listing.details.bathrooms} baños
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
															Dirección revisada
														</p>
													</>
												) : null}
											</div>
										))}
									</div>
								</div>

								<div className="grid gap-4 rounded-lg border border-primary/40 bg-primary/5 p-6">
									<div className="flex flex-col gap-1">
										<h3 className="text-lg font-semibold">
											Piezas que se prepararán
										</h3>
										<p className="text-sm text-muted-foreground">
											Esto queda listo para trabajar desde la bandeja.
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
													Para {generation.listingTitle}
												</p>
											</div>
										))}
									</div>
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
								Volver
							</Button>
						) : null}
						{currentStep !== "brand" ? (
							<Button
								type="button"
								variant="ghost"
								onClick={() => goToStep("brand")}
							>
								Ir a marca
							</Button>
						) : null}
						{currentStep === "review" ? (
							<Button
								type="button"
								variant="ghost"
								onClick={() => goToStep("listings")}
							>
								Ir a inmuebles
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
								Continuar
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
								Guardar inmuebles e ir a la bandeja
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
	single_family: "Unifamiliar",
	multi_family: "Multifamiliar",
	condo: "Piso",
	townhouse: "Adosado",
	land: "Terreno",
	commercial: "Comercial",
};

const brandSourceOptions: Array<{
	value: BrandSourceType;
	label: string;
	icon: typeof Building2;
}> = [
	{
		value: "firecrawl",
		label: "Analizar mi sitio web",
		icon: Globe2,
	},
	{
		value: "manual",
		label: "Introducir datos de marca",
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
		label: "Marca",
		title: "Define tu marca",
		description: "Nombre, web, color y tono. Nada más de lo necesario.",
		icon: Building2,
	},
	listings: {
		label: "Inmuebles",
		title: "Añade inmuebles",
		description: "Cada inmueble queda listo para preparar piezas a medida.",
		icon: ListChecks,
	},
	review: {
		label: "Revisión",
		title: "Revisar y lanzar",
		description:
			"Confirma la captura y abre la bandeja para empezar a trabajar.",
		icon: Sparkles,
	},
};
