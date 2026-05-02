import { SignIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import {
	ArrowLeft,
	Building2,
	ShieldCheck,
	Sparkles,
	Workflow,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isAllowedAppUser } from "@/lib/app-access";

export const metadata: Metadata = {
	title: "Iniciar sesión | Casedra",
	description:
		"Accede al espacio de trabajo de Casedra para gestionar contactos en directo, controlar el reparto y generar pruebas semanales.",
};

const accessReasons = [
	{
		icon: Workflow,
		title: "Ordena la bandeja",
		description: "WhatsApp, portales y formularios llegan a un solo lugar.",
	},
	{
		icon: ShieldCheck,
		title: "Mantén el control visible",
		description:
			"Consulta cobertura, traspasos y pendientes sin pedir capturas.",
	},
	{
		icon: Sparkles,
		title: "Muestra el trabajo hecho",
		description: "Dirección ve respuestas, huecos y siguientes acciones.",
	},
] as const;

const accessSignals = [
	"Cobertura de contactos",
	"Traspasos claros",
	"Pruebas para vendedores",
] as const;

export default async function SignInPage() {
	const user = await currentUser();

	if (user) {
		redirect(isAllowedAppUser(user) ? "/app" : "/access-restricted");
	}

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="relative isolate overflow-hidden">
				<div className="pointer-events-none absolute inset-0">
					<div className="absolute left-[-8rem] top-[-6rem] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(156,97,55,0.22),transparent_60%)] blur-3xl" />
					<div className="absolute right-[-5rem] top-[-5rem] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(232,223,204,0.9),transparent_64%)] blur-3xl" />
					<div className="absolute inset-0 bg-[linear-gradient(rgba(31,26,20,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(31,26,20,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.18),transparent_72%)]" />
				</div>

				<div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
					<header className="flex items-center justify-between gap-4">
						<Link
							href="/"
							className="inline-flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/85 font-serif text-lg text-foreground shadow-sm">
								C
							</span>
							<span className="inline-flex items-center gap-2">
								<ArrowLeft className="h-4 w-4" aria-hidden="true" />
								Volver al sitio
							</span>
						</Link>
						<div className="hidden items-center gap-2 rounded-full border border-border bg-background/85 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground shadow-sm sm:inline-flex">
							<Building2
								className="h-3.5 w-3.5 text-primary"
								aria-hidden="true"
							/>
							Acceso al espacio de Casedra
						</div>
					</header>

					<section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,30rem)] lg:py-16 xl:gap-16">
						<div className="max-w-3xl">
							<div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/80 bg-background/85 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur sm:px-4 sm:text-[11px] sm:tracking-[0.28em]">
								<Building2
									className="h-3.5 w-3.5 text-primary"
									aria-hidden="true"
								/>
								Control claro para la oficina
							</div>
							<h1 className="mt-6 max-w-4xl text-balance font-serif text-[3rem] font-normal leading-[0.98] text-foreground sm:text-[4.4rem] xl:text-[5.1rem]">
								Inicia sesión para controlar cada contacto.
							</h1>
							<p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
								Casedra reúne primera respuesta, reparto, cobertura y
								conversaciones con propietarios en una sola bandeja.
							</p>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
								El acceso está limitado a cuentas aprobadas por ahora.
							</p>

							<div className="mt-8 flex flex-wrap gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:gap-3 sm:text-xs sm:tracking-[0.2em]">
								{accessSignals.map((item) => (
									<span
										key={item}
										className="rounded-full border border-border bg-background/70 px-3 py-2"
									>
										{item}
									</span>
								))}
							</div>

							<div className="mt-10 grid gap-4 sm:grid-cols-3">
								{accessReasons.map((reason) => {
									const Icon = reason.icon;

									return (
										<div
											key={reason.title}
											className="rounded-[26px] border border-border/80 bg-background/88 p-5 shadow-[0_18px_60px_rgba(31,26,20,0.06)]"
										>
											<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
												<Icon className="h-5 w-5" aria-hidden="true" />
											</div>
											<h2 className="mt-4 text-lg font-semibold text-foreground">
												{reason.title}
											</h2>
											<p className="mt-2 text-sm leading-6 text-muted-foreground">
												{reason.description}
											</p>
										</div>
									);
								})}
							</div>
						</div>

						<div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:justify-self-end">
							<div className="absolute -inset-4 rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(156,97,55,0.18),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(111,94,74,0.14),transparent_34%)] blur-2xl sm:-inset-6" />
							<div className="casedra-clerk-auth relative">
								<SignIn
									path="/sign-in"
									routing="path"
									withSignUp
									fallbackRedirectUrl="/app"
									signUpFallbackRedirectUrl="/app"
								/>
							</div>
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}
