import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { LockKeyhole, Mail, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
	getCurrentUserPrimaryEmailAddress,
	isAllowedAppUser,
} from "@/lib/app-access";
import { generalEmail } from "../marketing-data";

export const metadata: Metadata = {
	title: "Acceso restringido | Casedra",
	description:
		"El acceso al espacio de trabajo de Casedra está limitado por ahora a cuentas aprobadas.",
};

export default async function AccessRestrictedPage() {
	const user = await currentUser();

	if (user && isAllowedAppUser(user)) {
		redirect("/app");
	}

	const primaryEmailAddress = getCurrentUserPrimaryEmailAddress(user);
	const accessRequestBody = primaryEmailAddress
		? `Hola, quiero activar acceso a Casedra para ${primaryEmailAddress}.`
		: "Hola, quiero activar acceso a Casedra.";
	const accessRequestHref = `mailto:${generalEmail}?subject=${encodeURIComponent(
		"Acceso a Casedra",
	)}&body=${encodeURIComponent(accessRequestBody)}`;

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-10">
				<div className="rounded-[32px] border border-border/70 bg-background/90 p-8 shadow-[0_24px_80px_rgba(31,26,20,0.08)] sm:p-10">
					<div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
						<LockKeyhole
							className="h-3.5 w-3.5 text-primary"
							aria-hidden="true"
						/>
						Acceso limitado
					</div>
					<h1 className="mt-6 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
						Este espacio de trabajo está limitado por ahora a cuentas aprobadas.
					</h1>
					<p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
						Puedes iniciar sesión, pero solo los correos aprobados pueden entrar
						en la app por ahora.
					</p>
					{primaryEmailAddress ? (
						<div className="mt-6 rounded-2xl border border-border/70 bg-muted/25 p-4 text-sm text-muted-foreground">
							<div className="flex items-center gap-2 text-foreground">
								<Mail className="h-4 w-4 text-primary" aria-hidden="true" />
								Sesión iniciada como {primaryEmailAddress}
							</div>
						</div>
					) : null}
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Link
							href={accessRequestHref}
							className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.96]"
						>
							<Mail className="h-4 w-4" aria-hidden="true" />
							Pedir acceso
						</Link>
						{user ? (
							<SignOutButton>
								<button
									type="button"
									className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-[background-color,transform] hover:bg-muted/35 active:scale-[0.96]"
								>
									Cerrar sesión
								</button>
							</SignOutButton>
						) : (
							<Link
								href="/sign-in"
								className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-[background-color,transform] hover:bg-muted/35 active:scale-[0.96]"
							>
								Ir a iniciar sesión
							</Link>
						)}
						<Link
							href="/"
							className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-[background-color,transform] hover:bg-muted/35 active:scale-[0.96]"
						>
							Volver al sitio
						</Link>
					</div>
					<div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
						<ShieldAlert
							className="mt-0.5 h-4 w-4 text-primary"
							aria-hidden="true"
						/>
						<p>
							El acceso se gestiona manualmente mientras el espacio se abre a un
							grupo muy pequeño de cuentas.
						</p>
					</div>
				</div>
			</div>
		</main>
	);
}
