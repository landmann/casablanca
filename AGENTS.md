<!-- stripe-projects-cli managed:agents-md:start -->
## Stripe Projects CLI

This repository is initialized for the Stripe project "casablanca".

## Tools used

- [Stripe CLI](https://docs.stripe.com/stripe-cli) with the `projects` plugin to manage third-party services, credentials, and deployments for this project. Use the stripe-projects-cli to manage deploying and access to third party services.
<!-- stripe-projects-cli managed:agents-md:end -->

## Brand guidelines

Reference for any UI, marketing, or asset work. Vibe: *Financial Times editorial gravitas × contemporary tech confidence.* Think single-malt-and-leather-chairs meets a well-made product page.

### Palette

| Role | Hex | Use |
| --- | --- | --- |
| **Canvas** (primary) | `#FFFBF2` | Default page background. Warm cream — less pink than FT salmon, more understated. Never use pure white on interior surfaces. |
| **Accent** (secondary) | `#9C6137` | Copper/tobacco. Reserve for interactive affordances (CTAs, links, active nav), pull-quote rules, data emphasis. Do **not** use as a large fill — it's load-bearing, not decorative. |
| Body text | `#1F1A14` | Warm off-black. Cool-black on the cream canvas reads dirty; keep tones aligned. |
| Muted text | `#6F5E4A` | Metadata, captions, secondary copy. |
| Hairlines | `#E8DFCC` | Borders, dividers — stay tonal with the canvas. |

Rule of thumb: if the cream and copper aren't doing the heavy lifting, you're off-brand. Avoid introducing blues or saturated secondaries without a very specific reason.

### Typography

Pair an editorial serif with a clean geometric sans — the same move the FT makes, done with free, variable fonts.

- **Display / headlines**: **Instrument Serif** (Google Fonts). High-contrast, restrained, editorial — closest free analog to FT's Financier. Use regular + italic; avoid bold (the letterforms don't need it).
- **Body / UI**: **Geist** (already wired in `layout.tsx`). Keep. Neutral, modern, tech-native — balances the serif's gravitas.
- **Mono**: **Geist Mono** (already present). For IDs, code, tabular data.

Alternative if you want more personality in headlines: **Fraunces** (variable, with optical-size + softness axes). Warmer, quirkier — leans more "craft" than "journal." Pick one and stick with it.

### Usage notes

- **Hierarchy via serif size, not weight.** Let Instrument Serif do its editorial thing at 48–80px for hero copy; use 32–40px for section heads. Avoid `font-bold` on the serif.
- **Leading & measure for prose.** 1.55–1.7 line-height on body; cap long-form reading width at ~70ch (already applied on `/masterplan`).
- **Accent discipline.** Copper links, copper CTA fill, copper active-tab underline. That's it. If you find yourself using it for decoration, stop.
- **No pure white surfaces** visible to the user — the cream canvas *is* the brand.
- **Imagery.** When we use photography or Fal-generated visuals, bias toward warm, desaturated tones that sit within the palette. Avoid saturated stock.
