# Casablanca

Casablanca is a media studio and CRM platform for real-estate teams. This monorepo is powered by Turborepo, Next.js, Expo, Convex, BetterAuth, and Fal.ai.

- Read **SETUP.md** for full environment and integration instructions.
- Web studio lives in `apps/web`, mobile shell in `apps/mobile`.
- Shared logic/components live in the `packages/*` workspaces, Convex functions in `convex/`.

```bash
pnpm install
pnpm dev --filter web
```
