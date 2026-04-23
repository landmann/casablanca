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
	scoreOfficialCandidate,
	sortScoredCandidates,
} from "./catastro-shared";
import type { LocalizaOfficialResolution } from "./types";

const NAVARRA_ADDRESS_WFS_URL = "https://inspire.navarra.es/services/AD/wfs";
const NAVARRA_PARCEL_WFS_URL = "https://inspire.navarra.es/services/CP/wfs";
const OFFICIAL_SOURCE_LABEL = "Registro de la Riqueza Territorial de Navarra";
const MAX_RESULTS_PER_REQUEST = 60;

interface NavarraAddressFeatureCollection {
	features?: NavarraAddressFeature[];
}

interface NavarraAddressFeature {
	id?: string;
	geometry?: {
		type?: "Point";
		coordinates?: [number, number];
	};
	properties?: {
		inspireId?: {
			localId?: string;
		};
		alternativeIdentifier?: string;
		position?: {
			specification?: {
				"@href"?: string;
			};
			geometry?: {
				type?: "Point";
				coordinates?: [number, number];
			};
		};
		locator?: {
			designator?: {
				designator?: string;
			};
		};
		component?: Array<{
			"@href"?: string;
			"@title"?: string;
		}>;
	};
}

interface NavarraParcelFeatureCollection {
	features?: NavarraParcelFeature[];
}

interface NavarraParcelFeature {
	id?: string;
	geometry?: {
		type?: "Polygon" | "MultiPolygon";
		coordinates?: number[][][] | number[][][][];
	};
	properties?: {
		nationalCadastralReference?: string;
		inspireId?: {
			localId?: string;
		};
	};
}

interface ParsedNavarraAddress {
	id: string;
	streetName?: string;
	designator?: string;
	municipality?: string;
	postalCode?: string;
	specification?: string;
	parcelRef14?: string;
	point: {
		x: number;
		y: number;
	};
}

const fetchWfsJson = async <T>(input: {
	baseUrl: string;
	params: Record<string, string>;
	signal?: AbortSignal;
}) => {
	const params = new URLSearchParams(input.params);
	const response = await fetch(`${input.baseUrl}?${params.toString()}`, {
		signal: input.signal,
		headers: {
			Accept: "application/json",
		},
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`navarra_rtn_http_${response.status}`);
	}

	return (await response.json()) as T;
};

const specificationFromHref = (href?: string) => {
	if (!href) {
		return undefined;
	}

	return href.split("/").at(-1);
};

const parseAddressComponents = (
	components: NonNullable<NavarraAddressFeature["properties"]>["component"],
) => {
	let municipality: string | undefined;
	let streetName: string | undefined;
	let postalCode: string | undefined;

	for (const component of components ?? []) {
		const href = component["@href"] ?? "";
		const title = component["@title"]?.trim();

		if (!title) {
			continue;
		}

		if (href === "ThoroughfareName") {
			streetName = title;
			continue;
		}

		if (href === "PostalDescriptor") {
			postalCode = title;
			continue;
		}

		if (
			href.includes("MUN_") ||
			(!municipality &&
				title !== "España" &&
				title !== "Comunidad Foral de Navarra")
		) {
			municipality = title;
		}
	}

	return {
		municipality,
		streetName,
		postalCode,
	};
};

const parseAddressFeatures = (
	payload: NavarraAddressFeatureCollection,
	parcels: NavarraParcelFeature[],
) => {
	const parsed = (payload.features ?? []).flatMap((feature) => {
		const properties = feature.properties;
		const pointCoordinates =
			feature.geometry?.coordinates ??
			properties?.position?.geometry?.coordinates;

		if (
			!pointCoordinates ||
			!Number.isFinite(pointCoordinates[0]) ||
			!Number.isFinite(pointCoordinates[1])
		) {
			return [];
		}

		const { municipality, streetName, postalCode } = parseAddressComponents(
			properties?.component,
		);
		const [longitude, latitude] = pointCoordinates;
		const point = convertWgs84ToWebMercator(latitude, longitude);
		const parcelRef14 =
			findContainingParcelReference(parcels, longitude, latitude) ??
			properties?.inspireId?.localId;

		return [
			{
				id:
					properties?.inspireId?.localId ??
					feature.id ??
					`${longitude},${latitude}`,
				streetName,
				designator: properties?.locator?.designator?.designator,
				municipality,
				postalCode,
				specification: specificationFromHref(
					properties?.position?.specification?.["@href"],
				),
				parcelRef14,
				point,
			} satisfies ParsedNavarraAddress,
		];
	});

	return dedupeById(parsed);
};

const pointInRing = (longitude: number, latitude: number, ring: number[][]) => {
	let inside = false;

	for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
		const [currentLng, currentLat] = ring[current] ?? [];
		const [previousLng, previousLat] = ring[previous] ?? [];

		const intersects =
			currentLat > latitude !== previousLat > latitude &&
			longitude <
				((previousLng - currentLng) * (latitude - currentLat)) /
					(previousLat - currentLat || Number.EPSILON) +
					currentLng;

		if (intersects) {
			inside = !inside;
		}
	}

	return inside;
};

const geometryContainsPoint = (
	geometry: NavarraParcelFeature["geometry"],
	longitude: number,
	latitude: number,
) => {
	if (!geometry?.coordinates) {
		return false;
	}

	if (geometry.type === "Polygon") {
		const polygonCoordinates = geometry.coordinates as number[][][] | undefined;
		return pointInRing(longitude, latitude, polygonCoordinates?.[0] ?? []);
	}

	if (geometry.type === "MultiPolygon") {
		const multiPolygonCoordinates = geometry.coordinates as
			| number[][][][]
			| undefined;
		return (multiPolygonCoordinates ?? []).some((polygon) =>
			pointInRing(longitude, latitude, polygon[0] ?? []),
		);
	}

	return false;
};

const findContainingParcelReference = (
	parcels: NavarraParcelFeature[],
	longitude: number,
	latitude: number,
) =>
	parcels.find((parcel) =>
		geometryContainsPoint(parcel.geometry, longitude, latitude),
	)?.properties?.nationalCadastralReference;

const dedupeById = <T extends { id: string }>(values: T[]) => {
	const byId = new Map<string, T>();

	for (const value of values) {
		if (!byId.has(value.id)) {
			byId.set(value.id, value);
		}
	}

	return Array.from(byId.values());
};

const fetchAddressesAndParcelsForRadius = async (input: {
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
	const bboxValue = [
		bbox.minLng,
		bbox.minLat,
		bbox.maxLng,
		bbox.maxLat,
		"EPSG:4326",
	].join(",");

	const [addressPayload, parcelPayload] = await Promise.all([
		fetchWfsJson<NavarraAddressFeatureCollection>({
			baseUrl: NAVARRA_ADDRESS_WFS_URL,
			params: {
				service: "WFS",
				request: "GetFeature",
				version: "2.0.0",
				typeNames: "AD:Address",
				count: String(MAX_RESULTS_PER_REQUEST),
				bbox: bboxValue,
				outputFormat: "application/json",
				srsName: "EPSG:4326",
			},
			signal: input.signal,
		}),
		fetchWfsJson<NavarraParcelFeatureCollection>({
			baseUrl: NAVARRA_PARCEL_WFS_URL,
			params: {
				service: "WFS",
				request: "GetFeature",
				version: "2.0.0",
				typeNames: "CP:CadastralParcel",
				count: String(MAX_RESULTS_PER_REQUEST),
				bbox: bboxValue,
				outputFormat: "application/json",
				srsName: "EPSG:4326",
			},
			signal: input.signal,
		}),
	]);

	return parseAddressFeatures(addressPayload, parcelPayload.features ?? []);
};

export const resolveNavarraCatastro = async (input: {
	signals: IdealistaSignals;
	signal?: AbortSignal;
}): Promise<LocalizaOfficialResolution> => {
	if (
		input.signals.approximateLat === undefined ||
		input.signals.approximateLng === undefined
	) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "navarra_rtn",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["navarra_rtn_missing_coordinates"],
			discardedSignals: ["approximate_coordinates"],
		});
	}

	const radii = buildSearchRadii(input.signals.mapPrecisionMeters);
	const allCandidates: ParsedNavarraAddress[] = [];

	for (const radius of radii) {
		const nextCandidates = await fetchAddressesAndParcelsForRadius({
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
			territoryAdapter: "navarra_rtn",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["navarra_rtn_no_candidates_found"],
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
						provinceName: "Navarra",
						postalCode: candidate.postalCode,
						parcelRef14: candidate.parcelRef14,
						specification: candidate.specification,
						prefillLocation: buildPrefillLocation({
							streetName: candidate.streetName,
							designator: candidate.designator,
							municipality: candidate.municipality,
							provinceName: "Navarra",
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
			territoryAdapter: "navarra_rtn",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: [
				"navarra_rtn_candidates_discarded",
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
			territoryAdapter: "navarra_rtn",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["navarra_rtn_scores_below_threshold"],
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
			territoryAdapter: "navarra_rtn",
			officialSource: OFFICIAL_SOURCE_LABEL,
			selected: topCandidate,
			candidates: viableCandidates,
			extraReasonCodes: ["navarra_rtn_exact_match", `score_gap_${scoreGap}`],
		});
	}

	if (
		topCandidate.candidate.score >= BUILDING_MATCH_THRESHOLD &&
		scoreGap >= 0.12
	) {
		return buildResolvedOfficialResolution({
			status: "building_match",
			territoryAdapter: "navarra_rtn",
			officialSource: OFFICIAL_SOURCE_LABEL,
			selected: topCandidate,
			candidates: viableCandidates,
			extraReasonCodes: [
				"navarra_rtn_building_match",
				`score_gap_${scoreGap}`,
			],
		});
	}

	return buildResolvedOfficialResolution({
		status: "needs_confirmation",
		territoryAdapter: "navarra_rtn",
		officialSource: OFFICIAL_SOURCE_LABEL,
		selected: topCandidate,
		candidates: viableCandidates,
		extraReasonCodes: [
			"navarra_rtn_confirmation_required",
			`score_gap_${scoreGap}`,
		],
	});
};
