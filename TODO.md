# TODO

Running list of setup / platform work outstanding after initial Vercel deploy.
Grouped by when it matters, not by priority.

## Infrastructure — before external users

- [ ] **Connect repo to Vercel** so `git push` triggers preview + production deploys (Vercel dashboard → Project → Settings → Git)
- [ ] **Convex production deployment** — dev deployment is non-durable. Run `npx convex deploy` and add `CONVEX_DEPLOY_KEY` to Vercel prod env
- [ ] **Clerk production instance** — current instance is dev-mode (`inviting-emu-55`). Create prod instance, swap `CLERK_*` vars on Vercel for production target only
- [ ] **Custom domain** — pick and attach (e.g. `casablanca.cloud`, `casablanca.studio`). Vercel dashboard → Project → Domains
- [ ] **Sign-in / sign-up pages** — `ClerkProvider` is mounted but no `/sign-in` or `/sign-up` routes. Needed before anyone can gate `/app/*`

## Feature-driven (wire when the feature ships)

- [ ] **Stripe webhook secret** — required when billing flows start handling real events
- [ ] **Firecrawl API key** — needed when MLS listing ingestion goes live
- [ ] **PostHog** — analytics + feature flags; wire when we need funnels
- [ ] **Asset storage** — start with Convex File Storage (zero extra infra). Revisit Digital Ocean Spaces or Cloudflare R2 at ~10 GB or when video/CDN control matters

## Nice-to-have / later

- [ ] **Expo mobile app deploy** — `apps/mobile` is scaffolded; no EAS project, Clerk RN keys, or store submissions yet
- [ ] **Seed data** for Convex — currently empty; add example listings for internal demo
- [ ] **CI** — no GitHub Actions / lint / typecheck on PR yet; Vercel git integration covers deploy-time checks but not code review
