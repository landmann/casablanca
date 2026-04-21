# Responde — Technical Build Plan

**Date:** 2026-04-18  
**Scope:** Phase 0 and the start of Phase 1  
**Purpose:** build the first product that can earn trust with live lead workflows

---

## 1. What Responde Is In The New Plan

Responde is not a chatbot project.

Responde is the first operational layer of Casedra:

- it receives live demand
- it controls first response
- it hands off cleanly to humans
- it creates measurable response-time proof
- it seeds the inbox that later becomes the workflow core

If Responde works, Casedra can expand.
If Responde does not earn trust, the whole company shape gets weaker.

---

## 2. Product Boundaries

## In scope

- inbound lead creation from supported channels
- fast first response
- qualification and context gathering
- clear handoff to human
- web inbox for the agency team
- manager-visible reporting

## Out of scope in the first build

- voice AI
- huge CRM object model
- broad automation trees
- multilingual depth
- complex partner marketplace logic
- deep mobile feature set

The first job is not intelligence.
The first job is trust.

---

## 3. Technical Principles

1. **Fast and safe beats clever**
2. **Handoff must be explicit**
3. **Every conversation state must be observable**
4. **Provider abstractions matter from day 1**
5. **Deployment friction is a product bug**
6. **Trust architecture beats autonomy theatre**
7. **Evaluations are part of the system, not an afterthought**

---

## 4. Core Surfaces

### 1. Agency connection flow

This is where agencies:

- connect or provision messaging
- configure forwarding addresses
- set response rules
- define the responsible humans

### 2. Web inbox

This is where teams:

- see conversations
- take over manually
- assign ownership
- view summaries
- monitor performance

### 3. Internal control and reporting layer

This is where Casedra:

- tracks response time
- identifies misses
- measures handoff quality
- supports weekly customer reviews

---

## 5. Architecture

### Ingestion layer

- channel webhooks
- email forwarding intake
- parsing and normalization

### Workflow layer

- conversation creation
- state machine
- routing
- ownership changes
- handoff transitions

### Intelligence layer

- response drafting
- qualification
- summarization
- confidence and escalation logic

### Reporting layer

- first-response metrics
- coverage metrics
- assignment metrics
- account health signals

### Evaluation layer

- core response scenario tests
- parsing checks
- handoff and takeover checks
- confidence-threshold checks

---

## 6. Data Model

At minimum, the system needs durable objects for:

- agencies
- users
- channels
- leads
- conversations
- messages
- assignments
- handoff events
- performance snapshots

### Design rule

Do not let Phase 0 create a throwaway schema.
The earliest Responde data should be reusable by:

- inbox reporting
- seller-acquisition workflows
- benchmarks
- partner attribution later

---

## 7. Conversation State Model

Each conversation needs a simple and reliable state machine.

### Suggested states

- `new`
- `bot_active`
- `awaiting_human`
- `human_active`
- `closed`

### Required transitions

- lead enters -> `new`
- first response sent -> `bot_active`
- escalation needed -> `awaiting_human`
- user takes over -> `human_active`
- conversation complete -> `closed`

### Non-negotiable rule

The system must always know whether the bot or a human owns the conversation.

If ownership is ambiguous, trust collapses.

---

## 8. Handoff Design

Handoff is the most important product behavior.

### Handoff should happen when

- the lead requests a person
- confidence is low
- the question requires local human context
- tone becomes negative
- an agent chooses to take over

### Handoff package

The human should receive:

- contact identity
- channel
- source / listing reference when known
- short summary
- confidence or escalation reason when relevant
- next recommended step

### Sample agent notification

```text
Lead nuevo

Origen: Idealista - Piso 2 hab Chamberi
Nombre: Ana Garcia
Telefono: +34 612 345 678
Estado: esperando agente

Resumen:
Busca compra en Chamberi o Chamartin.
Presupuesto aproximado 350k-400k.
Quiere visita esta semana si encaja.

Accion recomendada:
Responder hoy y confirmar disponibilidad.
```

No emoji theatre. No cleverness. Just clarity.

---

## 9. Inbox Requirements

The first inbox does not need breadth.
It needs authority.

### Must have

- full conversation transcript
- visible owner
- visible state
- one-click takeover
- one-click reassign
- conversation summary

### Nice to have later

- deep filters
- collaboration comments
- bulk actions
- advanced analytics tabs

The inbox should feel operational, not decorative.

---

## 10. Deployment Engineering

The first 200 agencies will not adopt through self-serve alone.
So the build plan must include deployment support.

### Internal needs

- channel connection checklist
- portal forwarding checklist
- account health dashboard
- known-failure playbook
- evaluation dashboard for core workflows

### Product needs

- clearer setup guidance
- failure-state diagnostics
- provider-specific troubleshooting
- onboarding completion tracking
- visible trust state when AI ownership changes

Deployment quality is part of the product surface.

---

## 11. Observability

Every account needs to expose:

- time to first response
- percent of leads answered in SLA
- bot-to-human handoff rate
- percent of conversations manually taken over
- channel connection health
- parsing failure rate
- inbox weekly activity
- core eval pass rate
- trust-breaking incident count

Every internal dashboard should answer:

- is the account live
- is the workflow healthy
- is the customer seeing value
- is trust at risk

---

## 12. First 60-Day Build Schedule

## Weeks 1-2

- channel abstraction
- base schema
- first supported channel
- email-forwarding intake
- basic inbox
- manual handoff flow

## Weeks 3-4

- response drafting
- qualification logic
- reporting v1
- account setup checklist
- design-partner deployments
- evaluation harness for core flows

## Weeks 5-6

- routing rules
- manager visibility
- stability improvements
- onboarding automation
- first weekly ROI reports
- trust and escalation refinements

### What counts as done

Not "the code works."

Done means:

- agencies are live
- conversations are flowing
- takeover works
- reporting is believable

---

## 13. Build Tracks

### Track A — Ingestion and connection

- providers
- parsers
- setup
- diagnostics

### Track B — Inbox and state

- conversation model
- ownership
- takeover
- reporting

### Track C — Intelligence and summaries

- drafting
- qualification
- summarization
- escalation logic

Each track should have one clear owner.

---

## 14. Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| channel setup friction | agencies never go live | make deployment flows first-class |
| ambiguous ownership | trust breaks fast | strict state machine |
| over-automation | wrong replies on real leads | conservative escalation |
| brittle parsing | missing or malformed leads | narrow first, fail visibly |
| no evaluation discipline | quality drifts silently | treat eval coverage as a release gate |
| weak reporting | ROI is not believable | instrument everything early |

---

## 15. Kill Criteria

We should treat Responde as failing if, after the first design-partner phase:

- agencies still will not connect live channels
- manual takeover is used constantly because trust is low
- reporting cannot clearly show improvement
- weekly usage is weak even in paying accounts

If that happens, the response is not "build more AI."
The response is "fix trust, setup, and workflow clarity."

---

## 16. The One Thing To Remember

Responde is not impressive when it sounds smart.

Responde is impressive when an agency forgets to worry about missed leads because the workflow has become reliable.
