import type { IdealistaSignals, ResolveIdealistaLocationCandidate } from "@casedra/types";

import {
	buildSearchRadii,
	convertWgs84ToWebMercator,
	distanceBetweenPoints,
} from "./score";
import {
	MIN_VIABLE_SCORE,
	buildPrefillLocation,
	buildResolvedOfficialResolution,
	buildUnresolvedOfficialResolution,
	buildWgs84BoundingBox,
	getGeoJsonGeometryCenter,
	repairMojibake,
	scoreOfficialCandidate,
	sortScoredCandidates,
	stripHtml,
} from "./catastro-shared";
import type { LocalizaOfficialResolution } from "./types";

const ALAVA_CATASTRO_WFS_URL =
	"https://geo.araba.eus/geoaraba/services/OGC_ARABA/WFS_Katastroa/MapServer/WFSServer";
const OFFICIAL_SOURCE_LABEL = "Catastro de Alava";
const MAX_RESULTS_PER_REQUEST = 60;

interface AlavaFeatureCollection {
	features?: AlavaFeature[];
}

interface AlavaFeature {
	id?: string;
	geometry?: {
		type: "Polygon" | "MultiPolygon";
		coordinates: number[][][] | number[][][][];
	};
	properties?: {
		GmlID?: string;
		REF_CATASTRAL?: string;
		INFO?: string;
	};
}

interface ParsedAlavaCandidate {
	id: string;
	parcelRef14?: string;
	unitRef20?: string;
	officialUrl?: string;
	municipality?: string;
	streetName?: string;
	designator?: string;
	postalCode?: string;
	point: {
		x: number;
		y: number;
	};
	distanceMeters: number;
}

const fetchWfsGeoJson = async (input: {
	typeName: string;
	latitude: number;
	longitude: number;
	radiusMeters: number;
	signal?: AbortSignal;
}) => {
	const bbox = buildWgs84BoundingBox({
		latitude: input.latitude,
		longitude: input.longitude,
		radiusMeters: input.radiusMeters,
	});
	const params = new URLSearchParams({
		service: "WFS",
		request: "GetFeature",
		version: "2.0.0",
		typeNames: input.typeName,
		count: String(MAX_RESULTS_PER_REQUEST),
		bbox: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, "EPSG:4326"].join(
			",",
		),
		outputFormat: "GEOJSON",
		srsName: "EPSG:4326",
	});
	const response = await fetch(`${ALAVA_CATASTRO_WFS_URL}?${params.toString()}`, {
		signal: input.signal,
		headers: {
			Accept: "application/json",
		},
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`alava_catastro_http_${response.status}`);
	}

	return (await response.json()) as AlavaFeatureCollection;
};

const dedupeById = <T extends { id: string }>(values: T[]) => {
	const byId = new Map<string, T>();

	for (const value of values) {
		if (!byId.has(value.id)) {
			byId.set(value.id, value);
		}
	}

	return Array.from(byId.values());
};

const parseDirection = (value?: string) => {
	const normalized = repairMojibake(value)?.trim();

	if (!normalized) {
		return {};
	}

	const commaIndex = normalized.lastIndexOf(",");

	if (commaIndex >= 0) {
		return {
			streetName: normalized.slice(0, commaIndex).trim(),
			designator: normalized.slice(commaIndex + 1).trim(),
		};
	}

	const match = normalized.match(/^(.*?)(\d+[A-Za-z-]*)$/);

	if (!match) {
		return {
			streetName: normalized,
		};
	}

	return {
		streetName: match[1]?.trim(),
		designator: match[2]?.trim(),
	};
};

const extractOfficialPageDetails = (text: string) => {
	const municipality = text.match(
		/Municipio:\s*(.+?)\s*(?:Entidad:|Pol[ií]gono:)/i,
	)?.[1];
	const direction = text.match(
		/Direcci[oó]n:\s*(.+?)\s*(?:UNIDADES FISCALES|Correo Electr[oó]nico|PETICI[OÓ]N)/i,
	)?.[1];
	const postalCode = text.match(/\b\d{5}\b/)?.[0];

	return {
		municipality: repairMojibake(municipality)?.trim(),
		direction: repairMojibake(direction)?.trim(),
		postalCode,
	};
};

const fetchOfficialPageCandidateDetails = async (input: {
	url?: string;
	signal?: AbortSignal;
}): Promise<{
	municipality?: string;
	direction?: string;
	postalCode?: string;
}> => {
	if (!input.url) {
		return {};
	}

	try {
		const response = await fetch(input.url, {
			signal: input.signal,
			cache: "no-store",
		});

		if (!response.ok) {
			return {};
		}

		const html = await response.text();
		return extractOfficialPageDetails(stripHtml(html));
	} catch {
		return {};
	}
};

const parseReferenceParts = (reference?: string) => {
	const normalized = (reference ?? "").replace(/\s+/g, " ").trim();

	if (!normalized) {
		return {};
	}

	const [parcelRef14, unitSuffix] = normalized.split(" ");
	return {
		parcelRef14,
		unitRef20: unitSuffix ? normalized.replace(/\s+/g, "") : undefined,
	};
};

const buildFallbackCandidate = (input: {
	candidate: ParsedAlavaCandidate;
	score: number;
}) =>
	({
		id: input.candidate.id,
		label:
			[
				[
					input.candidate.streetName,
					input.candidate.designator,
				]
					.filter(Boolean)
					.join(" "),
				input.candidate.parcelRef14
					? `Ref. ${input.candidate.parcelRef14}`
					: undefined,
			]
				.filter(Boolean)
				.join(" · ") || input.candidate.id,
		parcelRef14: input.candidate.parcelRef14,
		unitRef20: input.candidate.unitRef20,
		officialUrl: input.candidate.officialUrl,
		score: Number(input.score.toFixed(2)),
		distanceMeters: Number(input.candidate.distanceMeters.toFixed(1)),
		reasonCodes: [
			"alava_catastro_viewer_candidate",
			`distance_${Math.round(input.candidate.distanceMeters)}m`,
		],
	} satisfies ResolveIdealistaLocationCandidate);

const buildNeedsConfirmationResult = (input: {
	candidates: ResolveIdealistaLocationCandidate[];
	reasonCodes: string[];
	matchedSignals: string[];
	discardedSignals?: string[];
}) =>
	({
		status: "needs_confirmation",
		confidenceScore: input.candidates[0]?.score ?? 0,
		officialSource: OFFICIAL_SOURCE_LABEL,
		resolvedAddressLabel: input.candidates[0]?.label,
		parcelRef14: input.candidates[0]?.parcelRef14,
		unitRef20: input.candidates[0]?.unitRef20,
		prefillLocation: input.candidates[0]?.prefillLocation,
		candidates: input.candidates,
		reasonCodes: input.reasonCodes,
		matchedSignals: input.matchedSignals,
		discardedSignals: input.discardedSignals ?? [],
		territoryAdapter: "alava_catastro",
	}) satisfies LocalizaOfficialResolution;

const fetchBuildingCandidates = async (input: {
	signals: IdealistaSignals;
	signal?: AbortSignal;
}) => {
	if (
		input.signals.approximateLat === undefined ||
		input.signals.approximateLng === undefined
	) {
		return [];
	}

	const radii = buildSearchRadii(input.signals.mapPrecisionMeters);
	const candidates: ParsedAlavaCandidate[] = [];
	const centerPoint = convertWgs84ToWebMercator(
		input.signals.approximateLat,
		input.signals.approximateLng,
	);

	for (const radius of radii) {
		const payload = await fetchWfsGeoJson({
			typeName: "WFS_Katastroa:Eraikinak_Edificios",
			latitude: input.signals.approximateLat,
			longitude: input.signals.approximateLng,
			radiusMeters: radius,
			signal: input.signal,
		});

		const parsed = await Promise.all(
			(payload.features ?? []).map(async (feature) => {
				const center = getGeoJsonGeometryCenter(feature.geometry ?? null);

				if (!center) {
					return null;
				}

				const point = convertWgs84ToWebMercator(
					center.latitude,
					center.longitude,
				);
				const details = await fetchOfficialPageCandidateDetails({
					url: feature.properties?.INFO,
					signal: input.signal,
				});
				const direction = parseDirection(details.direction);
				const referenceParts = parseReferenceParts(
					feature.properties?.REF_CATASTRAL,
				);

				const parsedCandidate: ParsedAlavaCandidate = {
					id:
						feature.id ??
						feature.properties?.GmlID ??
						feature.properties?.REF_CATASTRAL ??
						`${center.longitude},${center.latitude}`,
					parcelRef14: referenceParts.parcelRef14,
					unitRef20: referenceParts.unitRef20,
					officialUrl: feature.properties?.INFO,
					municipality: details.municipality,
					streetName: direction.streetName,
					designator: direction.designator,
					postalCode: details.postalCode,
					point,
					distanceMeters: distanceBetweenPoints(centerPoint, point),
				};

				return parsedCandidate;
			}),
		);

		candidates.push(
			...parsed.filter(
				(candidate): candidate is ParsedAlavaCandidate => candidate !== null,
			),
		);

		if (dedupeById(candidates).length >= 6) {
			break;
		}
	}

	return dedupeById(candidates);
};

const fetchParcelFallbackCandidates = async (input: {
	signals: IdealistaSignals;
	signal?: AbortSignal;
}) => {
	if (
		input.signals.approximateLat === undefined ||
		input.signals.approximateLng === undefined
	) {
		return [];
	}

	const radii = buildSearchRadii(input.signals.mapPrecisionMeters);
	const centerPoint = convertWgs84ToWebMercator(
		input.signals.approximateLat,
		input.signals.approximateLng,
	);
	const candidates: ParsedAlavaCandidate[] = [];

	for (const radius of radii) {
		const payload = await fetchWfsGeoJson({
			typeName: "WFS_Katastroa:PartzelaHiritarrak_ParcelasUrbanas",
			latitude: input.signals.approximateLat,
			longitude: input.signals.approximateLng,
			radiusMeters: radius,
			signal: input.signal,
		});

		for (const feature of payload.features ?? []) {
			const center = getGeoJsonGeometryCenter(feature.geometry ?? null);

			if (!center) {
				continue;
			}

			const point = convertWgs84ToWebMercator(center.latitude, center.longitude);
			const referenceParts = parseReferenceParts(feature.properties?.REF_CATASTRAL);

			candidates.push({
				id:
					feature.id ??
					feature.properties?.GmlID ??
					feature.properties?.REF_CATASTRAL ??
					`${center.longitude},${center.latitude}`,
				parcelRef14: referenceParts.parcelRef14,
				officialUrl: feature.properties?.INFO,
				point,
				distanceMeters: distanceBetweenPoints(centerPoint, point),
			});
		}

		if (dedupeById(candidates).length >= 6) {
			break;
		}
	}

	return dedupeById(candidates);
};

export const resolveAlavaCatastro = async (input: {
	signals: IdealistaSignals;
	signal?: AbortSignal;
}): Promise<LocalizaOfficialResolution> => {
	if (
		input.signals.approximateLat === undefined ||
		input.signals.approximateLng === undefined
	) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "alava_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["alava_catastro_missing_coordinates"],
			discardedSignals: ["approximate_coordinates"],
		});
	}

	const buildingCandidates = await fetchBuildingCandidates(input);

	if (buildingCandidates.length > 0) {
		const centerPoint = convertWgs84ToWebMercator(
			input.signals.approximateLat,
			input.signals.approximateLng,
		);
		const scoredCandidates = sortScoredCandidates(
			buildingCandidates
				.map((candidate) =>
					scoreOfficialCandidate({
						candidate: {
							id: candidate.id,
							point: candidate.point,
							streetName: candidate.streetName,
							designator: candidate.designator,
							municipality: candidate.municipality,
							provinceName: "Alava",
							postalCode: candidate.postalCode,
							parcelRef14: candidate.parcelRef14,
							unitRef20: candidate.unitRef20,
							officialUrl: candidate.officialUrl,
							prefillLocation: buildPrefillLocation({
								streetName: candidate.streetName,
								designator: candidate.designator,
								municipality: candidate.municipality,
								provinceName: "Alava",
								postalCode: candidate.postalCode,
							}),
						},
						signals: input.signals,
						centerPoint,
					}),
				)
				.filter(
					(candidate): candidate is NonNullable<typeof candidate> =>
						candidate !== null,
				),
		);

		if (scoredCandidates.length > 0) {
			const viableCandidates = scoredCandidates
				.filter((candidate) => candidate.candidate.score >= MIN_VIABLE_SCORE)
				.slice(0, 5);

			if (viableCandidates.length > 0) {
				return buildResolvedOfficialResolution({
					status: "needs_confirmation",
					territoryAdapter: "alava_catastro",
					officialSource: OFFICIAL_SOURCE_LABEL,
					selected: viableCandidates[0],
					candidates: viableCandidates,
					extraReasonCodes: ["alava_catastro_confirmation_required"],
				});
			}
		}

		const fallbackCandidates = buildingCandidates
			.sort((left, right) => left.distanceMeters - right.distanceMeters)
			.slice(0, 5)
			.map((candidate, index) =>
				buildFallbackCandidate({
					candidate,
					score: Math.max(0.35 - index * 0.03, 0.2),
				}),
			);

		if (fallbackCandidates.length > 0) {
			return buildNeedsConfirmationResult({
				candidates: fallbackCandidates,
				reasonCodes: [
					"alava_catastro_confirmation_required",
					"alava_catastro_viewer_backed_candidates",
				],
				matchedSignals: ["official_source_reached", "official_candidates_found"],
				discardedSignals: ["machine_readable_postal_code"],
			});
		}
	}

	const parcelFallbackCandidates = (await fetchParcelFallbackCandidates(input))
		.sort((left, right) => left.distanceMeters - right.distanceMeters)
		.slice(0, 5)
		.map((candidate, index) =>
			buildFallbackCandidate({
				candidate,
				score: Math.max(0.28 - index * 0.03, 0.15),
			}),
		);

	if (parcelFallbackCandidates.length > 0) {
		return buildNeedsConfirmationResult({
			candidates: parcelFallbackCandidates,
			reasonCodes: [
				"alava_catastro_confirmation_required",
				"alava_catastro_parcel_fallback",
			],
			matchedSignals: ["official_source_reached", "official_candidates_found"],
			discardedSignals: ["official_building_candidates"],
		});
	}

	return buildUnresolvedOfficialResolution({
		territoryAdapter: "alava_catastro",
		officialSource: OFFICIAL_SOURCE_LABEL,
		reasonCodes: ["alava_catastro_no_candidates_found"],
		matchedSignals: ["official_source_reached"],
		discardedSignals: ["official_candidates"],
	});
};
