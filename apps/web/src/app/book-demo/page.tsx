import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  MessageCircle,
  Network,
  ShieldCheck,
  TimerReset,
  Workflow,
} from "lucide-react";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@casedra/ui";
import {
  calendarHref,
  emailHref,
  founderContacts,
  founderSectionId,
  generalEmail,
} from "../marketing-data";

const agenda = [
  {
    title: "Dónde se enfrían los leads",
    description:
      "Miramos por dónde entran, cuánto tardáis en responder y dónde se pierde seguimiento hoy.",
    icon: TimerReset,
  },
  {
    title: "Cómo trabaja Casedra",
    description:
      "Verás primera respuesta, reparto al agente y visibilidad semanal para dirección.",
    icon: Workflow,
  },
  {
    title: "Qué haríamos primero",
    description:
      "Terminamos con un primer paso concreto para una oficina, no con una promesa abstracta.",
    icon: Network,
  },
] as const;

const prepChecklist = [
  "Qué canales usáis hoy: WhatsApp, portales, formularios",
  "Quién responde ahora y cómo se reparten los leads",
  "Volumen aproximado de leads por semana",
  "Qué os preocupa más: tiempo de respuesta, seguimiento o control",
] as const;

export const metadata: Metadata = {
  title: "Reservar demo | Casedra",
  description:
    "Reserva una demo de Casedra y revisamos cómo entran, se responden y se reparten vuestros leads.",
};

export default function BookDemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-6rem] top-[-5rem] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(156,97,55,0.18),transparent_62%)] blur-3xl" />
          <div className="absolute right-[-5rem] top-0 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(232,223,204,0.92),transparent_64%)] blur-3xl" />
        </div>

        <header className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Casedra
          </Link>
          <Button asChild className="rounded-full px-5 sm:px-6">
            <Link href={calendarHref}>Ver huecos disponibles</Link>
          </Button>
        </header>

        <main className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-4 sm:px-8">
          <section className="grid gap-8 lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:items-start">
            <div className="max-w-3xl">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:px-4 sm:text-[11px] sm:tracking-[0.28em]">
                <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Demo de 20 min
              </div>
              <h1 className="mt-6 max-w-4xl text-balance font-serif text-[3rem] font-normal leading-[1.02] text-foreground sm:text-[4.15rem] xl:text-[4.75rem]">
                Te enseñamos Casedra sobre el flujo real de tu oficina.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                No hacemos una demo genérica. Miramos cómo entran hoy vuestros leads, quién
                responde, dónde se pierde seguimiento y cómo sería una primera implantación si
                tuviera sentido empezar.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {agenda.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-border/80 bg-background/92 p-5 shadow-[0_18px_60px_rgba(31,26,20,0.06)]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <p className="mt-4 text-lg font-semibold text-foreground">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <Card className="rounded-[28px] border-border/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.96),rgba(248,241,229,0.88))] shadow-[0_30px_90px_rgba(31,26,20,0.10)] sm:rounded-[30px]">
              <CardHeader className="space-y-4">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  Traed esto
                </div>
                <div>
                  <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                    Traed vuestro contexto real.
                  </CardTitle>
                  <CardDescription className="mt-3 text-sm leading-6">
                    No hace falta una preparación pesada. Solo una imagen honesta de cómo trabajáis
                    hoy.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {prepChecklist.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground/90"
                  >
                    {item}
                  </div>
                ))}
                <div className="rounded-2xl border border-border/80 bg-background px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Control visible antes que autonomía ciega
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Te enseñaremos exactamente cuándo responde Casedra y cuándo entra una
                        persona del equipo.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mt-12 grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
            <Card className="rounded-[28px] border-border/80 bg-background/92 shadow-[0_24px_70px_rgba(31,26,20,0.07)] sm:rounded-[30px]">
              <CardHeader>
                <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                  Reserva una demo de 20 min
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6">
                  El camino más rápido es elegir hueco en calendario. Si prefieres escribir antes,
                  habla con uno de los fundadores.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Duración", value: "20 min" },
                    { label: "Formato", value: "Online" },
                    { label: "Foco", value: "Vuestro flujo real" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-border/80 bg-secondary/45 px-4 py-4"
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-3 text-lg font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:flex-nowrap">
                  <Button asChild size="lg" className="rounded-full px-7">
                    <Link href={calendarHref} className="inline-flex items-center gap-2">
                      Reservar demo
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                    <Link href={`#${founderSectionId}`}>Hablar con un fundador</Link>
                  </Button>
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                  Si prefieres ir a lo simple, también puedes escribir a{" "}
                  <Link href={emailHref} className="underline">
                    {generalEmail}
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-primary/25 bg-primary/10 sm:rounded-[30px]">
              <CardHeader>
                <CardTitle className="font-serif text-[2rem] font-normal leading-tight sm:text-3xl">
                  Qué os lleváis de la demo
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-foreground/75">
                  Una conversación más concreta y más útil que una demo proptech al uso.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "Un mapa claro de dónde se os enfrían los leads hoy.",
                  "Cómo encajaría Casedra sin cambiar toda la oficina de golpe.",
                  "Qué tocaríamos primero y qué dejaríamos para después.",
                  "Una respuesta honesta sobre si tiene sentido empezar o no.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-primary/20 bg-background/94 px-4 py-4 text-sm leading-6 text-foreground/90"
                  >
                    {item}
                  </div>
                ))}
                <Button asChild variant="secondary" className="rounded-full px-6">
                  <Link href={`#${founderSectionId}`} className="inline-flex items-center gap-2">
                    Hablar con un fundador
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section
            id={founderSectionId}
            className="mt-12 grid gap-6 rounded-[30px] border border-border/80 bg-background/92 p-6 shadow-[0_24px_70px_rgba(31,26,20,0.07)] sm:p-8 xl:grid-cols-[0.84fr_1.16fr]"
          >
            <div className="max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Fundadores
              </p>
              <h2 className="mt-4 font-serif text-4xl font-normal leading-tight text-foreground">
                Si prefieres coordinarlo por correo, aquí tienes contacto directo.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Estamos abriendo las primeras oficinas y preferimos conversaciones directas. Escríbenos
                con vuestro flujo actual y te diremos si encaja, cómo empezar y qué veríamos en la
                demo.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {founderContacts.map((contact) => (
                <Card
                  key={contact.email}
                  className="rounded-[26px] border-border/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.96),rgba(248,241,229,0.88))] shadow-[0_20px_60px_rgba(31,26,20,0.07)]"
                >
                  <CardHeader className="space-y-4">
                    <div>
                      <CardTitle className="font-serif text-[1.9rem] font-normal leading-tight">
                        {contact.name}
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {contact.role}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm leading-6 text-muted-foreground">{contact.summary}</p>
                    <div className="rounded-2xl border border-border/80 bg-background px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                        Email directo
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">{contact.email}</p>
                    </div>
                    <Button asChild variant="outline" className="rounded-full px-6">
                      <Link href={contact.href} className="inline-flex items-center gap-2">
                        Escribir a {contact.firstName}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
