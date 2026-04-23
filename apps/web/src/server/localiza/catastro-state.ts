import type {
	IdealistaSignals,
	ListingLocation,
	ResolveIdealistaLocationCandidate,
} from "@casedra/types";

import {
	buildListingSignalCorpus,
	buildSearchRadii,
	convertWgs84ToWebMercator,
	corpusIncludesDesignator,
	corpusIncludesPhrase,
	dedupeStrings,
	detectRegionalTerritory,
	distanceBetweenPoints,
	formatPostalCode,
	getProvinceNameFromCode,
	humanizePlaceName,
	humanizeStreetName,
	normalizeLocalizaText,
	provinceMatchesHint,
} from "./score";
import { resolveAlavaCatastro } from "./catastro-alava";
import { resolveBizkaiaCatastro } from "./catastro-bizkaia";
import { resolveGipuzkoaCatastro } from "./catastro-gipuzkoa";
import { resolveNavarraCatastro } from "./catastro-navarra";
import type { LocalizaOfficialResolution } from "./types";

const CATASTRO_WFS_URL = "https://ovc.catastro.meh.es/INSPIRE/wfsAD.aspx";
const OFFICIAL_SOURCE_LABEL = "Dirección General del Catastro";
const REGIONAL_OFFICIAL_SOURCES: Record<string, string> = {
	navarra_rtn: "Registro de la Riqueza Territorial de Navarra",
	alava_catastro: "Catastro de Alava",
	bizkaia_catastro: "Catastro de Bizkaia",
	gipuzkoa_catastro: "Catastro de Gipuzkoa",
};
const MAX_RESULTS_PER_REQUEST = 60;
const MIN_VIABLE_SCORE = 0.45;
const BUILDING_MATCH_THRESHOLD = 0.75;
const EXACT_MATCH_THRESHOLD = 0.9;

interface CatastroComponentMaps {
	thoroughfares: Map<string, string>;
	postalCodes: Map<string, string>;
	adminUnits: Map<
		string,
		{
			municipality?: string;
			provinceCode?: string;
			provinceName?: string;
		}
	>;
}

interface ParsedCatastroAddress {
	id: string;
	localId: string;
	parcelRef14?: string;
	specification?: string;
	designator?: string;
	streetName?: string;
	municipality?: string;
	provinceCode?: string;
	provinceName?: string;
	postalCode?: string;
	point: {
		x: number;
		y: number;
	};
}

interface ScoredCatastroCandidate {
	candidate: ResolveIdealistaLocationCandidate;
	matchedSignals: string[];
	discardedSignals: string[];
	specification?: string;
	streetName?: string;
	designator?: string;
	municipality?: string;
	provinceName?: string;
	postalCode?: string;
	distanceMeters?: number;
}

const decodeXmlEntities = (value?: string) => {
	if (!value) {
		return undefined;
	}

	return value
		.replace(/&amp;/g, "&")
		.replace(/&apos;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&#(\d+);/g, (_, code: string) =>
			String.fromCharCode(Number(code)),
		)
		.replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
			String.fromCharCode(parseInt(code, 16)),
		);
};

const collectFeatureBlocks = (xml: string, tagName: string) => {
	const matcher = new RegExp(
		`<${tagName}[^>]*gml:id="([^"]+)"[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
		"g",
	);

	const matches: Array<{ id: string; body: string }> = [];

	for (const match of xml.matchAll(matcher)) {
		matches.push({
			id: match[1],
			body: match[2],
		});
	}

	return matches;
};

const readSingleTag = (body: string, tagName: string) => {
	const match = body.match(
		new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`),
	);
	return decodeXmlEntities(match?.[1]?.trim());
};

const readLocatorDesignator = (body: string) => {
	const match = body.match(
		/<ad:LocatorDesignator>[\s\S]*?<ad:designator>([\s\S]*?)<\/ad:designator>[\s\S]*?<\/ad:LocatorDesignator>/,
	);
	return decodeXmlEntities(match?.[1]?.trim());
};

const readComponentRefs = (body: string) => {
	const componentMatcher = /<ad:component xlink:href="#([^"]+)"\s*\/>/g;
	const refs: string[] = [];

	for (const match of body.matchAll(componentMatcher)) {
		refs.push(match[1]);
	}

	return refs;
};

const parseComponentMaps = (xml: string): CatastroComponentMaps => {
	const thoroughfares = new Map<string, string>();
	const postalCodes = new Map<string, string>();
	const adminUnits = new Map<
		string,
		{
			municipality?: string;
			provinceCode?: string;
			provinceName?: string;
		}
	>();

	for (const feature of collectFeatureBlocks(xml, "ad:ThoroughfareName")) {
		const streetName = readSingleTag(feature.body, "gn:text");

		if (streetName) {
			thoroughfares.set(feature.id, streetName);
		}
	}

	for (const feature of collectFeatureBlocks(xml, "ad:PostalDescriptor")) {
		const postalCode = formatPostalCode(
			readSingleTag(feature.body, "ad:postCode"),
		);

		if (postalCode) {
			postalCodes.set(feature.id, postalCode);
		}
	}

	for (const feature of collectFeatureBlocks(xml, "ad:AdminUnitName")) {
		const localId = readSingleTag(feature.body, "base:localId");
		const municipality = humanizePlaceName(
			readSingleTag(feature.body, "gn:text"),
		);
		const provinceCode = localId?.split(".")[0];

		adminUnits.set(feature.id, {
			municipality,
			provinceCode,
			provinceName: getProvinceNameFromCode(provinceCode),
		});
	}

	return {
		thoroughfares,
		postalCodes,
		adminUnits,
	};
};

const parseAddressFeatures = (xml: string): ParsedCatastroAddress[] => {
	const components = parseComponentMaps(xml);
	const features = collectFeatureBlocks(xml, "ad:Address");
	const parsedAddresses: Array<ParsedCatastroAddress | null> = features.map(
		(feature): ParsedCatastroAddress | null => {
			const localId = readSingleTag(feature.body, "base:localId") ?? feature.id;
			const designator = readLocatorDesignator(feature.body);
			const specification = readSingleTag(feature.body, "ad:specification");
			const position = readSingleTag(feature.body, "gml:pos");
			const [xValue, yValue] = (position ?? "").split(/\s+/);
			const x = Number(xValue);
			const y = Number(yValue);

			if (!Number.isFinite(x) || !Number.isFinite(y)) {
				return null;
			}

			const componentRefs = readComponentRefs(feature.body);
			const streetName = componentRefs
				.map((ref) => components.thoroughfares.get(ref))
				.find(Boolean);
			const postalCode = componentRefs
				.map((ref) => components.postalCodes.get(ref))
				.find(Boolean);
			const adminUnit = componentRefs
				.map((ref) => components.adminUnits.get(ref))
				.find(Boolean);

			return {
				id: feature.id,
				localId,
				parcelRef14: localId.split(".").at(-1),
				specification,
				designator,
				streetName,
				municipality: adminUnit?.municipality,
				provinceCode: adminUnit?.provinceCode,
				provinceName: adminUnit?.provinceName,
				postalCode,
				point: { x, y },
			};
		},
	);

	return parsedAddresses.filter(
		(entry): entry is ParsedCatastroAddress => entry !== null,
	);
};

const buildCandidateLabel = (candidate: {
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

const buildPrefillLocation = (candidate: {
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

const fetchCandidatesForRadius = async (input: {
	centerX: number;
	centerY: number;
	radiusMeters: number;
	signal?: AbortSignal;
}) => {
	const params = new URLSearchParams({
		service: "WFS",
		version: "2.0.0",
		request: "GetFeature",
		typeNames: "ad:Address",
		count: String(MAX_RESULTS_PER_REQUEST),
		bbox: [
			input.centerX - input.radiusMeters,
			input.centerY - input.radiusMeters,
			input.centerX + input.radiusMeters,
			input.centerY + input.radiusMeters,
			"urn:ogc:def:crs:EPSG::3857",
		].join(","),
		srsname: "urn:ogc:def:crs:EPSG::3857",
	});

	const response = await fetch(`${CATASTRO_WFS_URL}?${params.toString()}`, {
		signal: input.signal,
		headers: {
			Accept: "application/xml, text/xml;q=0.9, */*;q=0.8",
			"User-Agent": "Mozilla/5.0 (compatible; Casedra Localiza/1.0)",
		},
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`state_catastro_http_${response.status}`);
	}

	const xml = await response.text();

	if (xml.includes("No se han encontrado inmuebles en la caja especificada")) {
		return [];
	}

	if (xml.includes("<Exception")) {
		throw new Error("state_catastro_exception");
	}

	return parseAddressFeatures(xml);
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

const scoreCandidate = (input: {
	candidate: ParsedCatastroAddress;
	signals: IdealistaSignals;
	centerPoint: { x: number; y: number };
	listingSignalCorpus: string;
}): ScoredCatastroCandidate | null => {
	const { candidate, signals, centerPoint, listingSignalCorpus } = input;
	const matchedSignals: string[] = [];
	const discardedSignals: string[] = [];
	const normalizedMunicipalityHint = normalizeLocalizaText(
		signals.municipality,
	);
	const normalizedCandidateMunicipality = normalizeLocalizaText(
		candidate.municipality,
	);

	if (
		normalizedMunicipalityHint &&
		normalizedCandidateMunicipality &&
		normalizedMunicipalityHint !== normalizedCandidateMunicipality
	) {
		return null;
	}

	if (!provinceMatchesHint(candidate.provinceCode, signals.province)) {
		return null;
	}

	const distanceMeters = distanceBetweenPoints(centerPoint, candidate.point);
	const expectedPrecision = Math.min(
		Math.max(signals.mapPrecisionMeters ?? 35, 20),
		120,
	);
	const streetLabel = humanizeStreetName(candidate.streetName);
	const prefillLocation = buildPrefillLocation(candidate);
	const label = buildCandidateLabel(candidate);

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
			: "official_parcel_candidate",
		`distance_${Math.round(distanceMeters)}m`,
	]);

	return {
		candidate: {
			id: candidate.id,
			label,
			parcelRef14: candidate.parcelRef14,
			score: Math.min(Number(score.toFixed(2)), 1),
			reasonCodes,
			distanceMeters: Number(distanceMeters.toFixed(1)),
			prefillLocation,
		},
		matchedSignals: dedupeStrings(matchedSignals),
		discardedSignals: dedupeStrings(discardedSignals),
		specification: candidate.specification,
		streetName: candidate.streetName,
		designator: candidate.designator,
		municipality: candidate.municipality,
		provinceName: candidate.provinceName,
		postalCode: candidate.postalCode,
		distanceMeters: Number(distanceMeters.toFixed(1)),
	};
};

const dedupeByCandidateId = (candidates: ParsedCatastroAddress[]) => {
	const byId = new Map<string, ParsedCatastroAddress>();

	for (const candidate of candidates) {
		if (!byId.has(candidate.id)) {
			byId.set(candidate.id, candidate);
		}
	}

	return Array.from(byId.values());
};

const buildUnresolvedOfficialResolution = (input: {
	territoryAdapter: LocalizaOfficialResolution["territoryAdapter"];
	reasonCodes: string[];
	matchedSignals?: string[];
	discardedSignals?: string[];
	officialSource?: string;
}): LocalizaOfficialResolution => ({
	status: "unresolved",
	confidenceScore: 0,
	officialSource: input.officialSource ?? OFFICIAL_SOURCE_LABEL,
	candidates: [],
	reasonCodes: dedupeStrings(input.reasonCodes),
	matchedSignals: dedupeStrings(input.matchedSignals ?? []),
	discardedSignals: dedupeStrings(input.discardedSignals ?? []),
	territoryAdapter: input.territoryAdapter,
});

const buildResolvedOfficialResolution = (input: {
	status: LocalizaOfficialResolution["status"];
	selected: ScoredCatastroCandidate;
	candidates: ScoredCatastroCandidate[];
	territoryAdapter: LocalizaOfficialResolution["territoryAdapter"];
	extraReasonCodes: string[];
}) =>
	({
		status: input.status,
		confidenceScore: input.selected.candidate.score,
		officialSource: OFFICIAL_SOURCE_LABEL,
		resolvedAddressLabel: input.selected.candidate.label,
		parcelRef14: input.selected.candidate.parcelRef14,
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

export const resolveStateCatastro = async (input: {
	signals: IdealistaSignals;
	signal?: AbortSignal;
}): Promise<LocalizaOfficialResolution> => {
	const regionalTerritory = await detectRegionalTerritory({
		provinceHint: input.signals.province,
		approximateLat: input.signals.approximateLat,
		approximateLng: input.signals.approximateLng,
		signal: input.signal,
	});

	if (regionalTerritory) {
		const regionalResolution = await (() => {
			switch (regionalTerritory.adapter) {
				case "navarra_rtn":
					return resolveNavarraCatastro(input);
				case "alava_catastro":
					return resolveAlavaCatastro(input);
				case "bizkaia_catastro":
					return resolveBizkaiaCatastro(input);
				case "gipuzkoa_catastro":
					return resolveGipuzkoaCatastro(input);
				default:
					return Promise.resolve(
						buildUnresolvedOfficialResolution({
							territoryAdapter: regionalTerritory.adapter,
							reasonCodes: [
								"regional_cadastre_required",
								`${regionalTerritory.adapter}_unsupported`,
							],
							matchedSignals: ["territory_routed"],
							discardedSignals: ["state_catastro"],
							officialSource:
								REGIONAL_OFFICIAL_SOURCES[regionalTerritory.adapter] ??
								OFFICIAL_SOURCE_LABEL,
						}),
					);
			}
		})();

		return {
			...regionalResolution,
			reasonCodes: dedupeStrings([
				"regional_cadastre_required",
				...regionalResolution.reasonCodes,
			]),
			matchedSignals: dedupeStrings([
				"territory_routed",
				regionalTerritory.source === "coordinates"
					? "territory_routed_by_coordinates"
					: "territory_routed_by_province_hint",
				...regionalResolution.matchedSignals,
			]),
			discardedSignals: dedupeStrings([
				"state_catastro",
				...regionalResolution.discardedSignals,
			]),
		};
	}

	if (
		input.signals.approximateLat === undefined ||
		input.signals.approximateLng === undefined
	) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "state_catastro",
			reasonCodes: ["state_catastro_missing_coordinates"],
			discardedSignals: ["approximate_coordinates"],
		});
	}

	const centerPoint = convertWgs84ToWebMercator(
		input.signals.approximateLat,
		input.signals.approximateLng,
	);
	const listingSignalCorpus = buildListingSignalCorpus(input.signals);
	const radii = buildSearchRadii(input.signals.mapPrecisionMeters);
	const allCandidates: ParsedCatastroAddress[] = [];

	for (const radius of radii) {
		const nextCandidates = await fetchCandidatesForRadius({
			centerX: centerPoint.x,
			centerY: centerPoint.y,
			radiusMeters: radius,
			signal: input.signal,
		});

		allCandidates.push(...nextCandidates);

		if (dedupeByCandidateId(allCandidates).length >= 6) {
			break;
		}
	}

	const dedupedCandidates = dedupeByCandidateId(allCandidates);

	if (dedupedCandidates.length === 0) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "state_catastro",
			reasonCodes: ["state_catastro_no_candidates_found"],
			matchedSignals: ["official_source_reached"],
			discardedSignals: ["official_candidates"],
		});
	}

	const scoredCandidates = dedupedCandidates
		.map((candidate) =>
			scoreCandidate({
				candidate,
				signals: input.signals,
				centerPoint,
				listingSignalCorpus,
			}),
		)
		.filter((entry): entry is ScoredCatastroCandidate => Boolean(entry))
		.sort((left, right) => {
			if (right.candidate.score !== left.candidate.score) {
				return right.candidate.score - left.candidate.score;
			}

			return (
				(left.distanceMeters ?? Number.POSITIVE_INFINITY) -
				(right.distanceMeters ?? Number.POSITIVE_INFINITY)
			);
		});

	if (scoredCandidates.length === 0) {
		return buildUnresolvedOfficialResolution({
			territoryAdapter: "state_catastro",
			reasonCodes: [
				"state_catastro_candidates_discarded",
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
			territoryAdapter: "state_catastro",
			reasonCodes: ["state_catastro_scores_below_threshold"],
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
			selected: topCandidate,
			candidates: viableCandidates,
			territoryAdapter: "state_catastro",
			extraReasonCodes: ["state_catastro_exact_match", `score_gap_${scoreGap}`],
		});
	}

	if (
		topCandidate.candidate.score >= BUILDING_MATCH_THRESHOLD &&
		scoreGap >= 0.12
	) {
		return buildResolvedOfficialResolution({
			status: "building_match",
			selected: topCandidate,
			candidates: viableCandidates,
			territoryAdapter: "state_catastro",
			extraReasonCodes: [
				"state_catastro_building_match",
				`score_gap_${scoreGap}`,
			],
		});
	}

	return buildResolvedOfficialResolution({
		status: "needs_confirmation",
		selected: topCandidate,
		candidates: viableCandidates,
		territoryAdapter: "state_catastro",
		extraReasonCodes: [
			"state_catastro_confirmation_required",
			`score_gap_${scoreGap}`,
		],
	});
};
