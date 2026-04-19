import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Landmark,
  MessageSquareText,
  Radar,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@casablanca/ui";

const studioRoute = "/app/studio";
const demoRoute = "/book-demo";
const masterplanRoute = "/masterplan";

export const metadata: Metadata = {
  title: "Casablanca",
  description:
    "Casablanca es el SO operativo independiente para agencias inmobiliarias: control de respuesta, operativa en vivo y prueba para captar propietarios.",
};

const marketSignals = [
  {
    label: "Control de respuesta",
    value: "SLA < 2 min",
    detail: "Entra el lead, sale la respuesta y la propiedad del hilo sigue visible.",
  },
  {
    label: "Capa operativa",
    value: "La bandeja manda",
    detail: "WhatsApp, reenvío de portales y traspaso en una sola superficie.",
  },
  {
    label: "Ruta de expansión",
    value: "Captación",
    detail: "La prueba de rendimiento se convierte en el siguiente motor de captación.",
  },
] as const;

const platformPillars = [
  {
    icon: MessageSquareText,
    title: "Responde",
    summary:
      "Responde rápido a cada lead con intención, cualifica el contexto y escala limpio cuando debe entrar una persona.",
    details: ["Primera respuesta", "Traspaso IA-humano", "Propiedad visible del hilo"],
  },
  {
    icon: Workflow,
    title: "Control de bandeja",
    summary:
      "Convierte la demanda entrante desordenada en un flujo gestionado con enrutado, asignación, visibilidad de SLA e informe semanal.",
    details: ["WhatsApp primero", "Responsabilidad directiva", "Ritmo operativo semanal"],
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Motor de captación",
    summary:
      "Usa los datos de ejecución del lado comprador para ganar más captaciones y crear rituales de agencia de mayor valor.",
    details: ["Captación de valoraciones", "Seguimiento de propietarios", "Páginas y presentaciones de prueba"],
  },
] as const;

const trustArchitecture = [
  {
    icon: ShieldCheck,
    title: "Propiedad clara",
    body:
      "Casablanca muestra exactamente cuándo actúa la IA, cuándo una persona toma el hilo y por qué se produjo el traspaso.",
  },
  {
    icon: Radar,
    title: "Prueba semanal",
    body:
      "Dirección ve con números la velocidad de respuesta, la cobertura, la demanda perdida y qué cambió esta semana.",
  },
  {
    icon: Landmark,
    title: "Posición independiente",
    body:
      "Pensado para agencias que quieren una capa operativa seria junto al ecosistema de portales, no dentro de él.",
  },
] as const;

const operatingLoop = [
  {
    step: "01",
    title: "Entra el lead",
    description:
      "Los reenvíos de portales, WhatsApp y la web aterrizan en la misma capa operativa.",
  },
  {
    step: "02",
    title: "La respuesta queda bajo control",
    description:
      "Casablanca redacta o envía la primera respuesta con rapidez y luego enruta el hilo según reglas y confianza.",
  },
  {
    step: "03",
    title: "La operativa del equipo sigue visible",
    description:
      "Asignación, traspaso, presión de SLA y responsabilidad directiva siguen explícitos, no enterrados en chats.",
  },
  {
    step: "04",
    title: "El rendimiento se convierte en prueba",
    description:
      "La agencia transforma los datos operativos en revisiones semanales, prueba para propietarios y la siguiente palanca de crecimiento.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(156,97,55,0.22),transparent_60%)] blur-3xl" />
          <div className="absolute right-[-4rem] top-[-6rem] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(232,223,204,0.92),transparent_66%)] blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(180deg,rgba(255,251,242,0),rgba(255,251,242,0.8)_62%,rgba(255,251,242,1))]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(31,26,20,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(31,26,20,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.16),transparent_72%)]" />
        </div>

        <header className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
          <Link href="/" className="inline-flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 font-serif text-lg text-foreground shadow-sm sm:h-11 sm:w-11 sm:text-xl">
              C
            </span>
            <span className="truncate text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-sm sm:tracking-[0.26em]">
              Casablanca
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
            <a href="#platform" className="transition-colors hover:text-foreground">
              Plataforma
            </a>
            <a href="#trust" className="transition-colors hover:text-foreground">
              Confianza
            </a>
            <a href="#masterplan" className="transition-colors hover:text-foreground">
              Masterplan
            </a>
          </nav>
          <Button asChild className="rounded-full px-5 sm:px-6">
            <Link href={demoRoute}>Reservar una demo</Link>
          </Button>
        </header>

        <main className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-6 sm:px-8 sm:pt-8 lg:px-12 lg:pb-28">
          <section className="grid gap-8 lg:gap-10 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,28rem)] xl:items-start">
            <div className="max-w-3xl">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/80 bg-background/85 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur sm:px-4 sm:text-[11px] sm:tracking-[0.28em]">
                <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                SO operativo independiente para agencias
              </div>
              <h1 className="mt-6 max-w-4xl text-balance font-serif text-[3rem] font-normal leading-[0.98] text-foreground sm:text-[4.25rem] xl:text-[5.25rem]">
                Controla la primera respuesta.
                <br />
                Ordena la operativa diaria.
                <br />
                Gana la próxima captación.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Casablanca da a las agencias inmobiliarias una capa operativa, con WhatsApp en el
                centro, para responder antes, enrutar mejor, exigir responsabilidad y demostrar
                rendimiento. Está diseñada para convertirse en el estándar alrededor de la demanda
                entrante, no en otro juguete de IA ni en un CRM inflado.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:flex-nowrap">
                <Button asChild size="lg" className="rounded-full px-7 sm:w-auto">
                  <Link href={demoRoute} className="inline-flex items-center gap-2">
                    Reservar una demo
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-7 sm:w-auto">
                  <Link href={masterplanRoute} className="inline-flex items-center gap-2">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Leer el masterplan
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="rounded-full px-6 sm:w-auto sm:justify-start">
                  <Link href={studioRoute} className="inline-flex items-center gap-2">
                    Ver el producto
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:gap-3 sm:text-xs sm:tracking-[0.2em]">
                <span className="rounded-full border border-border bg-background/70 px-3 py-2">
                  España primero
                </span>
                <span className="rounded-full border border-border bg-background/70 px-3 py-2">
                  Portugal después
                </span>
                <span className="rounded-full border border-border bg-background/70 px-3 py-2">
                  Italia en el radar
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[34rem] xl:mx-0 xl:justify-self-end">
              <div className="absolute -inset-4 rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(156,97,55,0.18),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(111,94,74,0.14),transparent_34%)] blur-2xl sm:-inset-6" />
              <Card className="relative overflow-hidden rounded-[28px] border-border/80 bg-background/92 shadow-[0_34px_100px_rgba(31,26,20,0.12)] sm:rounded-[32px]">
                <CardHeader className="border-b border-border/80 pb-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                        Capa operativa
                      </p>
                      <CardTitle className="mt-2 font-serif text-[1.9rem] font-normal leading-tight sm:text-3xl">
                        Resumen: oficina Madrid
                      </CardTitle>
                    </div>
                    <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-primary">
                      En vivo
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    {[
                      { label: "Mediana primera respuesta", value: "01:42" },
                      { label: "Leads recuperados esta semana", value: "+18" },
                      { label: "Informes semanales enviados", value: "12" },
                    ].map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-2xl border border-border/70 bg-secondary/55 p-4"
                      >
                        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                          {metric.label}
                        </p>
                        <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[26px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.98),rgba(248,241,229,0.88))] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                        <span>Bandeja en vivo</span>
                        <span>Reenvío Idealista</span>
                      </div>
                      <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-border/80 bg-background p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Ana García</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Interesada en un piso de 2 habitaciones en Chamberí. Quiere visita esta semana.
                              </p>
                            </div>
                            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                              Nuevo lead
                            </span>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                          <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">
                            IA respondió en 48 s
                          </p>
                          <p className="mt-2 text-sm leading-6 text-foreground/90">
                            Confirmó zona preferida, tramo de presupuesto e intención de agenda. La
                            confianza siguió alta hasta que se pidió disponibilidad concreta del inmueble.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/80 bg-background p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">Intervención humana</p>
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                              Marta Ruiz
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Se activó el traspaso cuando la interesada pidió una ventana de visita
                            para esta semana y dudas sobre tiempos de hipoteca.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[26px] border border-border/80 bg-secondary/55 p-5">
                        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                          Informe para dirección
                        </p>
                        <div className="mt-4 space-y-3">
                          {[
                            "92% de leads atendidos dentro del SLA",
                            "3 conversaciones escaladas por contexto local",
                            "Página de captación lanzada para 5 propietarios potenciales",
                          ].map((item) => (
                            <div
                              key={item}
                              className="rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground/90"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[26px] border border-primary/25 bg-primary/10 p-5">
                        <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">
                          Palanca de expansión
                        </p>
                        <p className="mt-3 font-serif text-2xl font-normal leading-tight text-foreground">
                          La ejecución diaria con compradores se convierte en prueba para captar propietarios.
                        </p>
                        <p className="mt-3 text-sm leading-6 text-foreground/85">
                          Casablanca compone desde el control de respuesta hacia captación de
                          propietarios, páginas de prueba y materiales comerciales basados en datos
                          operativos reales.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {marketSignals.map((signal, index) => (
              <div
                key={signal.label}
                className="animate-enter rounded-[24px] border border-border/80 bg-background/85 p-5 shadow-[0_18px_60px_rgba(31,26,20,0.06)]"
                style={{ animationDelay: `${index * 110}ms` }}
              >
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  {signal.label}
                </p>
                <p className="mt-3 font-serif text-3xl font-normal leading-tight text-foreground">
                  {signal.value}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{signal.detail}</p>
              </div>
            ))}
          </section>

          <section id="platform" className="mt-24">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Lo que Casablanca hace de verdad
              </p>
              <h2 className="mt-4 font-serif text-4xl font-normal leading-tight text-foreground sm:text-5xl">
                Primero, una empresa de operativa. La capa visual solo cuando refuerza la operativa.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">
                El plan de compañía es explícito con el orden. Casablanca entra por el camino del
                dinero, se vuelve parte del comportamiento diario de la oficina y después se expande
                hacia captación y marketplace selectivo. La interfaz debe dejar eso claro.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {platformPillars.map((pillar, index) => {
                const Icon = pillar.icon;

                return (
                  <Card
                    key={pillar.title}
                    className="animate-enter h-full rounded-[28px] border-border/80 bg-background/92 shadow-[0_24px_70px_rgba(31,26,20,0.07)]"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <CardHeader className="space-y-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-[2rem] font-normal leading-tight">
                          {pillar.title}
                        </CardTitle>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {pillar.summary}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {pillar.details.map((detail) => (
                          <span
                            key={detail}
                            className="rounded-full border border-border bg-secondary/55 px-3 py-1.5 text-xs font-medium text-foreground/85"
                          >
                            {detail}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section id="trust" className="mt-24 grid gap-8 xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
            <div className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.94),rgba(248,241,229,0.84))] p-6 shadow-[0_28px_90px_rgba(31,26,20,0.08)] sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Por qué esto transmite confianza
              </p>
              <h3 className="mt-4 font-serif text-4xl font-normal leading-tight text-foreground">
                La confianza viene del control visible, no de promesas más ruidosas sobre IA.
              </h3>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Harvey y Legora se presentan como infraestructura seria de operativa: resultados
                claros, lenguaje de producto contenido y señales fuertes de confianza. Casablanca
                necesita la misma postura para las agencias.
              </p>
              <div className="mt-8 space-y-4">
                {trustArchitecture.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[22px] border border-border/80 bg-background/92 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{item.title}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[30px] border border-border/80 bg-background/92 p-6 shadow-[0_24px_70px_rgba(31,26,20,0.07)] sm:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                  El bucle que queremos controlar
                </p>
                <div className="mt-6 space-y-4">
                  {operatingLoop.map((item) => (
                    <div
                      key={item.step}
                      className="grid gap-3 rounded-[24px] border border-border/80 bg-secondary/45 p-5 sm:grid-cols-[68px_1fr] sm:items-start"
                    >
                      <div className="font-serif text-3xl font-normal leading-none text-primary">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                id="masterplan"
                className="rounded-[30px] border border-primary/25 bg-primary/10 p-6 sm:p-8"
              >
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">
                  Acceso a estrategia
                </p>
                <h3 className="mt-4 font-serif text-4xl font-normal leading-tight text-foreground">
                  Cada markdown redactado ya tiene su sitio en `/masterplan`.
                </h3>
                <p className="mt-4 max-w-2xl text-base leading-8 text-foreground/85">
                  La ruta reúne el conjunto completo de `MASTER-PLAN` junto con la documentación del
                  repositorio que sostiene la ejecución y el contexto operativo.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="rounded-full px-7">
                    <Link href={masterplanRoute} className="inline-flex items-center gap-2">
                      Abrir la sala de lectura
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                    <Link href={demoRoute} className="inline-flex items-center gap-2">
                      Hablar del despliegue
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
