# TODO-LOCALIZA

## One-line pitch

Given an Idealista listing URL, Casedra resolves the smallest verifiable official location we can support for that property, fills the listing form with confidence-aware address data, and never silently writes a wrong address.

## Why This Matters Now

Users are already telling us that hidden-address Idealista listings are a practical blocker. If Casedra can turn an Idealista URL into a trustworthy address workflow, we remove manual research from the listing intake path and make the rest of the product more useful immediately.

This feature is worth doing now because:

- It solves a concrete user pain point with direct daily value.
- It fits the existing onboarding flow instead of requiring a new product surface.
- It creates a better listing import story than generic "paste a URL and hope for the best."
- It is defensible: the hard part is not scraping pages, it is turning partial listing signals into a confidence-scored official parcel or address.

## User Problem

Target user:

- A Spanish real-estate agent or broker using Casedra to create a listing from a public portal URL.

Primary job to be done:

- "I pasted an Idealista link. Tell me the exact property location, or show me the smallest set of official candidates so I can confirm it quickly."

Current pain:

- Idealista often hides the street number or exact address.
- Agents then have to manually inspect maps, compare photos, cross-check Catastro, or contact the listing agent.
- This slows down intake and produces inconsistent address quality.

## Product Contract

This feature must do all of the following:

1. Accept a user-submitted Idealista listing URL.
2. Extract every location signal we can legally and operationally obtain from that listing.
3. Resolve those signals against official cadastral sources.
4. Return one of four explicit outcomes:
   - `exact_match`: exact property location confirmed strongly enough to prefill automatically
   - `building_match`: exact building or parcel found, but unit-level precision is not proven
   - `needs_confirmation`: a short candidate list is available and the user must pick one
   - `unresolved`: Casedra cannot support a trustworthy result and leaves the form manual
5. Explain why the result was chosen.
6. Keep the address fields editable by the user at all times.
7. Record enough evidence to audit how the resolution happened.
8. Only auto-fill location-related fields from the resolver. Non-location listing fields remain explicit user input in this feature.

This feature must not silently guess.

## Success Criteria

We call the feature successful only if all of these are true in internal and beta rollout:

- `0` silent false-positive autofills. Any low-confidence result must require user confirmation.
- At least `80%` of tested Idealista hidden-address links return `building_match` or better.
- At least `60%` of the golden-dataset subset marked `human_unit_resolvable` return `exact_match`.
- Median uncached resolve time is under `12s`.
- Median cached resolve time is under `1.5s`.
- Fewer than `5%` of resolve attempts end in an unhandled error.
- At least `70%` of users who paste an Idealista URL complete the listing create flow without abandoning at the address step.

## Owner, Dependencies, And Approvals

Owner:

- Product + engineering owner: current Casedra product engineer on listing intake.

Required dependencies:

- Access to the official cadastral services already researched
- `FIRECRAWL_API_KEY` if Firecrawl is used as an acquisition adapter
- Idealista API credentials if the official API path is approved
- Browserbase credentials plus proxy setup, or an equivalent browser-worker runtime, only if the first two acquisition adapters are insufficient

Required approvals before GA:

- Product sign-off on the four-state contract
- Engineering sign-off on the golden dataset thresholds
- Explicit compliance sign-off if the browser-worker adapter is enabled in production

Budget stance:

- Preferred steady-state cost is near-zero or low-volume request cost because this feature only runs on user-submitted URLs.
- We will not adopt an expensive bulk-scraping platform as the default for this workflow.
- If Browserbase is used for the fallback adapter, keep sessions short and block unnecessary assets because proxy bandwidth is likely the main marginal cost driver.

## Verified External Findings

These points are verified from official sources or live endpoint checks done on `2026-04-21` and `2026-04-22`:

### Idealista

- Idealista allows advertisers to hide the exact address publicly.
- `idealista/maps` states that its information is built from Catastro plus non-personal listing data.
- `idealista/maps` can show an advertised property from its address page when the property is currently listed.
- Direct non-browser fetches of `https://www.idealista.com/inmueble/108926410/` returned an anti-bot JS/captcha interstitial in our environment.
- Idealista's general terms prohibit using automated mechanisms to copy or extract content without authorization, so official API access is preferable if approved.

### Catastro

- The public national Catastro services expose non-protected data and official WSDLs for:
  - reverse lookup from coordinates to cadastral reference
  - nearby parcel lookup from coordinates
  - lookup from cadastral reference to address and descriptive data
  - street and number lookup through callejero services
- The national Catastro public services cover Spain except `País Vasco` and `Navarra`.
- The reverse coordinate endpoint works with the `14-character` parcel reference, not the `20-character` unit reference.
- The national services return official location data that is strong enough to use as the canonical source of truth outside the excluded territories.

### Regional cadastral systems

- Navarra has an official `Registro de la Riqueza Territorial` and Geoportal with public parcel, address, and non-protected property information.
- Álava, Bizkaia, and Gipuzkoa each maintain their own official cadastral services and viewers.

### Browserbase

- Browserbase supports Playwright-connected cloud browser sessions and hosted Functions, so we can run a fallback browser worker without managing separate runner infrastructure.
- Browserbase supports residential proxies with Spain geolocation, browser contexts, and session observability.
- Browserbase pricing is plausible for a low-volume fallback path, but proxy bandwidth is billed separately and is likely the main cost driver for this workflow.
- Browserbase's stronger verified-access capabilities sit behind higher-tier plans, so we should treat it as a fallback acquisition tool, not as a guaranteed bypass for protected pages.

### Comparable product patterns

From the user-provided screenshots of other Spanish property tools:

- Comparable tools visibly show a `Dirección propuesta`, a `Referencia catastral`, and an explicit official source label such as `Dirección General del Catastro`.
- Comparable tools appear to join listing-level portal data with official cadastral identity rather than relying on listing text alone.
- The presence of full unit detail such as `escalera`, `planta`, and `puerta` implies that the strongest tools attempt unit-level confirmation when evidence supports it.
- The presence of duplicate counts, portal history, and agency timelines implies a separate listing-intelligence graph keyed to parcel or unit identity.

Implication for Localiza:

- We should match the trust-signaling part of that experience: proposed official address, cadastral reference when available, official source label, and explicit confidence.
- We should not widen Localiza into a cross-portal history or duplicate-intelligence product. That is a separate feature area, not part of this intake resolver contract.

## Repo Ground Truth

The current repo already gives us a good insertion point:

- Listing creation currently requires a full address in `packages/api/src/schema/listings.ts`.
- The Convex `listings` table mirrors that requirement in `convex/schema.ts`.
- The onboarding UI already supports a URL-driven listing source path in `apps/web/src/app/app/onboarding/OnboardingFlow.tsx`.
- `sourceType` currently only supports `manual` and `firecrawl`.
- `FIRECRAWL_API_KEY` is already present in `apps/web/src/env.ts`, but the actual listing ingestion flow is still pending.
- PostHog client bootstrapping already exists in `apps/web/src/lib/posthog.ts`.
- The current onboarding listing copy and placeholders are still US-centric, so Localiza must tighten that surface for Spanish listing intake instead of dropping into the existing wording unchanged.

This means we should build Localiza as an intake resolver inside the existing create flow, not as a separate product module.

## Why This Approach And Not The Alternatives

We are choosing this route intentionally.

- Not manual-only: manual lookup is the current pain and does not scale with user trust.
- Not bulk scraping products as the default: tools like Apify or managed browser platforms are priced for extraction infrastructure, not for low-volume user-submitted lookups.
- Not a pure geocoder: reverse geocoding approximate listing coordinates is not trustworthy enough for exact property data.
- Not owner or registry lookup: ownership research is a separate product and compliance problem.

This plan wins because it keeps the feature aligned to the actual user ask, uses official cadastral sources for truth, and treats automated extraction only as a way to obtain signals, not as the final answer.
If we use Browserbase, it is only as a surgical fallback signal collector for a single user-submitted URL, not as a general scraping layer.

## Explicit Decisions

These are resolved decisions for this plan. They are not open questions.

### 1. Canonical truth source

Official cadastral data is the canonical source of truth for location.

- Idealista is treated as a signal source.
- Catastro or the relevant regional cadastre is treated as the authoritative source for parcel or address confirmation.

### 2. Feature promise

We will not promise "always exact." We will promise "exact when verifiable, otherwise confidence-aware confirmation."

### 3. Launch scope

This feature is only for `user-submitted Idealista URLs`.

- No bulk crawling.
- No city-wide monitoring jobs.
- No owner lookup.
- No automated outreach.

### 4. Source acquisition strategy

We will implement Localiza with an adapter interface and parallel adapter development:

- `Idealista official API`, if approved and if it exposes enough signals for a pasted listing URL or property code.
- `Firecrawl rendered extraction`, because the repo already anticipates Firecrawl.
- `Browserbase-backed browser automation worker` for user-submitted URLs only, guarded behind explicit ops and legal approval.

User-facing strategy rules:

- The default user path is `Auto`.
- `Auto` chooses the best currently available adapter in priority order and keeps the UI simple.
- If `Auto` fails or returns `unresolved`, the user can retry with an explicit method.
- Advanced or beta users may choose a method up front when they want deterministic debugging or comparison.
- We expose user-facing strategy labels, not internal implementation detail dumps.

Engineering rules:

- We still keep a preferred server-side priority order for `Auto`.
- We record both the `requestedStrategy` and the `actualAcquisitionMethod` used for the attempt.
- We treat adapter choice as part of cache identity so a bad result from one method does not poison the others.

The browser worker is a minimal-signal acquisition step, not a scraping pipeline.

- It should collect only the smallest set of signals needed to resolve against official sources, such as listing ID, municipality, district or postal hint, approximate map point, price, area, floor text, and any building or portal clue.
- It must not attempt full-page archiving, bulk extraction, or media harvesting.

### 5. Trust-signaling output

When Localiza has official evidence, the UI should expose the evidence in a way that mirrors the best market examples:

- proposed official address
- cadastral reference when available
- official source label such as `Dirección General del Catastro` or the relevant regional cadastre
- concise explanation of why the match was selected
- clear indication when the result is building-level only and not unit-confirmed

The core resolver, scoring, UI, and persistence do not change across adapters.

### 6. Safety rule

No address is auto-filled into the listing unless the resolver reaches `exact_match` confidence. `building_match` and `needs_confirmation` require an explicit user action.

## User Experience

### Entry point

Inside the existing onboarding listing form, the user pastes an Idealista URL, leaves the strategy on `Auto` or selects a specific method, and clicks `Find exact location`.

UI compatibility rules for the existing onboarding form:

- Replace generic `MLS or public listing URL` copy with Idealista-specific language when Localiza is enabled.
- Default the country field to `Spain` after a successful Localiza resolution and in any Idealista-first flow.
- Use Spain-relevant placeholder examples for address fields so the flow does not feel US-specific.
- Remove obviously US-only field labels from the same flow, such as `Price (USD)` and `Interior square feet`, before exposing Localiza to Spanish beta users.
- If the underlying listing schema remains unchanged for non-location fields, treat price and area as user-entered business data and not as canonical location evidence.
- Keep `Auto` as the default visible path so the UI does not force non-technical users to pick an implementation detail first.
- When the result is `unresolved`, keep the method selector visible so the user can retry with another acquisition path immediately.

### Happy path: exact match

1. User pastes URL.
2. Casedra resolves an `exact_match`.
3. The form shows a success card:
   - resolved street address
   - municipality and postal code
   - cadastral reference when available
   - official source label
   - confidence label `Exact match`
   - short explanation like `Matched official cadastral parcel and validated against listing signals`
4. Address fields are prefilled.
5. User can still edit anything before saving.

### Happy path: building match

1. User pastes URL.
2. Casedra finds the building or parcel but not the exact unit.
3. The form shows:
   - building address
   - cadastral reference when available
   - official source label
   - confidence label `Building match`
   - note that the listing likely belongs to this building, but unit precision is not proven
   - button `Use this building` or `Review candidates`
4. If the user accepts, we prefill the building address and store resolution metadata as `building_match`.

### Happy path: needs confirmation

1. User pastes URL.
2. Casedra returns 2-5 ranked candidates.
3. Each candidate card shows:
   - address
   - parcel reference
   - official source label when the candidate came from an official cadastral adapter
   - distance from listing map point
   - matching signals such as floor, m2, postcode, district, or price proximity
   - confidence badge
4. User selects one candidate to prefill the form.

### Unresolved path

If Casedra cannot support a trustworthy answer:

- show `We could not verify the exact location for this link`
- preserve the pasted URL
- keep manual address entry visible
- offer `Try again`
- log the failure with the extracted signals and error reason

### Post-save success state

After the listing is created:

- show the chosen resolution label in the confirmation UI
- show whether the final saved address came from `exact_match`, `building_match`, or `manual_override`
- keep the original Idealista URL visible in listing metadata for auditability

### Loading state

During resolution:

- show a single progress block, not a fake multi-step spinner
- copy: `Checking the listing and matching it to official parcel data`
- disable duplicate submit clicks
- allow cancellation by editing the URL
- enforce a hard server deadline so the UI does not hang indefinitely on a blocked adapter

### Accessibility and polish

- All result states must be keyboard reachable.
- Candidate cards must be usable with radio-style selection semantics.
- Status text must not rely on color only.
- Mobile layout must stack candidate cards without truncating explanations.
- Screen-reader text must announce confidence and whether confirmation is required.

## End-to-End Technical Design

### Core flow

1. Validate the URL.
2. Parse the Idealista listing ID from the path.
3. Check for a fresh cached resolution by `(provider, externalListingId, resolverVersion, requestedStrategy)`.
4. If there is no fresh cached result, acquire a short-lived in-flight lease so concurrent requests do not fan out to the same third parties.
5. Resolve listing signals through the configured acquisition adapters under an overall request deadline.
6. Normalize the extracted signals into a common format.
7. Route the request to the correct cadastral adapter:
   - `state_catastro` for Spain except Navarra and País Vasco
   - `navarra_rtn` for Navarra
   - `alava_catastro`, `bizkaia_catastro`, `gipuzkoa_catastro` for the Basque territories
8. Generate candidate parcels or addresses.
9. Score the candidates.
10. Persist the normalized result in cache with evidence, expiry, strategy, and adapter metadata.
11. Return a structured result with confidence, evidence, and candidate list.
12. On user confirmation or create, persist the selected location plus the resolution audit trail on the listing itself.

### Normalized signal model

Every acquisition adapter must output this shape:

```ts
type IdealistaSignals = {
  provider: "idealista";
  listingId: string;
  sourceUrl: string;
  title?: string;
  price?: number;
  propertyType?: "homes" | "offices" | "premises" | "garages" | "bedrooms";
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  floorText?: string;
  portalHint?: string;
  neighborhood?: string;
  municipality?: string;
  province?: string;
  postalCodeHint?: string;
  approximateLat?: number;
  approximateLng?: number;
  mapPrecisionMeters?: number;
  listingText?: string;
  imageUrls?: string[];
  acquisitionMethod: "idealista_api" | "firecrawl" | "browser_worker";
  acquiredAt: string;
};
```

Browser worker acquisition rules:

- Prefer DOM text or map payloads over screenshots or downloaded media.
- Abort images, video, fonts, and unrelated third-party assets unless one of them is required to expose a needed signal.
- Persist normalized signals and compact evidence only, not raw page dumps.

### Cadastral adapters

#### State Catastro adapter

Use the official national Catastro services:

- `Consulta_RCCOOR_Distancia` to get candidate parcels near the listing map point.
- `Consulta_DNPRC_Codigos` to retrieve the official descriptive address for a parcel or unit.
- `ConsultaViaCodigos` and `ConsultaNumeroCodigos` when we have street-like signals but the coordinate path is weak.

Rules:

- Prefer the nearby-coordinate path when approximate coordinates are present.
- Use the `14-character` parcel reference for coordinate operations.
- Expand to full descriptive lookup before showing any result to the user.

#### Navarra adapter

Use official Navarra public systems:

- `Geoportal Catastro`
- `Registro de la Riqueza Territorial`

Implementation rule:

- The adapter must resolve by official parcel/address search when machine-readable access is available.
- If Navarra only exposes the candidate parcel through a public viewer flow for the needed data, Localiza must still return `needs_confirmation` with the smallest official candidate set and the viewer link; it must not claim `exact_match` without machine-verifiable evidence.

#### Álava, Bizkaia, Gipuzkoa adapters

Use the relevant official provincial cadastre service:

- Álava official cadastre
- Bizkaia official cadastre
- Gipuzkoa official cadastre

Implementation rule:

- Same as Navarra: exact automation if machine-readable endpoints exist; otherwise official candidate list plus confirmation.
- We still support these territories in the feature contract through structured manual confirmation. We do not silently mark them unsupported.

### Candidate scoring

Each candidate gets a score from `0` to `1`.

Score inputs:

- exact municipality match: `required`
- province match: `required`
- distance from listing coordinates
- postal code hint match
- district or neighborhood text similarity
- property type compatibility
- area similarity
- price similarity
- floor or portal signal match
- `idealista/maps` backlink confirmation to the same listing ID when obtainable

Hard rules:

- Any candidate that fails municipality or province match is discarded.
- Any candidate outside a configured distance threshold is discarded unless the listing does not expose coordinates.
- If the top two candidates are too close in score, the result becomes `needs_confirmation`.
- `idealista/maps` confirmation beats all soft-signal heuristics.

Initial thresholds:

- `exact_match`: score `>= 0.90` and either
  - official parcel or unit confirmed by multiple independent signals, or
  - `idealista/maps` confirms the same listing ID for the resolved address
- `building_match`: score `>= 0.75` and official building or parcel clearly leads, but unit precision is not proven
- `needs_confirmation`: at least one candidate above `0.45` with no safe winner
- `unresolved`: no candidate above `0.45`

### Evidence model

Every result must include machine-readable evidence:

```ts
type ResolutionEvidence = {
  reasonCodes: string[];
  matchedSignals: string[];
  discardedSignals: string[];
  candidateCount: number;
  requestedStrategy: "auto" | "idealista_api" | "firecrawl" | "browser_worker";
  actualAcquisitionMethod?: string;
  officialSource: string;
};
```

### Persistence model

We need two persistence changes.

#### A. Extend the listing domain model

Add optional metadata to listings so the resolution is auditable after creation:

- `sourceType`: add `"idealista"`
- `sourceMetadata?:`
  - `provider: "idealista"`
  - `externalListingId: string`
  - `sourceUrl: string`
- `locationResolution?:`
  - `status: "exact_match" | "building_match" | "needs_confirmation" | "unresolved" | "manual_override"`
  - `confidenceScore: number`
  - `officialSource: string`
  - `parcelRef14?: string`
  - `unitRef20?: string`
  - `resolvedAddressLabel?: string`
  - `resolverVersion: string`
  - `resolvedAt: string`
  - `reasonCodes: string[]`

Backward compatibility:

- Existing listings remain valid because all new fields are optional.
- Existing `location` remains required at create time.

#### B. Add a dedicated resolution cache table

Add a new Convex table such as `locationResolutions`:

- provider
- externalListingId
- sourceUrl
- requestedStrategy
- resolverVersion
- status
- normalizedSignals
- candidates
- selectedCandidate
- leaseOwner
- leaseExpiresAt
- lastAttemptAt
- lastCompletedAt
- expiresAt
- errorCode
- errorMessage

Indexes:

- lookup by `(provider, externalListingId, resolverVersion, requestedStrategy)`
- lookup by `sourceUrl`
- lookup by `expiresAt` for cleanup jobs

Why:

- prevents repeated third-party hits for the same URL
- gives us auditability
- supports retries and observability
- lets us dedupe concurrent resolve attempts

Concurrency rule:

- Do not rely on index uniqueness alone for dedupe. Use an application-level in-flight lease with a short timeout and make later callers poll or reuse the cached result.

### API surface

Add a new protected tRPC mutation in `packages/api/src/routers/listings.ts`:

```ts
resolveIdealistaLocation(input: {
  url: string;
  strategy?: "auto" | "idealista_api" | "firecrawl" | "browser_worker";
})
```

Response shape:

```ts
type ResolveIdealistaLocationResult = {
  status:
    | "exact_match"
    | "building_match"
    | "needs_confirmation"
    | "unresolved";
  requestedStrategy: "auto" | "idealista_api" | "firecrawl" | "browser_worker";
  confidenceScore: number;
  prefillLocation?: {
    street: string;
    city: string;
    stateOrProvince: string;
    postalCode: string;
    country: "Spain";
  };
  candidates: Array<{
    id: string;
    label: string;
    parcelRef14?: string;
    unitRef20?: string;
    distanceMeters?: number;
    score: number;
    reasonCodes: string[];
  }>;
  evidence: ResolutionEvidence;
  sourceMetadata: {
    provider: "idealista";
    externalListingId: string;
    sourceUrl: string;
  };
  cacheExpiresAt?: string;
};
```

Create flow:

- The user first calls `resolveIdealistaLocation`.
- The user then calls the existing `create` mutation with the selected address and attached resolution metadata.
- If the user overrides the suggested address manually, the final create payload stores `manual_override`.

Create input changes:

- Extend `listingCreateInputSchema`, `ListingCreateInput`, and the Convex `create` mutation args with:
  - `sourceType: "manual" | "firecrawl" | "idealista"`
  - `sourceMetadata?:`
    - `provider: "idealista"`
    - `externalListingId: string`
    - `sourceUrl: string`
  - `locationResolution?:`
    - `status: "exact_match" | "building_match" | "needs_confirmation" | "unresolved" | "manual_override"`
    - `confidenceScore: number`
    - `officialSource: string`
    - `parcelRef14?: string`
    - `unitRef20?: string`
    - `resolvedAddressLabel?: string`
    - `resolverVersion: string`
    - `resolvedAt: string`
    - `reasonCodes: string[]`

Manual override rule:

- If the user changes any prefilled address field materially after normalization, persist `manual_override` even if the resolver originally returned `exact_match` or `building_match`.

Context change:

- Extend `packages/api/src/context.ts` with a `localiza` service so the router does not own third-party request logic directly.
- Keep all secret-bearing acquisition adapters on the server side.

## Environment And Configuration

Add these environment variables:

- `LOCALIZA_ENABLED` for server-side feature gating
- `NEXT_PUBLIC_LOCALIZA_ENABLED` for client-side gating
- `IDEALISTA_API_KEY` and `IDEALISTA_API_SECRET` if official API access is granted
- `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` if the Browserbase-backed browser-worker adapter is required

Rules:

- The onboarding UI must hide the Localiza action when `NEXT_PUBLIC_LOCALIZA_ENABLED` is false.
- The server must reject resolver calls when `LOCALIZA_ENABLED` is false.
- The browser-worker adapter must not be instantiated unless its Browserbase env vars are present.
- The resolver must enforce per-adapter timeouts and an overall deadline so one slow adapter cannot block the create flow indefinitely.

### Server modules to add

Create these modules in `apps/web/src/server/localiza/`:

- `types.ts`
- `idealista-adapter.ts`
- `firecrawl-adapter.ts`
- `browser-worker-adapter.ts`
- `maps-verifier.ts`
- `catastro-state.ts`
- `catastro-navarra.ts`
- `catastro-alava.ts`
- `catastro-bizkaia.ts`
- `catastro-gipuzkoa.ts`
- `score.ts`
- `resolver.ts`
- `errors.ts`

Implementation note:

- Keep the adapter boundary generic, but prefer Browserbase plus Playwright for the first fallback implementation.

### Repo files to modify

- `apps/web/src/app/app/onboarding/OnboardingFlow.tsx`
- `apps/web/src/env.ts`
- `packages/api/src/schema/listings.ts`
- `packages/api/src/routers/listings.ts`
- `packages/api/src/context.ts`
- `packages/types/src/index.ts`
- `convex/schema.ts`
- `convex/listings.ts`

## Developer Execution Checklist

This is the working engineering checklist for Localiza. It is intentionally more granular than the product brief and should be kept current as slices land.

### Phase 0. Ground truth and rollout guardrails

- [x] Re-read the full Localiza brief and verify the current repo insertion points.
- [x] Confirm where listing create data currently enters the system.
- [ ] Confirm where the golden dataset fixtures will live in-repo.
- [ ] Decide the first `resolverVersion` format and bump policy.
- [ ] Confirm whether the first rollout is gated by env only or by a user allowlist.
- [ ] Document the exact unsupported and blocked cases to surface during beta.

### Phase 1. Shared domain model and persistence contract

- [x] Extend shared listing types to support `sourceType: "idealista"`.
- [x] Add optional `sourceMetadata` to listing create/read shapes.
- [x] Add optional `locationResolution` to listing create/read shapes.
- [x] Extend Zod listing schemas for the new Localiza fields.
- [x] Enforce source-type and metadata consistency in API validation.
- [x] Extend Convex listing schema for the new Localiza fields.
- [x] Extend the Convex listing create mutation args and insert path to persist the new fields.
- [x] Enforce source-type and metadata consistency again at the Convex mutation boundary.
- [ ] Decide whether `priceUsd` and `squareFeet` should be renamed to unit-neutral field names before Spanish beta.
- [ ] Decide whether listings need a normalized display label separate from component address fields.

### Phase 2. Onboarding and listing-intake groundwork

- [x] Remove US-centric onboarding address placeholders from the listing step.
- [x] Add an Idealista-specific source mode to the onboarding listing intake.
- [x] Make the source URL field copy conditional on the selected intake mode.
- [x] Default Localiza-oriented listing flows to `Spain` for country storage.
- [x] Replace obviously US-only listing-step copy with Spain or portal-neutral language where safe.
- [x] Make listing source labels render correctly for `manual`, `firecrawl`, and `idealista`.
- [x] Add the `Find exact location` action to the onboarding form.
- [x] Add loading, exact, building, candidate, unresolved, and manual-override UI states.
- [x] Keep `Auto` as the default Localiza strategy in the onboarding UI.
- [x] Add explicit retry strategy selection for `Idealista API`, `Firecrawl`, and `Browser worker`.
- [x] Persist the selected Localiza metadata in the final create payload.
- [x] Keep the pasted Idealista URL visible after resolution and after save.
- [x] Make the final onboarding listing batch create idempotent across safe client retries.

### Phase 3. Server-side service boundary

- [x] Add a `localiza` service to API context so router code does not own resolution logic.
- [x] Add a protected `resolveIdealistaLocation` tRPC mutation.
- [x] Add server-side feature gating with `LOCALIZA_ENABLED`.
- [x] Add client-side feature gating with `NEXT_PUBLIC_LOCALIZA_ENABLED`.
- [x] Define the normalized `IdealistaSignals` model in server code.
- [x] Define the public resolver response contract used by the onboarding UI.
- [x] Add structured Localiza error types and timeout/error reason mapping.
- [x] Record `requestedStrategy` and `actualAcquisitionMethod` in cacheable resolver results.

### Phase 4. Acquisition adapters

- [x] Implement Idealista URL validation and listing ID parsing.
- [ ] Test whether official Idealista API access exists and is sufficient for user-submitted URLs.
- [ ] Implement the official Idealista adapter if approved and usable.
- [x] Implement the Firecrawl acquisition adapter.
- [ ] Benchmark Firecrawl success and failure modes on the golden dataset.
- [ ] Implement the Browserbase-backed fallback adapter only if the first two adapters are insufficient.
- [ ] Ensure the browser-worker path only collects minimum normalized signals.
- [ ] Ensure the browser-worker path does not persist raw HTML or page dumps.

### Phase 5. Cadastral adapters and resolution logic

- [x] Implement territory routing: national Catastro vs Navarra vs Álava/Bizkaia/Gipuzkoa.
  Current state: routing now uses province hints plus coordinate-safe reverse-geocode fallback, and dispatches into the national Catastro, Navarra RTN, or the Álava / Bizkaia / Gipuzkoa official cadastres as appropriate.
- [x] Implement the national Catastro adapter first.
- [x] Implement Navarra official candidate resolution.
- [x] Implement Álava official candidate resolution.
- [x] Implement Bizkaia official candidate resolution.
- [x] Implement Gipuzkoa official candidate resolution.
- [x] Implement candidate scoring and threshold logic.
- [x] Implement exact, building, candidate, and unresolved decision assignment.
- [x] Implement machine-readable evidence generation with stable `reasonCodes`.
- [ ] Add `idealista/maps` verification only as a higher-confidence signal, not as canonical truth.

### Phase 5A. Review follow-ups from the first state Catastro slice

- [x] Tighten `exact_match` designator proof in `apps/web/src/server/localiza/score.ts` and `apps/web/src/server/localiza/catastro-state.ts`.
  Current risk: `corpusIncludesDesignator()` can treat unrelated standalone numeric tokens in the listing text as unit or portal proof. Example: `3 habitaciones` can satisfy candidate designator `3`, which can incorrectly help promote a result to `exact_match`.
- [x] Split acquisition-adapter failures from cadastral matching failures in `apps/web/src/server/localiza/resolver.ts`.
  Current risk: the resolver wraps signal acquisition and official Catastro matching in the same `try` block, so a `state_catastro` timeout or error is currently recorded as `${strategy}_failed`. In `auto` mode this can also trigger unnecessary retries through other acquisition adapters instead of surfacing a cadastre failure cleanly.
- [x] Make regional routing coordinate-safe instead of province-string-only in `apps/web/src/server/localiza/score.ts` and `apps/web/src/server/localiza/catastro-state.ts`.
  Current risk: Navarra / Álava / Bizkaia / Gipuzkoa routing currently depends on `signals.province`. If the listing has usable coordinates but no province hint, we can still hit the national Catastro path even though those territories require regional cadastres.

### Phase 6. Cache, leases, and concurrency safety

- [x] Add a dedicated `locationResolutions` cache table.
- [x] Add lookup indexes for `(provider, externalListingId, resolverVersion)`.
- [x] Add cache lookup by `sourceUrl`.
- [ ] Add expiry lookup and cleanup behavior for stale cache rows.
- [x] Add an in-flight lease with short expiry for concurrent resolve attempts.
- [x] Make later callers reuse cached or in-flight results instead of fan-out resolving.
- [x] Add failure cooldown behavior for repeated hard failures.
- [x] Abort adapter work when per-adapter timeouts are exceeded.

### Phase 7. Observability and analytics

- [ ] Add structured server logs for start, adapter failure, cadastre failure, completion, confirm, and manual override.
- [x] Expose routed territory and exact official service URL in user-facing resolver output for auditability.
- [x] Add PostHog events for URL paste, resolve click, success, unresolved, candidate select, manual override, and listing created.
- [ ] Add metrics for success rate by acquisition adapter and territory adapter.
- [ ] Add unresolved-rate and timeout-rate monitoring thresholds.
- [ ] Add a severity-1 incident procedure for any confirmed false-positive autofill.

### Phase 8. Testing and fixture strategy

- [ ] Add unit tests for URL parsing.
- [ ] Add unit tests for signal normalization.
- [ ] Add unit tests for candidate scoring.
- [ ] Add unit tests for threshold and state assignment.
- [ ] Add integration tests for mocked resolver flows.
- [ ] Add integration tests for create-with-resolution metadata.
- [ ] Add integration tests for manual override.
- [ ] Add deterministic CI fixtures built from frozen normalized signals and official responses.
- [ ] Add a smaller live-link regression set for scheduled or manual verification.
- [ ] Add Playwright coverage for exact match, building match, needs confirmation, unresolved, and manual override flows.

### Phase 9. Rollout readiness

- [ ] Confirm zero silent false positives on internal dogfood before beta.
- [ ] Validate median resolve times against the stated targets.
- [ ] Validate success thresholds against the golden dataset.
- [ ] Keep manual entry fully functional even when the resolver is disabled.
- [ ] Write a narrow feature doc once the resolver path is wired into onboarding.

## Implementation Order

This is the concrete build order we will execute and later check against:

1. Extend shared types and schemas for `sourceType: "idealista"`, `sourceMetadata`, and `locationResolution`.
2. Extend Convex schema and `create` mutation so resolution metadata is persisted with the listing.
3. Add the Localiza service boundary and the `resolveIdealistaLocation` tRPC mutation.
4. Build the normalized signal model, resolver cache table, expiry behavior, and in-flight lease logic, including strategy-aware cache identity.
5. Implement the state Catastro adapter first because it covers most of Spain.
6. Implement Navarra and the Basque territory adapters so the contract works across supported regions.
7. Wire the onboarding UI states, Spain-specific copy, trust-signaling card, and manual override transitions.
8. Validate Firecrawl against the golden dataset.
9. Validate the explicit retry strategies against the same links so users can recover from adapter-specific failure.
10. Only stand up the Browserbase-backed minimal-signal worker if the official API and Firecrawl paths are insufficient on the dataset.
11. Finish observability, fixtures, regression tests, and feature-flagged rollout.

Execution notes:

- The first production-capable milestone is not "we can fetch portal data"; it is "we can return a trustworthy address outcome with auditable evidence."
- We should optimize for state Catastro coverage before spending time on browser automation.
- We should not implement duplicate history, agency timelines, or cross-portal listing graphs inside Localiza. Those are adjacent opportunities, not part of this feature's delivery criteria.

## State Transitions

The resolver state machine is:

1. `idle`
2. `resolving`
3. `resolved_exact`
4. `resolved_building`
5. `resolved_candidates`
6. `unresolved`
7. `confirmed`
8. `manual_override`

Rules:

- Editing the URL resets the state to `idle`.
- A new resolve attempt cancels the previous client-side state and reuses any valid cached server result.
- Double-clicking the resolve button must not launch duplicate network calls.
- Editing a prefilled address field after resolution moves the client state to `manual_override`.
- The final listing create call is the only write that creates a listing record.
- Safe retries of the final create call must reuse an idempotency key so the batch is not duplicated.

## Failure Modes And How We Handle Them

### Idealista source blocked

- If one acquisition adapter fails, try the next configured adapter.
- If all adapters fail, return `unresolved`.
- Surface a precise reason in logs: blocked, timed out, no content, invalid URL, unsupported market.

Timeout budget:

- Apply a strict overall resolver deadline of `10s`.
- Apply stricter per-adapter budgets inside that envelope so fallbacks still have time to run.
- Per-adapter timeouts must abort upstream acquisition work, not only the local await.
- If the overall deadline is exceeded, return `unresolved` with a timeout reason and leave manual entry available immediately.

### Catastro or regional cadastre unavailable

- Do not guess from raw listing coordinates alone.
- Return `needs_confirmation` only if we already have official candidates from cache.
- Otherwise return `unresolved` with a retry affordance.

### Ambiguous apartment building

- Do not auto-fill the unit.
- Return `building_match` or `needs_confirmation`.

### Listing deleted or changed between fetch and save

- The resolver result is advisory, not a permanent lock.
- If the listing disappears after resolution, the user can still create the listing with the already confirmed address.
- Persist the resolver version and resolution timestamp so future audits can explain which evidence was used.

### Repeated retries

- Cache by `(provider, externalListingId, resolverVersion)`.
- Use a short cooldown for repeated hard failures to avoid hammering third-party systems.
- If another request already owns the in-flight lease for the same listing, wait briefly for the cached result instead of launching a duplicate resolve path.

### Resolver regression after deployment

- Gate the feature behind an environment flag.
- Keep manual address entry fully functional.
- Rollback means disabling the resolver path; no listing data migration is required for safety.

### Wrong-address incident

- Treat any confirmed false-positive autofill as a severity-1 product bug.
- Add the offending URL to the golden dataset immediately.
- Ship the fix before widening rollout.

## Compliance And Data Handling

- Prefer official Idealista API access whenever available.
- Keep this feature limited to user-submitted URLs.
- Do not add bulk discovery, city sweeps, or unattended portal crawling.
- If the Browserbase-backed worker is enabled, use it only to collect the minimum structured signals needed for official resolution.
- If the Browserbase-backed worker is enabled, block unnecessary assets and avoid storing raw HTML or full page dumps.
- Do not store raw HTML long-term; persist normalized signals and evidence instead.
- Do not include owner lookup in this feature.
- If the browser-worker adapter is required, production rollout still needs an explicit compliance decision because Idealista's published terms restrict automated extraction, even when we only extract a narrow signal set.

## Observability

### Server-side logs

Emit structured logs for:

- `localiza.resolve.started`
- `localiza.resolve.adapter_failed`
- `localiza.resolve.catastro_failed`
- `localiza.resolve.completed`
- `localiza.resolve.user_confirmed`
- `localiza.resolve.manual_override`

Each log includes:

- user ID
- listing ID or source URL
- adapter used
- territory adapter used
- duration
- status
- confidence score
- candidate count
- error code if present

### Product analytics

Capture PostHog events if PostHog is configured:

- `localiza_url_pasted`
- `localiza_resolve_clicked`
- `localiza_resolve_success`
- `localiza_resolve_unresolved`
- `localiza_candidate_selected`
- `localiza_manual_override`
- `localiza_listing_created`

### Dashboard metrics

Track at minimum:

- resolve attempts per day
- success rate by status
- success rate by acquisition adapter
- success rate by territory adapter
- median duration
- manual override rate
- unresolved rate
- false-positive incident count
- abandonment rate after unresolved result

Alerts:

- Alert immediately on any confirmed false-positive autofill.
- Alert when unresolved rate or adapter timeout rate breaches the agreed beta threshold for two consecutive measurement windows.

## Test Plan

### Unit tests

- URL parsing
- signal normalization
- candidate scoring
- confidence threshold assignment
- state transition reducer logic if extracted from the UI

### Integration tests

- resolver with mocked Idealista signals and mocked Catastro responses
- create flow with exact match metadata
- create flow with manual override
- cache hit vs cache miss behavior

### End-to-end tests

Add Playwright e2e coverage for:

- exact match flow
- building match flow
- needs confirmation flow
- unresolved flow
- manual override flow

### Golden dataset

Maintain a fixture set of at least `30` real Idealista links covering:

- Madrid and Barcelona apartment buildings
- detached homes
- listings with hidden addresses
- listings with exact addresses
- Navarra
- one example from each Basque territory

Each fixture must store the expected final status and the officially validated address outcome.

Golden dataset rules:

- Keep two layers:
  - deterministic CI fixtures built from frozen normalized signals and official-source responses
  - a smaller live-link regression set for scheduled or manual verification against current portal behavior
- Do not make core CI depend on live portal availability or on listings that can disappear without notice.

## Rollout Plan

### Stage 1: internal dogfood

- Enable for internal users only.
- Use the golden dataset plus real user-submitted links.
- Verify zero silent false positives.

### Stage 2: controlled beta

- Enable for a small set of trusted agents.
- Watch unresolved rate, manual override rate, and wrong-address incidents.

### Stage 3: general availability

Ship once:

- the success thresholds are met
- the golden dataset remains green
- the unresolved path is stable
- the compliance path is approved for the configured acquisition adapter

Blast radius control:

- GA rollout still leaves manual entry available.
- Disabling the feature flag returns the product to the pre-Localiza behavior immediately.

## Timeline

Assumption: one engineer working full-time with product support from the founder.

### 2026-04-22 to 2026-04-23

- Build the normalized signal model and adapter interface.
- Test Idealista official API access if credentials exist.
- Test Firecrawl against the golden dataset.
- Stand up the fallback Browserbase-backed minimal-signal browser-worker path only if needed.

Timeline risk note:

- The dates above assume no external blocker on official API access, cadastral endpoint availability, or compliance review. If any of those block, beta timing moves, but the feature contract does not shrink.

### 2026-04-24 to 2026-04-25

- Build the state Catastro adapter.
- Build Navarra and Basque territory routing.
- Implement scoring and confidence thresholds.
- Persist resolution cache and metadata.

### 2026-04-26 to 2026-04-27

- Integrate the onboarding UI.
- Add candidate selection and manual override states.
- Add logs, analytics, and feature flag.

### 2026-04-28

- Build e2e coverage and golden dataset regression checks.
- Internal dogfood and threshold validation.

### 2026-04-29

- Controlled beta rollout and bug fixes.

This is a complete build, not a partial v1 with deferred core functionality.

## Acceptance Checklist

- [ ] User can paste an Idealista URL and trigger resolution from onboarding.
- [ ] Resolver returns one of the four contract states every time.
- [ ] Exact results only auto-fill when confidence rules are satisfied.
- [ ] Building-level and ambiguous results require user confirmation.
- [ ] User can manually override any suggested address.
- [ ] Resolution metadata is stored with the listing.
- [ ] Resolution attempts are cached and auditable.
- [ ] State Catastro path works for territories covered by the national service.
- [ ] Navarra and each Basque territory return either official exact automation or official candidate confirmation, not silent failure.
- [ ] Logs and analytics exist for all key transitions.
- [ ] Golden dataset passes before GA.
- [ ] Manual entry still works if the resolver is disabled.
- [ ] The browser-worker path, if enabled, only collects minimal normalized signals and does not store raw page dumps or bulk media.

## Sources

Official or primary sources used:

- Idealista general terms: `https://www.idealista.com/ayuda/articulos/terminos-y-condiciones-generales-de-idealista/`
- What is idealista/maps: `https://www.idealista.com/ayuda/articulos/que-es-idealista-maps/`
- Where idealista/maps data comes from: `https://www.idealista.com/ayuda/articulos/de-donde-viene-la-informacion-que-usa-idealista-maps/`
- Whether listed properties appear in idealista/maps: `https://www.idealista.com/ayuda/articulos/los-inmuebles-que-aparecen-en-idealista-maps-estan-en-venta-o-alquiler/`
- Browserbase platform overview: `https://www.browserbase.com/blog/platform`
- Browserbase Functions: `https://www.browserbase.com/blog/browserbase-functions`
- Browserbase Playwright quickstart: `https://docs.browserbase.com/welcome/quickstarts/playwright`
- Browserbase proxies: `https://docs.browserbase.com/platform/identity/proxies`
- Browserbase pricing: `https://docs.browserbase.com/account/billing/plans`
- National Catastro access and coverage: `https://www.sedecatastro.gob.es/Accesos/SECAccDescargaDatos.aspx`
- National Catastro coordinates WSDL: `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx?WSDL`
- National Catastro callejero WSDL: `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx?WSDL`
- Navarra Geoportal Catastro: `https://www.navarra.es/es/web/geoportal/catastro`
- Navarra Registro de la Riqueza Territorial: `https://www.navarra.es/es/hacienda/riqueza-territorial`
- Navarra public viewer for non-protected parcel information: `https://www.navarra.es/es/tramites/on/-/line/visor-del-registro-de-la-riqueza-territorial`
- Bizkaia Catastro: `https://www.bizkaia.eus/catastro`
- Gipuzkoa Catastro: `https://www.gipuzkoa.eus/es/web/ogasuna/catastro`
- Álava Catastro: `https://web.araba.eus/es/hacienda/catastro`

Operational findings verified live on `2026-04-21`:

- Direct fetch of `https://www.idealista.com/inmueble/108926410/` returned a JS/captcha anti-bot interstitial.
- National Catastro reverse-coordinate and nearby-candidate endpoints returned valid XML responses.
- National Catastro descriptive lookup returned official address data for a tested parcel reference.
