import type {
	LocalizaPropertyDossier,
	ResolveIdealistaLocationResult,
} from "@casedra/types";
import { Button, cn } from "@casedra/ui";
import {
	ArrowLeft,
	Download,
	Euro,
	ExternalLink,
	FileSearch,
	ImageIcon,
	Landmark,
	MapPinned,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";

type LocalizaPropertyReportProps = {
	dossier: LocalizaPropertyDossier;
	result?: ResolveIdealistaLocationResult;
	backHref?: string;
	showNavigation?: boolean;
	className?: string;
};

type MarketEvidenceLink = {
	title: string;
	href: string;
	Icon: typeof FileSearch;
};

type NegotiationSnapshot = {
	currentAsk?: number;
	pricePerM2?: number;
	previousAsk?: number;
	priceDelta?: number;
	priceDeltaPercent?: number;
};

const CATASTRO_SEDE_URL = "https://www.sedecatastro.gob.es/";
const CATASTRO_VALUE_REFERENCE_URL =
	"https://www.sedecatastro.gob.es/Accesos/SECAccvr.aspx";
const NOTARIADO_PRICE_PORTAL_URL = "https://penotariado.com/";
const REGISTRADORES_PROPERTY_URL =
	"https://sede.registradores.org/site/propiedad?lang=es_ES";

const formatDate = (value?: string) => {
	if (!value) {
		return "Fecha no disponible";
	}

	return new Intl.DateTimeFormat("es-ES", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(value));
};

const formatEuro = (value?: number) =>
	value === undefined
		? "Precio no disponible"
		: `${new Intl.NumberFormat("es-ES", {
				maximumFractionDigits: 0,
			}).format(value)} €`;

const formatSignedEuro = (value?: number) => {
	if (value === undefined) {
		return "Pendiente";
	}

	const formatted = formatEuro(Math.abs(value));
	return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
};

const formatPercent = (value?: number) =>
	value === undefined
		? "Pendiente"
		: `${value > 0 ? "+" : ""}${new Intl.NumberFormat("es-ES", {
				maximumFractionDigits: 1,
			}).format(value)}%`;

const formatEuroPerM2 = (value?: number) =>
	value === undefined
		? "Pendiente"
		: `${new Intl.NumberFormat("es-ES", {
				maximumFractionDigits: 0,
			}).format(value)} €/m²`;

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const getCadastralReference = (dossier: LocalizaPropertyDossier) =>
	dossier.officialIdentity.unitRef20 ?? dossier.officialIdentity.parcelRef14;

const buildMarketEvidenceLinks = (
	dossier: LocalizaPropertyDossier,
): MarketEvidenceLink[] => {
	const identity = dossier.officialIdentity;

	return [
		{
			title: "Catastro",
			href: identity.officialSourceUrl ?? CATASTRO_SEDE_URL,
			Icon: MapPinned,
		},
		{
			title: "Valor ref.",
			href: CATASTRO_VALUE_REFERENCE_URL,
			Icon: Landmark,
		},
		{
			title: "Notariado",
			href: NOTARIADO_PRICE_PORTAL_URL,
			Icon: Euro,
		},
		{
			title: "Registro",
			href: REGISTRADORES_PROPERTY_URL,
			Icon: ShieldCheck,
		},
	];
};

const buildReportDownloadHref = (dossier: LocalizaPropertyDossier) => {
	const identity = dossier.officialIdentity;
	const snapshot = dossier.listingSnapshot;
	const sortedHistory = sortHistory(dossier.publicHistory);
	const negotiation = buildNegotiationSnapshot(dossier, sortedHistory);
	const historyRows = dossier.publicHistory
		.map(
			(row) =>
				`<li>${escapeHtml(formatDate(row.observedAt))} - ${escapeHtml(
					formatEuro(row.askingPrice),
				)} - ${escapeHtml(row.portal)}${
					row.agencyName ? ` - ${escapeHtml(row.agencyName)}` : ""
				}</li>`,
		)
		.join("");
	const evidenceRows = buildMarketEvidenceLinks(dossier)
		.map(
			(link) =>
				`<li><a href="${escapeHtml(link.href)}">${escapeHtml(
					link.title,
				)}</a></li>`,
		)
		.join("");
	const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Informe Localiza</title><body style="font-family:Arial,sans-serif;color:#1F1A14;background:#FFFBF2;padding:32px"><h1>${escapeHtml(
		snapshot.title ?? "Informe de propiedad",
	)}</h1><p><strong>${escapeHtml(formatEuro(snapshot.askingPrice))}</strong></p><p>Dirección propuesta: ${escapeHtml(
		identity.proposedAddressLabel ?? "No disponible",
	)}</p><p>Referencia catastral: ${escapeHtml(
		identity.unitRef20 ?? identity.parcelRef14 ?? "No disponible",
	)}</p><p>Fuente: ${escapeHtml(identity.officialSource)}</p><h2>Resumen del inmueble</h2><ul><li>Precio actual: ${escapeHtml(
		formatEuro(negotiation.currentAsk),
	)}</li><li>Precio por metro: ${escapeHtml(
		formatEuroPerM2(negotiation.pricePerM2),
	)}</li><li>Movimiento público: ${escapeHtml(
		negotiation.priceDelta !== undefined
			? `${formatSignedEuro(negotiation.priceDelta)} (${formatPercent(
					negotiation.priceDeltaPercent,
				)}) desde ${formatEuro(negotiation.previousAsk)}`
			: "Sin bajada pública verificable",
	)}</li></ul><h2>Histórico público</h2><ul>${historyRows}</ul><h2>Fuentes externas</h2><ul>${evidenceRows}</ul></body></html>`;

	return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
};

const buildDownloadName = (dossier: LocalizaPropertyDossier) => {
	const source = dossier.listingSnapshot.sourceUrl
		.replace(/^https?:\/\/(www\.)?/i, "")
		.replace(/[^a-z0-9]+/gi, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 48);

	return `informe-localiza-${source || "propiedad"}.html`;
};

const getPropertyOverviewRows = (
	dossier: LocalizaPropertyDossier,
	negotiation: NegotiationSnapshot,
	publicMovementLabel: string,
) => {
	const snapshot = dossier.listingSnapshot;
	const rows = [
		{ label: "Precio actual", value: formatEuro(negotiation.currentAsk) },
		{ label: "Precio por m²", value: formatEuroPerM2(negotiation.pricePerM2) },
		{ label: "Movimiento", value: publicMovementLabel },
		{
			label: "Superficie",
			value: snapshot.areaM2 ? `${snapshot.areaM2} m²` : undefined,
		},
		{
			label: "Dormitorios",
			value:
				snapshot.bedrooms !== undefined
					? `${snapshot.bedrooms} hab.`
					: undefined,
		},
		{
			label: "Baños",
			value:
				snapshot.bathrooms !== undefined ? `${snapshot.bathrooms} baños` : undefined,
		},
		{ label: "Planta", value: snapshot.floorText },
		{ label: "Luz", value: snapshot.isExterior ? "Exterior" : undefined },
		{ label: "Ascensor", value: snapshot.hasElevator ? "Sí" : undefined },
		{ label: "Garaje", value: snapshot.priceIncludesParking ? "Incluido" : undefined },
		{
			label: "Portal",
			value:
				snapshot.sourcePortal === "idealista"
					? "Idealista"
					: snapshot.sourcePortal,
		},
	];

	return rows.filter(
		(row): row is { label: string; value: string } => Boolean(row.value),
	);
};

const getObservationLabel = (count: number) =>
	count === 1 ? "1 observación" : `${count} observaciones`;

const getHistoryPartyLabel = (
	row: LocalizaPropertyDossier["publicHistory"][number],
) => row.agencyName ?? row.advertiserName ?? "Anuncio público";

const formatSourceHost = (sourceUrl?: string) =>
	sourceUrl
		? sourceUrl.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")
		: undefined;

const sortHistory = (history: LocalizaPropertyDossier["publicHistory"]) =>
	[...history].sort(
		(left, right) =>
			new Date(right.observedAt).getTime() -
			new Date(left.observedAt).getTime(),
	);

const buildNegotiationSnapshot = (
	dossier: LocalizaPropertyDossier,
	history: LocalizaPropertyDossier["publicHistory"],
): NegotiationSnapshot => {
	const snapshot = dossier.listingSnapshot;
	const currentAsk =
		snapshot.askingPrice ??
		history.find((row) => row.askingPrice !== undefined)?.askingPrice;
	const pricePerM2 =
		currentAsk !== undefined && snapshot.areaM2
			? Math.round(currentAsk / snapshot.areaM2)
			: undefined;
	const previousAsk = history.find(
		(row) =>
			row.askingPrice !== undefined &&
			currentAsk !== undefined &&
			row.askingPrice !== currentAsk,
	)?.askingPrice;
	const priceDelta =
		currentAsk !== undefined && previousAsk !== undefined
			? currentAsk - previousAsk
			: undefined;
	const priceDeltaPercent =
		priceDelta !== undefined && previousAsk
			? (priceDelta / previousAsk) * 100
			: undefined;
	return {
		currentAsk,
		pricePerM2,
		previousAsk,
		priceDelta,
		priceDeltaPercent,
	};
};

const getOfficialFactRows = (dossier: LocalizaPropertyDossier) => {
	const identity = dossier.officialIdentity;
	const streetAddress = [identity.street, identity.number]
		.filter(Boolean)
		.join(" ");
	const rows = [
		{ label: "Referencia", value: getCadastralReference(dossier) },
		{ label: "Calle", value: streetAddress || undefined },
		{ label: "Escalera", value: identity.staircase },
		{ label: "Planta", value: identity.floor },
		{ label: "Puerta", value: identity.door },
		{ label: "Código postal", value: identity.postalCode },
		{ label: "Municipio", value: identity.municipality },
		{ label: "Provincia", value: identity.province },
	];

	return rows.filter(
		(row): row is { label: string; value: string } => Boolean(row.value),
	);
};

export function LocalizaPropertyReport({
	dossier,
	backHref = "/app/onboarding?step=listings",
	showNavigation = true,
	className,
}: LocalizaPropertyReportProps) {
	const snapshot = dossier.listingSnapshot;
	const identity = dossier.officialIdentity;
	const leadImage = snapshot.leadImageUrl ?? dossier.imageGallery[0]?.imageUrl;
	const history = sortHistory(dossier.publicHistory);
	const reportHref =
		dossier.actions.reportDownloadUrl ?? buildReportDownloadHref(dossier);
	const downloadName = dossier.actions.reportDownloadUrl
		? undefined
		: buildDownloadName(dossier);
	const valuationHref = dossier.actions.valuationUrl ?? "/app/studio";
	const officialFactRows = getOfficialFactRows(dossier);
	const marketEvidenceLinks = buildMarketEvidenceLinks(dossier);
	const negotiationSnapshot = buildNegotiationSnapshot(dossier, history);
	const publicMovementLabel =
		negotiationSnapshot.priceDelta !== undefined
			? `${formatSignedEuro(negotiationSnapshot.priceDelta)} · ${formatPercent(
					negotiationSnapshot.priceDeltaPercent,
				)}`
			: "Pendiente";
	const publicMovementDetail =
		negotiationSnapshot.previousAsk !== undefined
			? `Desde ${formatEuro(negotiationSnapshot.previousAsk)} observado públicamente.`
			: "No hay una bajada pública atribuible todavía.";
	const propertyOverviewRows = getPropertyOverviewRows(
		dossier,
		negotiationSnapshot,
		publicMovementLabel,
	);

	return (
		<section
			className={cn(
				"localiza-property-report rounded-[1.75rem] bg-[#FFFBF2] p-3 text-[#1F1A14] shadow-[0_28px_90px_rgba(31,26,20,0.1)]",
				className,
			)}
			aria-label="Informe de propiedad Localiza"
		>
			{showNavigation ? (
				<div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
					<Button
						asChild
						variant="ghost"
						className="min-h-10 rounded-full px-3 text-[#6F5E4A] transition-[background-color,color,transform] duration-200 hover:bg-[#FFF8EA] hover:text-[#9C6137] active:scale-[0.96]"
					>
						<Link href={backHref}>
							<ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
							Volver al listado
						</Link>
					</Button>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							asChild
							className="min-h-10 rounded-full bg-[#9C6137] px-4 text-[#FFFBF2] shadow-[0_10px_24px_rgba(156,97,55,0.2)] transition-[background-color,color,box-shadow,transform] duration-200 hover:bg-[#87522D] active:scale-[0.96]"
						>
							<a href={reportHref} download={downloadName}>
								<Download className="mr-2 h-4 w-4" aria-hidden="true" />
								Descargar informe de propiedad
							</a>
						</Button>
						<Button
							asChild
							variant="outline"
							className="min-h-10 rounded-full border-0 bg-[#FFF8EA] px-4 text-[#9C6137] shadow-[0_8px_20px_rgba(31,26,20,0.055)] transition-[background-color,color,box-shadow,transform] duration-200 hover:bg-[#FFFBF2] hover:text-[#87522D] hover:shadow-[0_12px_26px_rgba(31,26,20,0.075)] active:scale-[0.96]"
						>
							<Link href={valuationHref}>
								<Euro className="mr-2 h-4 w-4" aria-hidden="true" />
								Valoraciones
							</Link>
						</Button>
					</div>
				</div>
			) : null}

			<div className="grid items-center gap-4 rounded-[1.35rem] bg-[#FFF8EA] p-3 shadow-[0_14px_42px_rgba(31,26,20,0.07)] sm:grid-cols-[340px_minmax(0,1fr)]">
				<div className="relative w-full self-center justify-self-center overflow-hidden rounded-[0.95rem] bg-[#E8DFCC] shadow-[0_10px_28px_rgba(31,26,20,0.08)]">
					{leadImage ? (
						<img
							src={leadImage}
							alt={snapshot.title ?? "Imagen del inmueble"}
							className="block w-full outline outline-1 outline-black/10"
						/>
					) : (
						<div className="flex min-h-[220px] w-full items-center justify-center text-[#6F5E4A]">
							<ImageIcon className="h-8 w-8" aria-hidden="true" />
						</div>
					)}
				</div>

				<div className="relative px-1 py-1 sm:px-2">
					<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9C6137]">
						Resumen del inmueble
					</p>
					<h1 className="mt-2 font-serif text-2xl font-normal leading-tight text-[#1F1A14] text-balance">
						{snapshot.title ?? "Inmueble de Idealista"}
					</h1>
					{identity.proposedAddressLabel ? (
						<p className="mt-2 text-sm leading-6 text-[#6F5E4A] text-pretty">
							{identity.proposedAddressLabel}
						</p>
					) : null}
					<dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
						{propertyOverviewRows.map((row) => (
							<div key={`${row.label}-${row.value}`} className="min-w-0">
								<dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6F5E4A]">
									{row.label}
								</dt>
								<dd className="mt-1 truncate text-sm font-semibold leading-5 text-[#1F1A14]">
									{row.value}
								</dd>
							</div>
						))}
					</dl>
					<p className="mt-3 text-xs leading-5 text-[#6F5E4A] text-pretty">
						{publicMovementDetail}
					</p>
				</div>

			</div>

			<div className="mt-3 rounded-[1.35rem] bg-[#FFF8EA] p-5 shadow-[0_16px_46px_rgba(31,26,20,0.05)]">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<section className="min-w-0 lg:max-w-[58%]">
						<div className="flex items-start gap-3">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-[#9C6137] text-[#FFFBF2] shadow-[0_9px_20px_rgba(156,97,55,0.18)]">
								<FileSearch className="h-5 w-5" aria-hidden="true" />
							</span>
							<div className="min-w-0">
								<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9C6137]">
									Identidad oficial
								</p>
								<h2 className="mt-1 font-serif text-2xl font-normal leading-tight text-[#1F1A14] text-balance">
									Base defendible
								</h2>
							</div>
						</div>
						{officialFactRows.length > 0 ? (
							<dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
								{officialFactRows.map((row) => (
									<div key={`${row.label}-${row.value}`} className="min-w-0">
										<dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6F5E4A]">
											{row.label}
										</dt>
										<dd className="mt-1 break-words text-sm font-medium leading-5 text-[#1F1A14]">
											{row.value}
										</dd>
									</div>
								))}
							</dl>
						) : (
							<p className="mt-5 max-w-prose text-sm leading-6 text-[#6F5E4A] text-pretty">
								Localiza todavía no tiene suficientes componentes oficiales para
								desglosar la unidad.
							</p>
						)}
					</section>

					<section className="lg:max-w-[40%]">
						<div className="flex items-end justify-between gap-3 lg:justify-end">
							<div className="lg:text-right">
								<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9C6137]">
									Fuentes externas
								</p>
								<p className="mt-1 text-sm font-medium leading-5 text-[#6F5E4A]">
									{marketEvidenceLinks.length} accesos directos
								</p>
							</div>
						</div>
						<div className="mt-4 flex flex-wrap gap-2 lg:justify-end">
							{marketEvidenceLinks.map(({ Icon, ...link }) => (
								<a
									key={`${link.title}-${link.href}`}
									href={link.href}
									target="_blank"
									rel="noreferrer"
									className="group inline-flex min-h-10 items-center gap-2 rounded-full bg-[#FFFBF2] px-3 text-sm font-medium text-[#1F1A14] shadow-[0_8px_18px_rgba(31,26,20,0.05)] transition-[color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:text-[#9C6137] hover:shadow-[0_12px_26px_rgba(31,26,20,0.075)] active:scale-[0.96]"
								>
									<Icon className="h-4 w-4 text-[#9C6137]" aria-hidden="true" />
									{link.title}
									<ExternalLink
										className="h-3.5 w-3.5 text-[#9C6137] opacity-55 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
										aria-hidden="true"
									/>
								</a>
							))}
						</div>
					</section>
				</div>
			</div>

			<div className="mt-3 rounded-[1.35rem] bg-[#FFF8EA] p-5 shadow-[0_16px_46px_rgba(31,26,20,0.05)]">
				<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
					<div className="min-w-0">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9C6137]">
							Actividad pública
						</p>
						<h2 className="mt-1 font-serif text-2xl font-normal leading-tight text-[#1F1A14] text-balance">
							Histórico de precios, agencias y portales
						</h2>
					</div>
					<span className="inline-flex min-h-10 items-center self-start rounded-full bg-[#FFFBF2] px-3 text-xs font-medium text-[#6F5E4A] shadow-[0_8px_18px_rgba(31,26,20,0.045)] sm:self-auto">
						{getObservationLabel(history.length)}
					</span>
				</div>

				{history.length > 0 ? (
					<ol className="mt-5 grid gap-1">
						{history.map((row, index) => {
							const sourceHost = formatSourceHost(row.sourceUrl);

							return (
								<li
									key={`${row.portal}-${row.observedAt}-${index}`}
									className="group rounded-[1rem] px-1 py-3 transition-[background-color,transform] duration-200 ease-out hover:bg-[#FFFBF2]/70 active:scale-[0.99]"
								>
									<div className="grid gap-3 md:grid-cols-[108px_124px_minmax(0,1fr)_auto] md:items-start">
										<time className="text-xs font-medium tabular-nums text-[#6F5E4A] md:pt-1">
											{formatDate(row.observedAt)}
										</time>
										<p className="text-base font-semibold tabular-nums text-[#1F1A14] md:pt-0.5">
											{formatEuro(row.askingPrice)}
										</p>
										<div className="min-w-0">
											<p className="text-sm leading-6 text-[#1F1A14] text-pretty">
												<span className="font-semibold uppercase text-[#9C6137]">
													{row.portal}
												</span>
												<span className="text-[#6F5E4A]"> · </span>
												<span>{getHistoryPartyLabel(row)}</span>
											</p>
										</div>
										{row.sourceUrl ? (
											<a
												href={row.sourceUrl}
												target="_blank"
												rel="noreferrer"
												className="inline-flex min-h-10 items-center rounded-full px-2.5 text-xs font-medium text-[#9C6137] underline decoration-[#9C6137]/40 underline-offset-4 transition-[color,text-decoration-color] duration-200 hover:text-[#87522D] hover:decoration-[#87522D] md:justify-self-end"
												title={sourceHost}
											>
												Fuente
											</a>
										) : null}
									</div>
								</li>
							);
						})}
					</ol>
				) : (
					<p className="mt-5 rounded-[1rem] bg-[#FFFBF2]/78 p-4 text-sm leading-6 text-[#6F5E4A] text-pretty">
						Todavía no hay observaciones públicas suficientes para construir
						un histórico.
					</p>
				)}
			</div>
		</section>
	);
}
