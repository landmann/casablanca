import { Button, Card, CardContent, CardHeader, CardTitle } from "@casedra/ui";
import {
	ArrowRight,
	BarChart3,
	Building2,
	CheckCircle2,
	Clock3,
	Mail,
	MessageSquareText,
	Route,
	Search,
	UsersRound,
	Workflow,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeaderAuthCta } from "./MarketingHeaderAuthCta";
import { calendarHref, generalEmail } from "./marketing-data";

export const metadata: Metadata = {
	title: "Casedra",
	description:
		"Casedra une WhatsApp, portales y web en una bandeja operativa para responder antes, repartir mejor y dirigir con datos.",
};

const heroSignals = [
	{ label: "Ejemplo respuesta", value: "01:42", icon: Clock3 },
	{ label: "Ejemplo cobertura", value: "92%", icon: BarChart3 },
	{ label: "Ejemplo traspasos", value: "3 hilos", icon: Route },
] as const;

const inboxRows = [
	{
		contact: "Ana Garcia",
		source: "Idealista",
		state: "Necesita responsable",
		owner: "Marta Ruiz",
		summary: "Quiere visitar Chamberí esta semana.",
	},
	{
		contact: "Carlos Moreno",
		source: "WhatsApp",
		state: "Casedra responde",
		owner: "Casedra",
		summary: "Pregunta disponibilidad y aparcamiento.",
	},
	{
		contact: "Lucia Vega",
		source: "Web",
		state: "Valoración",
		owner: "Captación",
		summary: "Pide precio de salida para vender.",
	},
] as const;

const outcomes = [
	{
		title: "Contactos calientes",
		body: "La primera respuesta sale antes de que el lead se enfríe.",
		icon: MessageSquareText,
	},
	{
		title: "Equipo alineado",
		body: "Cada agente recibe contexto, intención y siguiente paso.",
		icon: UsersRound,
	},
	{
		title: "Dirección con control",
		body: "Pendientes, cobertura y fricción quedan visibles cada semana.",
		icon: CheckCircle2,
	},
] as const;

const workflow = [
	"Entra por WhatsApp, portal o web",
	"Casedra responde y cualifica",
	"El hilo pasa al agente correcto",
	"Dirección revisa cobertura y pendientes",
] as const;

const implementationNotes = [
	"Una oficina primero",
	"Canales existentes",
	"Control humano visible",
] as const;

const localizaHref = "/app/localiza";

export default function HomePage() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="relative isolate overflow-hidden">
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(31,26,20,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(31,26,20,0.035)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.16),transparent_62%)]" />

				<header className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
					<Link href="/" className="inline-flex min-w-0 items-center gap-3">
						<span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background/90 font-serif text-xl text-foreground shadow-sm">
							C
						</span>
						<span className="truncate text-xs font-medium uppercase tracking-[0.26em] text-muted-foreground">
							Casedra
						</span>
					</Link>
					<nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
						<a
							href="#benefits"
							className="transition-colors hover:text-foreground"
						>
							Resultado
						</a>
						<a
							href="#workflow"
							className="transition-colors hover:text-foreground"
						>
							Flujo
						</a>
						<a
							href="#trust"
							className="transition-colors hover:text-foreground"
						>
							Implantación
						</a>
					</nav>
					<MarketingHeaderAuthCta calendarHref={calendarHref} />
				</header>

				<main className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pb-24">
					<section className="max-w-5xl">
						<div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
							<Building2
								className="h-3.5 w-3.5 text-primary"
								aria-hidden="true"
							/>
							CRM operativo para agencias inmobiliarias
						</div>
						<h1 className="mt-7 max-w-5xl text-balance font-serif text-[3.35rem] font-normal leading-[0.96] text-foreground sm:text-[5rem] lg:text-[6rem]">
							Responde antes. Reparte mejor. Dirige con datos.
						</h1>
						<p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
							Casedra reúne WhatsApp, portales y web; contesta el primer
							mensaje, entrega cada hilo con contexto y muestra lo pendiente sin
							pedir capturas.
						</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
							<Button asChild size="lg" className="rounded-full px-7">
								<Link
									href={localizaHref}
									className="inline-flex items-center gap-2"
								>
									<Search className="h-4 w-4" aria-hidden="true" />
									Probar Localiza
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								size="lg"
								className="rounded-full px-7"
							>
								<Link
									href={calendarHref}
									className="inline-flex items-center gap-2"
								>
									Reservar demo
									<ArrowRight className="h-4 w-4" aria-hidden="true" />
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								size="lg"
								className="rounded-full px-7"
							>
								<Link
									href={`mailto:${generalEmail}`}
									className="inline-flex items-center gap-2"
								>
									<Mail className="h-4 w-4" aria-hidden="true" />
									Escribir
								</Link>
							</Button>
						</div>
					</section>

					<section
						aria-label="Vista de ejemplo del producto"
						className="mt-12 overflow-hidden rounded-[30px] border border-border/80 bg-background/95 shadow-[0_30px_90px_rgba(31,26,20,0.08)]"
					>
						<div className="flex flex-col gap-5 border-b border-border/80 bg-secondary/45 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
									Vista de ejemplo
								</p>
								<h2 className="mt-2 font-serif text-3xl font-normal leading-tight text-foreground">
									Lo importante arriba, lo demás fuera.
								</h2>
								<p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
									Datos de muestra para enseñar la mecánica, no resultados
									prometidos.
								</p>
							</div>
							<div className="grid gap-2 sm:grid-cols-3">
								{heroSignals.map((signal) => {
									const Icon = signal.icon;

									return (
										<div
											key={signal.label}
											className="rounded-2xl border border-border bg-background/90 px-4 py-3"
										>
											<div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
												<Icon
													className="h-3.5 w-3.5 text-primary"
													aria-hidden="true"
												/>
												{signal.label}
											</div>
											<p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
												{signal.value}
											</p>
										</div>
									);
								})}
							</div>
						</div>

						<div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
							<div className="border-b border-border/80 p-5 sm:p-7 xl:border-b-0 xl:border-r">
								<div className="space-y-3">
									{inboxRows.map((row) => (
										<div
											key={row.contact}
											className="rounded-[22px] border border-border/80 bg-secondary/45 p-4"
										>
											<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
												<div>
													<p className="text-base font-semibold text-foreground">
														{row.contact}
													</p>
													<p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
														{row.source}
													</p>
												</div>
												<div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
													<span className="rounded-full border border-border bg-background px-3 py-1">
														{row.state}
													</span>
													<span className="rounded-full border border-border bg-background px-3 py-1">
														{row.owner}
													</span>
												</div>
											</div>
											<p className="mt-3 text-sm leading-6 text-foreground/85">
												{row.summary}
											</p>
										</div>
									))}
								</div>
							</div>

							{/* biome-ignore lint/correctness/useUniqueElementIds: Singleton page anchor for header navigation. */}
							<div id="workflow" className="p-5 sm:p-7">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
									<Workflow className="h-3.5 w-3.5" aria-hidden="true" />
									Flujo
								</div>
								<div className="mt-5 space-y-3">
									{workflow.map((item, index) => (
										<div
											key={item}
											className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-[22px] border border-border/80 bg-background p-4"
										>
											<span className="font-serif text-2xl text-primary">
												{String(index + 1).padStart(2, "0")}
											</span>
											<p className="text-sm font-medium text-foreground">
												{item}
											</p>
										</div>
									))}
								</div>
							</div>
						</div>
					</section>

					{/* biome-ignore lint/correctness/useUniqueElementIds: Singleton page anchor for header navigation. */}
					<section id="benefits" className="mt-12 grid gap-4 md:grid-cols-3">
						{outcomes.map((item) => {
							const Icon = item.icon;

							return (
								<Card
									key={item.title}
									className="rounded-[26px] border-border/80 bg-background/92 shadow-[0_18px_60px_rgba(31,26,20,0.06)]"
								>
									<CardHeader className="space-y-4">
										<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
											<Icon className="h-5 w-5" aria-hidden="true" />
										</div>
										<CardTitle className="font-serif text-[2rem] font-normal leading-tight">
											{item.title}
										</CardTitle>
									</CardHeader>
									<CardContent className="pt-0">
										<p className="text-sm leading-6 text-muted-foreground">
											{item.body}
										</p>
									</CardContent>
								</Card>
							);
						})}
					</section>

					{/* biome-ignore lint/correctness/useUniqueElementIds: Singleton page anchor for header navigation. */}
					<section
						id="trust"
						className="mt-12 rounded-[30px] border border-primary/25 bg-primary/10 p-6 sm:p-8"
					>
						<div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">
									Implantación ligera
								</p>
								<h3 className="mt-4 max-w-3xl font-serif text-4xl font-normal leading-tight text-foreground sm:text-5xl">
									Se monta sobre la oficina real, no sobre una migración eterna.
								</h3>
								<div className="mt-6 flex flex-wrap gap-2">
									{implementationNotes.map((note) => (
										<span
											key={note}
											className="rounded-full border border-primary/20 bg-background/75 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-primary/85"
										>
											{note}
										</span>
									))}
								</div>
							</div>
							<Button asChild size="lg" className="rounded-full px-7">
								<Link
									href={calendarHref}
									className="inline-flex items-center gap-2"
								>
									Ver huecos
									<ArrowRight className="h-4 w-4" aria-hidden="true" />
								</Link>
							</Button>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}
