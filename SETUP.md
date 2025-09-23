# Casablanca Setup Guide

Casablanca is a Turborepo that hosts the web studio (Next.js), the mobile companion (Expo), shared UI/auth/api packages, and Convex functions. This guide walks through configuring the stack end-to-end.

## Monorepo layout

- `apps/web` – Next.js app (Tailwind + ShadCN UI) with TRPC, Convex, BetterAuth, Fal.ai, PostHog, Stripe integrations
- `apps/mobile` – Expo + React Native shell for approvals and on-the-go tasks
- `packages/ui` – shared component library built on the ShadCN patterns
- `packages/api` – shared TRPC router, schemas, and context contract
- `packages/auth` – BetterAuth bootstrapper (in-memory today, Convex adapter planned)
- `packages/types` – cross-platform domain types
- `convex` – serverless data + jobs (listings, media queue)

## Prerequisites

- Node.js ≥ 20.11 and pnpm ≥ 9 (`corepack enable` recommended)
- Convex CLI: `pnpm dlx convex -h` (or `npm i -g convex`)
- Expo CLI: `pnpm dlx expo --help`
- Stripe CLI (optional, useful for webhook testing)
- Access to the following services: Convex, fal.ai, Firecrawl, PostHog, Stripe, Vercel

## Install dependencies

```bash
pnpm install
```

> Turborepo builds the dependency graph automatically; `pnpm install` at the root is enough for every workspace.

## Environment variables

1. Copy the example file and edit values:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

2. Populate the keys listed below. Keep secrets out of git (the root `.gitignore` already ignores `.env*`).

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web + auth | Base browser URL (e.g. `http://localhost:3000` in dev) |
| `CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL` | Web + TRPC | Copy the deployment URL from Convex dashboard |
| `CONVEX_DEPLOYMENT` | Convex CLI | Format: `<team>/<deployment>` |
| `BETTER_AUTH_SECRET` | BetterAuth | 32+ char random string; rotate in prod |
| `BETTER_AUTH_SESSION_MAX_AGE_DAYS` | BetterAuth | Optional, defaults to 30 |
| `FAL_KEY` | Fal.ai | Server-side only; never expose publicly |
| `FIRECRAWL_API_KEY` | Firecrawl | Needed for listing ingestion via crawl |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe | Follow the Stripe section below |
| `POSTHOG_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | Host defaults to `https://app.posthog.com` |

## Convex

1. Create a Convex project + deployment at [https://dashboard.convex.dev](https://dashboard.convex.dev).
2. Authenticate locally and initialise the project:
   ```bash
   pnpm dlx convex login
   pnpm dlx convex dev --once --configure=new
   ```
   The configure command seeds `convex.json`, `.env` keys, and the `_generated` folder.
3. Update `CONVEX_URL`, `CONVEX_DEPLOYMENT`, and `NEXT_PUBLIC_CONVEX_URL` with the values returned by the CLI.
4. During development keep the Convex dev server running so codegen stays fresh:
   ```bash
   pnpm convex dev
   ```
5. The current schema defines two tables (`listings`, `mediaJobs`); functions live in `convex/listings.ts` and `convex/media.ts`.
6. TODO: we still need to implement a Convex-backed BetterAuth adapter (see roadmap below).

## BetterAuth

- `packages/auth` exposes `createCasablancaAuth()` which currently uses the in-memory adapter for local flows. Production should swap to a Convex adapter – keep track in the roadmap.
- Set `BETTER_AUTH_SECRET` before running the app.
- When we add auth routes, they will live under `apps/web/src/app/api/auth/*` and reuse the exported helper.

## Fal.ai

1. Create an API key at [https://fal.ai](https://fal.ai) and store it as `FAL_KEY`.
2. The helper in `apps/web/src/server/media.ts` maps Casablanca media types to Fal models (Flux for imagery, Runway/LLM placeholders for video & copy). Update model IDs as you settle on specific Fal endpoints.
3. Responses are stored in Convex (`mediaJobs`) and surfaced through TRPC.

## Firecrawl

- Grab an API key from [https://www.firecrawl.dev](https://www.firecrawl.dev) and set `FIRECRAWL_API_KEY`.
- Media ingestion mutations will invoke Firecrawl when a URL source is provided (implementation pending).

## Stripe

1. Create a Stripe account + project, then fetch the test secret & publishable keys.
2. Add them to the `.env.local` file.
3. For webhook testing run:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. The helper in `apps/web/src/server/payments/stripe.ts` centralises Stripe client access.
5. Reference: [Stripe recommendations template](https://github.com/t3dotgg/stripe-recommendations).

## PostHog

1. Create a PostHog project and copy the API key into both `POSTHOG_API_KEY` (server) and `NEXT_PUBLIC_POSTHOG_KEY` (client).
2. Adjust the host if you self-host PostHog.
3. `usePosthog()` in `apps/web/src/app/providers.tsx` bootstraps analytics on the client.

## Running the apps

- Web studio (Next.js + TRPC): `pnpm dev --filter web`
- Mobile app (Expo): `pnpm dev --filter mobile` or `pnpm --filter mobile expo start`
- Lint everything: `pnpm lint`
- Build (all packages via Turborepo): `pnpm build`

> Turborepo scripts fan out to each workspace, so `pnpm dev` at the root will spin up every `dev` script if you prefer.

## Deployment targets

- **Vercel** (recommended) – connect the repo, set env vars in the dashboard, and Vercel will detect the Next.js + Turborepo setup automatically.
- **Convex** – deploy functions with `pnpm dlx convex deploy` once the project is linked.
- **Expo EAS** – configure later for TestFlight/Play releases.
- **PostHog** – point to production host.
- **Stripe** – set live keys + webhooks in prod.

## Roadmap & TODOs

- [ ] Replace BetterAuth memory adapter with Convex-backed storage + session middleware wired into TRPC context
- [ ] Finish Firecrawl ingestion flow and media asset uploader (S3/Vercel Blob)
- [ ] Flesh out Fal.ai prompt templates per asset type and persist outputs in Convex `mediaJobs`
- [ ] Expose TRPC queries in Expo app via react-query + mobile-specific screens
- [ ] Implement CRM primitives (pipelines, contacts, referrals) and public share links
- [ ] Harden Stripe billing (pricing tables, webhook handlers, customer portal)
- [ ] Add e2e + integration tests (Playwright for web, Detox for mobile) once pages stabilise

Reach out once you are ready to tackle the next chunk — each TODO already has scaffolding slots in place.
