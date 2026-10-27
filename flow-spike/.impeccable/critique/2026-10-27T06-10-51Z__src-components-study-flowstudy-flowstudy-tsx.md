---
target: flow spike FlowStudy
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/zavalit/Projects/openuji/journey-viewer/flow-spike/src/components/study/FlowStudy/FlowStudy.tsx"
target_fingerprint: "sha256:f4f5eeb7c390e09ac5a4956a89f57ef916fcabdedee2a9c6884e7a6277596f55"
target_path: /Users/zavalit/Projects/openuji/journey-viewer/flow-spike/src/components/study/FlowStudy/FlowStudy.tsx
timestamp: 2026-10-27T06-10-51Z
slug: src-components-study-flowstudy-flowstudy-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser evidence sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Open frames run past the canvas edge with no cue beyond scrollbars |
| 2 | Match System / Real World | 2 | Exit glyph ⊗ on "IdP auth success" reads as failure to stakeholders |
| 3 | User Control and Freedom | 3 | No way back to the previous expansion after Expand all |
| 4 | Consistency and Standards | 3 | Card toggle reuses the global expand-all / collapse-all icons |
| 5 | Error Prevention | 3 | Fit has no legibility floor (labels ~5px at everything-open) |
| 6 | Recognition Rather Than Recall | 2 | No key for filled/hollow circles, dotted lines, hollow arrowheads, ×N, ↗N |
| 7 | Flexibility and Efficiency | 2 | No find, no arrow-key traversal along the flow |
| 8 | Aesthetic and Minimalist Design | 2 | Collapsed view excellent; open frames become a line web (49 / 124 crossings) |
| 9 | Error Recovery | 3 | Plain in-context notices (unavailable screen, no child journey, repeats an enclosing journey) |
| 10 | Help and Documentation | 1 | Only native <title> tooltips on connectors; mouse-only |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict

LLM assessment: specific to this product while collapsed — the card that becomes its frame's corner, contracts as statechart glyphs on borders, relation tones shared with the tree, and the context strip are not category defaults. Once frames open, generic routing debris buries that identity.

Deterministic scan: `impeccable detect --json src` returned 0 findings (exit 0). Browser overlay (3 stories × light/dark): `overused-font` (Inter; intentional — the design system's face via `--jv-font-sans`), `flat-type-hierarchy` (false positive: hidden 16px SVG <title> tooltips; rendered steps 13 → 14 → 18 = 1.29). No hard-coded colours. Hard-coded 10px / 11px font sizes in connector chips and the outgoing badge. Contrast: all text ≥ 4.5:1 (lowest 4.53 light); neutral connector 3.24 vs surface, 3.02 vs background (light), 4.96 (dark); focus ring 5.9 / 8.3.

## Overall Impression

The disclosure model and the contract grammar answer the user's complaints 2 and 4; the collapsed overview is the target quality. The biggest opportunity is the open-frame line web and the missing legend.

## What's Working

1. Identity-preserving disclosure: the MFA card keeps its screen position (≤ 0.5px), the toggle does not move, and the context strip names enclosing frames with their collapse action.
2. Contracts read as border annotations, not states.
3. Collapsed overview: 12 connectors, 0 crossings, selection tones shared with the tree.

## Priority Issues

- [P1] Open frames become a line web (parallel rails down the left gutter, many crossings). Fix: rest weight for connectors unrelated to the selection, selection's lines at full weight; consider labelled stubs for long returns at stakeholder detail. Command: /impeccable quieter, /impeccable layout.
- [P1] Keyboard and screen-reader order follows block type, not the flow (cards, then states, then contracts). Fix: render blocks in reading order; arrow-key traversal later. Command: /impeccable harden.
- [P1] Connectors look clickable (pointer, hover thickening) but do nothing. Fix: clicking selects the bundle's source so the inspector lists its transitions; otherwise drop the affordance. Command: /impeccable harden.
- [P2] Spec marks illegible: ×N at 10px, ↗N at 11px (Thirteen Rule), chip collides with arrowheads. Fix: 12px caption token, on the longest straight segment. Command: /impeccable typeset.
- [P2] No key; ⊗ exit glyph connotes failure. Fix: a Key listing only marks visible at the current detail; a neutral exit (ring with centre). Command: /impeccable clarify.

## Persona Red Flags

Jordan (stakeholder): IdP open shows 49 crossings; reads ⊗ on "IdP auth success" as an error; "Leads to" repeats "Authenticate with identity provider" five times.
Sam (keyboard / screen reader): Tab jumps by block type; connections unannounced (SVG hidden, inspector carries them); card toggle 22px below the 24px WCAG 2.5.8 minimum.
Alex (spec reader): cannot select a bundle; no find; Fit at everything-open is a thumbnail.

## Minor Observations

Card toggle icon ambiguity; 375px toolbar wraps to three rows; closed card's stacked edge reads as a hard offset shadow; composite title weight 600 vs DESIGN 500; DESIGN mentions a per-node touchpoint stripe that the build intentionally omits; context strip floats over chart labels.

## Questions to Consider

- At stakeholder detail, should the selection's routes be the only full-weight lines?
- If Fit cannot render legible text, should it switch to a structural overview (frames and titles only)?
- Should exits read as named outcomes built from the data rather than statechart notation?
