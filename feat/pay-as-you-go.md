# Pay-as-you-go Creative Studio trial

Target repo: `/Users/landmann/Projects/tryiton/webapp`.

Note: the active workspace is `casedra`, but Express Headshots and Creative Studio live in the Try It On repo. This plan targets those Try It On paths.

## Goal

At the bottom of Express Headshots results, invite eligible users to unlock Creative tools on that Express model without a subscription. Clicking `Sure!` turns on pay-as-you-go access; generation still spends credits. Pay-as-you-go images are deleted after 30 days unless the user upgrades to Creative Studio.

## Current ground truth

- Express results mount `PhotoshootGallery` from `src/pages/express/[modelId]/results.tsx`.
- The bottom Express-only deletion note already lives in `src/components/photoshoots/gallery/gallery.tsx`.
- Creative Studio access resolves through `src/server/services/subscriptions/studio-access.ts`.
- Creative Studio index/model creation stays subscription-only.
- `newCreativeStudioModel` deducts `NEW_MODEL` credits after subscription/admin access is verified.
- `expire-old-images.ts` expires one-time products after `EXPIRE_AFTER_DAYS`; Creative Studio is intentionally excluded today.
- `ai_generation.deleted_at` already hides deleted generated media.

## Terminology

`pay_as_you_go` is the internal Creative Studio access source returned by `studio-access.ts`, next to existing sources like `creative_subscription` and `none`.

The existing `public.user.metadata` JSONB stores one durable fact: whether the user has pay-as-you-go Creative Studio access.

## Product decisions

- The only persisted entitlement is `metadata.creativePaygEnabled`.
- Show the offer only on owned Express result pages with at least one completed image when `metadata.creativePaygEnabled` is absent/false.
- Do not show on team/project/shared galleries, pending Express drafts, or Creative Studio pages.
- Do not mutate `user.stripe_sub_status`; subscriptions remain Stripe-backed.
- "Free of charge" means free access unlock, not free generation. Images still spend credits.
- Upgrade before deletion preserves payg images under normal Creative Studio retention.
- Pay-as-you-go does not unlock standalone Creative Studio model creation; this preserves the Express model as the cleanup signal.

## UI

Add a compact bottom card below the existing Express deletion note:

- Title: `Try Creative Studio without a subscription`
- Body: `We're trialing pay-as-you-go access with select customers. Unlock it free, then only pay for images you generate. Those images are deleted after 30 days unless you upgrade.`
- Primary CTA: `Sure!`
- Secondary CTA: `Maybe later`

UX requirements:

- Use the existing button/modal primitives and sentence-case labels.
- Card should feel like a polished product invitation, not an ad: centered, soft gradient border, subtle glass/blur, clear `30 days` badge.
- `Sure!` shows an inline loading state, disables both actions, and never double-submits.
- Success state replaces the card with `Creative Studio is unlocked` and an `Upgrade` link.
- Errors render inline in the card; no toast.
- Keyboard, focus, and mobile touch targets must be first-class.

## Data model

No database migration is required.

Store the toggle in existing `public.user.metadata`:

```json
{
  "creativePaygEnabled": true
}
```

Do not add retention columns to `ai_generation`. Pay-as-you-go cleanup is derived from the existing model/generation relationship and the user's current subscription state.

Do not add this field to any user-editable metadata mutation. Only the pay-as-you-go accept mutation and admin toggle should write it.

## Server changes

1. Extend `studio-access.ts`.
   - Add Creative source `pay_as_you_go`.
   - Select `user.metadata`.
   - `creative.hasAccess=true` when subscription access is active/canceled or `metadata.creativePaygEnabled=true`.
   - Keep Fashion behavior unchanged: payg does not unlock Fashion unless deliberately added later.

2. Add protected user mutation.
   - `enableCreativePayg`: validates the current owned standalone Express model, idempotently sets `metadata.creativePaygEnabled=true`, and returns fresh access.
   - Repeated enables return success.

3. Add admin controls.
   - Minimal toggle in existing admin user details/other actions: pay-as-you-go on/off.
   - Admin toggle writes `metadata.creativePaygEnabled`.
   - No Stripe subscription or trial subscription is created.

4. Harden generation paths.
   - Server decides access from `studio-access.ts`, not client optimistic state.
   - Pay-as-you-go generations continue to write through the existing generation/model relationship.
   - Failed or processing generations are not expired by the payg cleanup job.

5. Preserve on upgrade.
   - No generation-row backfill needed. Cleanup checks the user's current subscription state at runtime.
   - If the user has active/canceled Creative subscription access, cleanup skips their pay-as-you-go media.

6. Delete expired payg media.
   - Extend `expire-old-images.ts` or add a sibling cron.
   - Select completed generated media linked to pay-as-you-go Express models older than 30 days.
   - Skip rows for users who currently have active/canceled Creative subscription access.
   - Delete `media_key` and any stored provider artifact key if present.
   - Set `ai_generation.deleted_at`.
   - Log scanned/deleted/failed counts to `cron_log`.
   - Partial S3 failures should not mark DB rows deleted.

## Client changes

- `PhotoshootGallery`
  - Fetch user access and offer state.
  - Render the offer in the existing Express-only bottom area.
  - Invalidate `user` and `user.getStudioSubscriptionAccess` after enable.

- `PhotoshootSelectorPage`
  - Keep standalone Creative Studio subscription-only for non-admins.

- Creative Studio gallery/sidebar
  - For `pay_as_you_go`, show a small non-blocking retention note: `Pay as you go. Images are deleted after 30 days unless you upgrade.`
  - Add an upgrade link to `/purchase/creative-studio`.

- Creative Studio index/model creation
  - Keep `/creative-studio` and `newCreativeStudioModel` subscription-only for non-admins.

## Error modes

- No owned completed Express result: no card.
- Toggle off or absent: show the card on eligible Express results; no Creative tools until `Sure!`.
- Toggle on: no offer card; show the Express Creative tools and retention note.
- Already subscribed: no card; normal Creative Studio access wins.
- Storage/DB failure: card keeps state, shows retry copy.
- Concurrent clicks: idempotent mutation, disabled UI.
- Stripe webhook race: subscription release is idempotent.
- Cleanup crash: per-row try/catch, cron logs failures, no DB delete after failed S3 delete.

## Manual verification

- Eligible Express user sees the card only after completed owned results while `metadata.creativePaygEnabled` is absent/false.
- `Sure!` unlocks Creative Studio without changing `stripe_sub_status`.
- Admin can turn pay-as-you-go access on/off with one toggle.
- Payg user can generate from the Express results panel if they have enough credits.
- Payg user cannot create a standalone Creative Studio model without a subscription.
- Generated payg images become cleanup-eligible after 30 days through the existing model/generation relationship.
- Upgrade prevents cleanup without backfilling generation rows.
- Due payg images delete from S3 and disappear from the gallery.
- Ineligible/shared/team/Creative pages never show the offer.
