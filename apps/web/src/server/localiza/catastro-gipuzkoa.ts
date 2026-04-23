import type { IdealistaSignals } from "@casedra/types";

import {
	buildSearchRadii,
	convertWgs84ToWebMercator,
} from "./score";
import {
	BUILDING_MATCH_THRESHOLD,
	EXACT_MATCH_THRESHOLD,
	MIN_VIABLE_SCORE,
	buildPrefillLocation,
	buildResolvedOfficialResolution,
	buildUnresolvedOfficialResolution,
	buildWgs84BoundingBox,
	getGeoJsonGeometryCenter,
	repairMojibake,
	scoreOfficialCandidate,
	sortScoredCandidates,
} from "./catastro-shared";
import type { LocalizaOfficialResolution } from "./types";

const GIPUZKOA_WFS_URL = "https://b5m.gipuzkoa.eus/ogc/wfs/gipuzkoa_wfs";
const OFFICIAL_SOURCE_LABEL = "Catastro de Gipuzkoa";
const MAX_RESULTS_PER_REQUEST = 60;

interface GipuzkoaAddressFeatureCollection {
	features?: GipuzkoaAddressFeature[];
}

interface GipuzkoaAddressFeature {
	id?: string;
	geometry?: {
		type: "Polygon" | "MultiPolygon";
		coordinates: number[][][] | number[][][][];
	};
	properties?: {
		ID?: string;
		NAME?: string;
		MUNICIPALITY?: string;
		STREET?: string;
		DOORWAY_NUMBER?: string;
		ENCORE?: string;
		POSTCODE?: string;
	};
}

interface ParsedGipuzkoaAddress {
	id: string;
	streetName?: string;
	designator?: string;
	municipality?: string;
	postalCode?: string;
	point: {
		x: number;
		y: number;
	};
}

const fetchAddressCandidatesForRadius = async (input: {
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
		typeNames: "ms:ADDRESS",
		count: String(MAX_RESULTS_PER_REQUEST),
		bbox: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, "EPSG:4326"].join(
			",",
		),
		outputFormat: "application/json; subtype=geojson",
		srsName: "EPSG:4326",
	});
	const response = await fetch(`${GIPUZKOA_WFS_URL}?${params.toString()}`, {
		signal: input.signal,
		headers: {
			Accept: "application/json",
		},
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`gipuzkoa_catastro_http_${response.status}`);
	}

	const payload = (await response.json()) as GipuzkoaAddressFeatureCollection;
	return parseAddressFeatures(payload);
};

const normalizeEncore = (value?: string) => {
	const normalized = repairMojibake(value)?.trim();
	return normalized && normalized !== "-" ? normalized : undefined;
};

const normalizeDesignator = (doorwayNumber?: string, encore?: string) => {
	const normalizedDoorway = repairMojibake(doorwayNumber)?.trim();
	const normalizedEncore = normalizeEncore(encore);

	if (!normalizedDoorway) {
		return undefined;
	}

	return [normalizedDoorway, normalizedEncore].filter(Boolean).join(" ");
};

const parseAddressFeatures = (payload: GipuzkoaAddressFeatureCollection) =>
	dedupeById(
		(payload.features ?? []).flatMap((feature) => {
			const center = getGeoJsonGeometryCenter(feature.geometry ?? null);

			if (!center) {
				return [];
			}

			return [
				{
					id:
						feature.id ??
						feature.properties?.ID ??
						`${center.longitude},${center.latitude}`,
					streetName:
						repairMojibake(feature.properties?.STREET) ??
						repairMojibake(feature.properties?.NAME),
					designator: normalizeDesignator(
						feature.properties?.DOORWAY_NUMBER,
						feature.properties?.ENCORE,
					),
					municipality: repairMojibake(feature.properties?.MUNICIPALITY),
					postalCode: feature.properties?.POSTCODE,
					point: convertWgs84ToWebMercator(
						center.latitude,
						center.longitude,
					),
				} satisfies ParsedGipuzkoaAddress,
			];
		}),
	);

const dedupeById = <T extends { id: string }>(values: T[]) => {
	const byId = new Map<string, T>();

	for (const value of values) {
		if (!byId.has(value.id)) {
			byId.set(value.id, value);
		}
	}

	return Array.from(byId.values());
};

export const resolveGipuzkoaCatastro = async (input: {
	signals: IdealistaSignals;
	signal?: AbortSignal;
}): Promise<LocalizaOfficialResolution> => {
	if (
		input.signals.approximateLat === undefined ||
		input.signals.approximateLng === undefined
	) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "gipuzkoa_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["gipuzkoa_catastro_missing_coordinates"],
			discardedSignals: ["approximate_coordinates"],
		});
	}

	const radii = buildSearchRadii(input.signals.mapPrecisionMeters);
	const allCandidates: ParsedGipuzkoaAddress[] = [];

	for (const radius of radii) {
		const nextCandidates = await fetchAddressCandidatesForRadius({
			latitude: input.signals.approximateLat,
			longitude: input.signals.approximateLng,
			radiusMeters: radius,
			signal: input.signal,
		});

		allCandidates.push(...nextCandidates);

		if (dedupeById(allCandidates).length >= 6) {
			break;
		}
	}

	const dedupedCandidates = dedupeById(allCandidates);

	if (dedupedCandidates.length === 0) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "gipuzkoa_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["gipuzkoa_catastro_no_candidates_found"],
			matchedSignals: ["official_source_reached"],
			discardedSignals: ["official_candidates"],
		});
	}

	const centerPoint = convertWgs84ToWebMercator(
		input.signals.approximateLat,
		input.signals.approximateLng,
	);
	const scoredCandidates = sortScoredCandidates(
		dedupedCandidates
			.map((candidate) =>
				scoreOfficialCandidate({
					candidate: {
						id: candidate.id,
						point: candidate.point,
						streetName: candidate.streetName,
						designator: candidate.designator,
						municipality: candidate.municipality,
						provinceName: "Gipuzkoa",
						postalCode: candidate.postalCode,
						prefillLocation: buildPrefillLocation({
							streetName: candidate.streetName,
							designator: candidate.designator,
							municipality: candidate.municipality,
							provinceName: "Gipuzkoa",
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

	if (scoredCandidates.length === 0) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "gipuzkoa_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: [
				"gipuzkoa_catastro_candidates_discarded",
				"municipality_or_province_mismatch",
			],
			matchedSignals: ["official_candidates_found"],
			discardedSignals: ["official_candidates"],
		});
	}

	const viableCandidates = scoredCandidates
		.filter((candidate) => candidate.candidate.score >= MIN_VIABLE_SCORE)
		.slice(0, 5);

	if (viableCandidates.length === 0) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "gipuzkoa_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["gipuzkoa_catastro_scores_below_threshold"],
			matchedSignals: ["official_candidates_found"],
			discardedSignals: ["top_candidate_below_threshold"],
		});
	}

	const [topCandidate, secondCandidate] = viableCandidates;
	const scoreGap = Number(
		(
			topCandidate.candidate.score - (secondCandidate?.candidate.score ?? 0)
		).toFixed(2),
	);
	const hasStreetLevelProof =
		topCandidate.matchedSignals.includes("street_name_match");
	const hasDesignatorProof =
		topCandidate.matchedSignals.includes("portal_hint_match") ||
		topCandidate.matchedSignals.includes("designator_match");

	if (
		topCandidate.candidate.score >= EXACT_MATCH_THRESHOLD &&
		scoreGap >= 0.12 &&
		hasStreetLevelProof &&
		hasDesignatorProof
	) {
		return buildResolvedOfficialResolution({
			status: "exact_match",
			territoryAdapter: "gipuzkoa_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			selected: topCandidate,
			candidates: viableCandidates,
			extraReasonCodes: [
				"gipuzkoa_catastro_exact_match",
				`score_gap_${scoreGap}`,
			],
		});
	}

	if (
		topCandidate.candidate.score >= BUILDING_MATCH_THRESHOLD &&
		scoreGap >= 0.12
	) {
		return buildResolvedOfficialResolution({
			status: "building_match",
			territoryAdapter: "gipuzkoa_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			selected: topCandidate,
			candidates: viableCandidates,
			extraReasonCodes: [
				"gipuzkoa_catastro_building_match",
				`score_gap_${scoreGap}`,
			],
		});
	}

	return buildResolvedOfficialResolution({
		status: "needs_confirmation",
		territoryAdapter: "gipuzkoa_catastro",
		officialSource: OFFICIAL_SOURCE_LABEL,
		selected: topCandidate,
		candidates: viableCandidates,
		extraReasonCodes: [
			"gipuzkoa_catastro_confirmation_required",
			`score_gap_${scoreGap}`,
		],
	});
};
