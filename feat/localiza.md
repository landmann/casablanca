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
8. Produce an operator-facing property dossier, when the source signals support it, with the same classes of information shown by strong Spanish market tools:
   - listing snapshot: lead image when available, title, asking price, parking inclusion, square meters, bedrooms, floor, exterior/interior status, elevator, and source portal
   - proposed official address with unit components when known: street, number, staircase, floor, door, postal code, municipality, and province
   - cadastral reference and official source label
   - public listing history: observation date, asking price, portal, advertiser or agency name, source URL, and days published
   - duplicate group count and the public duplicate records that are safely attributable to the same parcel, unit, or listing identity
   - publication-duration summary by advertiser, agency, and portal
9. Only auto-fill location-related fields from the resolver. Non-location listing fields may be shown as report or audit evidence, but they remain explicit user input unless the user confirms them.

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
- `100%` of displayed dossier rows have visible provenance: portal, official cadastre, operator note, or cached prior observation.
- The report must not present listing images as an exhaustive gallery. A lead image may be shown as listing context when it has provenance, but additional image observations stay out of the user-facing report until the acquisition source can prove completeness.

## Owner, Dependencies, And Approvals

Owner:

- Product + engineering owner: current Casedra product engineer on listing intake.

Required dependencies:

- Access to the official cadastral services already researched
- `FIRECRAWL_API_KEY` if Firecrawl is used as an acquisition adapter
- Idealista API credentials only if an approved official path arrives during endgame work without blocking the rest of Localiza
- Browserbase credentials plus proxy setup, or an equivalent browser-worker runtime, only if Firecrawl plus compliant market-history acquisition are insufficient and compliance approves the fallback

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
- Idealista's general terms prohibit using automated mechanisms to copy or extract content without authorization. Official API access is preferable in theory if it is already approved, but it is not a near-term Localiza blocker.

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
- The presence of duplicate counts, portal history, and agency timelines implies a property-intelligence graph keyed to parcel, unit, or high-confidence listing identity.
- The report affordances in the screenshot imply two operator workflows beyond autofill: download a property report and jump to a valuation view.

Implication for Localiza:

- We should match the trust-signaling part of that experience: proposed official address, cadastral reference when available, official source label, and explicit confidence.
- We should also produce a compact Localiza dossier for the submitted property: source-listing snapshot, public history, duplicate group, agency/portal publication summary, downloadable report, and valuation handoff.
- This still must not become bulk crawling. The dossier is limited to user-submitted URLs, official-source matches, cached prior observations, and public duplicate records directly attributable to the same property identity.

## Repo Ground Truth

The current repo already gives us a good insertion point:

- Listing creation currently requires a full address in `packages/api/src/schema/listings.ts`.
- The Convex `listings` table mirrors that requirement in `convex/schema.ts`.
- The onboarding UI already supports a URL-driven listing source path in `apps/web/src/app/app/onboarding/OnboardingFlow.tsx`.
- `sourceType` supports `manual`, `firecrawl`, and `idealista`; Idealista URLs enter through Localiza and keep the resolver audit payload with the saved listing.
- `FIRECRAWL_API_KEY` powers the current signal-acquisition path, and `OPORTUNISTA_RAPIDAPI_KEY` powers the automated Idealista historical-price import.
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

We will implement Localiza with an adapter interface, but the current acquisition priority is intentionally conservative:

- `Firecrawl rendered extraction`, because the repo already anticipates Firecrawl.
- `Browserbase-backed browser automation worker` for user-submitted URLs only, guarded behind explicit ops and legal approval.
- `Idealista official API` only as an endgame acquisition path if it becomes approved, accessible, and clearly better than the shipped Firecrawl/provider-feed setup. Do not spend near-term engineering time trying to unblock it.

User-facing strategy rules:

- The default user path is `Auto`, and it is the only visible path in beta.
- `Auto` chooses the best currently available adapter in priority order and keeps the UI simple.
- If `Auto` fails or returns `unresolved`, the user should continue with manual address entry instead of choosing an implementation method.
- Explicit method controls belong in operator diagnostics only, not in the normal user flow.
- We expose user-facing progress and result labels, not internal implementation detail dumps.

Engineering rules:

- We still keep a preferred server-side priority order for `Auto`.
- We record both the `requestedStrategy` and the `actualAcquisitionMethod` used for the attempt.
- We treat adapter choice as part of cache identity so a bad result from one method does not poison the others.

The browser worker is a minimal-signal acquisition step, not a scraping pipeline.

- It should collect only the smallest set of signals needed to resolve against official sources, such as listing ID, municipality, district or postal hint, approximate map point, price, area, floor text, and any building or portal clue.
- It must not attempt full-page archiving, bulk extraction, or bulk media harvesting.

### 5. Trust-signaling output

When Localiza has official evidence, the UI should expose the evidence in a way that mirrors the best market examples:

- proposed official address
- unit components when evidence supports them: street number, `escalera`, floor, and door
- cadastral reference when available
- official source label such as `Dirección General del Catastro` or the relevant regional cadastre
- concise explanation of why the match was selected
- clear indication when the result is building-level only and not unit-confirmed
- report-level listing facts when available: lead image, title, asking price, parking inclusion, area, rooms, floor, exterior/elevator attributes, source portal, and source URL
- historical observations when available: date, asking price, portal, advertiser or agency, source URL, and days published
- publication-duration bars by advertiser, agency, and portal when a source exposes a duration above one day
- actions to download a property report and open valuation context

The core resolver and scoring safety rules do not change across adapters. The response, cache, and listing read models must now carry the dossier fields separately from autofill metadata.

### 6. Safety rule

No address is auto-filled into the listing unless the resolver reaches `exact_match` confidence. `building_match` and `needs_confirmation` require an explicit user action.

## User Experience

### Entry point

The simple user entry is `/app/localiza`. The user pastes an Idealista URL, clicks `Buscar`, sees a compact animated loading composer, and then either selects the official candidate to create an inmueble or enters the address manually. A history icon opens the last 10 unique searches saved in the browser; selecting one runs the resolver again and benefits from the server cache when the cached result is still fresh.

The onboarding listing form still accepts an Idealista URL when the user lands there directly, but it also runs the automatic path only. When `/app/localiza` passes a selected candidate, onboarding consumes that candidate once and applies it to the listing draft. Implementation methods stay hidden from the user.

UI compatibility rules for the existing onboarding form:

- Replace generic `MLS or public listing URL` copy with Idealista-specific language when Localiza is enabled.
- Default the country field to `Spain` after a successful Localiza resolution and in any Idealista-first flow.
- Use Spain-relevant placeholder examples for address fields so the flow does not feel US-specific.
- Remove obviously US-only field labels from the same flow, such as `Price (USD)` and `Interior square feet`, before exposing Localiza to Spanish beta users.
- If the underlying listing schema remains unchanged for non-location fields, treat price and area as user-entered business data and not as canonical location evidence.
- Keep method selection out of the user UI. `Auto` chooses the configured adapter; operator diagnostics live at `/app/localiza/readiness`.
- When the result is `unresolved`, preserve the URL and keep manual address entry visible.

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

- show `No se pudo leer` or `No encontrada`
- preserve the pasted URL
- keep manual address entry visible
- log the failure with the extracted signals and error reason

### Post-save success state

After the listing is created:

- show the chosen resolution label in the confirmation UI
- show whether the final saved address came from `exact_match`, `building_match`, or `manual_override`
- keep the original Idealista URL visible in listing metadata for auditability
- show a property dossier tab or panel with the listing snapshot, cadastral identity, public history, agency/portal publication duration, report download, and valuation handoff when those rows exist

Current state: onboarding now stays on a saved-listing confirmation screen after batch create. The screen shows the final address, source URL, official source, Localiza status, resolved address label, and Idealista reference before the operator enters Studio or Inbox.

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
  primaryImageUrl?: string;
  price?: number;
  priceIncludesParking?: boolean;
  propertyType?: "homes" | "offices" | "premises" | "garages" | "bedrooms";
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  floorText?: string;
  isExterior?: boolean;
  hasElevator?: boolean;
  portalHint?: string;
  neighborhood?: string;
  municipality?: string;
  province?: string;
  postalCodeHint?: string;
  approximateLat?: number;
  approximateLng?: number;
  mapPrecisionMeters?: number;
  advertiserName?: string;
  agencyName?: string;
  listingText?: string;
  imageUrls?: string[];
  imageObservations?: Array<{
    imageUrl: string;
    thumbnailUrl?: string;
    sourcePortal: string;
    sourceUrl: string;
    observedAt: string;
    lastVerifiedAt?: string;
    sourcePublishedAt?: string;
  }>;
  acquisitionMethod: "idealista_api" | "firecrawl" | "browser_worker";
  acquiredAt: string;
};
```

### Property dossier model

Localiza must build a read model for the screenshot-style report. It is separate from address autofill so non-location data can be useful without becoming silently canonical listing input.

```ts
type LocalizaPropertyDossier = {
  listingSnapshot: {
    title?: string;
    leadImageUrl?: string;
    askingPrice?: number;
    currencyCode?: "EUR";
    priceIncludesParking?: boolean;
    areaM2?: number;
    bedrooms?: number;
    bathrooms?: number;
    floorText?: string;
    isExterior?: boolean;
    hasElevator?: boolean;
    sourcePortal: "idealista";
    sourceUrl: string;
  };
  imageGallery: Array<{
    imageUrl: string;
    thumbnailUrl?: string;
    sourcePortal: string;
    sourceUrl: string;
    observedAt: string;
    lastVerifiedAt?: string;
    sourcePublishedAt?: string;
    caption?: string;
  }>;
  officialIdentity: {
    proposedAddressLabel?: string;
    street?: string;
    number?: string;
    staircase?: string;
    floor?: string;
    door?: string;
    postalCode?: string;
    municipality?: string;
    province?: string;
    parcelRef14?: string;
    unitRef20?: string;
    officialSource: string;
    officialSourceUrl?: string;
  };
  publicHistory: Array<{
    observedAt: string;
    askingPrice?: number;
    currencyCode?: "EUR";
    portal: string;
    advertiserName?: string;
    agencyName?: string;
    sourceUrl?: string;
    daysPublished?: number;
  }>;
  duplicateGroup: {
    count: number;
    records: Array<{
      portal: string;
      sourceUrl?: string;
      advertiserName?: string;
      agencyName?: string;
      firstSeenAt?: string;
      lastSeenAt?: string;
      askingPrice?: number;
    }>;
  };
  publicationDurations: Array<{
    label: string;
    kind: "advertiser" | "agency" | "portal";
    daysPublished: number;
  }>;
  actions: {
    reportDownloadUrl?: string;
    valuationUrl?: string;
  };
};
```

Rules:

- Every dossier row must carry provenance internally, even if the UI renders a shortened label.
- Official identity fields come from Catastro or the relevant regional cadastre, not from portal copy.
- The first eligible image should be shown in the listing header when it has provenance.
- Additional image observations stay in audit metadata and must not render as a user-facing carousel unless the acquisition source can prove the set is complete, fresh, and timestamped. Default freshness rule for any future carousel: the image source is still active or `lastVerifiedAt` / `observedAt` is within the last `90` days.
- Image records should store source metadata and remote URLs or generated thumbnails, not unbounded full-size media archives.
- Portal history and duplicate rows are public-market intelligence. They may support confidence, but they do not override official address proof.
- Duplicate grouping must use a conservative key: exact listing ID, official unit reference, official parcel reference plus compatible unit signals, or an operator-confirmed match. No fuzzy duplicate should raise autofill confidence by itself.

Browser worker acquisition rules:

- Prefer DOM text or map payloads over screenshots or downloaded media.
- Abort video, fonts, and unrelated third-party assets. Images may be requested only for the user-submitted property dossier, and only enough to collect lead-image provenance and compact audit metadata.
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
- `propertyDossier?: LocalizaPropertyDossier`

Backward compatibility:

- Existing listings remain valid because all new fields are optional.
- Existing `location` remains required at create time.
- `propertyDossier` is report/audit data. It must not backfill editable listing fields unless the user explicitly confirms a value.

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
- propertyDossier
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
  propertyDossier?: LocalizaPropertyDossier;
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
  - `propertyDossier?: LocalizaPropertyDossier`

Manual override rule:

- If the user changes any prefilled address field materially after normalization, persist `manual_override` even if the resolver originally returned `exact_match` or `building_match`.

Context change:

- Extend `packages/api/src/context.ts` with a `localiza` service so the router does not own third-party request logic directly.
- Keep all secret-bearing acquisition adapters on the server side.

## Environment And Configuration

Add these environment variables:

- `IDEALISTA_API_KEY` and `IDEALISTA_API_SECRET` only if approved official API access arrives during endgame work
- `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` if the Browserbase-backed browser-worker adapter is required

There is no dedicated Localiza feature flag anymore. Access is controlled by app-level allowlisting, and the resolver is available whenever the user can enter the app and the required upstream credentials exist.

Rules:

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

### Critical-path update - 2026-04-24

- Resolver versioning is now centralized in `apps/web/src/server/localiza/version.ts`; the first policy is `stable-bootstrap-date-plus-patch`, meaning semantic behavior changes to parsing, acquisition, official matching, scoring, or cache payloads must bump the trailing patch.
- Fixture policy is locked to the existing repo rule: do not create new test files. Frozen Localiza fixtures and validation cases live in `packages/api/src/workflow.test.ts` until this repo has a broader approved test layout.
- The first deterministic frozen layer now covers Idealista URL canonicalization, numeric designator false-positive prevention, threshold classification, and a registry entry for each supported cadastral territory.
- Resolver cache completion is lease-owner guarded in `convex/locationResolutions.ts`, so an expired resolver cannot overwrite a newer in-flight or completed result for the same lookup.
- Direct Convex cache functions now require an authenticated Convex identity, and `locationResolutions:pruneExpired` uses the `by_expires_at` index to remove stale rows without broad scans.
- Confirmed wrong-address incidents now have a durable `localizaIncidents` source and authenticated report/resolve mutations, and the metrics snapshot counts open and recent severity-1 false-positive autofill incidents.
- The live golden registry now contains live Idealista candidate links, but readiness remains blocked until those links are marked `officially_validated`; do not widen rollout on pending live-link candidates.
- Live validation is still a beta blocker: the Firecrawl path and each official cadastre adapter must pass against the real golden links before widening beyond the current app allowlist. The 2026-04-28 live run returned `unresolved` for the Madrid, Valencia, and Getxo live fixtures, so the registry records the observed failure and keeps those fixtures pending.
- The beta acquisition contract is now explicitly Firecrawl-only in code: `Auto` only attempts Firecrawl, `idealista_api` and `browser_worker` remain disabled, and `/app/localiza/readiness` exposes the readiness gate before allowlist widening.
- Idealista API is intentionally tabled until the very end of Localiza work. Treat it as an optional endgame adapter after compliant market-history acquisition, live readiness, and Browserbase/compliance decisions are settled.
- Spanish beta listings now write unit-neutral `priceAmount`, `currencyCode`, `interiorAreaSquareMeters`, and `lotAreaSquareMeters`; legacy `priceUsd` / `squareFeet` fields remain accepted only at the Convex table edge for existing local data.
- `/app/localiza` is now the simple user-facing resolver input. It shows one URL field, a history dropdown for the last 10 unique browser-local searches, a compact animated loading composer, official candidate results, and the `Crear inmueble` handoff. `/app/localiza/readiness` keeps the authenticated operator controls for pruning expired resolver cache rows, filing confirmed wrong-address incidents, listing open incidents, and closing them after a shipped fix.
- The 2026-04-29 production-review smoke for `https://www.idealista.com/inmueble/108926410/` now returns `needs_confirmation` with official national Catastro candidates for `Calle Alcala 181` and `Calle Alcala 179` instead of `unresolved`.
- Official-source links shown to users now point to human-facing cadastre pages instead of raw WFS/OGC service endpoints that return XML errors when opened directly.
- Localiza now carries `propertyDossier` through the shared resolver result, Convex cache, listing create input, listing persistence, onboarding draft state, and saved-listing review state. `/app/localiza` renders the screenshot-style property report with listing snapshot, lead image when available, official identity, public price history, report download, valuation handoff, and official-market evidence links. Additional public image galleries and publication-duration claims are intentionally hidden because the current acquisition sources are not exhaustive enough to prove them. The resolver version is bumped to `localiza-bootstrap-2026-04-23.10` so cached pre-market-intake results are not reused as current report output.

### Screenshot-parity update - 2026-04-29

- [x] Add the `LocalizaPropertyDossier` read model to the shared resolver response and persistence boundary without letting non-location fields silently autofill listing inputs.
- [x] Extract listing snapshot fields where available: lead image, title, price, parking inclusion, square meters, bedrooms, floor, exterior/interior status, elevator, source portal, and canonical source URL.
- [x] Render the first eligible public image in the report header and keep additional image observations out of the user-facing report until completeness can be proven.
- [x] Preserve official identity fields in report form: proposed address, `escalera`, floor, door, postal code, municipality, province, cadastral reference, official source label, and official source URL.
- [x] Add public listing-history rows keyed to the submitted property: observation date, asking price, portal, advertiser or agency, and source URL.
- [x] Add duplicate grouping with conservative attribution: exact listing ID, official unit reference, official parcel reference plus compatible unit signals, or operator-confirmed match. Current automated rows stay limited to the submitted listing and directly cached same-identity observations.
- [x] Preserve publication-duration fields in the data model for future licensed feeds, but do not render public-duration claims unless the source can prove them.
- [x] Add report actions for `Descargar informe de propiedad` and `Valoraciones`; the report action renders the same dossier data as a downloadable report and the valuation action links into the valuation context for the resolved property.
- [x] Keep compliance boundaries explicit: no bulk discovery, no city sweeps, no owner lookup, no raw page dumps, no unbounded media archive, and no private identifiers in report URLs.

### Evidence-grade market update - 2026-04-30

- [x] Stop rendering public-duration claims from partial acquisition evidence; dated price observations stay visible, but `Permanencia pública` and inline `Días publicados` are hidden until a licensed source proves them.
- [x] Remove the additional `Imágenes públicas` carousel from the report because current public acquisition is partial and should not imply a complete photo set.
- [x] Add an `Identidad oficial` section that decomposes the defensible official unit fields Localiza has already resolved: cadastral reference, street, number, staircase, floor, door, postal code, municipality, and province.
- [x] Shrink the report lead image by constraining only its width and preserving the source image's natural aspect ratio; place a property overview to its right with current ask, price per square meter, public movement, surface, bedrooms, bathrooms, floor, exterior/elevator, garage, and portal.
- [x] Consolidate additional evidence into a compact `Fuentes externas` rail for sophisticated realtor workflows: official Catastro identity, distinct Catastro `valor de referencia`, Notariado transaction benchmarks, and Registro nota-simple due diligence.
- [x] Include the same complementary evidence links in the downloaded report so the HTML handoff remains useful outside the app.
- [x] Fold the price snapshot into `Resumen del inmueble`: current asking price, asking price per square meter, and any public price movement from observed history without exposing internal confidence scores.
- [x] Remove the repetitive `Evidencia pendiente` checklist from the user-facing report; external follow-up sources live once in the compact `Fuentes externas` rail.
- [x] Remove screenshot-only affordances from the report surface: `Notificar una incidencia`, `Duplicados`, and `Favorito`.
- [x] Keep `Actividad pública` focused on dated price and portal observations; do not show duration bars from inferred or partial evidence.
- [x] Include the negotiation snapshot and external source links in the downloaded report.

### Property-history graph update - 2026-05-01

- [x] Add a `propertyHistoryKey` to cached Localiza resolutions so each completed resolve can be grouped by defensible official identity: `unitRef20`, `parcelRef14`, or a resolved address key when the result is not a candidate-confirmation state.
- [x] Add an authenticated `locationResolutions:getPropertyHistoryByKey` query for same-property dossier reuse without broad cache scans.
- [x] Enrich each newly resolved or cached dossier with prior same-property observations from `locationResolutions`, merging public-history rows, duplicate records, and publication-duration bars.
- [x] Bump the resolver version to `localiza-bootstrap-2026-04-23.10` so new cache rows carry property-history keys and market-observation merges.
- [x] Add a compliant cross-portal market-observation intake for rows outside our own Localiza cache: `localizaMarketObservations`, authenticated operator import on `/app/localiza/readiness`, recent property-history keys for attribution, bulk CSV/TSV paste, provenance fields, provider-ready normalization in `convex/localizaMarketObservations.ts`, and resolver-side merge into public-history rows, duplicate records, and publication-duration bars.
- [x] Connect an automated Idealista historical-price provider through Oportunista/RapidAPI. Localiza now fetches listing-level weekly price snapshots by Idealista `propertyCode`, stores them as provenance-labeled `localizaMarketObservations`, and merges them into the report's `Histórico de precios`. Exact/building results use the defensible official `propertyHistoryKey`; ambiguous results use a listing-scoped key until the user confirms a cadastral candidate.
- [ ] Connect licensed Fotocasa/Habitaclia observations. Manual/operator import and automated Idealista history are live, but production-scale cross-portal acquisition still needs a compliant partner feed with visible provenance.

### Phase 0. Ground truth and rollout guardrails

- [x] Re-read the full Localiza brief and verify the current repo insertion points.
- [x] Confirm where listing create data currently enters the system.
- [x] Confirm where the golden dataset fixtures will live in-repo.
  Current state: deterministic frozen fixtures live in `packages/api/src/workflow.test.ts` because repo policy forbids new test files.
- [x] Decide the first `resolverVersion` format and bump policy.
  Current state: `apps/web/src/server/localiza/version.ts` exports `localiza-bootstrap-2026-04-23.10` and the `stable-bootstrap-date-plus-patch` policy.
- [x] Confirm whether the first rollout is gated by env only or by a user allowlist.
  Current state: Localiza access is currently gated by app-level allowlisting in `apps/web/src/lib/app-access.ts`.
- [x] Document the exact unsupported and blocked cases to surface during beta.
  Current state: `/app/localiza/readiness` now renders an "Unsupported during beta" card listing the six explicit out-of-scope cases (non-Idealista portals, listings outside Spain, hidden-address listings without coordinates in regional territories, unit-level autofill without independent proof, disabled Idealista API and Browserbase paths, and the no-bulk/no-owner-lookup boundary) so operators see them at the same time they read the readiness gate.

### Phase 1. Shared domain model and persistence contract

- [x] Extend shared listing types to support `sourceType: "idealista"`.
- [x] Add optional `sourceMetadata` to listing create/read shapes.
- [x] Add optional `locationResolution` to listing create/read shapes.
- [x] Extend Zod listing schemas for the new Localiza fields.
- [x] Enforce source-type and metadata consistency in API validation.
- [x] Extend Convex listing schema for the new Localiza fields.
- [x] Extend the Convex listing create mutation args and insert path to persist the new fields.
- [x] Enforce source-type and metadata consistency again at the Convex mutation boundary.
- [x] Decide whether `priceUsd` and `squareFeet` should be renamed to unit-neutral field names before Spanish beta.
  Current state: new create payloads use `priceAmount`, `currencyCode`, `interiorAreaSquareMeters`, and `lotAreaSquareMeters`; the onboarding UI writes EUR and square-meter values by default.
- [x] Decide whether listings need a normalized display label separate from component address fields.
  Current state: listings now carry an optional `displayAddressLabel` field across `convex/schema.ts`, `convex/listings.ts`, `packages/api/src/schema/listings.ts`, and `packages/types/src/index.ts`. The Convex insert path auto-fills it from `locationResolution.resolvedAddressLabel` when not set explicitly, so Localiza-resolved listings get a single rendered string for cards and audit while manual listings can stay component-only.

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
- [x] Add explicit retry strategy selection for the acquisition methods that are currently available.
  Current state: onboarding receives the server-side adapter availability snapshot but keeps implementation methods hidden from users; the user-facing path runs `Auto`, while `Idealista API` remains endgame-only and `Browser worker` remains a compliance-approved fallback only.
- [x] Ignore stale Localiza responses when the user edits the URL, changes source mode, or changes strategy mid-request.
- [x] Reset Localiza-linked address and hidden source state when the user changes source mode, URL, or strategy.
- [x] Canonicalize the saved Idealista URL from resolver output before create validation runs.
- [x] Cancel any in-flight Localiza request when the draft is cleared or the listing is queued so a late response cannot repopulate the next draft.
- [x] Persist the selected Localiza metadata in the final create payload.
- [x] Keep the pasted Idealista URL visible after resolution and after save.
  Current state: after batch save, onboarding renders a confirmation/audit screen instead of immediately redirecting, so the saved source URL and Localiza result remain visible.
- [x] Make `/app/localiza` a simple resolver entry instead of an operator dashboard.
  Current state: `/app/localiza` shows one Idealista URL input, a history dropdown for the last 10 unique browser-local searches, a resolve button, a compact animated loading composer, selectable official candidates, and a `Crear inmueble` handoff into onboarding with the URL and selected candidate preserved. It does not expose method/territory labels, reason-code dumps, or implementation pipeline text.
- [x] Make the final onboarding listing batch create idempotent across safe client retries.

### Phase 3. Server-side service boundary

- [x] Add a `localiza` service to API context so router code does not own resolution logic.
- [x] Add a protected `resolveIdealistaLocation` tRPC mutation.
- [x] Remove dedicated Localiza feature flags and rely on app-level access control instead.
- [x] Define the normalized `IdealistaSignals` model in server code.
- [x] Define the public resolver response contract used by the onboarding UI.
- [x] Add structured Localiza error types and timeout/error reason mapping.
- [x] Record `requestedStrategy` and `actualAcquisitionMethod` in cacheable resolver results.

### Phase 4. Acquisition adapters

- [x] Implement Idealista URL validation and listing ID parsing.
- [x] Lock the beta acquisition contract.
  Current state: beta address acquisition is Firecrawl-only. `apps/web/src/server/localiza/acquisition-contract.ts` is the source of truth, `Auto` attempts only Firecrawl, and disabled adapters are excluded from the onboarding availability snapshot. The separate market-history path uses Oportunista/RapidAPI only after a resolved property-history key exists.
- [ ] Endgame only: test whether official Idealista API access exists and is sufficient for user-submitted URLs after the rest of Localiza is launch-ready.
- [x] Keep the onboarding UI aligned with adapter readiness so disabled strategies are not exposed to users.
  Current state: the onboarding page now receives a server-side availability snapshot and keeps implementation methods hidden from users. It runs the automatic path when at least one server adapter is configured.
- [ ] Endgame only: implement the official Idealista adapter if approved and usable.
  Current state: the `idealista_api` adapter remains intentionally disabled, is not part of the beta auto path, and is deliberately tabled until every non-Idealista-API Localiza blocker is closed.
- [x] Implement the Firecrawl acquisition adapter.
  Current state: the adapter accepts the canonical `FIRECRAWL_API_KEY` plus Stripe Projects-generated `FIRECRAWL_API_API_KEY` / `FIRECRAWL_PLAN_API_KEY` aliases so local and deployed availability checks use the same credential source. It requests rendered HTML plus markdown and extracts listing signals deterministically, including Idealista static-map coordinates when present, instead of relying on LLM JSON extraction.
- [x] Implement the Oportunista historical-price adapter for Idealista observations.
  Current state: `apps/web/src/server/localiza/oportunista-price-history.ts` calls the RapidAPI-hosted Oportunista endpoint with `OPORTUNISTA_RAPIDAPI_KEY`, compresses weekly snapshots to first/latest and price-change rows, and writes the existing `localizaMarketObservations` shape through a bulk Convex mutation.
- [ ] Benchmark Firecrawl success and failure modes on the golden dataset.
- [ ] Implement the Browserbase-backed fallback adapter only if Firecrawl plus compliant market-history acquisition are insufficient and compliance approves the fallback.
  Current state: the `browser_worker` adapter remains intentionally disabled, is not part of the beta auto path, and still requires explicit compliance approval before production use.
- [ ] Ensure the browser-worker path only collects minimum normalized signals.
- [ ] Ensure the browser-worker path does not persist raw HTML or page dumps.

### Phase 5. Cadastral adapters and resolution logic

- [x] Implement territory routing: national Catastro vs Navarra vs Álava/Bizkaia/Gipuzkoa.
  Current state: routing now uses province hints plus coordinate-safe reverse-geocode fallback, and dispatches into the national Catastro, Navarra RTN, or the Álava / Bizkaia / Gipuzkoa official cadastres as appropriate.
- [x] Implement the national Catastro adapter first.
  Current state: national Catastro resolution uses coordinate WFS when map signals exist and falls back to the official Callejero address lookup when the listing exposes a street name and number but coordinate lookup is missing, empty, filtered out, or below threshold.
- [x] Implement Navarra official candidate resolution.
- [x] Implement Álava official candidate resolution.
- [x] Implement Bizkaia official candidate resolution.
- [x] Implement Gipuzkoa official candidate resolution.
- [x] Implement candidate scoring and threshold logic.
- [x] Implement exact, building, candidate, and unresolved decision assignment.
- [x] Implement machine-readable evidence generation with stable `reasonCodes`.
- [x] Add `idealista/maps` verification only as a higher-confidence signal, not as canonical truth.
  Current state: `apps/web/src/server/localiza/maps-verifier.ts` runs only when the official cadastre returns `building_match` and a top candidate exists. The resolver promotes `building_match` to `exact_match` only when idealista/maps confirms the same listing ID at the resolved coordinates; any HTTP error, anti-bot block, or "listing id not found" is logged as inconclusive and never downgrades the result.

### Phase 5A. Review follow-ups from the first state Catastro slice

- [x] Tighten `exact_match` designator proof in `apps/web/src/server/localiza/score.ts` and `apps/web/src/server/localiza/catastro-state.ts`.
  Current state: `corpusIncludesDesignator()` now requires street/designator or explicit portal/door context, so unrelated standalone numeric tokens like `3 habitaciones` do not provide exact-match proof.
- [x] Split acquisition-adapter failures from cadastral matching failures in `apps/web/src/server/localiza/resolver.ts`.
  Current state: acquisition failures and official cadastre failures are logged and cached with separate reason codes, so `auto` does not retry other acquisition adapters after the official matching step fails.
- [x] Make regional routing coordinate-safe instead of province-string-only in `apps/web/src/server/localiza/score.ts` and `apps/web/src/server/localiza/catastro-state.ts`.
  Current state: Navarra / Álava / Bizkaia / Gipuzkoa routing uses province aliases plus coordinate reverse-geocoding, and candidate scoring accepts official regional aliases like `Araba`, `Vizcaya`, and `Guipúzcoa`.

### Phase 6. Cache, leases, and concurrency safety

- [x] Add a dedicated `locationResolutions` cache table.
- [x] Add lookup indexes for `(provider, externalListingId, resolverVersion)`.
- [x] Add cache lookup by `sourceUrl`.
- [x] Add expiry lookup and cleanup behavior for stale cache rows.
  Current state: `locationResolutions:pruneExpired` requires an authenticated Convex identity, deletes bounded batches through `by_expires_at`, returns whether more stale rows remain, and is callable from the `/app/localiza/readiness` operator page.
- [x] Add an in-flight lease with short expiry for concurrent resolve attempts.
- [x] Make later callers reuse cached or in-flight results instead of fan-out resolving.
- [x] Add failure cooldown behavior for repeated hard failures.
- [x] Abort adapter work when per-adapter timeouts are exceeded.

### Phase 7. Observability and analytics

- [x] Add structured server logs for start, adapter failure, cadastre failure, completion, confirm, and manual override.
  Current state: resolver logs use `localiza.resolve.*` event names and include user/source/duration context where available; listing create now emits backend `localiza.resolve.user_confirmed` and `localiza.resolve.manual_override` logs from persisted resolution metadata.
- [x] Expose routed territory and exact official service URL in user-facing resolver output for auditability.
- [x] Add PostHog events for URL paste, resolve click, success, unresolved, candidate select, manual override, and listing created.
- [x] Add metrics for success rate by acquisition adapter and territory adapter.
  Current state: `locationResolutions:getMetricsSnapshot` aggregates resolve attempts, status rates, acquisition-adapter rates, territory-adapter rates, median duration, manual override rate, and user-confirmation rate.
- [x] Add unresolved-rate and timeout-rate monitoring thresholds.
  Current state: the metrics snapshot returns beta thresholds and alert labels only when unresolved or timeout rates breach the configured backend limits in both the current and previous measurement windows.
- [x] Add a severity-1 incident procedure and durable incident source for any confirmed false-positive autofill.
  Current state: `localizaIncidents` stores open/resolved severity-1 false-positive autofill incidents, `locationResolutions:reportFalsePositiveIncident` and `locationResolutions:resolveFalsePositiveIncident` are authenticated operator mutations, `/app/localiza/readiness` exposes report/list/close controls, and `locationResolutions:getMetricsSnapshot` returns false-positive incident counts plus an immediate alert label.
- [x] Expose an operator-safe rollout readiness gate.
  Current state: `/app/localiza/readiness` and the protected `listings.localizaReadiness` query combine the Firecrawl-only acquisition contract, golden dataset readiness, aggregate metrics, and active alert labels without exposing raw source URLs.

### Phase 8. Testing and fixture strategy

- [x] Add unit tests for URL parsing.
- [ ] Add unit tests for signal normalization.
- [ ] Add unit tests for candidate scoring.
  Current state: exact/building threshold and regional province-alias coverage exist; full candidate-scoring fixture coverage is still open.
- [x] Add unit tests for threshold and state assignment.
- [ ] Add integration tests for mocked resolver flows.
- [ ] Add integration tests for create-with-resolution metadata.
- [ ] Add integration tests for manual override.
- [x] Add deterministic CI fixtures built from frozen normalized signals and official responses.
  Current state: the canonical frozen golden fixture registry lives in `apps/web/src/server/localiza/golden-dataset.ts` with 30 deterministic fixtures, planned outcome coverage, territory coverage, and frozen-contract threshold validation in the existing `packages/api/src/workflow.test.ts` file.
- [x] Add a smaller live-link regression set for scheduled or manual verification.
  Current state: `apps/web/src/server/localiza/golden-dataset.ts` contains live Idealista candidate links with expected territory/status hints, explicit validation status, and the latest observed live result. The 2026-04-28 run returned `unresolved` for all three current live links, so golden readiness still reports `localiza_live_regression_set_pending_official_validation` until each live candidate is validated against the official cadastre and marked `officially_validated`.
- [ ] Add Playwright coverage for exact match, building match, needs confirmation, unresolved, and manual override flows.
  Current state: repo policy still forbids new test files, so the first Localiza coverage lives in the existing `packages/api/src/workflow.test.ts` file and currently guards source-type/source-URL consistency, draft-state helpers for failed-resolve clearing and in-flight add prevention, strategy-option helper alignment with server-side adapter readiness, Idealista URL parsing, designator false-positive prevention, regional province aliases, threshold classification, and the territory fixture registry.

### Phase 9. Rollout readiness

- [x] Expose a single readiness gate for allowlist widening.
  Current state: `/app/localiza/readiness` shows whether widening is blocked by missing Firecrawl config, live-link validation, false-positive incidents, unresolved/timeout thresholds, metrics unavailability, or other aggregate health alerts. Metrics query failures fail closed with `localiza_metrics_unavailable` instead of crashing the operator gate.
- [ ] Confirm zero silent false positives on internal dogfood before beta.
- [ ] Validate median resolve times against the stated targets.
- [ ] Validate success thresholds against the golden dataset.
- [x] Keep manual entry fully functional even when the resolver is disabled.
  Current state: manual source mode remains available, unresolved results keep manual entry visible, and saved manual overrides persist as `manual_override` with audit metadata when a resolved address is edited.
- [x] Write a narrow feature doc once the resolver path is wired into onboarding.
  Current state: `feat/localiza.md` now contains a "How To Use Localiza" section covering what Localiza does, the four outcomes, what counts as a manual override, and how to read the trust card.

## Implementation Order

This is the concrete build order we will execute and later check against:

1. Extend shared types and schemas for `sourceType: "idealista"`, `sourceMetadata`, and `locationResolution`.
2. Extend Convex schema and `create` mutation so resolution metadata is persisted with the listing.
3. Add the Localiza service boundary and the `resolveIdealistaLocation` tRPC mutation.
4. Build the normalized signal model, resolver cache table, expiry behavior, and in-flight lease logic, including strategy-aware cache identity.
5. Implement the state Catastro adapter first because it covers most of Spain.
6. Implement Navarra and the Basque territory adapters so the contract works across supported regions.
7. Wire the onboarding UI states, Spain-specific copy, trust-signaling card, and manual override transitions.
8. Add the screenshot-style property dossier read model, persistence fields, report panel, report download, valuation handoff, public history rows, duplicate grouping, and publication-duration summary.
9. Validate Firecrawl against the golden dataset.
10. Validate the explicit retry strategies against the same links so users can recover from adapter-specific failure.
11. Only stand up the Browserbase-backed minimal-signal worker if Firecrawl plus compliant market-history acquisition are insufficient and compliance approves the fallback.
12. Revisit the official Idealista API only at the very end, after Localiza is otherwise launch-ready and there is a concrete approved API path to evaluate.
13. Finish observability, fixtures, regression tests, and allowlisted rollout.

Execution notes:

- The first production-capable milestone is not "we can fetch portal data"; it is "we can return a trustworthy address outcome with auditable evidence."
- We should optimize for state Catastro coverage before spending time on browser automation.
- The dossier can include duplicate history, agency timelines, and portal summaries only when they are directly tied to the submitted property identity. It is not a city-wide monitoring or bulk market-intelligence crawler.

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

- Editing the URL resets the state to `idle` and invalidates any in-flight client request so stale responses are ignored.
- A new resolve attempt supersedes the previous client-side request and reuses any valid cached server result.
- Clearing the draft or queuing a listing also invalidates any in-flight client request before the next draft starts.
- Double-clicking the resolve button must not launch duplicate network calls.
- Editing a prefilled address field after resolution moves the client state to `manual_override`.
- A failed re-resolve clears only Localiza-owned exact or building prefills; manual overrides remain intact.
- The final listing create call is the only write that creates a listing record.
- Safe retries of the final create call must reuse an idempotency key so the batch is not duplicated.

## Failure Modes And How We Handle Them

### Idealista source blocked

- If one acquisition adapter fails, try the next configured adapter.
- If all adapters fail, return `unresolved`.
- Surface a precise reason in logs: blocked, timed out, no content, invalid URL, unsupported market.

Timeout budget:

- Apply a strict overall resolver deadline of `35s` during the Firecrawl-only beta.
- Apply a `25s` Firecrawl adapter budget inside that envelope so rendered pages have enough time to return usable HTML and markdown.
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

- Control rollout through app-level allowlisting rather than a dedicated Localiza feature flag.
- Keep manual address entry fully functional.
- Rollback means removing allowlisted access or hiding the Idealista-specific intake path; no listing data migration is required for safety.

### Wrong-address incident

- Treat any confirmed false-positive autofill as a severity-1 product bug.
- Record it through `locationResolutions:reportFalsePositiveIncident` with the offending source URL, listing id when available, resolver version, observed status, and operator notes.
- Operators can file and close these incidents from `/app/localiza/readiness`; an open case blocks allowlist widening.
- Add the offending URL to the golden dataset immediately.
- Keep the incident open until the URL is represented by a frozen or officially validated live fixture and the resolver no longer produces the wrong autofill.
- Close it through `locationResolutions:resolveFalsePositiveIncident` only after the fix is shipped and the app allowlist is safe to widen again.
- Ship the fix before widening rollout.

## Compliance And Data Handling

- Prefer official Idealista API access only if it is already approved and straightforward to use. Until then, table it behind the shipped Firecrawl path, official cadastre adapters, compliant market-history acquisition, and rollout readiness.
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

Implementation note: resolver events are emitted by `apps/web/src/server/localiza/resolver.ts`; confirm and manual-override backend events are emitted from the protected listing create path after Convex returns the saved listing id.

### Product analytics

Capture PostHog events if PostHog is configured:

- `localiza_url_pasted`
- `localiza_resolve_clicked`
- `localiza_resolve_success`
- `localiza_resolve_unresolved`
- `localiza_candidate_selected`
- `localiza_manual_override`
- `listing_created`

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

Implementation note: `locationResolutions:getMetricsSnapshot` is the authenticated backend operator snapshot for the current rollout. It intentionally returns aggregate counts and rates rather than raw source URLs and is not exposed as an app-facing tRPC procedure.
It now includes `falsePositiveIncidents`, `openFalsePositiveIncidents`, and the `localiza_false_positive_incident_reported` alert label when any confirmed wrong-address incident exists in the current window or remains open. Unresolved-rate and timeout-rate alert labels require both the current window and the previous window to breach the beta threshold.

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
- Record failed live validation attempts in the live fixture metadata instead of marking a link validated prematurely.

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
- Removing users from the allowlist or hiding the Idealista intake surface returns the product to the pre-Localiza behavior immediately.

## Timeline

Assumption: one engineer working full-time with product support from the founder.

### 2026-04-22 to 2026-04-23

- Build the normalized signal model and adapter interface.
- Test Firecrawl against the golden dataset.
- Stand up the fallback Browserbase-backed minimal-signal browser-worker path only if needed.
- Leave Idealista official API exploration until the endgame unless credentials and documentation arrive without product-engineering effort.

Timeline risk note:

- The dates above assume no external blocker on cadastral endpoint availability, compliant Firecrawl/provider-feed acquisition, or compliance review. Idealista official API access is explicitly outside the beta critical path.

### 2026-04-24 to 2026-04-25

- Build the state Catastro adapter.
- Build Navarra and Basque territory routing.
- Implement scoring and confidence thresholds.
- Persist resolution cache and metadata.

### 2026-04-26 to 2026-04-27

- Integrate the onboarding UI.
- Add candidate selection and manual override states.
- Add logs, analytics, and rollout guardrails.

### 2026-04-28

- Build e2e coverage and golden dataset regression checks.
- Internal dogfood and threshold validation.

### 2026-04-29

- Controlled beta rollout and bug fixes.

This is a complete build, not a partial v1 with deferred core functionality.

## Acceptance Checklist

- [x] User can paste an Idealista URL and trigger resolution from `/app/localiza` or onboarding.
- [x] Resolver returns one of the four contract states every time.
- [x] Exact results only auto-fill when confidence rules are satisfied.
- [x] Building-level and ambiguous results require user confirmation.
- [x] User can manually override any suggested address.
- [x] Resolution metadata is stored with the listing.
- [x] Resolution attempts are cached and auditable.
- [x] State Catastro path works for territories covered by the national service.
  Current state: the Madrid smoke URL `108926410` resolves through Firecrawl plus national Catastro to `needs_confirmation` with official candidates, and the no-coordinate street-number fallback resolves through Catastro Callejero.
- [x] Navarra and each Basque territory return either official exact automation or official candidate confirmation, not silent failure.
  Current state: `apps/web/src/server/localiza/catastro-state.ts` routes Navarra, Álava, Bizkaia, and Gipuzkoa into dedicated official-cadastre adapters. Navarra, Bizkaia, and Gipuzkoa can return exact, building, confirmation, or unresolved outcomes; Álava returns official viewer-backed confirmation candidates rather than claiming exact automation without machine-verifiable unit proof.
- [x] Logs and analytics exist for all key transitions.
- [ ] Golden dataset passes before GA.
- [x] Manual entry still works if the resolver is disabled.
- [ ] The browser-worker path, if enabled, only collects minimal normalized signals and does not store raw page dumps or bulk media.
  [x] The Localiza report exposes screenshot-parity dossier information when available: listing snapshot, lead image, proposed official address, cadastral reference, source label, public price/portal/agency history, property report download, valuation handoff, and official-market evidence links.
  Current state: the report contract and UI can represent the screenshot-level dossier, and the resolver now merges same-property observations from the Localiza cache, the authenticated market-observation intake, and automated Oportunista/Idealista historical-price imports through `propertyHistoryKey`. Publication-duration claims are intentionally hidden from the user-facing report because partial sources can undercount how long an advert has been public. Matching the screenshot's full cross-portal timeline at scale still requires licensed Fotocasa/Habitaclia feeds keyed to the official parcel/unit identity.
- [x] Add automated Idealista public-history acquisition for Localiza dossiers.
  Current state: Localiza imports Oportunista weekly price snapshots for the submitted Idealista `propertyCode`, normalizes first/latest and price-change observations, and merges them into the report's price history. If the official property identity is still ambiguous, those observations are stored under a listing-scoped key instead of being grouped with other properties.
- [ ] Add Fotocasa/Habitaclia public-history acquisition for Localiza dossiers.
  Current state: authenticated operator import can already add dated Fotocasa/Habitaclia observations one by one or via bulk CSV/TSV paste, with advertiser/agency names, asking prices, first/last seen dates, duplicate grouping, and publication-duration summaries tied to recent resolved cadastral identities. Remaining work is a licensed partner feed that writes the same normalized observation shape.

## How To Use Localiza

This is the narrow user-facing reference for Localiza inside the Casedra listing intake flow.

### What Localiza does

- You open `/app/localiza`, paste an Idealista listing URL, and click `Buscar`.
- You can reopen the history icon to pick one of the last 10 unique searches from this browser. Localiza sends that URL through the same resolver path, so fresh server-cache rows return quickly and expired or missing rows are resolved again.
- While Localiza works, the page shows a compact loading composer whose text, dots, and shimmer update softly.
- When a result appears, `Crear inmueble` carries the URL into onboarding with the listing source prefilled. For `needs_confirmation`, the selected official candidate is carried through and applied to the draft automatically.
- Casedra reads what the listing publicly exposes (municipality, district, approximate map point, floor text, area, price, etc.) and matches that signal set against the official Spanish cadastres.
- Localiza never copies addresses from the listing text. The proposed address always comes from an official cadastre (`Dirección General del Catastro`, `Registro de la Riqueza Territorial de Navarra`, or the Álava / Bizkaia / Gipuzkoa official cadastre, depending on territory).

### The four outcomes

Every resolve call ends in exactly one of these:

1. **Exact match** — The official cadastre confirms the property at street, building, and unit precision, and a second independent signal supports the same listing. The address fields are prefilled in onboarding. You can still edit anything before saving.
2. **Building match** — The official cadastre confirms the building or parcel, but unit-level precision is not proven. Confirming in onboarding prefills the building address with `building_match` recorded in the listing's resolution metadata.
3. **Needs confirmation** — Two to five ranked official candidates are shown. The user chooses one from `/app/localiza` or onboarding to prefill the address, or falls back to manual entry.
4. **Unresolved** — Localiza could not produce a trustworthy match. The pasted URL is preserved and the manual address fields stay open.

### What counts as a manual override

The listing's resolution metadata is set to `manual_override` whenever the saved address differs materially from what Localiza prefilled, regardless of the original outcome. That includes:

- Editing any of the prefilled street, city, province, or postal code fields after an `exact_match` or `building_match` autofill.
- Picking one of the candidates from a `needs_confirmation` result and then editing it before saving.
- Skipping the suggested address entirely and entering a manual one.

`manual_override` is never a resolver failure. It is a faithful record that the human-entered address took priority over the cadastre suggestion, and it is preserved in the audit trail alongside the original Idealista URL and the resolver version that produced the suggestion.

### How to read the trust card

The result card shows, top to bottom:

- **Result label** — `Dirección encontrada`, `Edificio encontrado`, `Elige una opción`, `No se pudo leer`, or `No encontrada`.
- **Resolved address** — the official cadastre's rendered label when available.
- **Official source** — the named cadastre that produced the result, with a link to the source service when available.
- **Candidates** — short official-address options when Localiza needs user confirmation.
- **Action buttons** — `Crear inmueble` and, when available, `Fuente oficial`.

If a result feels wrong, the safe action is to edit the address and save: the listing will be persisted as `manual_override` and the resolver call is preserved for audit. If the autofilled address is concretely wrong, file it through the false-positive incident path so the offending URL becomes a permanent fixture in the golden dataset.

### What the property report shows

When Localiza has enough public evidence, the report mirrors the screenshot-style market view:

- A listing header with the lead image, title, price, parking inclusion, area, bedrooms, floor, exterior/elevator attributes, and source portal.
- No public image gallery is shown unless the acquisition source can prove it is complete and fresh. Current UI keeps additional image observations out of the report because partial public images create false confidence.
- A trust block with `Dirección propuesta`, `Referencia catastral`, official source label, and the resolved unit components when they are proven.
- An official-identity breakdown with the unit components Localiza can defend from cadastre-backed evidence.
- Additional evidence links for Catastro ficha, Catastro reference value, Notariado transaction benchmarks, and Registro due diligence.
- A negotiation snapshot with current ask, asking price per square meter, public price movement when available, and a conservative evidence-strength label.
- A public history timeline with date, price, portal, advertiser or agency, source URL, and observation provenance.
- Publication-duration bars by advertiser, agency, and portal only when at least one source exposes more than one day published.
- Actions for `Descargar informe de propiedad` and `Valoraciones`.

Every item in this report is evidence or operator context. It does not silently update the listing create form unless the user confirms that value.

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
- Oportunista Idealista historical price API: `https://oportunista.net/api-historico-de-precios/`
- Oportunista historical price exports: `https://oportunista.net/historico-de-precios/`
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
