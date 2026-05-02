# Feature: CRM Foundation

## One-line pitch

Build the first real operational layer of Casedra: an inbox and workflow kernel for live demand, with explicit ownership, handoff, routing, and reporting. This is the right "CRM" to build now. A broad object-heavy CRM is not.

## Why This Matters Now

The repo and roadmap are currently out of balance.

- The roadmap is clear that Phase 0 is about response control, inbox, handoff, and proof.
- The current codebase is still weighted toward listing intake, media generation scaffolding, and product-preview surfaces.
- If we start with a broad CRM clone now, we will move away from the wedge that can actually earn trust and revenue.

The right move is to define the minimal durable data model and product surfaces that let Casedra handle real inbound demand.

## Repo Ground Truth

Current implementation reality:

- Auth exists and `/app/*` is protected with Clerk middleware.
- The main authenticated surface is still a preview page, not a real inbox.
- The onboarding flow is centered on brand intake, listings, and media plan setup.
- Convex currently stores `listings` and `mediaJobs`, but not agencies, conversations, messages, assignments, or handoff history.
- TRPC currently exposes listing creation, listing reads, Localiza resolution, and media generation, but not workflow primitives.

Implication:

- We should not bolt a "CRM UI" onto the existing listing/media model.
- We should add a new workflow domain beside listings, with a schema meant to survive later seller-acquisition and reporting work.

## Product Stance

What we are building now:

- agency-scoped workflow primitives
- live inbox queue
- explicit conversation ownership
- manual takeover and reassignment
- handoff history
- response-time and coverage reporting foundations

What is outside the scope of this feature definition:

- broad deals and opportunities model
- Kanban-heavy pipeline management
- notes, tasks, reminders, sequences, and arbitrary CRM objects
- generic custom fields system
- full reporting suite
- deep mobile CRM workflows

This is CRM as operational control, not CRM as object sprawl.

## Product Contract

The first workflow system must guarantee all of the following:

1. Every inbound demand item becomes a durable record.
2. Every conversation has an explicit state.
3. Every conversation has an explicit owner.
4. The system always knows whether AI, a human, or nobody currently owns the conversation.
5. A human can take over with one action.
6. A manager can reassign ownership with one action.
7. The transcript and current summary are always visible.
8. Handoff reasons are recorded, not implied.
9. Reporting can be derived from the same operational records later.

If ownership becomes ambiguous, the product is failing.

## Owner, Dependencies, And Approvals

Owner:

- product + engineering owner: current Casedra product engineer working in this repo

Required dependencies:

- Clerk-authenticated user identity in TRPC context
- Convex schema and query support for the new workflow tables
- one selected ingestion path for live conversation creation
- optional PostHog or equivalent analytics only for product instrumentation, not as a hard dependency

Required approvals before live design-partner rollout:

- product sign-off on agency bootstrap behavior
- product sign-off on the first real ingestion channel order
- engineering sign-off on the state machine, idempotency contract, and rollback plan

Budget stance:

- the schema and inbox foundation should be near-zero marginal cost
- the first real cost center is likely channel ingestion or downstream messaging, not the CRM foundation itself
- do not introduce paid infrastructure that is only justified by a hypothetical future CRM breadth story

## Working Definition Of "CRM" For Phase 0

For this phase, "CRM" means:

- a source-aware lead record
- a conversation thread
- an owner
- a state machine
- a handoff log
- enough reporting data to prove response performance

For this phase, "CRM" does not mean:

- full back-office system of record
- broad sales pipeline parity with incumbents
- configurable enterprise admin layer

## Core User Stories

### Office manager

- I can open one inbox and see what is new, what is waiting, and who owns each conversation.
- I can see when AI is still active and when a human needs to step in.
- I can reassign a conversation without losing context.
- I can review whether the office is actually responding within SLA.

### Agent

- I can open a conversation and immediately see the transcript, source, lead context, and next recommended step.
- I can take over a conversation in one click.
- I can see whether the bot already replied and why the conversation was handed to me.

### Casedra operations

- We can prove first-response performance and handoff behavior from system data, not anecdotes.
- We can inspect workflow failures as explicit records rather than reconstructing them manually.

## Proposed Domain Model

These objects should exist in the first durable schema:

### `agencies`

Purpose:

- top-level tenant for workflow data

Suggested fields:

- `name`
- `slug`
- `country`
- `timezone`
- `status`
- `createdAt`
- `updatedAt`

### `agencyMemberships`

Purpose:

- map Clerk users into agencies and roles

Suggested fields:

- `agencyId`
- `userId`
- `role`
- `status`
- `displayName`
- `createdAt`
- `updatedAt`

### `channels`

Purpose:

- represent connected sources of inbound demand

Suggested fields:

- `agencyId`
- `type`
- `label`
- `status`
- `provider`
- `externalChannelId`
- `config`
- `createdAt`
- `updatedAt`

Initial channel types:

- `whatsapp`
- `portal_email`
- `web_form`
- `manual`

### `contacts`

Purpose:

- canonical person record for a lead or owner contact

Suggested fields:

- `agencyId`
- `kind`
- `fullName`
- `phone`
- `email`
- `preferredLanguage`
- `notes`
- `createdAt`
- `updatedAt`

Initial contact kinds:

- `buyer`
- `seller`
- `unknown`

### `leads`

Purpose:

- source-level inbound demand record

Suggested fields:

- `agencyId`
- `contactId`
- `channelId`
- `listingId`
- `kind`
- `sourceType`
- `sourceLabel`
- `externalLeadId`
- `status`
- `receivedAt`
- `rawPayload`
- `createdAt`
- `updatedAt`

Initial lead kinds:

- `buyer_inquiry`
- `seller_inquiry`
- `valuation_request`
- `other`

### `conversations`

Purpose:

- operational thread that the inbox works on

Suggested fields:

- `agencyId`
- `leadId`
- `contactId`
- `channelId`
- `listingId`
- `state`
- `ownerType`
- `ownerUserId`
- `version`
- `sourceType`
- `sourceLabel`
- `summary`
- `nextRecommendedStep`
- `firstResponseAt`
- `lastInboundAt`
- `lastOutboundAt`
- `lastMessageAt`
- `reopenedAt`
- `closedAt`
- `createdAt`
- `updatedAt`

Initial states:

- `new`
- `bot_active`
- `awaiting_human`
- `human_active`
- `closed`

Initial owner types:

- `unassigned`
- `ai`
- `human`

Notes:

- `summary` and `nextRecommendedStep` may start empty or null and be populated asynchronously
- missing summary data must not block inbox rendering, takeover, or reassignment

### `messages`

Purpose:

- transcript storage

Suggested fields:

- `agencyId`
- `conversationId`
- `direction`
- `senderType`
- `senderUserId`
- `body`
- `bodyFormat`
- `providerMessageId`
- `externalEventId`
- `dedupeKey`
- `sentAt`
- `metadata`
- `createdAt`

Initial directions:

- `inbound`
- `outbound`
- `internal`

Initial sender types:

- `lead`
- `ai`
- `user`
- `system`

### `assignments`

Purpose:

- track explicit ownership changes and support future accountability views

Suggested fields:

- `agencyId`
- `conversationId`
- `assigneeUserId`
- `assignedByUserId`
- `reason`
- `active`
- `createdAt`
- `endedAt`

### `handoffEvents`

Purpose:

- record why the conversation moved from AI or unassigned into human hands

Suggested fields:

- `agencyId`
- `conversationId`
- `fromOwnerType`
- `fromUserId`
- `toOwnerType`
- `toUserId`
- `trigger`
- `summarySnapshot`
- `recommendation`
- `createdAt`

Initial triggers:

- `low_confidence`
- `lead_requested_human`
- `manual_takeover`
- `routing_rule`
- `manager_reassign`
- `other`

### `performanceSnapshots`

Purpose:

- store derived daily or weekly metrics later without redesigning the source model

Suggested fields:

- `agencyId`
- `periodType`
- `periodStart`
- `periodEnd`
- `conversationCount`
- `respondedConversationCount`
- `medianFirstResponseSeconds`
- `responseCoveragePct`
- `handoffRatePct`
- `manualTakeoverRatePct`
- `createdAt`

## Indexing Strategy

We should add only the indexes needed for the first inbox and reporting use cases.

Minimum useful indexes:

- `agencies.by_slug`
- `agencyMemberships.by_user`
- `agencyMemberships.by_agency`
- `channels.by_agency`
- `contacts.by_agency`
- `leads.by_agency`
- `leads.by_contact`
- `conversations.by_agency`
- `conversations.by_state`
- `conversations.by_owner`
- `conversations.by_lead`
- `conversations.by_channel`
- `messages.by_conversation`
- `assignments.by_conversation`
- `handoffEvents.by_conversation`
- `performanceSnapshots.by_agency_and_period`

## Conversation State Model

The first version should use a strict and boring state machine.

Transitions:

1. inbound lead arrives -> `new`
2. first automated reply sent -> `bot_active`
3. escalation needed -> `awaiting_human`
4. agent takes over -> `human_active`
5. workflow complete -> `closed`

Rules:

- `ownerType="ai"` is valid only in `bot_active`
- `ownerType="human"` is expected in `human_active`
- `awaiting_human` can be owned by a specific user or remain `unassigned`
- `closed` must preserve prior transcript and handoff history

Additional invariants:

- `conversations.ownerType` and `conversations.ownerUserId` are the source of truth for current ownership
- `assignments` and `handoffEvents` are append-only history, not the canonical current owner
- there can be at most one active assignment row per conversation at a time
- any mutation that changes owner or state must also append a history record in the same write transaction
- a new inbound message on a closed conversation reopens the same conversation and records a system event instead of silently creating an unrelated second thread
- `firstResponseAt` is set by the first non-internal outbound message in the conversation and never overwritten

## Metric Definitions

To avoid reporting drift, the first foundation plan should define its key metrics explicitly.

- first-response time: elapsed time between the first inbound message in a conversation and the first non-internal outbound message in that same conversation
- response coverage: percent of conversations with at least one qualifying outbound response
- handoff rate: percent of conversations with at least one recorded `handoffEvent`
- manual takeover rate: percent of conversations where a human takes ownership from `ai` or `unassigned`
- reopened conversation rate: percent of conversations that were closed and later reopened by new inbound activity

Beta-readiness thresholds for this foundation:

- zero authorization leaks in manual and automated verification
- deterministic retry tests produce zero duplicate records for the same external event
- all invalid state transitions are rejected server-side
- first-response time is derivable for every conversation that contains both inbound and outbound messages

## Ingestion, Idempotency, And Concurrency Rules

The plan needs these rules locked before coding.

### Ingestion idempotency

- every ingestion path must provide or derive a stable `dedupeKey`
- duplicate retries from the same external event must not create a second lead, conversation, or message
- dedupe should happen before any follow-on side effects such as summary refresh or reporting updates

Suggested dedupe sources:

- portal email: message-id header or a normalized hash of provider + mailbox + message-id
- web form: provider submission id
- WhatsApp: provider message id

### Ownership mutation concurrency

- takeover, reassignment, and state-change mutations should check a conversation `version` or `updatedAt` guard before writing
- if two users act at the same time, the second write should fail explicitly with a stale-state error rather than silently overwriting the first action
- the UI should refresh the conversation immediately after a stale-state error and explain what changed

### Message ordering

- use provider timestamp when trustworthy
- fall back to ingest receive time when provider timestamps are absent or invalid
- render ties deterministically by `createdAt` and document id so the transcript does not reorder between refreshes

## First Product Surfaces

### `/app/inbox`

This should be the first real authenticated operational page.

Initial UI should include:

- left column queue of conversations
- filters for `new`, `awaiting_human`, `human_active`, `closed`
- visible owner chip
- visible channel/source chip
- response age / freshness cue
- main thread panel with transcript
- summary block
- takeover button
- reassign control
- state transition control

Required user states:

- empty queue state when no conversations exist yet
- empty selection state when a queue exists but no conversation is selected
- loading skeletons for queue and thread
- recoverable error state for failed queries
- explicit mutation feedback for takeover, reassignment, and stale-state conflicts
- mobile behavior that collapses into list view and detail view instead of trying to force a desktop two-pane layout on small screens

Accessibility requirements:

- full keyboard navigation for queue items and action controls
- visible focus treatment
- no status communicated by color alone
- transcript updates announced appropriately when actions succeed or fail

### `/app/studio`

This has stopped pretending to be the operational surface.

Current state:

- `/app/studio` is retained only as a legacy redirect to `/app/inbox`
- the real operating surface is `/app/inbox`
- placeholder studio queue content is removed from active navigation

### onboarding

Onboarding should eventually gather workflow setup data, not only brand/listing/media inputs.

That does not need to be the first coding step, but it should move toward:

- agency creation
- team member mapping
- channel setup
- routing preferences

## Agency Resolution And Bootstrap Rules

The server needs an explicit way to determine the current agency.

Rules:

- every workflow query and mutation must resolve `currentAgencyId` from authenticated membership, not from an untrusted client parameter
- if the signed-in user has no membership in development, the system may create a bootstrap agency and owner membership automatically
- production should not silently create agencies from arbitrary page visits; agency creation belongs in the onboarding or deployment flow
- the current TRPC context should grow to include agency-resolution helpers rather than repeating membership lookups in every procedure

## API Plan

New TRPC routers should be added for workflow primitives instead of expanding the listings router further.

Suggested initial routers:

### `agencies`

- `createDefaultAgencyForUser`
- `getCurrentAgency`
- `listMemberships`

### `conversations`

- `list`
- `byId`
- `createManual`
- `takeOver`
- `reassign`
- `setState`

### `messages`

- `listByConversation`
- `createOutbound`
- `createInternalNote`

### `reporting`

- `getInboxSummary`
- `getResponseMetrics`

For v1 we should keep all mutations conservative and explicit. No hidden workflow magic.

Mutation rules:

- `createManual` must create the contact, lead, conversation, and first message atomically when used for internal testing or manual entry
- `takeOver` must update state, owner, assignment history, and handoff history atomically
- `reassign` must close the previous active assignment and create the next one atomically
- `setState` must reject invalid transitions instead of coercing them
- every workflow mutation must be agency-scoped and authorization-checked server-side

## Initial Authorization Model

We need a simple and safe first pass.

Assumptions:

- one user can belong to one or more agencies later
- in development, we can bootstrap one default agency per signed-in user if needed
- every workflow query and mutation must be scoped to the current agency

Recommended v1 role model:

- `owner`
- `manager`
- `agent`

Role capabilities in v1:

- `owner` and `manager` can reassign
- `agent` can take over and work owned conversations
- all members can view the transcript for agency conversations unless we later add privacy rules

Explicit denies in v1:

- a user outside the agency cannot read or mutate the agency workflow even if they guess ids
- an `agent` cannot reassign conversations they do not have permission to manage
- unauthenticated requests never receive workflow data through TRPC

## Recommended Execution Sequence

This is the order I would actually build in.

### Phase 1: workflow schema foundation

- add shared workflow types in `packages/types`
- extend Convex schema with the workflow tables
- add minimal indexes for inbox and ownership queries
- add migration-safe defaults where possible

Exit condition:

- the repo has a durable workflow model that does not depend on listings/media objects

### Phase 2: agency context and development bootstrap

- create a current-agency resolver
- create default agency membership for the current signed-in user in development
- add seed or bootstrap helpers so the inbox can be used before real channels are connected

Exit condition:

- a signed-in user can land in an agency-scoped workflow context without manual database surgery

### Phase 3: inbox queries and actions

- add conversation list query
- add conversation detail query
- add messages-by-conversation query
- add takeover mutation
- add reassignment mutation
- add state transition mutation

Exit condition:

- the core workflow actions exist server-side with agency scoping

### Phase 4: `/app/inbox` UI

- build the inbox shell
- render a real queue from TRPC
- render a real transcript
- show owner, state, and source
- wire takeover and reassignment actions

Exit condition:

- the product has a real operational surface instead of a preview-only studio

### Phase 5: reporting v1

- derive inbox counts by state
- derive first-response timing
- derive handoff counts
- add a lightweight manager summary strip or panel

Exit condition:

- we can show proof that the workflow is being used and whether it is behaving

### Phase 6: first ingestion adapter

Preferred first ingestion path:

- forwarded portal email

Why:

- it fits the roadmap
- it is easier to debug than a full WhatsApp path
- it gives us real conversation creation and transcript primitives immediately

Initial ingestion outcomes:

- create contact if needed
- create lead
- create conversation
- append first inbound message
- mark conversation `new`

This is still one coherent build, not a partial "v2 later" plan. The sequence above is implementation order, not a statement that the rest of the feature is optional.

## Reviewed Implementation Status

Implemented in the current slice:

- Phase 1 is in place: shared workflow types, Convex workflow tables, and inbox-oriented indexes were added.
- Phase 2 is in place for development: current-agency resolution, default development bootstrap, and seeded inbox data now exist.
- Phase 3 is in place: conversation list/detail/message queries plus manual conversation creation, takeover, reassignment, state-change, and internal-note mutations are live.
- Phase 4 is in place: `/app/inbox` now renders real workflow records, transcript history, ownership, and queue actions instead of preview arrays.
- The legacy `/app/studio` page now redirects to `/app/inbox`, so post-auth product traffic lands on the operational inbox rather than a preview.
- Workflow authorization is now enforced inside Convex using Clerk-backed identity and active agency membership, and the server-side Convex client is request-scoped and authenticated.

Now covered in this reviewed slice:

- Phase 5 reporting now exists as a first manager-facing inbox surface with queue counts, response coverage, first-response timing, handoff rate, and reopen rate derived from workflow records.
- Phase 6 forwarded portal email ingestion is now in place through a guarded `/api/workflow/portal-email` route with dedupe, idempotent ingest handling, reopen-on-new-message behavior, and fallback thread reuse when upstream lead ids are absent.
- Human outbound replies are now recorded from `/app/inbox`, claim ownership when appropriate, and update first-response timing from the same workflow records.
- Manual smoke verification of the authenticated `/app/inbox` flow and the portal-email ingest path has been completed in local development.

Remaining gaps against the full plan:

- workflow-specific rollout controls are still missing: app-level email allowlisting now gates testers, but there is still no per-agency workflow feature flag
- observability remains partial: the workflow events listed in this document are still not instrumented end-to-end, and PostHog capture is currently only used in onboarding flows
- verification remains incomplete: manual checks are done, but the recommended automated coverage for idempotent ingestion, ownership concurrency, and inbox UI smoke paths is still absent
- repo-wide verification is not fully clean yet: the standalone `packages/api` `tsc --noEmit` path still has pre-existing Node/lib configuration debt outside this CRM slice
- onboarding still has not been expanded to capture team member mapping, channel setup, or routing preferences
- API parity is close but not exact: `messages.createOutbound` is live, while `appendSystemEvent` is still handled through internal workflow writes rather than a public TRPC procedure

Still open after this reviewed slice:

- the remaining rollout, observability, and verification work above should be closed before wider beta rollout

## Key Risks

### Risk 1: overbuilding the schema

If we design for every future CRM use case now, we will slow down the first useful surface.

Mitigation:

- add only the tables and fields needed for inbox, handoff, routing, and proof

### Risk 2: ownership ambiguity

If state and owner drift apart, trust collapses quickly.

Mitigation:

- keep strict state transition rules
- centralize ownership mutations
- log every handoff and reassignment

### Risk 3: weak tenant model

If agency scoping is bolted on late, future migration gets painful.

Mitigation:

- make `agencyId` a first-class field from day one

### Risk 4: fake inbox with no ingestion

If the inbox is only manual test data for too long, we will feel progress without proving the workflow.

Mitigation:

- use seed data only to unlock UI work
- move quickly to one real ingestion path

### Risk 5: mixing listings/media concerns into workflow

Listings matter, but the workflow core should not depend on listings being present.

Mitigation:

- make `listingId` optional on leads and conversations

### Risk 6: duplicate ingestion and retry storms

If inbound retries create duplicate records, the inbox becomes untrustworthy quickly.

Mitigation:

- require stable dedupe keys per ingestion path
- make conversation creation idempotent for repeated external events
- log dedupe hits so we can audit noisy providers

### Risk 7: irreversible rollout mistakes

If we connect live ingestion before the inbox actions and permissions are stable, we risk operational confusion in design-partner accounts.

Mitigation:

- gate the inbox and ingestion behind a feature flag
- roll out to internal users first
- keep ingestion disableable without deleting stored data

## Observability And Success Metrics

We should instrument the foundation from day one.

Structured events to log:

- `conversation_created`
- `message_ingested`
- `message_deduped`
- `conversation_reopened`
- `conversation_taken_over`
- `conversation_reassigned`
- `conversation_state_changed`
- `first_response_recorded`
- `workflow_mutation_denied`
- `inbox_query_failed`

Minimum product metrics:

- number of conversations by state
- median first-response time
- percent of conversations with first response recorded
- bot-to-human handoff rate
- manual takeover rate
- reassignment count
- percent of conversations reopened after close

Alert conditions for internal and beta rollout:

- ingestion failure rate above agreed threshold for a full day
- duplicate-ingestion rate spikes above baseline
- workflow mutation errors spike after deployment
- inbox query failure rate exceeds a safe threshold

## Success Criteria

We should call the first CRM foundation slice successful only if:

- a signed-in user can access a real `/app/inbox`
- the inbox reads from workflow records, not hardcoded preview arrays
- each conversation shows state, owner, transcript, and summary
- takeover and reassignment are durable mutations
- the system can derive first-response timing from stored records
- the workflow model works whether or not a listing is linked

## Verification Plan

Minimum verification before we call the feature ready for beta:

- `tsc --noEmit`
- Convex schema compiles cleanly
- manual auth flow into `/app/inbox`
- manual seeded workflow records render correctly
- takeover changes owner and state correctly
- reassignment updates owner history correctly
- message ordering is stable
- duplicate ingest retries do not create duplicate messages or conversations
- unauthorized users cannot read another agency's workflow data
- stale-state takeover and reassignment conflicts fail safely

Recommended automated coverage:

- unit tests for valid and invalid state transitions
- unit tests for agency authorization rules
- integration tests for idempotent ingestion
- integration tests for takeover and reassignment concurrency
- UI smoke tests for queue rendering, thread rendering, and mutation feedback

## Rollout Plan

Rollout should be staged and reversible.

1. Internal development
   - bootstrap agency enabled in development
   - seeded and manual conversations allowed
   - no live third-party ingestion
2. Internal dogfooding
   - real `/app/inbox` replaces preview use for internal users
   - `/app/studio` remains a redirect only
   - manual conversation handling only
3. Design-partner beta
   - first live ingestion path enabled for selected agencies
   - app-level allowlisting controls tester access until a per-agency workflow gate exists
   - daily review of failures, duplicates, and ownership confusion
4. Wider rollout
   - expand access only after beta metrics are stable and handoff behavior is trusted

Rollback rules:

- disabling the feature flag removes inbox access without deleting workflow data
- disabling ingestion stops new conversations without mutating existing history
- schema additions should be additive so rollback does not require destructive data migration

## Strategic Narrative

This feature matters because it turns Casedra from a polished promise into an operational system.

Positioning:

- incumbents tend to be broad systems of record or weak inbox layers
- Casedra should win first by being the clearest workflow layer at the moment a lead arrives
- the foundation plan is valuable because it creates the operational records that later seller proof, routing intelligence, and weekly reporting depend on

Execution assumptions locked for this plan:

- the first live ingestion path is forwarded portal email
- one external thread maps to one conversation in v1, with reopen-on-new-inbound behavior after close
- development can auto-bootstrap a default agency; production agency creation remains explicit
- AI draft attempts do not require a dedicated top-level table in this foundation slice; sent messages and workflow history are the priority

## Recommended First Coding Task

When we start implementation, I would begin with this exact slice:

1. Add workflow types to `packages/types`.
2. Add Convex workflow tables and indexes.
3. Add TRPC agency and conversation queries.
4. Build `/app/inbox` with seeded records.
5. Add takeover and reassignment mutations.

That gives us a real product spine quickly and keeps us aligned with the roadmap.
