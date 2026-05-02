export type LocalizaMarketObservationImportInput = {
	propertyHistoryKey: string;
	portal: string;
	observedAt: string;
	askingPrice?: number;
	currencyCode?: "EUR";
	advertiserName?: string;
	agencyName?: string;
	sourceUrl?: string;
	daysPublished?: number;
	firstSeenAt?: string;
	lastSeenAt?: string;
	provenanceLabel: string;
	provenanceUrl?: string;
	sourceRecordId?: string;
};

export type NormalizedLocalizaMarketObservation = {
	observationKey: string;
	propertyHistoryKey: string;
	portal: string;
	observedAt: string;
	askingPrice?: number;
	currencyCode?: "EUR";
	advertiserName?: string;
	agencyName?: string;
	sourceUrl?: string;
	daysPublished?: number;
	firstSeenAt?: string;
	lastSeenAt?: string;
	provenanceLabel: string;
	provenanceUrl?: string;
	sourceRecordId?: string;
};

export const cleanOptionalText = (value?: string) => {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
};

export const requireLocalizaMarketObservationText = (
	value: string,
	fieldName: string,
) => {
	const trimmed = value.trim();
	if (!trimmed) {
		throw new Error(`${fieldName}_required`);
	}
	return trimmed;
};

const normalizeMarketPortal = (portal: string) =>
	requireLocalizaMarketObservationText(portal, "portal").toUpperCase();

const normalizeMarketUrl = (sourceUrl?: string) => {
	const cleanedUrl = cleanOptionalText(sourceUrl);
	if (!cleanedUrl) {
		return undefined;
	}

	try {
		const parsedUrl = new URL(cleanedUrl);
		parsedUrl.hash = "";
		parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
		parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "") || "/";
		return parsedUrl.toString().replace(/\/$/, "").toLowerCase();
	} catch {
		return cleanedUrl.replace(/\/+$/, "").toLowerCase();
	}
};

const normalizeIsoDate = (value: string, fieldName: string) => {
	const timestamp = Date.parse(value);
	if (!Number.isFinite(timestamp)) {
		throw new Error(`${fieldName}_invalid`);
	}
	return new Date(timestamp).toISOString();
};

const normalizeOptionalIsoDate = (value: string | undefined, fieldName: string) =>
	value ? normalizeIsoDate(value, fieldName) : undefined;

const normalizeOptionalMoney = (value?: number) => {
	if (value === undefined) {
		return undefined;
	}

	if (!Number.isFinite(value) || value < 0) {
		throw new Error("asking_price_invalid");
	}

	return Math.round(value);
};

const normalizeOptionalDays = (value?: number) => {
	if (value === undefined) {
		return undefined;
	}

	if (!Number.isFinite(value) || value < 1) {
		throw new Error("days_published_invalid");
	}

	return Math.round(value);
};

const buildMarketObservationKey = (input: {
	propertyHistoryKey: string;
	portal: string;
	sourceUrl?: string;
	sourceRecordId?: string;
	observedAt: string;
	askingPrice?: number;
	advertiserName?: string;
	agencyName?: string;
}) =>
	[
		input.propertyHistoryKey,
		input.portal,
		normalizeMarketUrl(input.sourceUrl) ??
			cleanOptionalText(input.sourceRecordId) ??
			input.observedAt,
		input.askingPrice ?? "no-price",
		cleanOptionalText(input.agencyName ?? input.advertiserName) ?? "no-party",
	].join("|");

export const normalizeLocalizaMarketObservation = (
	input: LocalizaMarketObservationImportInput,
): NormalizedLocalizaMarketObservation => {
	const propertyHistoryKey = requireLocalizaMarketObservationText(
		input.propertyHistoryKey,
		"property_history_key",
	);
	const portal = normalizeMarketPortal(input.portal);
	const observedAt = normalizeIsoDate(input.observedAt, "observed_at");
	const firstSeenAt = normalizeOptionalIsoDate(
		cleanOptionalText(input.firstSeenAt),
		"first_seen_at",
	);
	const lastSeenAt = normalizeOptionalIsoDate(
		cleanOptionalText(input.lastSeenAt),
		"last_seen_at",
	);

	if (
		firstSeenAt &&
		lastSeenAt &&
		Date.parse(lastSeenAt) < Date.parse(firstSeenAt)
	) {
		throw new Error("last_seen_before_first_seen");
	}

	const askingPrice = normalizeOptionalMoney(input.askingPrice);
	const daysPublished = normalizeOptionalDays(input.daysPublished);
	const sourceUrl = cleanOptionalText(input.sourceUrl);
	const provenanceUrl = cleanOptionalText(input.provenanceUrl);
	const sourceRecordId = cleanOptionalText(input.sourceRecordId);
	const advertiserName = cleanOptionalText(input.advertiserName);
	const agencyName = cleanOptionalText(input.agencyName);
	const provenanceLabel = requireLocalizaMarketObservationText(
		input.provenanceLabel,
		"provenance_label",
	);
	const observationKey = buildMarketObservationKey({
		propertyHistoryKey,
		portal,
		sourceUrl,
		sourceRecordId,
		observedAt,
		askingPrice,
		advertiserName,
		agencyName,
	});

	return {
		observationKey,
		propertyHistoryKey,
		portal,
		observedAt,
		askingPrice,
		currencyCode: askingPrice !== undefined ? "EUR" : input.currencyCode,
		advertiserName,
		agencyName,
		sourceUrl,
		daysPublished,
		firstSeenAt,
		lastSeenAt,
		provenanceLabel,
		provenanceUrl,
		sourceRecordId,
	};
};
