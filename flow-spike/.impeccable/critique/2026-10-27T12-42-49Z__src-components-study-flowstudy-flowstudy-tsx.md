---
target: Flow view iteration 5 (heading, frame tones, journey path)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/zavalit/Projects/openuji/journey-viewer/flow-spike/src/components/study/FlowStudy/FlowStudy.tsx"
target_fingerprint: "sha256:9345df6eee5410aaba0985bfd81992105c85ec396051a1ae2144c438fc09db9f"
target_path: /Users/zavalit/Projects/openuji/journey-viewer/flow-spike/src/components/study/FlowStudy/FlowStudy.tsx
timestamp: 2026-10-27T12-42-49Z
slug: src-components-study-flowstudy-flowstudy-tsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Strip shows the path; on canvas the active tone is 1.07:1 (light) / 1.12:1 (dark) |
| 2 | Match System / Real World | 3 | Breadcrumb is familiar; "10 states", dots still vocabulary |
| 3 | User Control and Freedom | 2 | Return collapses without undo |
| 4 | Consistency and Standards | 2 | Current step is not inert; separator = toggle chevron |
| 5 | Error Prevention | 1 | One click on the current step closed 9 of 10 frames |
| 6 | Recognition Rather Than Recall | 2 | After return, the user must remember what was open |
| 7 | Flexibility and Efficiency | 2 | No up-level key; focus enters at root |
| 8 | Aesthetic and Minimalist Design | 3 | Clean; figure/ground inverted inside the active frame |
| 9 | Error Recovery | 1 | Accidental collapse: no feedback, no way back |
| 10 | Help and Documentation | 2 | Nothing says return collapses |
| Total | | 20/40 | Acceptable |

## Design Specificity Verdict
LLM: authored; one border, heading in the corner, stripe idiom; weaknesses are behaviour and hierarchy.
Detector: CLI 0 findings; overlay overused-font (Inter) false positive; axe 0 contrast violations, iframe-only landmark/heading rules, up to 90 incomplete over connector SVG (headings hand-measured >= 13.7:1 / 5.05:1).

## Priority Issues
- [P1-a] Breadcrumb return destructive, no undo; current step collapses too. Fix: current step scroll-only; forward ghost steps restore; aria-description. (clarify, harden)
- [P1-b] Active tone 1.07:1 / 1.12:1, outside identical to canvas; outside nodes stand out more than active ones. Fix: border-strong hairline on the active frame only, outside headings Muted Ink 500. (polish)
- [P2] Opening does not reveal the new frame (anchoring gate). (layout)
- [P2] No frame semantics/aria-current on canvas; focus after return stays in strip. (harden)
- [P2] Strip at 375: wraps 3 lines, chevron separator looks like a tree toggle, 22px targets. (adapt)

## Persona Red Flags
Alex: one back-click loses deep exploration; no up-level key; Expand all leaves everything current; second root becomes active only by opening inside it.
Sam: active only by 1.07:1 tone; aria-current on a state-changing button without description; focus leads away; 22px targets.
Stakeholder: plain step names help; MFA vanishing on back is a surprise; dimmed parents may read as disabled.

## Minor Observations
Frame hairline 1.16-1.24:1 vs corridors at 3:1 re-create a second border via routing (geometry, out of scope); selected-heading stripe weakest selection mark; x5 chip partly under IdP card (pre-existing); Tree/Expand-all opens don't extend the path.

## Questions to Consider
If the ground cannot darken, is ink weight the better "you are here" channel? Should selecting in another root make it active?
