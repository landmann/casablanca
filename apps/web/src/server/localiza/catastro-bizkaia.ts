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

const BIZKAIA_ANNEX1_REST_URL =
	"https://geo.bizkaia.eus/arcgisserverinspire/rest/services/Catastro/Annex1/MapServer";
const OFFICIAL_SOURCE_LABEL = "Catastro de Bizkaia";
const MAX_RESULTS_PER_REQUEST = 60;

interface ArcGisFeature<TAttributes> {
	attributes?: TAttributes;
	geometry?: {
		x?: number;
		y?: number;
	};
}

interface ArcGisQueryResponse<TAttributes> {
	features?: Array<ArcGisFeature<TAttributes>>;
}

interface BizkaiaAddressPositionAttributes {
	OBJECTID: number;
	IFCID: number;
	RID: number;
}

interface BizkaiaAddressAttributes {
	IFCID: number;
	id_localId?: string;
}

interface BizkaiaAddressComponentLinkAttributes {
	ID1: number;
	ID2: number;
}

interface BizkaiaComponentAttributes {
	IFCID: number;
	STYPE: number;
	postCode?: string;
}

interface BizkaiaComponentNameAttributes {
	RID: number;
	name?: string;
}

interface BizkaiaAddressParcelLinkAttributes {
	ID1: number;
	ID2: number;
}

interface BizkaiaParcelAttributes {
	IFCID: number;
	nationalCadastralRef?: string;
	label?: string;
}

interface ParsedBizkaiaAddress {
	id: string;
	streetName?: string;
	designator?: string;
	municipality?: string;
	postalCode?: string;
	parcelRef14?: string;
	point: {
		x: number;
		y: number;
	};
}

const fetchArcGisJson = async <T>(input: {
	path: string;
	params?: Record<string, string>;
	signal?: AbortSignal;
}) => {
	const url = new URL(`${BIZKAIA_ANNEX1_REST_URL}/${input.path}`);

	for (const [key, value] of Object.entries(input.params ?? {})) {
		url.searchParams.set(key, value);
	}

	url.searchParams.set("f", "json");

	const response = await fetch(url, {
		signal: input.signal,
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`bizkaia_catastro_http_${response.status}`);
	}

	return (await response.json()) as T;
};

const chunk = <T>(values: T[], size: number) => {
	const output: T[][] = [];

	for (let index = 0; index < values.length; index += size) {
		output.push(values.slice(index, index + size));
	}

	return output;
};

const buildNumberWhereClause = (field: string, values: number[]) =>
	values.length === 1
		? `${field} = ${values[0]}`
		: `${field} in (${values.join(",")})`;

const queryTableRows = async <TAttributes>(input: {
	path: string;
	field: string;
	values: number[];
	outFields: string[];
	signal?: AbortSignal;
}) => {
	if (input.values.length === 0) {
		return [] as Array<ArcGisFeature<TAttributes>>;
	}

	const resultSets = await Promise.all(
		chunk(input.values, 50).map(async (valueChunk) =>
			await fetchArcGisJson<ArcGisQueryResponse<TAttributes>>({
				path: `${input.path}/query`,
				params: {
					where: buildNumberWhereClause(input.field, valueChunk),
					outFields: input.outFields.join(","),
					returnGeometry: "false",
				},
				signal: input.signal,
			}),
		),
	);

	return resultSets.flatMap((result) => result.features ?? []);
};

const queryNearbyAddressPositions = async (input: {
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

	const payload = await fetchArcGisJson<
		ArcGisQueryResponse<BizkaiaAddressPositionAttributes>
	>({
		path: "9/query",
		params: {
			geometry: [
				bbox.minLng,
				bbox.minLat,
				bbox.maxLng,
				bbox.maxLat,
			].join(","),
			geometryType: "esriGeometryEnvelope",
			inSR: "4326",
			spatialRel: "esriSpatialRelIntersects",
			outFields: "OBJECTID,IFCID,RID",
			returnGeometry: "true",
			resultRecordCount: String(MAX_RESULTS_PER_REQUEST),
		},
		signal: input.signal,
	});

	return payload.features ?? [];
};

const cleanBizkaiaStreetName = (value?: string) => {
	const normalized = (value ?? "")
		.replace(/\\+/g, " ")
		.replace(/\(\d+\)/g, "")
		.trim();

	return normalized || undefined;
};

const normalizeBizkaiaDesignator = (value?: string) => {
	const normalized = (value ?? "").trim();

	if (!normalized) {
		return undefined;
	}

	const match = normalized.match(/^0*([0-9]+)([A-Za-z]+)?$/);

	if (!match) {
		return normalized;
	}

	return `${Number(match[1])}${match[2] ?? ""}`;
};

const dedupeByObjectId = (
	features: Array<ArcGisFeature<BizkaiaAddressPositionAttributes>>,
) => {
	const byId = new Map<number, ArcGisFeature<BizkaiaAddressPositionAttributes>>();

	for (const feature of features) {
		const objectId = feature.attributes?.OBJECTID;

		if (objectId !== undefined && !byId.has(objectId)) {
			byId.set(objectId, feature);
		}
	}

	return Array.from(byId.values());
};

const mapByField = <TAttributes extends object>(
	features: Array<ArcGisFeature<TAttributes>>,
	field: keyof TAttributes,
) => {
	const output = new Map<number, TAttributes>();

	for (const feature of features) {
		const key = feature.attributes?.[field];

		if (typeof key === "number" && feature.attributes) {
			output.set(key, feature.attributes);
		}
	}

	return output;
};

const groupByField = <TAttributes extends object>(
	features: Array<ArcGisFeature<TAttributes>>,
	field: keyof TAttributes,
) => {
	const output = new Map<number, TAttributes[]>();

	for (const feature of features) {
		const key = feature.attributes?.[field];

		if (typeof key !== "number" || !feature.attributes) {
			continue;
		}

		const existing = output.get(key) ?? [];
		existing.push(feature.attributes);
		output.set(key, existing);
	}

	return output;
};

const parseDesignatorFromLocalId = (localId?: string) =>
	normalizeBizkaiaDesignator(localId?.split(".").at(-1));

const buildParsedAddresses = (input: {
	positions: Array<ArcGisFeature<BizkaiaAddressPositionAttributes>>;
	addressesByIfcId: Map<number, BizkaiaAddressAttributes>;
	componentLinksByAddressIfcId: Map<number, BizkaiaAddressComponentLinkAttributes[]>;
	componentsByIfcId: Map<number, BizkaiaComponentAttributes>;
	componentNamesByComponentIfcId: Map<number, BizkaiaComponentNameAttributes[]>;
	parcelLinksByAddressIfcId: Map<number, BizkaiaAddressParcelLinkAttributes[]>;
	parcelsByIfcId: Map<number, BizkaiaParcelAttributes>;
}) =>
	input.positions.flatMap((feature) => {
		const attributes = feature.attributes;
		const longitude = feature.geometry?.x;
		const latitude = feature.geometry?.y;

		if (
			!attributes ||
			typeof longitude !== "number" ||
			typeof latitude !== "number" ||
			!Number.isFinite(longitude) ||
			!Number.isFinite(latitude)
		) {
			return [];
		}

		const address = input.addressesByIfcId.get(attributes.IFCID);
		const componentLinks =
			input.componentLinksByAddressIfcId.get(attributes.IFCID) ?? [];
		const components = componentLinks
			.map((link) => input.componentsByIfcId.get(link.ID2))
			.filter(Boolean);
		const municipalityComponent = components.find(
			(component) => component?.STYPE === 16,
		);
		const postalComponent = components.find(
			(component) => component?.STYPE === 15,
		);
		const streetComponent = components.find(
			(component) => component?.STYPE === 14,
		);
		const municipality = (
			input.componentNamesByComponentIfcId.get(
				municipalityComponent?.IFCID ?? -1,
			)?.[0]?.name ?? ""
		).trim();
		const streetName = cleanBizkaiaStreetName(
			input.componentNamesByComponentIfcId.get(streetComponent?.IFCID ?? -1)?.[0]
				?.name,
		);
		const parcelLink = (
			input.parcelLinksByAddressIfcId.get(attributes.IFCID) ?? []
		)[0];
		const parcel = parcelLink
			? input.parcelsByIfcId.get(parcelLink.ID2)
			: undefined;

		return [
			{
				id: address?.id_localId ?? String(attributes.IFCID),
				streetName,
				designator: parseDesignatorFromLocalId(address?.id_localId),
				municipality: municipality || undefined,
				postalCode: postalComponent?.postCode,
				parcelRef14:
					parcel?.nationalCadastralRef ?? parcel?.label ?? undefined,
				point: convertWgs84ToWebMercator(latitude, longitude),
			} satisfies ParsedBizkaiaAddress,
		];
	});

export const resolveBizkaiaCatastro = async (input: {
	signals: IdealistaSignals;
	signal?: AbortSignal;
}): Promise<LocalizaOfficialResolution> => {
	if (
		input.signals.approximateLat === undefined ||
		input.signals.approximateLng === undefined
	) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "bizkaia_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["bizkaia_catastro_missing_coordinates"],
			discardedSignals: ["approximate_coordinates"],
		});
	}

	const radii = buildSearchRadii(input.signals.mapPrecisionMeters);
	const allPositions: Array<ArcGisFeature<BizkaiaAddressPositionAttributes>> = [];

	for (const radius of radii) {
		const nextPositions = await queryNearbyAddressPositions({
			latitude: input.signals.approximateLat,
			longitude: input.signals.approximateLng,
			radiusMeters: radius,
			signal: input.signal,
		});

		allPositions.push(...nextPositions);

		if (dedupeByObjectId(allPositions).length >= 6) {
			break;
		}
	}

	const positions = dedupeByObjectId(allPositions);

	if (positions.length === 0) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "bizkaia_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["bizkaia_catastro_no_candidates_found"],
			matchedSignals: ["official_source_reached"],
			discardedSignals: ["official_candidates"],
		});
	}

	const addressIfcIds = dedupeNumbers(
		positions.flatMap((feature) =>
			feature.attributes?.IFCID !== undefined ? [feature.attributes.IFCID] : [],
		),
	);
	const [addressRows, componentLinkRows, parcelLinkRows] = await Promise.all([
		queryTableRows<BizkaiaAddressAttributes>({
			path: "16",
			field: "IFCID",
			values: addressIfcIds,
			outFields: ["IFCID", "id_localId"],
			signal: input.signal,
		}),
		queryTableRows<BizkaiaAddressComponentLinkAttributes>({
			path: "10",
			field: "ID1",
			values: addressIfcIds,
			outFields: ["ID1", "ID2"],
			signal: input.signal,
		}),
		queryTableRows<BizkaiaAddressParcelLinkAttributes>({
			path: "15",
			field: "ID1",
			values: addressIfcIds,
			outFields: ["ID1", "ID2"],
			signal: input.signal,
		}),
	]);

	const componentIfcIds = dedupeNumbers(
		componentLinkRows.flatMap((feature) =>
			feature.attributes?.ID2 !== undefined ? [feature.attributes.ID2] : [],
		),
	);
	const parcelIfcIds = dedupeNumbers(
		parcelLinkRows.flatMap((feature) =>
			feature.attributes?.ID2 !== undefined ? [feature.attributes.ID2] : [],
		),
	);
	const [componentRows, componentNameRows, parcelRows] = await Promise.all([
		queryTableRows<BizkaiaComponentAttributes>({
			path: "25",
			field: "IFCID",
			values: componentIfcIds,
			outFields: ["IFCID", "STYPE", "postCode"],
			signal: input.signal,
		}),
		queryTableRows<BizkaiaComponentNameAttributes>({
			path: "21",
			field: "RID",
			values: componentIfcIds,
			outFields: ["RID", "name"],
			signal: input.signal,
		}),
		queryTableRows<BizkaiaParcelAttributes>({
			path: "8",
			field: "IFCID",
			values: parcelIfcIds,
			outFields: ["IFCID", "nationalCadastralRef", "label"],
			signal: input.signal,
		}),
	]);

	const parsedCandidates = buildParsedAddresses({
		positions,
		addressesByIfcId: mapByField<BizkaiaAddressAttributes>(addressRows, "IFCID"),
		componentLinksByAddressIfcId: groupByField<BizkaiaAddressComponentLinkAttributes>(
			componentLinkRows,
			"ID1",
		),
		componentsByIfcId: mapByField<BizkaiaComponentAttributes>(
			componentRows,
			"IFCID",
		),
		componentNamesByComponentIfcId: groupByField<BizkaiaComponentNameAttributes>(
			componentNameRows,
			"RID",
		),
		parcelLinksByAddressIfcId: groupByField<BizkaiaAddressParcelLinkAttributes>(
			parcelLinkRows,
			"ID1",
		),
		parcelsByIfcId: mapByField<BizkaiaParcelAttributes>(parcelRows, "IFCID"),
	});

	if (parsedCandidates.length === 0) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "bizkaia_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["bizkaia_catastro_candidates_unreadable"],
			matchedSignals: ["official_candidates_found"],
			discardedSignals: ["official_candidate_details"],
		});
	}

	const centerPoint = convertWgs84ToWebMercator(
		input.signals.approximateLat,
		input.signals.approximateLng,
	);
	const scoredCandidates = sortScoredCandidates(
		parsedCandidates
			.map((candidate) =>
				scoreOfficialCandidate({
					candidate: {
						id: candidate.id,
						point: candidate.point,
						streetName: candidate.streetName,
						designator: candidate.designator,
						municipality: candidate.municipality,
						provinceName: "Bizkaia",
						postalCode: candidate.postalCode,
						parcelRef14: candidate.parcelRef14,
						prefillLocation: buildPrefillLocation({
							streetName: candidate.streetName,
							designator: candidate.designator,
							municipality: candidate.municipality,
							provinceName: "Bizkaia",
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
			territoryAdapter: "bizkaia_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: [
				"bizkaia_catastro_candidates_discarded",
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
			territoryAdapter: "bizkaia_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			reasonCodes: ["bizkaia_catastro_scores_below_threshold"],
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
			territoryAdapter: "bizkaia_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			selected: topCandidate,
			candidates: viableCandidates,
			extraReasonCodes: [
				"bizkaia_catastro_exact_match",
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
			territoryAdapter: "bizkaia_catastro",
			officialSource: OFFICIAL_SOURCE_LABEL,
			selected: topCandidate,
			candidates: viableCandidates,
			extraReasonCodes: [
				"bizkaia_catastro_building_match",
				`score_gap_${scoreGap}`,
			],
		});
	}

	return buildResolvedOfficialResolution({
		status: "needs_confirmation",
		territoryAdapter: "bizkaia_catastro",
		officialSource: OFFICIAL_SOURCE_LABEL,
		selected: topCandidate,
		candidates: viableCandidates,
		extraReasonCodes: [
			"bizkaia_catastro_confirmation_required",
			`score_gap_${scoreGap}`,
		],
	});
};

const dedupeNumbers = (values: number[]) => Array.from(new Set(values));
