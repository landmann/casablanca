import type {
	IdealistaSignals,
	ListingLocation,
	ResolveIdealistaLocationCandidate,
} from "@casedra/types";

import {
	buildListingSignalCorpus,
	corpusIncludesDesignator,
	corpusIncludesPhrase,
	dedupeStrings,
	distanceBetweenPoints,
	formatPostalCode,
	humanizeStreetName,
	normalizeLocalizaText,
} from "./score";
import type { LocalizaOfficialResolution } from "./types";

export const MIN_VIABLE_SCORE = 0.45;
export const BUILDING_MATCH_THRESHOLD = 0.75;
export const EXACT_MATCH_THRESHOLD = 0.9;

export interface OfficialCandidateRecord {
	id: string;
	point: {
		x: number;
		y: number;
	};
	streetName?: string;
	designator?: string;
	municipality?: string;
	provinceName?: string;
	postalCode?: string;
	parcelRef14?: string;
	unitRef20?: string;
	specification?: string;
	label?: string;
	prefillLocation?: ListingLocation;
	officialUrl?: string;
}

export interface ScoredOfficialCandidate {
	candidate: ResolveIdealistaLocationCandidate;
	matchedSignals: string[];
	discardedSignals: string[];
	streetName?: string;
	designator?: string;
	municipality?: string;
	provinceName?: string;
	postalCode?: string;
	distanceMeters?: number;
}

export const buildCandidateLabel = (candidate: {
	streetName?: string;
	designator?: string;
	postalCode?: string;
	municipality?: string;
}) => {
	const street = [
		humanizeStreetName(candidate.streetName),
		candidate.designator,
	]
		.filter(Boolean)
		.join(" ");
	const locality = [
		formatPostalCode(candidate.postalCode),
		candidate.municipality,
	]
		.filter(Boolean)
		.join(" ");

	return [street, locality].filter(Boolean).join(", ");
};

export const buildPrefillLocation = (candidate: {
	streetName?: string;
	designator?: string;
	municipality?: string;
	provinceName?: string;
	postalCode?: string;
}): ListingLocation | undefined => {
	const street = [
		humanizeStreetName(candidate.streetName),
		candidate.designator,
	]
		.filter(Boolean)
		.join(" ");
	const city = candidate.municipality;
	const stateOrProvince = candidate.provinceName;
	const postalCode = formatPostalCode(candidate.postalCode);

	if (!street || !city || !stateOrProvince || !postalCode) {
		return undefined;
	}

	return {
		street,
		city,
		stateOrProvince,
		postalCode,
		country: "Spain",
	};
};

const scoreDistance = (distanceMeters: number, expectedPrecision: number) => {
	if (distanceMeters <= expectedPrecision * 0.75) {
		return 0.25;
	}

	if (distanceMeters <= expectedPrecision * 1.5) {
		return 0.18;
	}

	if (distanceMeters <= expectedPrecision * 3) {
		return 0.1;
	}

	return 0.03;
};

const provinceMatchesHint = (
	provinceName: string | undefined,
	provinceHint: string | undefined,
) => {
	if (!provinceHint) {
		return true;
	}

	const normalizedProvince = normalizeLocalizaText(provinceName);
	const normalizedHint = normalizeLocalizaText(provinceHint);

	if (!normalizedProvince || !normalizedHint) {
		return false;
	}

	return normalizedProvince === normalizedHint;
};

export const scoreOfficialCandidate = (input: {
	candidate: OfficialCandidateRecord;
	signals: IdealistaSignals;
	centerPoint: { x: number; y: number };
	listingSignalCorpus?: string;
}) => {
	const listingSignalCorpus =
		input.listingSignalCorpus ?? buildListingSignalCorpus(input.signals);
	const { candidate, signals, centerPoint } = input;
	const matchedSignals: string[] = [];
	const discardedSignals: string[] = [];
	const normalizedMunicipalityHint = normalizeLocalizaText(signals.municipality);
	const normalizedCandidateMunicipality = normalizeLocalizaText(
		candidate.municipality,
	);

	if (
		normalizedMunicipalityHint &&
		(!normalizedCandidateMunicipality ||
			normalizedMunicipalityHint !== normalizedCandidateMunicipality)
	) {
		return null;
	}

	if (!provinceMatchesHint(candidate.provinceName, signals.province)) {
		return null;
	}

	const distanceMeters = distanceBetweenPoints(centerPoint, candidate.point);
	const expectedPrecision = Math.min(
		Math.max(signals.mapPrecisionMeters ?? 35, 20),
		120,
	);
	const streetLabel = humanizeStreetName(candidate.streetName);
	const label =
		candidate.label ||
		buildCandidateLabel({
			streetName: candidate.streetName,
			designator: candidate.designator,
			postalCode: candidate.postalCode,
			municipality: candidate.municipality,
		}) ||
		candidate.parcelRef14 ||
		candidate.id;

	let score = 0.35;
	matchedSignals.push("official_candidate");

	if (candidate.municipality && normalizedMunicipalityHint) {
		matchedSignals.push("municipality_match");
	} else if (signals.municipality) {
		discardedSignals.push("municipality");
	}

	if (signals.province) {
		matchedSignals.push("province_match");
	}

	score += scoreDistance(distanceMeters, expectedPrecision);
	matchedSignals.push("coordinate_proximity");

	if (
		signals.postalCodeHint &&
		formatPostalCode(signals.postalCodeHint) ===
			formatPostalCode(candidate.postalCode)
	) {
		score += 0.1;
		matchedSignals.push("postal_code_match");
	} else if (signals.postalCodeHint) {
		discardedSignals.push("postal_code_hint");
	}

	if (
		streetLabel &&
		(corpusIncludesPhrase(listingSignalCorpus, streetLabel) ||
			corpusIncludesPhrase(listingSignalCorpus, candidate.streetName))
	) {
		score += 0.15;
		matchedSignals.push("street_name_match");
	} else if (candidate.streetName) {
		discardedSignals.push("street_name");
	}

	if (
		signals.portalHint &&
		normalizeLocalizaText(signals.portalHint) ===
			normalizeLocalizaText(candidate.designator)
	) {
		score += 0.1;
		matchedSignals.push("portal_hint_match");
	} else if (
		corpusIncludesDesignator(
			listingSignalCorpus,
			candidate.designator,
			candidate.streetName,
		)
	) {
		score += 0.1;
		matchedSignals.push("designator_match");
	} else if (candidate.designator) {
		discardedSignals.push("designator");
	}

	if (candidate.specification?.toLowerCase() === "entrance") {
		score += 0.05;
		matchedSignals.push("entrance_level_candidate");
	}

	const reasonCodes = dedupeStrings([
		...matchedSignals,
		candidate.specification?.toLowerCase() === "entrance"
			? "official_entrance_candidate"
			: "official_candidate",
		`distance_${Math.round(distanceMeters)}m`,
	]);

	return {
		candidate: {
			id: candidate.id,
			label,
			parcelRef14: candidate.parcelRef14,
			unitRef20: candidate.unitRef20,
			officialUrl: candidate.officialUrl,
			score: Math.min(Number(score.toFixed(2)), 1),
			reasonCodes,
			distanceMeters: Number(distanceMeters.toFixed(1)),
			prefillLocation: candidate.prefillLocation,
		},
		matchedSignals: dedupeStrings(matchedSignals),
		discardedSignals: dedupeStrings(discardedSignals),
		streetName: candidate.streetName,
		designator: candidate.designator,
		municipality: candidate.municipality,
		provinceName: candidate.provinceName,
		postalCode: candidate.postalCode,
		distanceMeters: Number(distanceMeters.toFixed(1)),
	} satisfies ScoredOfficialCandidate;
};

export const sortScoredCandidates = (
	candidates: ScoredOfficialCandidate[],
) =>
	candidates.sort((left, right) => {
		if (right.candidate.score !== left.candidate.score) {
			return right.candidate.score - left.candidate.score;
		}

		return (
			(left.distanceMeters ?? Number.POSITIVE_INFINITY) -
			(right.distanceMeters ?? Number.POSITIVE_INFINITY)
		);
	});

export const buildUnresolvedOfficialResolution = (input: {
	territoryAdapter: LocalizaOfficialResolution["territoryAdapter"];
	officialSource: string;
	reasonCodes: string[];
	matchedSignals?: string[];
	discardedSignals?: string[];
	candidates?: ResolveIdealistaLocationCandidate[];
}) =>
	({
		status: "unresolved",
		confidenceScore: 0,
		officialSource: input.officialSource,
		candidates: input.candidates ?? [],
		reasonCodes: dedupeStrings(input.reasonCodes),
		matchedSignals: dedupeStrings(input.matchedSignals ?? []),
		discardedSignals: dedupeStrings(input.discardedSignals ?? []),
		territoryAdapter: input.territoryAdapter,
	}) satisfies LocalizaOfficialResolution;

export const buildResolvedOfficialResolution = (input: {
	status: LocalizaOfficialResolution["status"];
	territoryAdapter: LocalizaOfficialResolution["territoryAdapter"];
	officialSource: string;
	selected: ScoredOfficialCandidate;
	candidates: ScoredOfficialCandidate[];
	extraReasonCodes: string[];
}) =>
	({
		status: input.status,
		confidenceScore: input.selected.candidate.score,
		officialSource: input.officialSource,
		resolvedAddressLabel: input.selected.candidate.label,
		parcelRef14: input.selected.candidate.parcelRef14,
		unitRef20: input.selected.candidate.unitRef20,
		prefillLocation: input.selected.candidate.prefillLocation,
		candidates: input.candidates.map((entry) => entry.candidate),
		reasonCodes: dedupeStrings([
			...input.selected.candidate.reasonCodes,
			...input.selected.matchedSignals,
			...input.extraReasonCodes,
		]),
		matchedSignals: dedupeStrings(input.selected.matchedSignals),
		discardedSignals: dedupeStrings(input.selected.discardedSignals),
		territoryAdapter: input.territoryAdapter,
	}) satisfies LocalizaOfficialResolution;

export const buildWgs84BoundingBox = (input: {
	latitude: number;
	longitude: number;
	radiusMeters: number;
}) => {
	const latDegrees = input.radiusMeters / 111_320;
	const lngDegrees =
		input.radiusMeters /
		(Math.max(Math.cos((input.latitude * Math.PI) / 180), 0.2) * 111_320);

	return {
		minLng: input.longitude - lngDegrees,
		minLat: input.latitude - latDegrees,
		maxLng: input.longitude + lngDegrees,
		maxLat: input.latitude + latDegrees,
	};
};

interface GeoJsonPointGeometry {
	type: "Point";
	coordinates?: unknown;
}

interface GeoJsonPolygonGeometry {
	type: "Polygon";
	coordinates?: unknown;
}

interface GeoJsonMultiPolygonGeometry {
	type: "MultiPolygon";
	coordinates?: unknown;
}

type GeoJsonGeometry =
	| GeoJsonPointGeometry
	| GeoJsonPolygonGeometry
	| GeoJsonMultiPolygonGeometry;

const pushCoordinate = (
	points: Array<[number, number]>,
	coordinate?: number[],
) => {
	if (
		coordinate &&
		Number.isFinite(coordinate[0]) &&
		Number.isFinite(coordinate[1])
	) {
		points.push([coordinate[0], coordinate[1]]);
	}
};

const collectGeometryPointsFromUnknown = (
	value: unknown,
	points: Array<[number, number]>,
) => {
	if (!Array.isArray(value)) {
		return;
	}

	if (
		value.length >= 2 &&
		typeof value[0] === "number" &&
		typeof value[1] === "number"
	) {
		pushCoordinate(points, value as number[]);
		return;
	}

	for (const entry of value) {
		collectGeometryPointsFromUnknown(entry, points);
	}
};

const collectGeometryPoints = (geometry: GeoJsonGeometry): Array<[number, number]> => {
	const points: Array<[number, number]> = [];

	collectGeometryPointsFromUnknown(geometry.coordinates, points);
	return points;
};

export const getGeoJsonGeometryCenter = (geometry?: GeoJsonGeometry | null) => {
	if (!geometry) {
		return null;
	}

	const points = collectGeometryPoints(geometry);

	if (points.length === 0) {
		return null;
	}

	let minLng = Number.POSITIVE_INFINITY;
	let minLat = Number.POSITIVE_INFINITY;
	let maxLng = Number.NEGATIVE_INFINITY;
	let maxLat = Number.NEGATIVE_INFINITY;

	for (const [lng, lat] of points) {
		if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
			continue;
		}

		minLng = Math.min(minLng, lng);
		minLat = Math.min(minLat, lat);
		maxLng = Math.max(maxLng, lng);
		maxLat = Math.max(maxLat, lat);
	}

	if (
		!Number.isFinite(minLng) ||
		!Number.isFinite(minLat) ||
		!Number.isFinite(maxLng) ||
		!Number.isFinite(maxLat)
	) {
		return null;
	}

	return {
		longitude: (minLng + maxLng) / 2,
		latitude: (minLat + maxLat) / 2,
	};
};

export const repairMojibake = (value?: string) => {
	if (!value) {
		return undefined;
	}

	if (!/[ÃÂ]/.test(value)) {
		return value;
	}

	try {
		return Buffer.from(value, "latin1").toString("utf8");
	} catch {
		return value;
	}
};

export const stripHtml = (value: string) =>
	value
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, '"')
		.replace(/&apos;/gi, "'")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/\s+/g, " ")
		.trim();
