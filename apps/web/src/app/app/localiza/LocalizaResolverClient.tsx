"use client";

import type {
	ListingLocation,
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
} from "@casedra/ui";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	ExternalLink,
	History,
	LoaderCircle,
	MapPin,
	Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
	type AvailableLocalizaStrategy,
	buildLocalizaStrategyOptions,
	getPreferredLocalizaStrategy,
} from "@/lib/localiza-strategies";
import { capturePosthogEvent } from "@/lib/posthog";
import { trpc } from "@/trpc/shared";
import { LocalizaPropertyReport } from "./LocalizaPropertyReport";

type LocalizaResolverClientProps = {
	availableLocalizaStrategies: AvailableLocalizaStrategy[];
	initialSourceUrl?: string;
};

type LocalizaSearchHistoryEntry = {
	sourceUrl: string;
	searchedAt: string;
	resolvedAddressLabel?: string;
	status?: ResolveIdealistaLocationResult["status"];
	officialSource?: string;
	cacheExpiresAt?: string;
};

type LocalizaCandidate = ResolveIdealistaLocationResult["candidates"][number];

const LOCALIZA_SEARCH_HISTORY_STORAGE_KEY = "casedra.localiza.searchHistory.v1";
const MAX_LOCALIZA_SEARCH_HISTORY_ITEMS = 10;

const resultCopy: Record<
	ResolveIdealistaLocationResult["status"],
	{ label: string; description: string }
> = {
	exact_match: {
		label: "Dirección encontrada",
		description: "Localiza encontró una dirección oficial para este anuncio.",
	},
	building_match: {
		label: "Edificio encontrado",
		description:
			"Localiza encontró el edificio. Revisa el piso o completa lo que falte.",
	},
	needs_confirmation: {
		label: "Opciones encontradas",
		description:
			"Localiza encontró varias direcciones oficiales posibles para este anuncio.",
	},
	unresolved: {
		label: "No encontrada",
		description:
			"No hay suficiente señal oficial para rellenar la dirección con seguridad.",
	},
};

const temporaryReadFailureReasonCodes = new Set([
	"auto_no_configured_or_successful_adapter",
	"selected_strategy_failed",
	"firecrawl_failed",
	"browser_worker_failed",
	"resolver_deadline_exceeded",
	"state_catastro_missing_coordinates",
]);

const getResultCopy = (result: ResolveIdealistaLocationResult) => {
	if (
		result.status === "unresolved" &&
		result.evidence.reasonCodes.some((reasonCode) =>
			temporaryReadFailureReasonCodes.has(reasonCode),
		)
	) {
		return {
			label: "No se pudo leer",
			description:
				"El anuncio no dio suficientes señales de ubicación. Vuelve a intentarlo; no significa que Catastro haya descartado la dirección.",
		};
	}

	return resultCopy[result.status];
};

const loadingMessages = [
	{
		key: "reading",
		text: "Buscando señales públicas en el anuncio...",
	},
	{
		key: "official",
		text: "Contrastando la dirección con fuentes oficiales...",
	},
	{
		key: "result",
		text: "Preparando un resultado verificable...",
	},
] as const;

const LOADING_MESSAGE_INTERVAL_MS = 2100;

const formatAddress = (location?: ListingLocation) =>
	location
		? [
				location.street,
				location.city,
				location.stateOrProvince,
				location.postalCode,
				location.country,
			]
				.filter(Boolean)
				.join(", ")
		: null;

const buildOnboardingHref = (sourceUrl: string, candidateId?: string) => {
	const params = new URLSearchParams({
		step: "listings",
		sourceUrl,
	});

	if (candidateId) {
		params.set("localizaCandidateId", candidateId);
	}

	return `/app/onboarding?${params.toString()}`;
};

const getCandidateMeta = (candidate: LocalizaCandidate) =>
	[
		candidate.parcelRef14 ? `Parcela ${candidate.parcelRef14}` : null,
		typeof candidate.distanceMeters === "number"
			? `${Math.round(candidate.distanceMeters)} m del anuncio`
			: null,
	].filter(Boolean);

const getHistoryUrlKey = (sourceUrl: string) => {
	const trimmedSourceUrl = sourceUrl.trim();

	try {
		const parsedUrl = new URL(trimmedSourceUrl);
		parsedUrl.hash = "";
		parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
		parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "") || "/";

		return parsedUrl.toString().replace(/\/$/, "").toLowerCase();
	} catch {
		return trimmedSourceUrl.replace(/\/+$/, "").toLowerCase();
	}
};

const formatHistorySourceUrl = (sourceUrl: string) =>
	sourceUrl
		.replace(/^https?:\/\/(www\.)?/i, "")
		.replace(/\/$/, "")
		.slice(0, 72);

const getHistoryTimestamp = (entry: LocalizaSearchHistoryEntry) => {
	const timestamp = Date.parse(entry.searchedAt);

	return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatHistoryDate = (entry: LocalizaSearchHistoryEntry) => {
	const timestamp = getHistoryTimestamp(entry);

	if (!timestamp) {
		return "Fecha no disponible";
	}

	return new Intl.DateTimeFormat("es-ES", {
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		month: "short",
	}).format(new Date(timestamp));
};

const mergeSearchHistoryEntry = (
	entries: LocalizaSearchHistoryEntry[],
	nextEntry: LocalizaSearchHistoryEntry,
) => {
	const nextEntryKey = getHistoryUrlKey(nextEntry.sourceUrl);
	const mergedEntries = [
		nextEntry,
		...entries.filter(
			(entry) => getHistoryUrlKey(entry.sourceUrl) !== nextEntryKey,
		),
	];
	const seenKeys = new Set<string>();

	return mergedEntries
		.sort(
			(left, right) => getHistoryTimestamp(right) - getHistoryTimestamp(left),
		)
		.filter((entry) => {
			const entryKey = getHistoryUrlKey(entry.sourceUrl);

			if (!entryKey || seenKeys.has(entryKey)) {
				return false;
			}

			seenKeys.add(entryKey);
			return true;
		})
		.slice(0, MAX_LOCALIZA_SEARCH_HISTORY_ITEMS);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const parseSearchHistoryEntry = (
	value: unknown,
): LocalizaSearchHistoryEntry | null => {
	if (!isRecord(value) || typeof value.sourceUrl !== "string") {
		return null;
	}

	const searchedAt =
		typeof value.searchedAt === "string" &&
		Number.isFinite(Date.parse(value.searchedAt))
			? value.searchedAt
			: null;

	if (!searchedAt) {
		return null;
	}

	const status =
		typeof value.status === "string" && Object.hasOwn(resultCopy, value.status)
			? (value.status as ResolveIdealistaLocationResult["status"])
			: undefined;
	const cacheExpiresAt =
		typeof value.cacheExpiresAt === "string" &&
		Number.isFinite(Date.parse(value.cacheExpiresAt))
			? value.cacheExpiresAt
			: undefined;

	return {
		sourceUrl: value.sourceUrl,
		searchedAt,
		status,
		cacheExpiresAt,
		officialSource:
			typeof value.officialSource === "string"
				? value.officialSource
				: undefined,
		resolvedAddressLabel:
			typeof value.resolvedAddressLabel === "string"
				? value.resolvedAddressLabel
				: undefined,
	};
};

const parseStoredSearchHistory = (storedValue: string | null) => {
	if (!storedValue) {
		return [];
	}

	try {
		const parsedValue: unknown = JSON.parse(storedValue);

		if (!Array.isArray(parsedValue)) {
			return [];
		}

		return parsedValue.reduce<LocalizaSearchHistoryEntry[]>(
			(entries, value) => {
				const entry = parseSearchHistoryEntry(value);

				return entry ? mergeSearchHistoryEntry(entries, entry) : entries;
			},
			[],
		);
	} catch {
		return [];
	}
};

const buildPendingHistoryEntry = (
	sourceUrl: string,
): LocalizaSearchHistoryEntry => ({
	sourceUrl,
	searchedAt: new Date().toISOString(),
});

const buildResolvedHistoryEntry = (
	result: ResolveIdealistaLocationResult,
	fallbackSourceUrl: string,
): LocalizaSearchHistoryEntry => ({
	sourceUrl: result.sourceMetadata.sourceUrl || fallbackSourceUrl,
	searchedAt: new Date().toISOString(),
	resolvedAddressLabel:
		result.resolvedAddressLabel ??
		formatAddress(result.prefillLocation) ??
		result.candidates[0]?.label,
	status: result.status,
	officialSource: result.officialSource,
	cacheExpiresAt: result.cacheExpiresAt,
});

function LocalizaLoadingComposer({
	activeMessageIndex,
}: {
	activeMessageIndex: number;
}) {
	const activeMessage =
		loadingMessages[activeMessageIndex % loadingMessages.length] ??
		loadingMessages[0];

	return (
		<div
			className="localiza-loading-panel mt-5 overflow-hidden rounded-[1.35rem] bg-[#FFF8EA]/90 p-4 shadow-[0_18px_52px_rgba(31,26,20,0.07),inset_0_0_0_1px_rgba(232,223,204,0.9)]"
			aria-live="polite"
		>
			<div className="flex items-start gap-3">
				<div
					className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#FFFBF2] text-[#9C6137] shadow-[0_8px_24px_rgba(31,26,20,0.06),inset_0_0_0_1px_rgba(156,97,55,0.14)]"
					aria-hidden="true"
				>
					<span className="localiza-loading-orb absolute h-2.5 w-2.5 rounded-full bg-[#9C6137]" />
					<span className="localiza-loading-ring absolute h-2.5 w-2.5 rounded-full border border-[#9C6137]/35" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9C6137]">
							Localiza está trabajando
						</p>
						<span
							className="localiza-loading-dots inline-flex items-center gap-1"
							aria-hidden="true"
						>
							<span />
							<span />
							<span />
						</span>
					</div>
					<p
						key={activeMessage.key}
						className="localiza-loading-text mt-1 min-h-6 text-[15px] font-medium leading-6 text-[#1F1A14] [text-wrap:pretty]"
					>
						{activeMessage.text}
					</p>
					<div className="mt-3 space-y-2" aria-hidden="true">
						<span className="localiza-loading-shimmer block h-2 rounded-full bg-[#E8DFCC]/70" />
						<span className="localiza-loading-shimmer block h-2 w-8/12 rounded-full bg-[#E8DFCC]/55" />
					</div>
				</div>
			</div>
		</div>
	);
}

export default function LocalizaResolverClient({
	availableLocalizaStrategies,
	initialSourceUrl = "",
}: LocalizaResolverClientProps) {
	const candidateFieldId = useId();
	const sourceUrlInputId = `${candidateFieldId}-source-url`;
	const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
	const [result, setResult] = useState<ResolveIdealistaLocationResult | null>(
		null,
	);
	const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const hasTrackedLocalizaUrlPasteRef = useRef(false);
	const requestSequenceRef = useRef(0);
	const historyContainerRef = useRef<HTMLDivElement>(null);
	const resolveIdealistaLocation =
		trpc.listings.resolveIdealistaLocation.useMutation();
	const [searchHistory, setSearchHistory] = useState<
		LocalizaSearchHistoryEntry[]
	>([]);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const strategyOptions = useMemo(
		() => buildLocalizaStrategyOptions(availableLocalizaStrategies),
		[availableLocalizaStrategies],
	);
	const hasConfiguredStrategy = strategyOptions.length > 0;
	const resolvedAddress =
		result?.resolvedAddressLabel ?? formatAddress(result?.prefillLocation);
	const visibleResultCopy = result ? getResultCopy(result) : null;
	const currentSourceUrl = result?.sourceMetadata.sourceUrl ?? sourceUrl.trim();
	const selectedCandidate =
		result?.status === "needs_confirmation"
			? (result.candidates.find(
					(candidate) => candidate.id === selectedCandidateId,
				) ?? null)
			: null;
	const createHref = result
		? buildOnboardingHref(currentSourceUrl, selectedCandidate?.id)
		: null;
	const [activeLoadingMessageIndex, setActiveLoadingMessageIndex] = useState(0);
	const effectiveStrategy =
		getPreferredLocalizaStrategy("auto", availableLocalizaStrategies) ?? "auto";

	useEffect(() => {
		if (!resolveIdealistaLocation.isPending) {
			setActiveLoadingMessageIndex(0);
			return;
		}

		setActiveLoadingMessageIndex(0);
		const intervalId = window.setInterval(() => {
			setActiveLoadingMessageIndex(
				(currentIndex) => (currentIndex + 1) % loadingMessages.length,
			);
		}, LOADING_MESSAGE_INTERVAL_MS);

		return () => window.clearInterval(intervalId);
	}, [resolveIdealistaLocation.isPending]);

	useEffect(() => {
		try {
			setSearchHistory(
				parseStoredSearchHistory(
					window.localStorage.getItem(LOCALIZA_SEARCH_HISTORY_STORAGE_KEY),
				),
			);
		} catch {
			setSearchHistory([]);
		}
	}, []);

	useEffect(() => {
		if (!isHistoryOpen) {
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				!historyContainerRef.current?.contains(event.target)
			) {
				setIsHistoryOpen(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsHistoryOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isHistoryOpen]);

	const rememberSearchHistoryEntry = (entry: LocalizaSearchHistoryEntry) => {
		setSearchHistory((currentEntries) => {
			const nextEntries = mergeSearchHistoryEntry(currentEntries, entry);

			try {
				window.localStorage.setItem(
					LOCALIZA_SEARCH_HISTORY_STORAGE_KEY,
					JSON.stringify(nextEntries),
				);
			} catch {
				// If browser storage is unavailable, keep the in-memory history for this session.
			}

			return nextEntries;
		});
	};

	const handleSourceUrlChange = (value: string) => {
		requestSequenceRef.current += 1;
		setSourceUrl(value);
		setResult(null);
		setSelectedCandidateId(null);
		setError(null);
		setIsHistoryOpen(false);

		const trimmedValue = value.trim();

		if (trimmedValue && !hasTrackedLocalizaUrlPasteRef.current) {
			hasTrackedLocalizaUrlPasteRef.current = true;
			capturePosthogEvent("localiza_url_pasted", {
				requestedStrategy: effectiveStrategy,
				surface: "localiza_resolver_page",
			});
		}

		if (!trimmedValue) {
			hasTrackedLocalizaUrlPasteRef.current = false;
		}
	};

	const resolveLocation = async (sourceUrlOverride?: string) => {
		const trimmedSourceUrl = (sourceUrlOverride ?? sourceUrl).trim();
		const requestedStrategy = effectiveStrategy;

		capturePosthogEvent("localiza_resolve_clicked", {
			requestedStrategy,
			surface: "localiza_resolver_page",
			hasConfiguredStrategy,
		});

		if (!trimmedSourceUrl) {
			setError("Pega una URL de Idealista primero.");
			setResult(null);
			return;
		}

		if (!hasConfiguredStrategy) {
			setError("La lectura de anuncios no está configurada en este entorno.");
			setResult(null);
			return;
		}

		const requestSequence = requestSequenceRef.current + 1;
		requestSequenceRef.current = requestSequence;

		try {
			setSourceUrl(trimmedSourceUrl);
			setError(null);
			setResult(null);
			setSelectedCandidateId(null);
			rememberSearchHistoryEntry(buildPendingHistoryEntry(trimmedSourceUrl));
			const resolved = await resolveIdealistaLocation.mutateAsync({
				url: trimmedSourceUrl,
				strategy: requestedStrategy,
			});

			if (requestSequenceRef.current !== requestSequence) {
				return;
			}

			setResult(resolved);
			setSelectedCandidateId(
				resolved.status === "needs_confirmation"
					? (resolved.candidates[0]?.id ?? null)
					: null,
			);
			setSourceUrl(resolved.sourceMetadata.sourceUrl);
			rememberSearchHistoryEntry(
				buildResolvedHistoryEntry(resolved, trimmedSourceUrl),
			);
			capturePosthogEvent(
				resolved.status === "unresolved"
					? "localiza_resolve_unresolved"
					: "localiza_resolve_success",
				{
					requestedStrategy: resolved.requestedStrategy,
					actualAcquisitionMethod: resolved.evidence.actualAcquisitionMethod,
					territoryAdapter: resolved.territoryAdapter,
					status: resolved.status,
					confidenceScore: resolved.confidenceScore,
					candidateCount: resolved.candidates.length,
					surface: "localiza_resolver_page",
				},
			);
		} catch (unknownError) {
			if (requestSequenceRef.current !== requestSequence) {
				return;
			}

			capturePosthogEvent("localiza_resolve_failed", {
				requestedStrategy,
				surface: "localiza_resolver_page",
				errorMessage:
					unknownError instanceof Error
						? unknownError.message
						: "unknown_error",
			});
			setError(
				unknownError instanceof Error
					? unknownError.message
					: "No hemos podido leer este anuncio.",
			);
			setSelectedCandidateId(null);
		}
	};

	const retrieveHistoryEntry = (entry: LocalizaSearchHistoryEntry) => {
		setIsHistoryOpen(false);
		void resolveLocation(entry.sourceUrl);
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 sm:py-12">
				<header className="flex flex-col gap-3">
					<span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
						Localiza
					</span>
					<h1 className="font-serif text-[2.8rem] font-normal leading-tight sm:text-[4rem]">
						Pega un enlace de Idealista.
					</h1>
					<p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
						Localiza intenta convertir el anuncio en una dirección oficial y
						auditable. Si no puede verificarla, deja el inmueble para entrada
						manual.
					</p>
				</header>

				<Card className="border-border/80 bg-background">
					<CardHeader>
						<CardTitle className="text-lg">Buscar dirección</CardTitle>
						<CardDescription>
							Pega un enlace completo de Idealista.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
							onSubmit={(event) => {
								event.preventDefault();
								void resolveLocation();
							}}
						>
							<label className="sr-only" htmlFor={sourceUrlInputId}>
								URL del anuncio de Idealista
							</label>
							<Input
								id={sourceUrlInputId}
								type="url"
								value={sourceUrl}
								onChange={(event) => handleSourceUrlChange(event.target.value)}
								placeholder="https://www.idealista.com/inmueble/108926410/"
								className="min-h-12 flex-1 text-base"
							/>
							<div className="flex gap-3">
								<div ref={historyContainerRef} className="relative">
									<Button
										type="button"
										variant="outline"
										aria-label="Ver búsquedas recientes"
										aria-expanded={isHistoryOpen}
										aria-haspopup="listbox"
										className="min-h-12 w-12 rounded-[0.85rem] px-0 transition-[background-color,border-color,color,transform] active:scale-[0.96]"
										onClick={() => setIsHistoryOpen((isOpen) => !isOpen)}
									>
										<History className="h-4 w-4" aria-hidden="true" />
									</Button>

									{isHistoryOpen ? (
										<div className="absolute right-0 top-[calc(100%+0.55rem)] z-30 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-[1.1rem] bg-[#FFFBF2] shadow-[0_24px_80px_rgba(31,26,20,0.14),inset_0_0_0_1px_rgba(232,223,204,0.95)]">
											<div className="flex items-center justify-between gap-3 border-b border-[#E8DFCC] px-4 py-3">
												<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9C6137]">
													Historial
												</p>
												<p className="text-right text-xs leading-5 text-[#6F5E4A]">
													Últimas 10 búsquedas únicas.
												</p>
											</div>
											{searchHistory.length > 0 ? (
												<ul className="max-h-80 overflow-y-auto p-2">
													{searchHistory.map((entry) => {
														const entryLabel =
															entry.resolvedAddressLabel ??
															formatHistorySourceUrl(entry.sourceUrl);

														return (
															<li key={getHistoryUrlKey(entry.sourceUrl)}>
																<button
																	type="button"
																	className="group flex w-full rounded-[0.9rem] px-3 py-2.5 text-left transition-[background-color,transform] duration-200 hover:bg-[#FFF8EA] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-55"
																	disabled={resolveIdealistaLocation.isPending}
																	onClick={() => retrieveHistoryEntry(entry)}
																>
																	<span className="min-w-0 flex-1">
																		<span className="block truncate text-sm font-medium text-[#1F1A14]">
																			{entryLabel}
																		</span>
																		<span className="mt-0.5 block truncate text-xs leading-5 text-[#6F5E4A]">
																			{formatHistorySourceUrl(entry.sourceUrl)}
																		</span>
																		<span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] leading-4 text-[#6F5E4A]">
																			<span>{formatHistoryDate(entry)}</span>
																		</span>
																	</span>
																</button>
															</li>
														);
													})}
												</ul>
											) : (
												<p className="p-4 text-sm leading-6 text-[#6F5E4A]">
													Todavía no hay búsquedas guardadas en este navegador.
												</p>
											)}
										</div>
									) : null}
								</div>

								<Button
									type="submit"
									className="min-h-12 flex-1 px-5 transition-[background-color,color,transform] active:scale-[0.96] sm:flex-none"
									disabled={
										resolveIdealistaLocation.isPending ||
										!sourceUrl.trim() ||
										!hasConfiguredStrategy
									}
								>
									{resolveIdealistaLocation.isPending ? (
										<LoaderCircle
											className="mr-2 h-4 w-4 animate-spin"
											aria-hidden="true"
										/>
									) : (
										<Search className="mr-2 h-4 w-4" aria-hidden="true" />
									)}
									Buscar
								</Button>
							</div>
						</form>

						{!hasConfiguredStrategy ? (
							<p className="mt-4 rounded-md border border-border/70 p-3 text-sm text-muted-foreground">
								Localiza no está disponible ahora. Puedes crear el inmueble
								manualmente.
							</p>
						) : null}

						{error ? (
							<div className="mt-4 flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
								<AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
								<p>{error}</p>
							</div>
						) : null}

						{resolveIdealistaLocation.isPending ? (
							<LocalizaLoadingComposer
								activeMessageIndex={activeLoadingMessageIndex}
							/>
						) : null}
					</CardContent>
				</Card>

				{result?.propertyDossier ? (
					<LocalizaPropertyReport
						dossier={result.propertyDossier}
						result={result}
					/>
				) : null}

				{result ? (
					<Card className="border-border/80 bg-background">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								{result.status === "unresolved" ? (
									<AlertCircle
										className="h-5 w-5 text-muted-foreground"
										aria-hidden="true"
									/>
								) : (
									<CheckCircle2
										className="h-5 w-5 text-primary"
										aria-hidden="true"
									/>
								)}
								{visibleResultCopy?.label}
							</CardTitle>
							<CardDescription>
								{visibleResultCopy?.description}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{resolvedAddress && result.status !== "needs_confirmation" ? (
								<div className="flex items-start gap-3 rounded-md border border-border/70 p-3">
									<MapPin
										className="mt-0.5 h-4 w-4 text-primary"
										aria-hidden="true"
									/>
									<div>
										<p className="font-medium text-foreground">
											{resolvedAddress}
										</p>
										<p className="mt-1 text-sm text-muted-foreground">
											Fuente oficial: {result.officialSource}
										</p>
									</div>
								</div>
							) : null}

							{result.status === "needs_confirmation" &&
							result.candidates.length > 0 ? (
								<div className="space-y-3">
									<p className="text-sm text-muted-foreground">
										Selecciona la dirección oficial que corresponde al anuncio.
									</p>
									<fieldset className="grid gap-2">
										<legend className="sr-only">
											Direcciones oficiales posibles
										</legend>
										{result.candidates.map((candidate, index) => {
											const isSelected = selectedCandidateId === candidate.id;
											const candidateMeta = getCandidateMeta(candidate);

											return (
												<label
													key={candidate.id}
													htmlFor={`${candidateFieldId}-candidate-${index}`}
													className={`flex cursor-pointer items-start gap-3 rounded-[0.95rem] p-3 text-sm transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.985] ${
														isSelected
															? "bg-[#FFF8EA] shadow-[0_0_0_1px_rgba(156,97,55,0.35),0_14px_36px_rgba(31,26,20,0.07)]"
															: "bg-background shadow-[inset_0_0_0_1px_rgba(232,223,204,0.95)] hover:bg-[#FFF8EA]/70"
													}`}
												>
													<input
														id={`${candidateFieldId}-candidate-${index}`}
														type="radio"
														name={`${candidateFieldId}-candidate`}
														value={candidate.id}
														checked={isSelected}
														onChange={() =>
															setSelectedCandidateId(candidate.id)
														}
														className="sr-only"
													/>
													<span
														className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
															isSelected
																? "bg-primary text-primary-foreground"
																: "shadow-[inset_0_0_0_1px_rgba(156,97,55,0.35)]"
														}`}
														aria-hidden="true"
													>
														{isSelected ? (
															<CheckCircle2 className="h-3.5 w-3.5" />
														) : null}
													</span>
													<span className="min-w-0 flex-1">
														<span className="block font-medium text-foreground">
															{candidate.label}
														</span>
														{candidateMeta.length > 0 ? (
															<span className="mt-1 block text-xs leading-5 text-muted-foreground">
																{candidateMeta.join(" · ")}
															</span>
														) : null}
													</span>
												</label>
											);
										})}
									</fieldset>
								</div>
							) : null}

							{result.status === "needs_confirmation" &&
							result.candidates.length === 0 ? (
								<div className="rounded-md border border-border/70 p-3 text-sm text-muted-foreground">
									No hay una opción oficial seleccionable. Crea el inmueble y
									completa la dirección manualmente.
								</div>
							) : null}

							<div className="flex flex-wrap gap-3">
								{createHref ? (
									<Button
										asChild
										className="transition-[background-color,color,transform] active:scale-[0.96]"
									>
										<Link href={createHref}>
											{result.status === "needs_confirmation"
												? "Crear inmueble con esta dirección"
												: "Crear inmueble"}
											<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
										</Link>
									</Button>
								) : null}
								{result.officialSourceUrl &&
								result.status !== "needs_confirmation" ? (
									<Button
										asChild
										variant="outline"
										className="transition-[background-color,border-color,color,transform] active:scale-[0.96]"
									>
										<a
											href={result.officialSourceUrl}
											target="_blank"
											rel="noreferrer"
										>
											Fuente oficial
											<ExternalLink
												className="ml-2 h-4 w-4"
												aria-hidden="true"
											/>
										</a>
									</Button>
								) : null}
							</div>
						</CardContent>
					</Card>
				) : null}
			</div>
		</main>
	);
}
