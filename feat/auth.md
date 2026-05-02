# Feature: Authentication

This document describes the current Clerk-based authentication flow implemented for the web app.

## Overview

The app uses Clerk for user authentication in `apps/web`.

The implementation adds:

- A branded sign-in screen at `/sign-in`
- Protection for all `/app/*` routes
- Redirect preservation so signed-out users return to their original destination after sign-in
- App-level email allowlisting through `APP_ALLOWED_EMAILS`
- Signed-in account controls in the shared app shell
- A marketing-header CTA that switches between `Entrar` and `Bandeja`

## User Flow

1. A signed-out user visits a protected route under `/app/*`
2. Middleware redirects the user to `/sign-in?redirect_url=<original-url>`
3. Clerk renders the embedded sign-in / sign-up UI on the branded page
4. After successful authentication, Clerk redirects the user back to the requested URL
5. If no redirect target is available, Clerk falls back to `/app`, which redirects to `/app/inbox`
6. Signed-in users whose email is not approved are sent to `/access-restricted`

## Routes

- `/sign-in`
  - Dedicated Clerk route implemented as an App Router catch-all page
  - Supports Clerk sign-in and sign-up UI in the same branded shell

- `/app/*`
  - Protected by Clerk middleware
  - Unauthenticated requests are redirected to `/sign-in`
  - Authenticated requests also pass through the server-side app allowlist

- `/app/inbox`
  - Current post-auth operating surface
  - Uses the shared app shell for navigation and account controls

- `/app/studio`
  - Legacy route retained as a redirect to `/app/inbox`

- `/access-restricted`
  - Explains the allowlist gate and gives unapproved users a direct access-request email action

## Key Files

- `apps/web/src/middleware.ts`
  - Protects `/app/*`
  - Preserves `redirect_url` for post-login return flow

- `apps/web/src/app/layout.tsx`
  - Configures `ClerkProvider`
  - Sets `signInUrl="/sign-in"` so Clerk helpers use the branded route

- `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx`
  - Branded authentication page
  - Renders Clerk `<SignIn />` with route-based navigation

- `apps/web/src/app/MarketingHeaderAuthCta.tsx`
  - Client-side header CTA for the marketing page
  - Uses Clerk state to show either the sign-in entry point or the inbox link

- `apps/web/src/app/page.tsx`
  - Uses the auth-aware header CTA without making the entire marketing page dynamic

- `apps/web/src/app/app/layout.tsx`
  - Enforces the server-side app allowlist for authenticated app routes
  - Renders the shared app shell outside excluded Localiza paths

- `apps/web/src/app/app/AppShellNav.tsx`
  - Provides compact app navigation and the Clerk `UserButton`

- `apps/web/src/lib/app-access.ts`
  - Centralizes approved email resolution from defaults plus `APP_ALLOWED_EMAILS`

- `apps/web/src/app/app/studio/page.tsx`
  - Redirects legacy studio traffic to `/app/inbox`

- `apps/web/src/app/globals.css`
  - Adds scoped Clerk styling under `.casedra-clerk-auth`

## Branding Notes

The authentication screen follows the repository brand guidance:

- Cream canvas background
- Copper accent for primary actions and auth links
- Instrument Serif for headline treatment
- Geist for interface text

All Clerk-specific styling is scoped to the branded auth container to avoid leaking component overrides into the rest of the app.

## Verification

Verified locally:

- `npx biome check --write <reviewed files>`
- `pnpm --dir apps/web exec tsc --noEmit`
- `git diff --check`
- `pnpm --dir apps/web build`

## Current Assumptions

- `/app/inbox` is the default authenticated landing page
- `/sign-in` is the canonical sign-in URL for the web app
- App-route server layouts and TRPC context both enforce the app-level allowlist

## Follow-Up Options

Possible next steps if the product surface expands:

- Add a dedicated sign-up route if the marketing flow needs separate entry points
- Add route-level onboarding guards after sign-in
- Add auth-specific tests once a frontend test runner is introduced for `apps/web`
