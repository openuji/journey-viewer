---
target: Stage-14 Flow building blocks and toolbar scenarios
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/zavalit/Projects/openuji/journey-viewer/packages/viewer/src/components/JourneyFlow"
timestamp: 2026-10-30T07-26-52Z
slug: packages-viewer-src-components-journeyflow
---
Method: dual-agent (A: design review · B: detector + browser)

Target: Stage-14 Flow building blocks (design system `Flow/*`), viewer `JourneyFlow`, and the four `Viewer/Flow scenarios` toolbar arrangements.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | After a path return the selection stays in the inspector but has no mark on the canvas; Fit does nothing visible when content already fits |
| 2 | Match System / Real World | 3 | Metro routes and plain labels read well; resting corridor loops read as containment |
| 3 | User Control and Freedom | 2 | Path return closes everything inside that journey; 1600px slack scrolls into empty ground; Key ignores Esc and outside clicks |
| 4 | Consistency and Standards | 2 | Several word pairs for one idea (ways in/out, incoming/outgoing, entry/exit, active step); Key is a filled chip unlike the other controls |
| 5 | Error Prevention | 3 | Path return is destructive; search Enter picks the first match |
| 6 | Recognition Rather Than Recall | 2 | Key covers lines only: no fills, selection, paper vs ground, card click vs chevron |
| 7 | Flexibility and Efficiency | 2 | Two zoom states only; no zoom shortcuts; no arrow-key traversal |
| 8 | Aesthetic and Minimalist Design | 3 | Quiet and on-system; root title twice (path + heading), entry dotted lines form boxes |
| 9 | Error Recovery | 2 | No way back from empty slack except Fit, which two scenarios lack |
| 10 | Help and Documentation | 2 | Key copy says "point at a step" (pointer only); Key clipped in the canvas scenario |
| **Total** | | **23/40** | **Acceptable** |

## Design Specificity Verdict

LLM assessment: specific to this product. Statechart entry/exit glyphs on frame borders, the composite card that becomes its frame's heading, metro corridors with direction halves and the journey path exist only because of UJG, and the build follows DESIGN.md (no shadows on flow nodes, 13px labels, meaningful hue only). Weakest point: at rest, corridors close into rounded rectangles around nodes, so a crop looks like a generic box chart.

Deterministic scan: file scans of all eight DS components, `JourneyFlow`, both browser adapters and the scenario harness: exit 0, no findings (regex-only rules). Page scans: 20 findings per 1440 page, 5 at 375, all false positives: `overused-font` (Inter is the documented face) and `nested-cards` (flow blocks are absolutely positioned siblings over frames, not nested cards). axe: no contrast violations in light or dark; manual check of axe-incomplete text: light minimum 4.53:1 (12px "←"), dark 8.33:1. Only Storybook-iframe violations (`landmark-one-main`, `page-has-heading-one`). No page errors, no horizontal overflow at 320/375/1440.

Visual overlays: injected via a headless browser on six pages; console reported only the same two false-positive rules. No user-visible overlay was left running.

## Overall Impression

The flow carries over from the spike faithfully and conforms to the design system; the canvas's activation moment (routes drawing over a quiet network) is the high point. What lets it down is the frame around it: the viewport's empty slack and phone first view, a Key that gets clipped and cannot be dismissed, and selection that vanishes after a path return. The biggest opportunity is the viewport, because "shape at a glance" depends on what the first and every revealed view shows.

## What's Working

- An open composite's heading stays exactly where its card was (≤0.5px), and the chevron and path extension follow the tree's grammar, so disclosure never disorients.
- Route halves and half-arrowheads stay readable in both themes; keyboard focus draws routes exactly like hover.
- Accessible names are clean ("Default entry: Start app auth", "Collapse Identity consent"), the lightbox returns focus to its opener, and contrast passes AA everywhere.

## Priority Issues

- **[P1] Key clipped and not dismissible.** In ControlsOnTheCanvas the Key panel is anchored to its inline start and cut by the flow region's `overflow: hidden`; it never closes on Esc or an outside click. Why: the only legend is unreadable in one of the four candidates. Fix: make `FlowKey` a top-layer popover with light dismiss (Esc, outside click), positioned beside its summary; or drop the region's clip. Command: /impeccable harden.
- **[P1] The viewport lands on empty ground.** `SLACK = 1600` lets the canvas scroll far into nothing, with no way back except Fit (missing in two scenarios); on phones the first 100% view shows ground before content. Why: "shape at a glance" fails when the first view is empty. Fix: clamp scrolling to the content outside anchoring transitions, and make the first view show the location (or Fit below `md`). Command: /impeccable adapt.
- **[P2] Selection disappears after a path return.** Returning closes the composite that holds the selection; the inspector still shows it but the canvas has no mark (also in the spike). Fix: give a closed card that contains the selection a resting accent stripe. Command: /impeccable clarify.
- **[P2] Touch targets under 44px.** State buttons stay 31px tall on coarse pointers (all 18–38 measured), the Key summary is 30px, contract captions 22px. Fix: extend hit areas with a pseudo-element without changing the drawn sizes the layout depends on. Command: /impeccable adapt.
- **[P2] Resting corridors read as containers.** Rounded bends where a bus meets a trunk close into rounded rectangles around Login, MFA challenge and others, and activation lights them as violet "boxes". This is the approved metro rendering; the review proposes square T-junctions with small junction dots. Command: /impeccable layout.

## Persona Red Flags

**Alex (power user):** no zoom steps or shortcuts; Placement reads like a lab setting; a path return wipes his expansions; Enter on "Login" opens "Login cancelled"; transition labels only appear as native line tooltips.

**Sam (keyboard / screen reader):** the canvas is a flat list of buttons (two tab stops per state with a screen, 100+ when fully open); connectors are `aria-hidden` and frames are not grouped, so "what leads where" and nesting are not available on the canvas; no skip to the inspector; the Key ignores Esc.

**Casey (mobile):** empty first view at 100%; the 70dvh canvas contains overscroll, so swipes on it never scroll the page; state buttons 31px; ControlsInTheBar pushes the first node ~450px down (bar 369px tall at 375 vs 257px without flow controls); the inspector updates below the fold without a cue.

## Minor Observations

- The journey path repeats the root heading 40px below it.
- "Median" is jargon for stakeholders.
- In ControlsInTheBar the bar grows from 51 to 89px when switching Tree → Flow at 1440 (and +112px at 375), so content jumps.
- In light theme the outside-frame tone barely shows (ground vs paper).
- A long unbreakable label is clipped without an ellipsis.
- The DS story `Flow/CompositeCard/RepeatsAnEnclosingJourney` uses a box too small for its two caption lines (story sizing, not the component).
- The Key covers lines only and says "point at a step".
- Not Flow-specific: search Enter picks the first result; the inspector shows URNs at stakeholder detail.

Scenario recommendation (review): ControlsOnTheCanvas without Placement and with a fixed Key: Fit and the Key sit with the surface they act on, the global bar keeps one height across views, Expand/Collapse stays in the bar for both Tree and Flow; FlowWithDefaults and FlowOnItsOwn lose the only overview (Fit) and legend.

## Questions to Consider

- If the team cannot pick a Placement, why should a stakeholder have to?
- Should Fit be the first view, with zoom into a region, rather than 100% at the top-left corner?
- Should the path only navigate, leaving collapse to the chevron?
